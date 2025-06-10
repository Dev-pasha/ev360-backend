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
import { UserGroupRole } from "../entities/user-group-role.entity";
import { PlayerList } from "../entities/player-list.entity";

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
  private userGroupRoleRepository;
  private playerListRepository;

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
    this.userGroupRoleRepository = this.dataSource.getRepository(UserGroupRole);
    this.playerListRepository = this.dataSource.getRepository(PlayerList);
  }

  /**
   * Create a new event
   */
  // async createEvent(
  //   groupId: number,
  //   eventData: {
  //     name: string;
  //     event_type?: EventType;
  //     event_datetime: Date;
  //     end_date: Date;
  //     team_id?: number;
  //     hide_player_names?: boolean;
  //     hide_preferred_positions?: boolean;
  //     send_invites?: boolean;
  //     skill_ids: number[];
  //     player_ids: number[];
  //     evaluator_ids: number[];
  //   },
  //   createdBy: any
  // ): Promise<Event> {
  //   try {
  //     // Validate group
  //     const group = await this.groupRepository.findOne({
  //       where: { id: groupId },
  //     });

  //     if (!group) {
  //       throw new EntityNotFoundError(Group, { id: groupId });
  //     }

  //     // Validate team if provided
  //     let team = null;
  //     if (eventData.team_id) {
  //       team = await this.teamRepository.findOne({
  //         where: { id: eventData.team_id, group: { id: groupId } },
  //       });

  //       if (!team) {
  //         throw new EntityNotFoundError(Team, { id: eventData.team_id });
  //       }
  //     }

  //     // Validate skills belong to the group
  //     const skills = await this.groupTemplateSkillRepository.find({
  //       where: {
  //         id: In(eventData.skill_ids),
  //         category: { groupTemplate: { group: { id: groupId } } },
  //       },
  //     });

  //     if (skills.length !== eventData.skill_ids.length) {
  //       throw new Error("Some skills not found or don't belong to this group");
  //     }

  //     // Validate players belong to the group
  //     const players = await this.playerRepository.find({
  //       where: {
  //         id: In(eventData.player_ids),
  //         group: { id: groupId },
  //       },
  //     });

  //     if (players.length !== eventData.player_ids.length) {
  //       throw new Error("Some players not found or don't belong to this group");
  //     }

  //     // Validate evaluators
  //     const evaluators = await this.userRepository.find({
  //       where: { id: In(eventData.evaluator_ids) },
  //     });

  //     if (evaluators.length !== eventData.evaluator_ids.length) {
  //       throw new Error("Some evaluators not found");
  //     }

  //     // Create event in transaction
  //     return this.dataSource.transaction(async (transactionalEntityManager) => {
  //       // Create the event
  //       const event = transactionalEntityManager.create(Event, {
  //         name: eventData.name,
  //         event_type: eventData.event_type || EventType.STANDARD_EVALUATION,
  //         event_datetime: eventData.event_datetime,
  //         end_date: eventData.end_date,
  //         group,
  //         team,
  //         hide_player_names: eventData.hide_player_names || false,
  //         hide_preferred_positions: eventData.hide_preferred_positions || false,
  //         send_invites: eventData.send_invites !== false,
  //         is_active: true,
  //         locked: false,
  //         created_by: createdBy,
  //         players,
  //         skills,
  //       });

  //       const savedEvent = await transactionalEntityManager.save(event);

  //       // Create evaluator assignments
  //       const eventEvaluators = evaluators.map((evaluator) => {
  //         return transactionalEntityManager.create(EventEvaluator, {
  //           event: savedEvent,
  //           evaluator,
  //           status: EvaluatorStatus.INVITED,
  //           invitation_sent_at: eventData.send_invites ? new Date() : undefined,
  //         });
  //       });

  //       await transactionalEntityManager.save(eventEvaluators);

  //       // TODO: Send invitation emails if send_invites is true

  //       return savedEvent;
  //     });
  //   } catch (error) {
  //     Logger.error("Error creating event:", error);
  //     throw error;
  //   }
  // }

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
    const eventType = eventData.event_type || EventType.STANDARD_EVALUATION;

    switch (eventType) {
      case 1: // EventType.STANDARD_EVALUATION or similar
        return this.createStandardEvaluationEvent(
          groupId,
          eventData,
          createdBy
        );

      case 2: // EventType.SELF_ASSESSMENT or similar
        return this.createSelfAssessmentEvent(groupId, eventData, createdBy);

      default:
        console.error("❌ [ERROR] Unknown event type:", eventType);
        throw new Error(`Unsupported event type: ${eventType}`);
    }
  }

  /**
   * Update an event
   */

  // async updateEvent(
  //   groupId: number,
  //   eventId: number,
  //   eventData: {
  //     name?: string;
  //     event_type?: EventType;
  //     event_datetime?: Date;
  //     end_date?: Date;
  //     team_id?: number;
  //     hide_player_names?: boolean;
  //     hide_preferred_positions?: boolean;
  //     send_invites?: boolean;
  //     skill_ids?: number[];
  //     player_ids?: number[];
  //     evaluator_ids?: number[];
  //     is_active?: boolean;
  //     locked?: boolean;
  //   },
  //   updatedBy: any
  // ): Promise<Event> {
  //   if (!groupId || isNaN(Number(groupId))) {
  //     throw new Error(`Invalid groupId: ${groupId}. Expected a valid number.`);
  //   }

  //   if (!eventId || isNaN(Number(eventId))) {
  //     throw new Error(`Invalid eventId: ${eventId}. Expected a valid number.`);
  //   }

  //   const numericGroupId = Number(groupId);
  //   const numericEventId = Number(eventId);

  //   try {
  //     // Fetch existing event
  //     const existingEvent = await this.eventRepository.findOne({
  //       where: {
  //         id: numericEventId,
  //         group: { id: numericGroupId },
  //       },
  //       relations: [
  //         "group",
  //         "team",
  //         "players",
  //         "skills",
  //         "evaluators",
  //         "evaluators.evaluator",
  //         "created_by",
  //       ],
  //     });

  //     if (!existingEvent) {
  //       throw new EntityNotFoundError(Event, {
  //         id: numericEventId,
  //         groupId: numericGroupId,
  //       });
  //     }

  //     // Validate team if provided
  //     let team = existingEvent.team;

  //     if (eventData.team_id !== undefined) {
  //       if (eventData.team_id === null) {
  //         team = null;
  //       } else {
  //         team = await this.teamRepository.findOne({
  //           where: { id: eventData.team_id, group: { id: numericGroupId } },
  //         });

  //         if (!team) {
  //           throw new EntityNotFoundError(Team, { id: eventData.team_id });
  //         }
  //       }
  //     }

  //     // Validate skills if provided
  //     let skills = existingEvent.skills;

  //     if (eventData.skill_ids !== undefined) {
  //       if (eventData.skill_ids.length === 0) {
  //         skills = [];
  //       } else {
  //         skills = await this.groupTemplateSkillRepository.find({
  //           where: {
  //             id: In(eventData.skill_ids),
  //             category: { groupTemplate: { group: { id: numericGroupId } } },
  //           },
  //         });

  //         if (skills.length !== eventData.skill_ids.length) {
  //           throw new Error(
  //             "Some skills not found or don't belong to this group"
  //           );
  //         }
  //       }
  //     }

  //     // Validate players if provided
  //     let players = existingEvent.players;

  //     if (eventData.player_ids !== undefined) {
  //       if (eventData.player_ids.length === 0) {
  //         players = [];
  //       } else {
  //         players = await this.playerRepository.find({
  //           where: {
  //             id: In(eventData.player_ids),
  //             group: { id: numericGroupId },
  //           },
  //         });

  //         if (players.length !== eventData.player_ids.length) {
  //           throw new Error(
  //             "Some players not found or don't belong to this group"
  //           );
  //         }
  //       }
  //     }

  //     // Validate evaluators if provided
  //     let newEvaluators: any[] | null = null;
  //     let evaluatorsToRemove: any[] = [];
  //     let evaluatorsToAdd: any[] = [];

  //     if (eventData.evaluator_ids !== undefined) {
  //       if (eventData.evaluator_ids.length === 0) {
  //         evaluatorsToRemove = existingEvent.evaluators || [];
  //         newEvaluators = [];
  //       } else {
  //         newEvaluators = await this.userRepository.find({
  //           where: { id: In(eventData.evaluator_ids) },
  //         });

  //         if (newEvaluators.length !== eventData.evaluator_ids.length) {
  //           throw new Error("Some evaluators not found");
  //         }

  //         const currentEvaluatorIds = new Set(
  //           existingEvent.evaluators?.map((e) => e.evaluator.id) || []
  //         );
  //         const newEvaluatorIds = new Set(eventData.evaluator_ids);

  //         evaluatorsToRemove =
  //           existingEvent.evaluators?.filter(
  //             (e) => !newEvaluatorIds.has(e.evaluator.id)
  //           ) || [];
  //         evaluatorsToAdd = newEvaluators.filter(
  //           (e) => !currentEvaluatorIds.has(e.id)
  //         );
  //       }
  //     }

  //     // Update event in transaction
  //     return this.dataSource.transaction(async (transactionalEntityManager) => {
  //       // Prepare update data - ONLY for scalar fields, NO relationships
  //       const updateData: Partial<Event> = {};

  //       if (eventData.name !== undefined) {
  //         updateData.name = eventData.name;
  //       }

  //       if (eventData.event_type !== undefined) {
  //         updateData.event_type = eventData.event_type;
  //       }

  //       if (eventData.event_datetime !== undefined) {
  //         updateData.event_datetime = eventData.event_datetime;
  //       }

  //       if (eventData.end_date !== undefined) {
  //         updateData.end_date = eventData.end_date;
  //       }

  //       if (eventData.hide_player_names !== undefined) {
  //         updateData.hide_player_names = eventData.hide_player_names;
  //       }

  //       if (eventData.hide_preferred_positions !== undefined) {
  //         updateData.hide_preferred_positions =
  //           eventData.hide_preferred_positions;
  //       }

  //       if (eventData.send_invites !== undefined) {
  //         updateData.send_invites = eventData.send_invites;
  //       }

  //       if (eventData.is_active !== undefined) {
  //         updateData.is_active = eventData.is_active;
  //       }

  //       if (eventData.locked !== undefined) {
  //         updateData.locked = eventData.locked;
  //       }

  //       // Handle team relationship (ManyToOne - can be updated directly)
  //       if (eventData.team_id !== undefined) {
  //         updateData.team = team;
  //       }

  //       updateData.updated_at = new Date();

  //       // Update basic fields
  //       await transactionalEntityManager.update(
  //         Event,
  //         numericEventId,
  //         updateData
  //       );

  //       // Get the event entity for relationship updates
  //       const eventEntity = await transactionalEntityManager.findOne(Event, {
  //         where: { id: numericEventId },
  //         relations: ["players", "skills"],
  //       });

  //       if (!eventEntity) {
  //         throw new Error("Event not found after update");
  //       }

  //       // Update many-to-many relationships using entity methods
  //       let relationshipsUpdated = false;

  //       if (eventData.player_ids !== undefined) {
  //         eventEntity.players = players;
  //         relationshipsUpdated = true;
  //       }

  //       if (eventData.skill_ids !== undefined) {
  //         eventEntity.skills = skills;
  //         relationshipsUpdated = true;
  //       }

  //       // Save entity if relationships were updated
  //       if (relationshipsUpdated) {
  //         await transactionalEntityManager.save(eventEntity);
  //       }

  //       // Handle evaluator changes if needed
  //       if (eventData.evaluator_ids !== undefined) {
  //         // Remove old evaluators
  //         if (evaluatorsToRemove.length > 0) {
  //           await transactionalEntityManager.delete(EventEvaluator, {
  //             id: In(evaluatorsToRemove.map((e) => e.id)),
  //           });
  //         }

  //         // Add new evaluators
  //         if (evaluatorsToAdd.length > 0) {
  //           const newEventEvaluators = evaluatorsToAdd.map((evaluator) => {
  //             return transactionalEntityManager.create(EventEvaluator, {
  //               event: { id: numericEventId } as Event,
  //               evaluator,
  //               status: EvaluatorStatus.INVITED,
  //               invitation_sent_at: eventData.send_invites
  //                 ? new Date()
  //                 : undefined,
  //             });
  //           });

  //           await transactionalEntityManager.save(newEventEvaluators);

  //           // TODO: Send invitation emails to new evaluators if send_invites is true
  //         }
  //       }

  //       // Fetch and return the updated event
  //       const updatedEvent = await transactionalEntityManager.findOne(Event, {
  //         where: { id: numericEventId },
  //         relations: [
  //           "group",
  //           "team",
  //           "players",
  //           "skills",
  //           "evaluators",
  //           "evaluators.evaluator",
  //           "created_by",
  //         ],
  //       });

  //       if (!updatedEvent) {
  //         throw new Error("Failed to fetch updated event");
  //       }

  //       return updatedEvent;
  //     });
  //   } catch (error) {
  //     Logger.error("Error updating event:", error);
  //     throw error;
  //   }
  // }

  async updateEvent(
    groupId: number,
    eventId: number,
    eventData: {
      name?: string;
      event_type?: EventType;
      event_datetime?: Date;
      end_date?: Date;
      team_id?: number;
      hide_player_names?: boolean;
      hide_preferred_positions?: boolean;
      send_invites?: boolean;
      skill_ids?: number[];
      player_ids?: number[];
      evaluator_ids?: number[];
      is_active?: boolean;
      locked?: boolean;
    },
    updatedBy: any
  ): Promise<Event> {
    if (!groupId || isNaN(Number(groupId))) {
      throw new Error(`Invalid groupId: ${groupId}. Expected a valid number.`);
    }

    if (!eventId || isNaN(Number(eventId))) {
      throw new Error(`Invalid eventId: ${eventId}. Expected a valid number.`);
    }

    const numericGroupId = Number(groupId);
    const numericEventId = Number(eventId);

    try {
      // Fetch existing event to determine type
      const existingEvent = await this.eventRepository.findOne({
        where: {
          id: numericEventId,
          group: { id: numericGroupId },
        },
        relations: [
          "group",
          "team",
          "players",
          "skills",
          "metrics",
          "evaluators",
          "evaluators.evaluator",
          "created_by",
        ],
      });

      if (!existingEvent) {
        throw new EntityNotFoundError(Event, {
          id: numericEventId,
          groupId: numericGroupId,
        });
      }

      // Route to appropriate update handler based on event type
      console.log("🔄 [UPDATE ROUTING] Event type:", existingEvent.event_type);

      switch (existingEvent.event_type) {
        case 1:
        case EventType.STANDARD_EVALUATION:
          console.log("🎯 [ROUTE] Routing to Standard Evaluation update flow");
          return this.updateStandardEvaluationEvent(
            numericGroupId,
            numericEventId,
            eventData,
            updatedBy,
            existingEvent
          );

        case 2:
        case EventType.SELF_ASSESSMENT:
          console.log("🎯 [ROUTE] Routing to Self Assessment update flow");
          return this.updateSelfAssessmentEvent(
            numericGroupId,
            numericEventId,
            eventData,
            updatedBy,
            existingEvent
          );

        default:
          console.error(
            "❌ [ERROR] Unknown event type:",
            existingEvent.event_type
          );
          throw new Error(
            `Unsupported event type: ${existingEvent.event_type}`
          );
      }
    } catch (error) {
      Logger.error("Error updating event:", error);
      throw error;
    }
  }

  /**
   * Get event by ID with all relations
   */
  async getEventById(eventId: number, groupId?: number): Promise<Event> {
    Logger.debug(`Fetching event with ID: ${eventId}`);

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new EntityNotFoundError(Group, { id: groupId });
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId, group: { id: groupId } },
      relations: [
        "group",
        "team",
        "players",
        "players.primary_position", // Add this line
        "players.secondary_position",
        "skills",
        "metrics",
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

    // getting player list by playersid
    const eventPlayerIds = event.players.map((p) => p.id);

    const playerLists = await this.playerListRepository.find({
      relations: ["players"], // Make sure to load the players relation
      where: {
        players: {
          id: In(eventPlayerIds),
        },
      },
    });

    // Optional: Filter lists that contain ALL event players (exact match)
    const exactMatchLists = playerLists.filter((list) => {
      const listPlayerIds = list.players.map((p) => p.id);
      return (
        eventPlayerIds.length === listPlayerIds.length &&
        eventPlayerIds.every((id) => listPlayerIds.includes(id))
      );
    });

    const result = {
      ...event,
      exactMatchLists,
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
        subscriptions: event.created_by.subscriptions || [],
        is_account_owner: event.created_by.is_account_owner,
      },
    };

    return result;
  }

  /**
   * Get all events for a group
   */
  async getAllEvents(groupId: number): Promise<Event[]> {
    console.log("🔍 [INPUT] groupId:", groupId, "Type:", typeof groupId);

    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new EntityNotFoundError(Group, { id: groupId });
    }

    const events = await this.eventRepository.find({
      where: { group: { id: groupId } },
      relations: [
        "team",
        "players",
        "skills",
        "metrics",
        "evaluators",
        "created_by",
      ],
    });

    return events;
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
    console.log("🔍 [INPUT] groupId:", groupId, "Type:", typeof groupId);

    let query = this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.team", "team")
      .leftJoinAndSelect("event.evaluators", "evaluators")
      .leftJoinAndSelect("evaluators.evaluator", "evaluator")
      .leftJoinAndSelect("event.players", "players")
      .leftJoinAndSelect("event.skills", "skills")
      .leftJoinAndSelect("event.metrics", "metrics") // ← This should include metrics
      .leftJoinAndSelect("event.group", "group")
      .leftJoin("event.created_by", "created_by")
      .addSelect([
        "created_by.id",
        "created_by.firstName",
        "created_by.lastName",
        "created_by.email",
      ])
      .where("group.id = :groupId", { groupId });

    // if (filters) {
    //   if (filters.active !== undefined) {
    //     query = query.andWhere("event.is_active = :active", {
    //       active: filters.active,
    //     });
    //   }

    //   if (filters.event_type !== undefined) {
    //     query = query.andWhere("event.event_type = :event_type", {
    //       event_type: filters.event_type,
    //     });
    //   }

    //   if (filters.team_id !== undefined) {
    //     query = query.andWhere("event.teamId = :team_id", {
    //       team_id: filters.team_id,
    //     });
    //   }

    //   if (filters.start_date) {
    //     query = query.andWhere("event.event_datetime >= :start_date", {
    //       start_date: filters.start_date,
    //     });
    //   }

    //   if (filters.end_date) {
    //     query = query.andWhere("event.end_date <= :end_date", {
    //       end_date: filters.end_date,
    //     });
    //   }
    // }

    // query = query.orderBy("event.event_datetime", "DESC");

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
      note?: string;
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

      // if (!eventEvaluator) {
      //   throw new Error("Evaluator not assigned to this event");
      // }

      // if (eventEvaluator.status !== EvaluatorStatus.ACCEPTED) {
      //   throw new Error("Evaluator has not accepted the invitation");
      // }

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
            existing.note = evaluation.note || existing.note;

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
              note: evaluation.note,
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


    console.log("🔍 [INPUT] eventId:", eventId, "Type:", typeof eventId);


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

    console.log("🔍 [QUERY] Fetching event results with filters:", 
        
      JSON.stringify(filters, null, 2));
      console.log("🔍 [QUERY] SQL:", query.getSql())
      ;

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

  // list of playerids are passed in to check in players
  async checkInPlayers(
    eventId: number,
    playerIds: number[]
  ): Promise<{
    event: Event;
    checkedInPlayers: number[];
    alreadyCheckedIn: number[];
    notFound: number[];
    summary: {
      total: number;
      successful: number;
      skipped: number;
      failed: number;
    };
  }> {
    try {
      // Input validation
      if (!playerIds || playerIds.length === 0) {
        throw new Error("Player IDs are required");
      }

      // Remove duplicates
      const uniquePlayerIds = [...new Set(playerIds)];

      const event = await this.eventRepository.findOne({
        where: { id: eventId },
        relations: ["players", "group"],
      });

      if (!event) {
        throw new EntityNotFoundError(Event, { id: eventId });
      }

      // if (event.locked) {
      //   throw new Error("Cannot check in players for a locked event");
      // }

      // Check if event is in the past
      // if (new Date(event.event_datetime) < new Date()) {
      //   throw new Error("Cannot check in players for a past event");
      // }

      // Validate players belong to the same group
      const players = await this.playerRepository.find({
        where: {
          id: In(uniquePlayerIds),
          group: { id: event.group.id },
        },
      });

      // Track results
      const foundPlayerIds = players.map((p) => p.id);
      const notFoundPlayerIds = uniquePlayerIds.filter(
        (id) => !foundPlayerIds.includes(id)
      );
      const alreadyCheckedInIds: number[] = [];
      const newlyCheckedInIds: number[] = [];

      // Check in players
      for (const player of players) {
        const isAlreadyCheckedIn = event.players.some(
          (p) => p.id === player.id
        );

        if (isAlreadyCheckedIn) {
          alreadyCheckedInIds.push(player.id);
        } else {
          event.players.push(player);
          newlyCheckedInIds.push(player.id);
        }
      }

      // Save the event with new check-ins
      const savedEvent = await this.eventRepository.save(event);

      // Log the operation
      Logger.info(`Check-in completed for event ${eventId}:`, {
        total: uniquePlayerIds.length,
        newlyCheckedIn: newlyCheckedInIds.length,
        alreadyCheckedIn: alreadyCheckedInIds.length,
        notFound: notFoundPlayerIds.length,
      });

      return {
        event: savedEvent,
        checkedInPlayers: newlyCheckedInIds,
        alreadyCheckedIn: alreadyCheckedInIds,
        notFound: notFoundPlayerIds,
        summary: {
          total: uniquePlayerIds.length,
          successful: newlyCheckedInIds.length,
          skipped: alreadyCheckedInIds.length,
          failed: notFoundPlayerIds.length,
        },
      };
    } catch (error) {
      Logger.error("Error checking in players:", error);
      throw error;
    }
  }

  private async createStandardEvaluationEvent(
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
      // Step 1: Validate group
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        throw new EntityNotFoundError(Group, { id: groupId });
      }

      // Step 2: Validate team if provided
      let team = null;
      if (eventData.team_id) {
        team = await this.teamRepository.findOne({
          where: { id: eventData.team_id, group: { id: groupId } },
        });

        if (!team) {
          throw new EntityNotFoundError(Team, { id: eventData.team_id });
        }
      }

      // Step 3: Validate skills
      const skills = await this.groupTemplateSkillRepository.find({
        where: {
          id: In(eventData.skill_ids),
          category: { groupTemplate: { group: { id: groupId } } },
        },
      });

      if (skills.length !== eventData.skill_ids.length) {
        throw new Error("Some skills not found or don't belong to this group");
      }

      // Step 4: Validate players
      const players = await this.playerRepository.find({
        where: {
          id: In(eventData.player_ids),
          group: { id: groupId },
        },
      });

      if (players.length !== eventData.player_ids.length) {
        throw new Error("Some players not found or don't belong to this group");
      }

      // Step 5: Validate evaluators
      const evaluators = await this.userRepository.find({
        where: { id: In(eventData.evaluator_ids) },
      });

      if (evaluators.length !== eventData.evaluator_ids.length) {
        throw new Error("Some evaluators not found");
      }

      // Step 6: Create event in transaction
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Create the event object
        const eventCreateData = {
          name: eventData.name,
          event_type: eventData.event_type || EventType.STANDARD_EVALUATION,
          event_datetime: eventData.event_datetime,
          end_date: eventData.end_date,
          group,
          team,
          hide_player_names: eventData.hide_player_names,
          hide_preferred_positions: !eventData.hide_preferred_positions,
          send_invites: eventData.send_invites !== false,
          is_active: true,
          locked: false,
          created_by: createdBy,
          players,
          skills,
        };

        const event = transactionalEntityManager.create(Event, eventCreateData);
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
      Logger.error("Error creating standard evaluation event:", error);
      throw error;
    }
  }

  private async createSelfAssessmentEvent(
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

      // Get all evaluators in the group
      const userGroupRoles = await this.userGroupRoleRepository.find({
        where: { group: { id: groupId } },
        relations: ["user", "role"],
      });

      const evaluatorUsers = userGroupRoles
        .filter((userGroupRole) => userGroupRole.role.name === "Evaluator")
        .map((userGroupRole) => userGroupRole.user);

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

      // Validate metrics
      const metrics = await this.groupTemplateMetricRepository.find({
        where: {
          id: In(eventData.skill_ids),
        },
      });

      if (metrics.length !== eventData.skill_ids.length) {
        throw new Error("Some metrics not found");
      }

      // Validate players
      const players = await this.playerRepository.find({
        where: {
          id: In(eventData.player_ids),
          group: { id: groupId },
        },
      });

      if (players.length !== eventData.player_ids.length) {
        throw new Error("Some players not found or don't belong to this group");
      }

      // Create event in transaction
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        const eventCreateData = {
          name: eventData.name,
          event_type: eventData.event_type || EventType.SELF_ASSESSMENT,
          event_datetime: eventData.event_datetime,
          end_date: eventData.end_date,
          group,
          team,
          hide_player_names: false,
          hide_preferred_positions: false,
          send_invites: true,
          is_active: true,
          locked: false,
          created_by: createdBy,
          players,
          metrics,
        };

        const event = transactionalEntityManager.create(Event, eventCreateData);
        const savedEvent = await transactionalEntityManager.save(event);

        // Create evaluator assignments for all evaluators in the group
        const eventEvaluators = evaluatorUsers.map((evaluator) => {
          return transactionalEntityManager.create(EventEvaluator, {
            event: savedEvent,
            evaluator,
            status: EvaluatorStatus.INVITED,
            invitation_sent_at: eventData.send_invites ? new Date() : undefined,
          });
        });

        await transactionalEntityManager.save(eventEvaluators);

        return savedEvent;
      });
    } catch (error) {
      Logger.error("Error creating self-assessment event:", error);
      throw error;
    }
  }

  private async updateStandardEvaluationEvent(
    groupId: number,
    eventId: number,
    eventData: {
      name?: string;
      event_type?: EventType;
      event_datetime?: Date;
      end_date?: Date;
      team_id?: number;
      hide_player_names?: boolean;
      hide_preferred_positions?: boolean;
      send_invites?: boolean;
      skill_ids?: number[];
      player_ids?: number[];
      evaluator_ids?: number[];
      is_active?: boolean;
      locked?: boolean;
    },
    updatedBy: any,
    existingEvent: Event
  ): Promise<Event> {
    try {
      // Validate team if provided
      let team = existingEvent.team;
      if (eventData.team_id !== undefined) {
        if (eventData.team_id === null) {
          team = null;
        } else {
          team = await this.teamRepository.findOne({
            where: { id: eventData.team_id, group: { id: groupId } },
          });

          if (!team) {
            throw new EntityNotFoundError(Team, { id: eventData.team_id });
          }
        }
      }

      // Validate skills if provided
      let skills = existingEvent.skills;
      if (eventData.skill_ids !== undefined) {
        if (eventData.skill_ids.length === 0) {
          skills = [];
        } else {
          skills = await this.groupTemplateSkillRepository.find({
            where: {
              id: In(eventData.skill_ids),
              category: { groupTemplate: { group: { id: groupId } } },
            },
          });

          if (skills.length !== eventData.skill_ids.length) {
            throw new Error(
              "Some skills not found or don't belong to this group"
            );
          }
        }
      }

      // Validate players if provided
      let players = existingEvent.players;
      if (eventData.player_ids !== undefined) {
        if (eventData.player_ids.length === 0) {
          players = [];
        } else {
          players = await this.playerRepository.find({
            where: {
              id: In(eventData.player_ids),
              group: { id: groupId },
            },
          });

          if (players.length !== eventData.player_ids.length) {
            throw new Error(
              "Some players not found or don't belong to this group"
            );
          }
        }
      }

      // Validate evaluators if provided
      let newEvaluators: any[] | null = null;
      let evaluatorsToRemove: any[] = [];
      let evaluatorsToAdd: any[] = [];

      if (eventData.evaluator_ids !== undefined) {
        if (eventData.evaluator_ids.length === 0) {
          evaluatorsToRemove = existingEvent.evaluators || [];
          newEvaluators = [];
        } else {
          newEvaluators = await this.userRepository.find({
            where: { id: In(eventData.evaluator_ids) },
          });

          if (newEvaluators.length !== eventData.evaluator_ids.length) {
            throw new Error("Some evaluators not found");
          }

          const currentEvaluatorIds = new Set(
            existingEvent.evaluators?.map((e) => e.evaluator.id) || []
          );
          const newEvaluatorIds = new Set(eventData.evaluator_ids);

          evaluatorsToRemove =
            existingEvent.evaluators?.filter(
              (e) => !newEvaluatorIds.has(e.evaluator.id)
            ) || [];
          evaluatorsToAdd = newEvaluators.filter(
            (e) => !currentEvaluatorIds.has(e.id)
          );
        }
      }

      // Update event in transaction
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Update basic fields
        const updateData: Partial<Event> = this.buildUpdateData(
          eventData,
          team
        );
        await transactionalEntityManager.update(Event, eventId, updateData);

        // Get the event entity for relationship updates
        const eventEntity = await transactionalEntityManager.findOne(Event, {
          where: { id: eventId },
          relations: ["players", "skills"],
        });

        if (!eventEntity) {
          throw new Error("Event not found after update");
        }

        // Update relationships
        let relationshipsUpdated = false;

        if (eventData.player_ids !== undefined) {
          eventEntity.players = players;
          relationshipsUpdated = true;
        }

        if (eventData.skill_ids !== undefined) {
          eventEntity.skills = skills;
          relationshipsUpdated = true;
        }

        if (relationshipsUpdated) {
          await transactionalEntityManager.save(eventEntity);
        }

        // Handle evaluator changes
        await this.handleEvaluatorChanges(
          transactionalEntityManager,
          eventId,
          eventData,
          evaluatorsToRemove,
          evaluatorsToAdd
        );

        // Fetch and return updated event
        return this.fetchUpdatedEvent(transactionalEntityManager, eventId);
      });
    } catch (error) {
      Logger.error("Error updating standard evaluation event:", error);
      throw error;
    }
  }

  private async updateSelfAssessmentEvent(
    groupId: number,
    eventId: number,
    eventData: {
      name?: string;
      event_type?: EventType;
      event_datetime?: Date;
      end_date?: Date;
      team_id?: number;
      hide_player_names?: boolean;
      hide_preferred_positions?: boolean;
      send_invites?: boolean;
      skill_ids?: number[];
      player_ids?: number[];
      evaluator_ids?: number[];
      is_active?: boolean;
      locked?: boolean;
    },
    updatedBy: any,
    existingEvent: Event
  ): Promise<Event> {
    try {
      // Validate team if provided
      let team = existingEvent.team;
      if (eventData.team_id !== undefined) {
        if (eventData.team_id === null) {
          team = null;
        } else {
          team = await this.teamRepository.findOne({
            where: { id: eventData.team_id, group: { id: groupId } },
          });

          if (!team) {
            throw new EntityNotFoundError(Team, { id: eventData.team_id });
          }
        }
      }

      // Validate metrics if provided (self-assessment uses metrics, not skills)
      let metrics = existingEvent.metrics;
      if (eventData.skill_ids !== undefined) {
        if (eventData.skill_ids.length === 0) {
          metrics = [];
        } else {
          metrics = await this.groupTemplateMetricRepository.find({
            where: {
              id: In(eventData.skill_ids),
            },
          });

          if (metrics.length !== eventData.skill_ids.length) {
            throw new Error("Some metrics not found");
          }
        }
      }

      // Validate players if provided
      let players = existingEvent.players;
      if (eventData.player_ids !== undefined) {
        if (eventData.player_ids.length === 0) {
          players = [];
        } else {
          players = await this.playerRepository.find({
            where: {
              id: In(eventData.player_ids),
              group: { id: groupId },
            },
          });

          if (players.length !== eventData.player_ids.length) {
            throw new Error(
              "Some players not found or don't belong to this group"
            );
          }
        }
      }

      // For self-assessment, always get all evaluators in the group (ignore evaluator_ids from request)
      const userGroupRoles = await this.userGroupRoleRepository.find({
        where: { group: { id: groupId } },
        relations: ["user", "role"],
      });

      const allGroupEvaluators = userGroupRoles
        .filter((userGroupRole) => userGroupRole.role.name === "Evaluator")
        .map((userGroupRole) => userGroupRole.user);

      // Determine evaluator changes
      const currentEvaluatorIds = new Set(
        existingEvent.evaluators?.map((e) => e.evaluator.id) || []
      );
      const newEvaluatorIds = new Set(allGroupEvaluators.map((e) => e.id));

      const evaluatorsToRemove =
        existingEvent.evaluators?.filter(
          (e) => !newEvaluatorIds.has(e.evaluator.id)
        ) || [];

      const evaluatorsToAdd = allGroupEvaluators.filter(
        (e) => !currentEvaluatorIds.has(e.id)
      );

      // Update event in transaction
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        // Update basic fields (force self-assessment specific values)
        const updateData: Partial<Event> = this.buildUpdateData(
          eventData,
          team
        );
        // Override for self-assessment specifics
        updateData.hide_player_names = false;
        updateData.hide_preferred_positions = false;
        updateData.send_invites = true;

        await transactionalEntityManager.update(Event, eventId, updateData);

        // Get the event entity for relationship updates
        const eventEntity = await transactionalEntityManager.findOne(Event, {
          where: { id: eventId },
          relations: ["players", "metrics"],
        });

        if (!eventEntity) {
          throw new Error("Event not found after update");
        }

        // Update relationships
        let relationshipsUpdated = false;

        if (eventData.player_ids !== undefined) {
          eventEntity.players = players;
          relationshipsUpdated = true;
        }

        if (eventData.skill_ids !== undefined) {
          eventEntity.metrics = metrics;
          relationshipsUpdated = true;
        }

        if (relationshipsUpdated) {
          await transactionalEntityManager.save(eventEntity);
        }

        // Handle evaluator changes (always sync with all group evaluators)
        await this.handleEvaluatorChanges(
          transactionalEntityManager,
          eventId,
          { send_invites: true }, // Always send invites for self-assessment
          evaluatorsToRemove,
          evaluatorsToAdd
        );

        // Fetch and return updated event
        return this.fetchUpdatedEvent(transactionalEntityManager, eventId);
      });
    } catch (error) {
      Logger.error("Error updating self-assessment event:", error);
      throw error;
    }
  }

  /**
   * Helper method to build update data for basic fields
   */
  private buildUpdateData(eventData: any, team: any): Partial<Event> {
    const updateData: Partial<Event> = {};

    if (eventData.name !== undefined) updateData.name = eventData.name;
    if (eventData.event_type !== undefined)
      updateData.event_type = eventData.event_type;
    if (eventData.event_datetime !== undefined)
      updateData.event_datetime = eventData.event_datetime;
    if (eventData.end_date !== undefined)
      updateData.end_date = eventData.end_date;
    if (eventData.hide_player_names !== undefined)
      updateData.hide_player_names = eventData.hide_player_names;
    if (eventData.hide_preferred_positions !== undefined)
      updateData.hide_preferred_positions = eventData.hide_preferred_positions;
    if (eventData.send_invites !== undefined)
      updateData.send_invites = eventData.send_invites;
    if (eventData.is_active !== undefined)
      updateData.is_active = eventData.is_active;
    if (eventData.locked !== undefined) updateData.locked = eventData.locked;
    if (eventData.team_id !== undefined) updateData.team = team;

    updateData.updated_at = new Date();

    return updateData;
  }

  /**
   * Helper method to handle evaluator changes
   */
  private async handleEvaluatorChanges(
    transactionalEntityManager: any,
    eventId: number,
    eventData: any,
    evaluatorsToRemove: any[],
    evaluatorsToAdd: any[]
  ): Promise<void> {
    // Remove old evaluators
    if (evaluatorsToRemove.length > 0) {
      await transactionalEntityManager.delete(EventEvaluator, {
        id: In(evaluatorsToRemove.map((e) => e.id)),
      });
    }

    // Add new evaluators
    if (evaluatorsToAdd.length > 0) {
      const newEventEvaluators = evaluatorsToAdd.map((evaluator) => {
        return transactionalEntityManager.create(EventEvaluator, {
          event: { id: eventId } as Event,
          evaluator,
          status: EvaluatorStatus.INVITED,
          invitation_sent_at: eventData.send_invites ? new Date() : undefined,
        });
      });

      await transactionalEntityManager.save(newEventEvaluators);
    }
  }

  /**
   * Helper method to fetch updated event
   */
  private async fetchUpdatedEvent(
    transactionalEntityManager: any,
    eventId: number
  ): Promise<Event> {
    const updatedEvent = await transactionalEntityManager.findOne(Event, {
      where: { id: eventId },
      relations: [
        "group",
        "team",
        "players",
        "skills",
        "metrics",
        "evaluators",
        "evaluators.evaluator",
        "created_by",
      ],
    });

    if (!updatedEvent) {
      throw new Error("Failed to fetch updated event");
    }

    return updatedEvent;
  }
}
