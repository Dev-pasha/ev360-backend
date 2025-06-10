// src/services/report.service.ts
import { DataSource, In } from "typeorm";
import { Report, ReportType } from "../entities/report.entity";
import { ReportConfirmation } from "../entities/report-confirmation.entity";
import { SelfAssessment } from "../entities/self-assessment.entity";
import { Event, EventType } from "../entities/event.entity";
import { Player } from "../entities/player.entity";
import { User } from "../entities/user.entity";
import { EvaluationResult } from "../entities/evaluation-result.entity";
import Logger from "../config/logger";
import AppDataSource from "../config/database";

export interface AllScoreReportResult {
  player_id: number;
  player_info: {
    id: number;
    name: string;
    player_number: string;
    email: string;
    date_of_birth: Date | null;
    height: number | null;
    weight: number | null;
  };
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
    metric_name: string;
    skill_name: string;
    category_name: string;
  }>;
  skill_scores: Array<{
    player_id: number;
    skill_id: number;
    category_id: number;
    average_value: number;
    skill_name: string;
    category_name: string;
  }>;
  category_scores: Array<{
    player_id: number;
    category_id: number;
    average_value: number;
    category_name: string;
  }>;
  overall_score: number;
  comments: string[];
  category_names: Record<number, string>;
  skill_names: Record<number, string>;
  metric_names: Record<number, string>;
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
    eventIds: number[]
    // evaluatorIds: number[]
  ): Promise<AllScoreReportResult[]> {
    try {
      // Validate input
      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        throw new Error("EventIds must be a non-empty array");
      }

      // Get all evaluation results for the specified events with player details and names
      const results = await this.evaluationResultRepository
        .createQueryBuilder("er")
        .leftJoinAndSelect("er.player", "player")
        .leftJoinAndSelect("er.evaluator", "evaluator")
        .leftJoinAndSelect("er.event", "event")
        .leftJoinAndSelect("er.metric", "metric")
        .leftJoinAndSelect("metric.skill", "skill") // Join skill to get skill details
        .leftJoinAndSelect("skill.category", "category") // Join category to get category details
        .where("event.id IN (:...eventIds)", { eventIds })
        .getMany();

      if (!results || results.length === 0) {
        return [];
      }

      // Group results by player
      const playerResults = new Map<number, any[]>();
      const playerDetailsMap = new Map<number, any>();

      // Maps to store names for categories, skills, and metrics
      const categoryNamesMap = new Map<number, string>();
      const skillNamesMap = new Map<number, string>();
      const metricNamesMap = new Map<number, string>();

      results.forEach((result) => {
        if (!result?.player?.id) {
          return;
        }

        const playerId = result.player.id;

        // Store player details (will be the same for all results of this player)
        if (!playerDetailsMap.has(playerId)) {
          playerDetailsMap.set(playerId, {
            id: result.player.id,
            name: result.player.first_name + " " + result.player.last_name,
            player_number: result.player.number,
            email: result.player.email,
            date_of_birth: result.player.date_of_birth,
            height: result.player.height,
            weight: result.player.weight,
          });
        }

        // Store category, skill, and metric names from joined data
        if (result.metric?.skill?.category) {
          const categoryId = result.metric.skill.category.id;
          const categoryName =
            result.metric.skill.category.name ||
            result.metric.skill.category.name ||
            `Category ${categoryId}`;
          categoryNamesMap.set(categoryId, categoryName);
        }

        if (result.metric?.skill) {
          const skillId = result.metric.skill.id;
          const skillName = result.metric.skill.name || `Skill ${skillId}`;
          skillNamesMap.set(skillId, skillName);
        }

        if (result.metric) {
          const metricId = result.metric.id;
          const metricName = result.metric.name || `Metric ${metricId}`;
          metricNamesMap.set(metricId, metricName);
        }

        // Group evaluation results
        if (!playerResults.has(playerId)) {
          playerResults.set(playerId, []);
        }
        playerResults.get(playerId)!.push(result);
      });

      // Calculate scores for each player
      const reportResults: AllScoreReportResult[] = [];

      for (const [playerId, playerEvaluations] of playerResults) {
        try {
          const metricScores =
            await this.calculateMetricScores(playerEvaluations);
          const skillScores = await this.calculateSkillScores(metricScores);
          const categoryScores =
            await this.calculateCategoryScores(skillScores);
          const overallScore = await this.calculateOverallScore(categoryScores);
          const comments = await this.aggregateComments(playerEvaluations);

          // Get player details from our map
          const playerDetails = playerDetailsMap.get(playerId);

          // Enhance metric scores with names
          const enhancedMetricScores = metricScores.map((metric) => ({
            ...metric,
            metric_name:
              metricNamesMap.get(metric.metric_id) ||
              `Metric ${metric.metric_id}`,
            skill_name:
              skillNamesMap.get(metric.skill_id) || `Skill ${metric.skill_id}`,
            category_name:
              categoryNamesMap.get(metric.category_id) ||
              `Category ${metric.category_id}`,
          }));

          // Enhance skill scores with names
          const enhancedSkillScores = skillScores.map((skill) => ({
            ...skill,
            skill_name:
              skillNamesMap.get(skill.skill_id) || `Skill ${skill.skill_id}`,
            category_name:
              categoryNamesMap.get(skill.category_id) ||
              `Category ${skill.category_id}`,
          }));

          // Enhance category scores with names
          const enhancedCategoryScores = categoryScores.map((category) => ({
            ...category,
            category_name:
              categoryNamesMap.get(category.category_id) ||
              `Category ${category.category_id}`,
          }));

          reportResults.push({
            player_id: playerId,
            player_info: playerDetails,
            metric_scores: enhancedMetricScores,
            skill_scores: enhancedSkillScores,
            category_scores: enhancedCategoryScores,
            overall_score: overallScore,
            comments: comments,
            // Add the name maps to the response for easy access in frontend
            category_names: Object.fromEntries(categoryNamesMap),
            skill_names: Object.fromEntries(skillNamesMap),
            metric_names: Object.fromEntries(metricNamesMap),
          });
        } catch (playerError) {
          Logger.error(`Error processing player ${playerId}:`, playerError);
          continue;
        }
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

  async getSelfAssessmentPlayerScores(eventId: number) {
    // First verify it's a self-assessment event
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      select: ["id", "event_type"],
    });

    if (!event || event.event_type !== EventType.SELF_ASSESSMENT) {
      throw new Error("Event is not a self-assessment type");
    }

    // Get evaluation results for self-assessment
    const evaluationResults = await this.evaluationResultRepository
      .createQueryBuilder("er")
      .leftJoinAndSelect("er.player", "player")
      .leftJoinAndSelect("er.evaluator", "evaluator")
      .leftJoinAndSelect("er.metric", "metric")
      .leftJoinAndSelect("er.event", "event")
      .where("er.event = :eventId", { eventId })
      .andWhere("event.event_type = :eventType", {
        eventType: EventType.SELF_ASSESSMENT,
      })
      .andWhere("er.player = er.evaluator") // Self-assessment condition: player evaluates themselves
      .getMany();

    // Transform to your desired structure
    const playerScoresMap = new Map();

    evaluationResults.forEach((result) => {
      const playerId = result.player.id;

      if (!playerScoresMap.has(playerId)) {
        playerScoresMap.set(playerId, {
          player_id: playerId,
          scores: [],
        });
      }

      playerScoresMap.get(playerId).scores.push({
        id: `${result.player.id}-${result.metric.id}-${result.event.id}-${result.evaluator.id}`,
        value: result.score?.toString() || "0",
        evaluation_event_id: result.event.id,
        evaluator_id: result.evaluator.id,
        metric_id: result.metric.id,
        multi_score: result.choice_value, // Using choice_value as multi_score
        player_id: result.player.id,
        note: result.comment || "Nothing",
        videos: [], // Since you don't have videos relation in EvaluationResult
      });
    });

    return Array.from(playerScoresMap.values());
  }

  async getPlayerSelfAssessmentDetail(eventId: number, playerId: number) {
    // First verify it's a self-assessment event
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      select: ["id", "event_type", "name", "event_datetime", "end_date"],
      relations: ["metrics"], // Include metrics to get metric details
    });

    if (!event || event.event_type !== EventType.SELF_ASSESSMENT) {
      throw new Error("Event is not a self-assessment type");
    }

    // Get player details (you might want to replace this with actual player repository call)
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new Error("Player not found");
    }

    // Get evaluation results for this specific player in this event
    const evaluationResults = await this.evaluationResultRepository
      .createQueryBuilder("er")
      .leftJoinAndSelect("er.player", "player")
      .leftJoinAndSelect("er.evaluator", "evaluator")
      .leftJoinAndSelect("er.metric", "metric")
      .leftJoinAndSelect("er.event", "event")
      .where("er.event = :eventId", { eventId })
      .andWhere("er.player = :playerId", { playerId })
      .andWhere("er.evaluator = :playerId", { playerId }) // Self-assessment condition
      .andWhere("event.event_type = :eventType", {
        eventType: EventType.SELF_ASSESSMENT,
      })
      .orderBy("er.created_at", "DESC") // Most recent first
      .getMany();

    if (evaluationResults.length === 0) {
      throw new Error("Player not found in this self-assessment event");
    }

    // Calculate overall progress and statistics
    const totalPossibleMetrics = event.metrics?.length || 0;
    const completedMetrics = evaluationResults.length;
    const progress =
      totalPossibleMetrics > 0
        ? Math.round((completedMetrics / totalPossibleMetrics) * 100)
        : 0;

    // Calculate average score
    const scores = evaluationResults.map((result) =>
      parseFloat(result.score?.toString() || "0")
    );
    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;
    const maxScore = Math.max(...scores, 0);
    const minScore = Math.min(...scores, 5); // Default min to 5 if no scores

    // Group metrics by category if you have categories, otherwise just return all
    const metricScores = evaluationResults.map((result) => ({
      metric_id: result.metric.id,
      metric_name: result.metric.name || `Metric ${result.metric.id}`,
      score: parseFloat(result.score?.toString() || "0"),
      max_score: result.metric.max_value || 5, // Assuming max score of 5, adjust as needed
      note: result.note || null,
      comment: result.comment || null,
      choice_value: result.choice_value || null,
      attempt_number: result.attempt_number || 1,
      evaluated_at: result.created_at,
      updated_at: result.updated_at,
    }));

    // Get metrics that haven't been completed yet
    const completedMetricIds = evaluationResults.map(
      (result) => result.metric.id
    );
    const pendingMetrics =
      event.metrics
        ?.filter((metric) => !completedMetricIds.includes(metric.id))
        .map((metric) => ({
          metric_id: metric.id,
          metric_name: metric.name || `Metric ${metric.id}`,
          score: null,
          max_score: metric.max_value || 5,
          note: null,
          comment: null,
          choice_value: null,
          attempt_number: 0,
          evaluated_at: null,
          updated_at: null,
          status: "pending",
        })) || [];

    return {
      // Event information
      event: {
        id: event.id,
        name: event.name,
        event_type: event.event_type,
        start_date: event.event_datetime,
        end_date: event.end_date,
        total_metrics: totalPossibleMetrics,
      },

      // Player information
      player: player,

      // Assessment progress and statistics
      assessment_summary: {
        progress_percentage: progress,
        completed_metrics: completedMetrics,
        total_metrics: totalPossibleMetrics,
        pending_metrics: totalPossibleMetrics - completedMetrics,
        average_score: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
        highest_score: maxScore,
        lowest_score: scores.length > 0 ? minScore : null,
        last_updated: evaluationResults[0]?.updated_at || null,
      },

      // Detailed metric scores
      metric_scores: metricScores,

      // Pending metrics (not yet evaluated)
      pending_metrics: pendingMetrics,

      // Overall assessment status
      status:
        progress === 100
          ? "completed"
          : progress > 0
            ? "in_progress"
            : "not_started",
    };
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
