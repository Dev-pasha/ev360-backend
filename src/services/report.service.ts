// src/services/report.service.ts
import { DataSource, In } from "typeorm";
import { Report, ReportType } from "../entities/report.entity";
import { ReportConfirmation } from "../entities/report-confirmation.entity";
import { SelfAssessment } from "../entities/self-assessment.entity";
import { Event } from "../entities/event.entity";
import { Player } from "../entities/player.entity";
import { User } from "../entities/user.entity";
import { EvaluationResult } from "../entities/evaluation-result.entity";
import Logger from "../config/logger";
import AppDataSource from "../config/database";

export interface AllScoreReportResult {
  player_id: number;
  metric_scores: Array<{
    player_id: number;
    metric_id: number;
    skill_id: number;
    category_id: number;
    average_value: number;
    normalized_value: number;
    formatted_value: string;
    rank: number;
    number_of_players: number;
    player_metric_rank: number;
  }>;
  skill_scores: Array<{
    player_id: number;
    skill_id: number;
    category_id: number;
    average_value: number;
  }>;
  category_scores: Array<{
    player_id: number;
    category_id: number;
    average_value: number;
  }>;
  overall_score: number;
  comments: string[];
}

export class ReportService {
  private reportRepository;
  private reportConfirmationRepository;
  private selfAssessmentRepository;
  private evaluationResultRepository;
  private eventRepository;
  private playerRepository;
  private userRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.reportRepository = this.dataSource.getRepository(Report);
    this.reportConfirmationRepository =
      this.dataSource.getRepository(ReportConfirmation);
    this.selfAssessmentRepository =
      this.dataSource.getRepository(SelfAssessment);
    this.evaluationResultRepository =
      this.dataSource.getRepository(EvaluationResult);
    this.eventRepository = this.dataSource.getRepository(Event);
    this.playerRepository = this.dataSource.getRepository(Player);
    this.userRepository = this.dataSource.getRepository(User);
  }

  /**
   * Generate All Score Report
   */
  async generateAllScoreReport(
    eventIds: number[],
    evaluatorIds: number[]
  ): Promise<AllScoreReportResult[]> {
    try {
      // Get all evaluation results for the specified events and evaluators
      const results = await this.evaluationResultRepository
        .createQueryBuilder("er")
        .leftJoinAndSelect("er.player", "player")
        .leftJoinAndSelect("er.metric", "metric")
        .leftJoinAndSelect("metric.skill", "skill")
        .leftJoinAndSelect("skill.category", "category")
        .where("er.event_id IN (:...eventIds)", { eventIds })
        .andWhere("er.evaluator_id IN (:...evaluatorIds)", { evaluatorIds })
        .getMany();

      // Group results by player
      const playerResults = new Map<number, any[]>();
      results.forEach((result) => {
        const playerId = result.player.id;
        if (!playerResults.has(playerId)) {
          playerResults.set(playerId, []);
        }
        playerResults.get(playerId)!.push(result);
      });

      // Calculate scores for each player
      const reportResults: AllScoreReportResult[] = [];

      for (const [playerId, playerEvaluations] of playerResults) {
        const metricScores =
          await this.calculateMetricScores(playerEvaluations);
        const skillScores = await this.calculateSkillScores(metricScores);
        const categoryScores = await this.calculateCategoryScores(skillScores);
        const overallScore = await this.calculateOverallScore(categoryScores);
        const comments = await this.aggregateComments(playerEvaluations);

        reportResults.push({
          player_id: playerId,
          metric_scores: metricScores,
          skill_scores: skillScores,
          category_scores: categoryScores,
          overall_score: overallScore,
          comments: comments,
        });
      }

      // Rank players for each metric
      await this.calculateRankings(reportResults);

      return reportResults;
    } catch (error) {
      Logger.error("Error generating all score report:", error);
      throw error;
    }
  }

  /**
   * Create Individual Report
   */
  async createIndividualReport(
    reportData: {
      name: string;
      group_id: number;
      event_ids: number[];
      evaluator_ids: number[];
      optional_message?: string;
      filters?: {
        player_list_ids?: number[];
        preferred_position_ids?: number[];
        team_ids?: number[];
        category_ids?: number[];
        jersey_colour_ids?: number[];
      };
      preferred_positions_type?: string;
    },
    createdBy: User
  ): Promise<Report> {
    try {
      // Validate events belong to the group
      const events = await this.eventRepository.find({
        where: {
          id: In(reportData.event_ids),
          group: { id: reportData.group_id },
        },
      });

      if (events.length !== reportData.event_ids.length) {
        throw new Error("Some events not found or don't belong to the group");
      }

      // Validate evaluators exist
      const evaluators = await this.userRepository.find({
        where: { id: In(reportData.evaluator_ids) },
      });

      if (evaluators.length !== reportData.evaluator_ids.length) {
        throw new Error("Some evaluators not found");
      }

      // Create report
      const report = this.reportRepository.create({
        name: reportData.name,
        report_type: ReportType.INDIVIDUAL,
        optional_message: reportData.optional_message || null,
        group: { id: reportData.group_id },
        created_by: createdBy,
        events: events,
        evaluators: evaluators,
        filters: reportData.filters || {},
        preferred_positions_type:
          (reportData.preferred_positions_type as any) || "PRIMARY",
      });

      const savedReport = await this.reportRepository.save(report);

      // Get players based on filters
      const players = await this.getFilteredPlayers(
        reportData.group_id,
        reportData.filters
      );

      // Create confirmations for each player
      const confirmations = await this.createReportConfirmations(
        savedReport,
        players
      );

      return savedReport;
    } catch (error) {
      Logger.error("Error creating individual report:", error);
      throw error;
    }
  }

  /**
   * Get or create self-assessment
   */
  async submitSelfAssessment(assessmentData: {
    event_id: number;
    player_id: number;
    scores: Array<{
      metric_id: number;
      value: number;
      note?: string;
      videos?: Array<{
        uuid: string;
        thumbnail: string;
      }>;
      multi_score?: any;
    }>;
  }): Promise<SelfAssessment[]> {
    try {
      const results: SelfAssessment[] = [];

      for (const score of assessmentData.scores) {
        // Check if assessment already exists
        let assessment = await this.selfAssessmentRepository.findOne({
          where: {
            event: { id: assessmentData.event_id },
            player: { id: assessmentData.player_id },
            metric: { id: score.metric_id },
          },
        });

        if (assessment) {
          // Update existing
          assessment.value = score.value;
          assessment.note = score.note || null;
          assessment.videos = score.videos || [];
          assessment.multi_score = score.multi_score || null;
        } else {
          // Create new
          assessment = this.selfAssessmentRepository.create({
            event: { id: assessmentData.event_id },
            player: { id: assessmentData.player_id },
            metric: { id: score.metric_id },
            value: score.value,
            note: score.note || null,
            videos: score.videos || [],
            multi_score: score.multi_score || null,
          });
        }

        const saved = await this.selfAssessmentRepository.save(assessment);
        results.push(saved);
      }

      return results;
    } catch (error) {
      Logger.error("Error submitting self-assessment:", error);
      throw error;
    }
  }

  /**
   * Send individual reports to players
   */
  async sendReports(reportId: number): Promise<Report> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id: reportId },
        relations: ["confirmations", "confirmations.player"],
      });

      if (!report) {
        throw new Error("Report not found");
      }

      // Send to each player
      for (const confirmation of report.confirmations) {
        await this.sendReportToPlayer(confirmation);
      }

      // Update report sent timestamp
      report.sent = new Date();
      return this.reportRepository.save(report);
    } catch (error) {
      Logger.error("Error sending reports:", error);
      throw error;
    }
  }

  
  // Helper methods
  private async calculateMetricScores(evaluations: any[]): Promise<any[]> {
    const metricGroups = new Map<number, any[]>();

    // Group by metric
    evaluations.forEach((ev) => {
      const metricId = ev.metric.id;
      if (!metricGroups.has(metricId)) {
        metricGroups.set(metricId, []);
      }
      metricGroups.get(metricId)!.push(ev);
    });

    const metricScores = [];

    for (const [metricId, metricEvals] of metricGroups) {
      const scores = metricEvals.map((e) => e.score).filter((s) => s !== null);

      if (scores.length === 0) continue;

      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      const firstEval = metricEvals[0];

      // Normalize based on metric min/max
      const min = parseFloat(firstEval.metric.min_value || 0);
      const max = parseFloat(firstEval.metric.max_value || 10);
      const normalized = (average - min) / (max - min);

      metricScores.push({
        player_id: firstEval.player.id,
        metric_id: metricId,
        skill_id: firstEval.metric.skill.id,
        category_id: firstEval.metric.skill.category.id,
        average_value: average,
        normalized_value: normalized,
        formatted_value: average.toFixed(2),
        rank: 0, // Will be calculated later
        number_of_players: 0,
        player_metric_rank: 0,
      });
    }

    return metricScores;
  }

  private async calculateSkillScores(metricScores: any[]): Promise<any[]> {
    const skillGroups = new Map<number, any[]>();

    metricScores.forEach((score) => {
      const skillId = score.skill_id;
      if (!skillGroups.has(skillId)) {
        skillGroups.set(skillId, []);
      }
      skillGroups.get(skillId)!.push(score);
    });

    const skillScores = [];

    for (const [skillId, skillMetrics] of skillGroups) {
      const average =
        skillMetrics.reduce((sum, m) => sum + m.normalized_value, 0) /
        skillMetrics.length;

      skillScores.push({
        player_id: skillMetrics[0].player_id,
        skill_id: skillId,
        category_id: skillMetrics[0].category_id,
        average_value: average,
      });
    }

    return skillScores;
  }

  private async calculateCategoryScores(skillScores: any[]): Promise<any[]> {
    const categoryGroups = new Map<number, any[]>();

    skillScores.forEach((score) => {
      const categoryId = score.category_id;
      if (!categoryGroups.has(categoryId)) {
        categoryGroups.set(categoryId, []);
      }
      categoryGroups.get(categoryId)!.push(score);
    });

    const categoryScores = [];

    for (const [categoryId, categorySkills] of categoryGroups) {
      const average =
        categorySkills.reduce((sum, s) => sum + s.average_value, 0) /
        categorySkills.length;

      categoryScores.push({
        player_id: categorySkills[0].player_id,
        category_id: categoryId,
        average_value: average,
      });
    }

    return categoryScores;
  }

  private async calculateOverallScore(categoryScores: any[]): Promise<number> {
    if (categoryScores.length === 0) return 0;

    const sum = categoryScores.reduce(
      (total, cat) => total + cat.average_value,
      0
    );
    return sum / categoryScores.length;
  }

  private async aggregateComments(evaluations: any[]): Promise<string[]> {
    return evaluations.filter((e) => e.comment).map((e) => e.comment);
  }

  private async calculateRankings(
    results: AllScoreReportResult[]
  ): Promise<void> {
    // Calculate rankings for each metric
    const metricRankings = new Map<number, any[]>();

    results.forEach((result) => {
      result.metric_scores.forEach((score) => {
        if (!metricRankings.has(score.metric_id)) {
          metricRankings.set(score.metric_id, []);
        }
        metricRankings.get(score.metric_id)!.push(score);
      });
    });

    for (const [metricId, scores] of metricRankings) {
      // Sort by normalized value (descending)
      scores.sort((a, b) => b.normalized_value - a.normalized_value);

      // Assign ranks
      scores.forEach((score, index) => {
        score.rank = index + 1;
        score.number_of_players = scores.length;
        score.player_metric_rank = index + 1;
      });
    }
  }

  private async getFilteredPlayers(
    groupId: number,
    filters?: any
  ): Promise<Player[]> {
    let query = this.playerRepository
      .createQueryBuilder("player")
      .where("player.group_id = :groupId", { groupId });

    if (filters) {
      if (filters.player_list_ids?.length > 0) {
        query = query.andWhere("player.id IN (:...playerIds)", {
          playerIds: filters.player_list_ids,
        });
      }

      if (filters.team_ids?.length > 0) {
        query = query.andWhere("player.team_id IN (:...teamIds)", {
          teamIds: filters.team_ids,
        });
      }

      // Add other filters as needed
    }

    return query.getMany();
  }

  private async createReportConfirmations(
    report: Report,
    players: Player[]
  ): Promise<ReportConfirmation[]> {
    const confirmations = players.map((player) => {
      return this.reportConfirmationRepository.create({
        report,
        player,
        token: this.generateSecureToken(),
      });
    });

    return this.reportConfirmationRepository.save(confirmations);
  }

  private generateSecureToken(): string {
    // Generate a secure random token
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async sendReportToPlayer(
    confirmation: ReportConfirmation
  ): Promise<void> {
    // TODO: Implement email/notification sending
    confirmation.sent_at = new Date();
    await this.reportConfirmationRepository.save(confirmation);
  }
}
