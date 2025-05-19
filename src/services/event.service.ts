// src/services/event.service.ts
import { Event, EventType } from "../entities/event.entity";
import {
  EventEvaluator,
  EvaluatorStatus,
} from "../entities/event-evaluator.entity";
import { EvaluationResult } from "../entities/evaluation-result.entity";
import AppDataSource from "../config/database";
import { DataSource, EntityNotFoundError, In } from "typeorm";
import { Group } from "../entities/group.entity";
import { Team } from "../entities/team.entity";
import { Player } from "../entities/player.entity";
import { User } from "../entities/user.entity";
import { GroupTemplateSkill } from "../entities/group-template-skill.entity";
import { GroupTemplateMetric } from "../entities/group-template-metric-score.entity";
import Logger from "../config/logger";

export class EventService {
  private eventRepository;
  private eventEvaluatorRepository;
  private evaluationResultRepository;
  private groupRepository;
  private teamRepository;
  private playerRepository;
  private userRepository;
  private groupTemplateSkillRepository;
  private groupTemplateMetricRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.eventRepository = this.dataSource.getRepository(Event);
    this.eventEvaluatorRepository =
      this.dataSource.getRepository(EventEvaluator);
    this.evaluationResultRepository =
      this.dataSource.getRepository(EvaluationResult);
    this.groupRepository = this.dataSource.getRepository(Group);
    this.teamRepository = this.dataSource.getRepository(Team);
    this.playerRepository = this.dataSource.getRepository(Player);
    this.userRepository = this.dataSource.getRepository(User);
    this.groupTemplateSkillRepository =
      this.dataSource.getRepository(GroupTemplateSkill);
    this.groupTemplateMetricRepository =
      this.dataSource.getRepository(GroupTemplateMetric);
  }

  /**
   * Create a new event
   */
  async createEvent(
    groupId: number,
    eventData: {
      name: string;
      event_type?: EventType;
      event_datetime: Date;
      end_date: Date;
      team_id?: number;
      hide_player_names?: boolean;
      hide_preferred_positions?: boolean;
      send_invites?: boolean;
      skill_ids: number[];
      player_ids: number[];
      evaluator_ids: number[];
    },
    createdBy: any
  ): Promise<Event> {
    try {
      // Validate group
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        throw new EntityNotFoundError(Group, { id: groupId });
      }

      // Validate team if provided
      let team = null;
      if (eventData.team_id) {
        team = await this.teamRepository.findOne({
          where: { id: eventData.team_id, group: { id: groupId } },
        });

        if (!team) {
          throw new EntityNotFoundError(Team, { id: eventData.team_id });
        }
      }

      // Validate skills belong to the group
      const skills = await this.groupTemplateSkillRepository.find({
        where: {
          id: In(eventData.skill_ids),
          category: { groupTemplate: { group: { id: groupId } } },
        },
      });

      if (skills.length !== eventData.skill_ids.length) {
        throw new Error("Some skills not found or don't belong to this group");
      }

      // Validate players belong to the group
      const players = await this.playerRepository.find({
        where: {
          id: In(eventData.player_ids),
          group: { id: groupId },
        },
      });

      if (players.length !== eventData.player_ids.length) {
        throw new Error("Some players not found or don't belong to this group");
      }

      // Validate evaluators
      const evaluators = await this.userRepository.find({
        where: { id: In(eventData.evaluator_ids) },
      });

      if (evaluators.length !== eventData.evaluator_ids.length) {
        throw new Error("Some evaluators not found");
      }

      // Create event in transaction
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Create the event
        const event = transactionalEntityManager.create(Event, {
          name: eventData.name,
          event_type: eventData.event_type || EventType.STANDARD_EVALUATION,
          event_datetime: eventData.event_datetime,
          end_date: eventData.end_date,
          group,
          team,
          hide_player_names: eventData.hide_player_names || false,
          hide_preferred_positions: eventData.hide_preferred_positions || false,
          send_invites: eventData.send_invites !== false,
          is_active: true,
          locked: false,
          created_by: createdBy,
          players,
          skills,
        });

        const savedEvent = await transactionalEntityManager.save(event);

        // Create evaluator assignments
        const eventEvaluators = evaluators.map((evaluator) => {
          return transactionalEntityManager.create(EventEvaluator, {
            event: savedEvent,
            evaluator,
            status: EvaluatorStatus.INVITED,
            invitation_sent_at: eventData.send_invites ? new Date() : undefined,
          });
        });

        await transactionalEntityManager.save(eventEvaluators);

        // TODO: Send invitation emails if send_invites is true

        return savedEvent;
      });
    } catch (error) {
      Logger.error("Error creating event:", error);
      throw error;
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: number,
    eventData: {
      name?: string;
      event_datetime?: Date;
      end_date?: Date;
      hide_player_names?: boolean;
      hide_preferred_positions?: boolean;
      locked?: boolean;
    }
  ): Promise<Event> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      if (event.locked && !eventData.locked) {
        throw new Error("Cannot modify a locked event");
      }

      // Update fields
      Object.assign(event, eventData);

      return this.eventRepository.save(event);
    } catch (error) {
      Logger.error("Error updating event:", error);
      throw error;
    }
  }

  /**
   * Get event by ID with all relations
   */
  async getEventById(eventId: number): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [
        "group",
        "team",
        "players",
        "skills",
        "skills.category",
        "skills.metrics",
        "evaluators",
        "evaluators.evaluator",
        "created_by",
      ],
    });

    if (!event) {
      throw new EntityNotFoundError(Event, { id: eventId });
    }
    const result = {
      ...event,
      created_by: {
        id: event.created_by.id,
        firstName: event.created_by.firstName,
        lastName: event.created_by.lastName,
        email: event.created_by.email,
        emailVerified: event.created_by.emailVerified,
        lastLoginAt: event.created_by.lastLoginAt,
        createdAt: event.created_by.createdAt,
        updatedAt: event.created_by.updatedAt,
        refreshToken: "",
        passwordHash: "",
        userGroupRoles: event.created_by.userGroupRoles || [],
      },
    };

    return result;
  }

  /**
   * Get events for a group
   */
  async getGroupEvents(
    groupId: number,
    filters?: {
      active?: boolean;
      event_type?: EventType;
      team_id?: number;
      start_date?: Date;
      end_date?: Date;
    }
  ): Promise<Event[]> {
    let query = this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.team", "team")
      .leftJoinAndSelect("event.evaluators", "evaluators")
      .leftJoinAndSelect("evaluators.evaluator", "evaluator")
      .leftJoinAndSelect("event.created_by", "created_by")
      .where("event.groupId = :groupId", { groupId }); // Use direct column name

    if (filters) {
      if (filters.active !== undefined) {
        query = query.andWhere("event.is_active = :active", {
          active: filters.active,
        });
      }

      if (filters.event_type !== undefined) {
        query = query.andWhere("event.event_type = :event_type", {
          event_type: filters.event_type,
        });
      }

      if (filters.team_id !== undefined) {
        query = query.andWhere("event.teamId = :team_id", {
          team_id: filters.team_id,
        });
      }

      if (filters.start_date) {
        query = query.andWhere("event.event_datetime >= :start_date", {
          start_date: filters.start_date,
        });
      }

      if (filters.end_date) {
        query = query.andWhere("event.end_date <= :end_date", {
          end_date: filters.end_date,
        });
      }
    }

    query = query.orderBy("event.event_datetime", "DESC");

    return query.getMany();
  }

  /**
   * Add players to an event
   */
  async addPlayersToEvent(
    eventId: number,
    playerIds: number[]
  ): Promise<Event> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ["players", "group"],
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      if (event.locked) {
        throw new Error("Cannot modify a locked event");
      }

      // Validate players belong to the same group
      const players = await this.playerRepository.find({
        where: {
          id: In(playerIds),
          group: { id: event.group.id },
        },
      });

      if (players.length !== playerIds.length) {
        throw new Error("Some players not found or don't belong to this group");
      }

      // Add new players (avoid duplicates)
      const existingPlayerIds = event.players.map((p) => p.id);
      const newPlayers = players.filter(
        (p) => !existingPlayerIds.includes(p.id)
      );

      event.players = [...event.players, ...newPlayers];

      return this.eventRepository.save(event);
    } catch (error) {
      Logger.error("Error adding players to event:", error);
      throw error;
    }
  }

  /**
   * Remove players from an event
   */
  async removePlayersFromEvent(
    eventId: number,
    playerIds: number[]
  ): Promise<Event> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ["players"],
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      if (event.locked) {
        throw new Error("Cannot modify a locked event");
      }

      event.players = event.players.filter((p) => !playerIds.includes(p.id));

      return this.eventRepository.save(event);
    } catch (error) {
      Logger.error("Error removing players from event:", error);
      throw error;
    }
  }

  /**
   * Invite evaluator to an event
   */
  async inviteEvaluator(
    eventId: number,
    evaluatorId: number
  ): Promise<EventEvaluator> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      const evaluator = await this.userRepository.findOne({
        where: { id: evaluatorId },
      });

      if (!evaluator) {
        throw new EntityNotFoundError(User, { id: evaluatorId });
      }

      // Check if already invited
      const existing = await this.eventEvaluatorRepository.findOne({
        where: {
          event: { id: eventId },
          evaluator: { id: evaluatorId },
        },
      });

      if (existing) {
        return existing;
      }

      const eventEvaluator = this.eventEvaluatorRepository.create({
        event,
        evaluator,
        status: EvaluatorStatus.INVITED,
        invitation_sent_at: new Date(),
      });

      // TODO: Send invitation email

      return this.eventEvaluatorRepository.save(eventEvaluator);
    } catch (error) {
      Logger.error("Error inviting evaluator:", error);
      throw error;
    }
  }

  /**
   * Update evaluator status
   */
  async updateEvaluatorStatus(
    eventId: number,
    evaluatorId: number,
    status: EvaluatorStatus
  ): Promise<EventEvaluator> {
    try {
      const eventEvaluator = await this.eventEvaluatorRepository.findOne({
        where: {
          event: { id: eventId },
          evaluator: { id: evaluatorId },
        },
      });

      if (!eventEvaluator) {
        throw new EntityNotFoundError(EventEvaluator, { eventId, evaluatorId });
      }

      eventEvaluator.status = status;

      if (status === EvaluatorStatus.ACCEPTED) {
        eventEvaluator.accepted_at = new Date();
      } else if (status === EvaluatorStatus.COMPLETED) {
        eventEvaluator.completed_at = new Date();
      }

      return this.eventEvaluatorRepository.save(eventEvaluator);
    } catch (error) {
      Logger.error("Error updating evaluator status:", error);
      throw error;
    }
  }

  /**
   * Submit an evaluation
   */
  async submitEvaluation(
    eventId: number,
    evaluatorId: number,
    evaluations: {
      playerId: number;
      metricId: number;
      score?: number;
      comment?: string;
      choice_value?: number;
      attempt_number?: number;
    }[]
  ): Promise<EvaluationResult[]> {
    try {
      // Verify event and evaluator
      const eventEvaluator = await this.eventEvaluatorRepository.findOne({
        where: {
          event: { id: eventId },
          evaluator: { id: evaluatorId },
        },
        relations: ["event", "evaluator"],
      });

      if (!eventEvaluator) {
        throw new Error("Evaluator not assigned to this event");
      }

      if (eventEvaluator.status !== EvaluatorStatus.ACCEPTED) {
        throw new Error("Evaluator has not accepted the invitation");
      }

      return this.dataSource.transaction(async (transactionalEntityManager) => {
        const results = [];

        for (const evaluation of evaluations) {
          // Check if result already exists
          const existing = await transactionalEntityManager.findOne(
            EvaluationResult,
            {
              where: {
                event: { id: eventId },
                player: { id: evaluation.playerId },
                evaluator: { id: evaluatorId },
                metric: { id: evaluation.metricId },
              },
            }
          );

          if (existing) {
            // Update existing result
            existing.score = evaluation.score || existing.score;
            existing.comment = evaluation.comment || existing.comment;
            existing.choice_value =
              evaluation.choice_value || existing.choice_value;
            existing.attempt_number =
              evaluation.attempt_number || existing.attempt_number;

            const updated = await transactionalEntityManager.save(existing);
            results.push(updated);
          } else {
            // Create new result
            const result = transactionalEntityManager.create(EvaluationResult, {
              event: { id: eventId },
              player: { id: evaluation.playerId },
              evaluator: { id: evaluatorId },
              metric: { id: evaluation.metricId },
              score: evaluation.score,
              comment: evaluation.comment,
              choice_value: evaluation.choice_value,
              attempt_number: evaluation.attempt_number,
            });

            const saved = await transactionalEntityManager.save(result);
            results.push(saved);
          }
        }

        // Update evaluator status if all evaluations are complete
        // You might want to add logic here to check if all required evaluations are done
        // eventEvaluator.status = EvaluatorStatus.COMPLETED;
        // eventEvaluator.completed_at = new Date();
        // await transactionalEntityManager.save(eventEvaluator);

        return results;
      });
    } catch (error) {
      Logger.error("Error submitting evaluation:", error);
      throw error;
    }
  }

  /**
   * Get evaluation results for an event
   */
  async getEventResults(
    eventId: number,
    filters?: {
      playerId?: number;
      evaluatorId?: number;
      skillId?: number;
    }
  ): Promise<EvaluationResult[]> {
    let query = this.evaluationResultRepository
      .createQueryBuilder("result")
      .leftJoinAndSelect("result.player", "player")
      .leftJoinAndSelect("result.evaluator", "evaluator")
      .leftJoinAndSelect("result.metric", "metric")
      .leftJoinAndSelect("metric.skill", "skill")
      .where("result.event.id = :eventId", { eventId });

    if (filters) {
      if (filters.playerId) {
        query = query.andWhere("result.player.id = :playerId", {
          playerId: filters.playerId,
        });
      }

      if (filters.evaluatorId) {
        query = query.andWhere("result.evaluator.id = :evaluatorId", {
          evaluatorId: filters.evaluatorId,
        });
      }

      if (filters.skillId) {
        query = query.andWhere("skill.id = :skillId", {
          skillId: filters.skillId,
        });
      }
    }

    return query.getMany();
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: number): Promise<boolean> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      if (event.locked) {
        throw new Error("Cannot delete a locked event");
      }

      await this.eventRepository.remove(event);
      return true;
    } catch (error) {
      Logger.error("Error deleting event:", error);
      throw error;
    }
  }

  /**
   * Lock/unlock an event
   */
  async setEventLocked(eventId: number, locked: boolean): Promise<Event> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      event.locked = locked;

      return this.eventRepository.save(event);
    } catch (error) {
      Logger.error("Error locking/unlocking event:", error);
      throw error;
    }
  }

  /**
   * Get evaluator progress for an event
   */
  async getEvaluatorProgress(eventId: number): Promise<any> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [
        "players",
        "skills",
        "skills.metrics",
        "evaluators",
        "evaluators.evaluator",
      ],
    });

    if (!event) {
      throw new EntityNotFoundError(Event, { id: eventId });
    }

    const totalMetrics = event.skills.reduce(
      (sum, skill) => sum + skill.metrics.length,
      0
    );
    const totalEvaluations = event.players.length * totalMetrics;

    const progress = [];

    for (const eventEvaluator of event.evaluators) {
      const completedCount = await this.evaluationResultRepository.count({
        where: {
          event: { id: eventId },
          evaluator: { id: eventEvaluator.evaluator.id },
        },
      });

      progress.push({
        evaluator: {
          id: eventEvaluator.evaluator.id,
          name: `${eventEvaluator.evaluator.firstName} ${eventEvaluator.evaluator.lastName}`,
          email: eventEvaluator.evaluator.email,
        },
        status: eventEvaluator.status,
        progress: {
          completed: completedCount,
          total: totalEvaluations,
          percentage: (completedCount / totalEvaluations) * 100,
        },
      });
    }

    return progress;
  }

  /**
   * Update event skills
   */
  async updateEventSkills(eventId: number, skillIds: number[]): Promise<Event> {
    try {
      // Find the event
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ["skills", "group"],
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      if (event.locked) {
        throw new Error("Cannot modify skills for a locked event");
      }

      // Validate all skills belong to the group
      const skills = await this.groupTemplateSkillRepository.find({
        where: {
          id: In(skillIds),
          category: { groupTemplate: { group: { id: event.group.id } } },
        },
      });

      if (skills.length !== skillIds.length) {
        const foundIds = skills.map((s) => s.id);
        const missingIds = skillIds.filter((id) => !foundIds.includes(id));
        throw new Error(
          `Skills not found or don't belong to this group: ${missingIds.join(", ")}`
        );
      }

      // Update the skills
      event.skills = skills;

      // Save the updated event
      return this.eventRepository.save(event);
    } catch (error) {
      Logger.error("Error updating event skills:", error);
      throw error;
    }
  }

  /**
   * Sync event evaluators
   */
  async syncEventEvaluators(
    eventId: number,
    evaluatorIds: number[]
  ): Promise<{
    event: Event;
    added: number[];
    removed: number[];
    kept: number[];
  }> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ["evaluators", "evaluators.evaluator"],
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      if (event.locked) {
        throw new Error("Cannot modify evaluators for a locked event");
      }

      // Get current evaluator IDs
      const currentEvaluatorIds = event.evaluators.map((e) => e.evaluator.id);

      // Determine what to add, remove, and keep
      const toAdd = evaluatorIds.filter(
        (id) => !currentEvaluatorIds.includes(id)
      );
      const toRemove = currentEvaluatorIds.filter(
        (id) => !evaluatorIds.includes(id)
      );
      const toKeep = evaluatorIds.filter((id) =>
        currentEvaluatorIds.includes(id)
      );

      // Validate new evaluators exist
      if (toAdd.length > 0) {
        const newEvaluatorUsers = await this.userRepository.find({
          where: { id: In(toAdd) },
        });

        if (newEvaluatorUsers.length !== toAdd.length) {
          const foundIds = newEvaluatorUsers.map((u) => u.id);
          const missingIds = toAdd.filter((id) => !foundIds.includes(id));
          throw new Error(`Users not found: ${missingIds.join(", ")}`);
        }
      }

      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Remove evaluators that are no longer in the list
        if (toRemove.length > 0) {
          await transactionalEntityManager.delete(EventEvaluator, {
            event: { id: eventId },
            evaluator: { id: In(toRemove) },
          });
        }

        // Add new evaluators
        if (toAdd.length > 0) {
          const newEvaluatorUsers = await transactionalEntityManager.find(
            User,
            {
              where: { id: In(toAdd) },
            }
          );

          const newEventEvaluators = newEvaluatorUsers.map((user) => {
            return transactionalEntityManager.create(EventEvaluator, {
              event: { id: eventId },
              evaluator: user,
              status: EvaluatorStatus.INVITED,
              invitation_sent_at: event.send_invites ? new Date() : null,
            });
          });

          await transactionalEntityManager.save(newEventEvaluators);
        }

        // Return updated event
        const updatedEvent = await transactionalEntityManager.findOne(Event, {
          where: { id: eventId },
          relations: ["evaluators", "evaluators.evaluator"],
        });

        return {
          event: updatedEvent!,
          added: toAdd,
          removed: toRemove,
          kept: toKeep,
        };
      });
    } catch (error) {
      Logger.error("Error syncing event evaluators:", error);
      throw error;
    }
  }

  /**
   * Sync event skills
   */
  async syncEventSkills(
    eventId: number,
    skillIds: number[]
  ): Promise<{
    event: Event;
    added: number[];
    removed: number[];
    kept: number[];
    changes: {
      before: number[];
      after: number[];
      total: {
        added: number;
        removed: number;
        kept: number;
      };
    };
  }> {
    try {
      // Fetch event with current skills and group
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ["skills", "group"],
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      if (event.locked) {
        throw new Error("Cannot modify skills for a locked event");
      }

      // Get current skill IDs
      const currentSkillIds = event.skills.map((skill) => skill.id);

      // Determine operations needed
      const toAdd = skillIds.filter((id) => !currentSkillIds.includes(id));
      const toRemove = currentSkillIds.filter((id) => !skillIds.includes(id));
      const toKeep = skillIds.filter((id) => currentSkillIds.includes(id));

      // Validate all requested skills belong to the group
      if (skillIds.length > 0) {
        const validSkills = await this.groupTemplateSkillRepository.find({
          where: {
            id: In(skillIds),
            category: {
              groupTemplate: {
                group: {
                  id: event.group.id,
                },
              },
            },
          },
        });

        if (validSkills.length !== skillIds.length) {
          const foundIds = validSkills.map((s) => s.id);
          const missingIds = skillIds.filter((id) => !foundIds.includes(id));
          throw new Error(
            `Skills not found or don't belong to this group: ${missingIds.join(", ")}`
          );
        }
      }

      // Execute synchronization in a transaction
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        let updatedSkills: GroupTemplateSkill[] = [];

        // If we have any skills to set, fetch them
        if (skillIds.length > 0) {
          updatedSkills = await transactionalEntityManager.find(
            GroupTemplateSkill,
            {
              where: {
                id: In(skillIds),
                category: {
                  groupTemplate: {
                    group: {
                      id: event.group.id,
                    },
                  },
                },
              },
            }
          );
        }

        // Update the skills relationship
        event.skills = updatedSkills;

        // Save the event with updated skills
        const savedEvent = await transactionalEntityManager.save(Event, event);

        // Reload the event with all relations for the response
        const finalEvent = await transactionalEntityManager.findOne(Event, {
          where: { id: eventId },
          relations: ["skills", "group"],
        });

        if (!finalEvent) {
          throw new Error("Failed to reload event after update");
        }

        // Return comprehensive change information
        return {
          event: finalEvent,
          added: toAdd,
          removed: toRemove,
          kept: toKeep,
          changes: {
            before: currentSkillIds,
            after: skillIds,
            total: {
              added: toAdd.length,
              removed: toRemove.length,
              kept: toKeep.length,
            },
          },
        };
      });
    } catch (error) {
      Logger.error("Error synchronizing event skills:", error);
      throw error;
    }
  }
}
