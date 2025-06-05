import { GroupTemplateCategory } from "../entities/group-template-category.entity";
import AppDataSource from "../config/database";
import { Position } from "../entities/group-position.entity";
import { Group } from "../entities/group.entity";
import { Category } from "../entities/player-category.entity";
import { TeamPlayer } from "../entities/team-player.entity";
import {
  Foot,
  Gender,
  Hand,
  JerseyColor,
  Player,
} from "../entities/player.entity";
import { Team } from "../entities/team.entity";
import { DataSource, EntityNotFoundError, In } from "typeorm";
import { User } from "../entities/user.entity";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import authConfig from "../config/auth";
import { PlayerList } from "../entities/player-list.entity";
import { EmailService } from "./email.service";

interface TokenPayload {
  playerId: number;
  groupId: number;
  type: string;
  email?: string;
}

interface PlayerUpdateData {
  first_name?: string;
  last_name?: string;
  number?: number | null;
  jersey_colour?: number | null;
  date_of_birth?: string | Date | null;
  gender?: number | null;
  headshot?: string | null;
  primary_position?: number | null;
  secondary_position?: number | null;
  height?: number | null;
  weight?: number | null;
  hand?: number | null;
  email?: string | null;
  secondary_email?: string | null;
  foot?: number | null;
  level?: string | null;
  zone?: string | null;
  team_id?: number | null;
  categories?: number[];
  player_lists?: number[];
  check_in?: boolean;
  archived?: boolean;
  custom_field_1?: string | null;
  custom_field_2?: string | null;
  custom_field_3?: string | null;
  custom_field_4?: string | null;
}

export class PlayerService {
  private groupRepository;
  private playerRepository;
  private positionRepository;
  private teamRepository;
  private categoryRepository;
  private groupTemplateCategoryRepository;
  private teamPlayerRepository;
  private playerListRepository;
  private userRepository;
  private emailService: EmailService;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.groupRepository = this.dataSource.getRepository(Group);
    this.playerRepository = this.dataSource.getRepository(Player);
    this.positionRepository = this.dataSource.getRepository(Position);
    this.teamRepository = this.dataSource.getRepository(Team);
    this.categoryRepository = this.dataSource.getRepository(Category);
    this.groupTemplateCategoryRepository = this.dataSource.getRepository(
      GroupTemplateCategory
    );
    this.teamPlayerRepository = this.dataSource.getRepository(TeamPlayer);
    this.userRepository = this.dataSource.getRepository(User);
    this.playerListRepository = this.dataSource.getRepository(PlayerList);
    this.emailService = new EmailService();
  }

  // async createPlayer(
  //   groupId: number,
  //   playerData: {
  //     first_name: string;
  //     last_name: string;
  //     number?: number;
  //     jersey_colour?: JerseyColor;
  //     date_of_birth?: string;
  //     gender?: Gender;
  //     groupId: number;
  //     headshot?: string;
  //     primary_position?: number;
  //     secondary_position?: number;
  //     height?: number;
  //     weight?: number;
  //     hand?: Hand;
  //     email?: string;
  //     secondary_email?: string;
  //     foot?: Foot;
  //     level?: string;
  //     zone?: string;
  //     categories?: any[];
  //     team_id?: number;
  //     check_in?: boolean;
  //     archived?: boolean;
  //     custom_field_1?: string;
  //     custom_field_2?: string;
  //     custom_field_3?: string;
  //     custom_field_4?: string;
  //     playerList?: number[];
  //   }
  // ): Promise<Player> {

  //   console.log("Creating player with data: ", playerData);

  //   // Verify group exists
  //   const group = await this.groupRepository.findOne({
  //     where: { id: groupId },
  //   });

  //   if (!group) {
  //     throw new Error("Group not found");
  //   }

  //   // player already exists
  //   const existingPlayer = await this.playerRepository.findOne({
  //     where: {
  //       email: playerData.email,
  //       group: { id: groupId },
  //     },
  //   });

  //   if (existingPlayer) {
  //     throw new Error("Player already exists");
  //   }

  //   console.log('"Player Data: ", playerData);', playerData);

  //   const PrimaryPostion = await this.positionRepository.findOne({
  //     where: {
  //       id: playerData.primary_position,
  //       group: { id: groupId },
  //     },
  //   });

  //   console.log("Primary Position: ", PrimaryPostion);

  //   console.log("categories: ", playerData.categories);

  //   const player = this.playerRepository.create({
  //     first_name: playerData.first_name,
  //     last_name: playerData.last_name,
  //     number: playerData.number,
  //     jersey_colour: playerData.jersey_colour,
  //     date_of_birth: playerData.date_of_birth
  //       ? new Date(playerData.date_of_birth)
  //       : undefined,
  //     gender: playerData.gender,
  //     headshot: playerData.headshot,
  //     primary_position: PrimaryPostion,
  //     secondary_position: playerData.secondary_position
  //       ? await this.positionRepository.findOne({
  //           where: { id: playerData.secondary_position },
  //         })
  //       : undefined,
  //     height: playerData.height,
  //     weight: playerData.weight,
  //     hand: playerData.hand,
  //     email: playerData.email,
  //     secondary_email: playerData.secondary_email,
  //     foot: playerData.foot,
  //     level: playerData.level,
  //     zone: playerData.zone,
  //     custom_field_1: playerData.custom_field_1,
  //     custom_field_2: playerData.custom_field_2,
  //     custom_field_3: playerData.custom_field_3,
  //     custom_field_4: playerData.custom_field_4,
  //     check_in: playerData.check_in,
  //     archived: playerData.archived,
  //     group: group,
  //     team: playerData.team_id
  //       ? await this.teamRepository.findOne({
  //           where: { id: playerData.team_id },
  //         })
  //       : undefined,
  //   } as Player);

  //   if (playerData.playerList && playerData.playerList.length > 0) {
  //     // Fetch the player lists by their IDs
  //     const playerLists = await this.playerListRepository.findBy({
  //       id: In(playerData.playerList),
  //       group: { id: groupId },
  //     });

  //     // Check if all player lists were found
  //     if (playerLists.length !== playerData.playerList.length) {
  //       throw new Error("One or more player lists not found");
  //     }

  //     // Assign the player lists to the player
  //     player.player_lists = playerLists;
  //   }

  //   if (playerData.categories && playerData.categories.length > 0) {
  //     // Assign the categories to the player
  //     player.categories = playerData.categories;
  //   }

  //   // send email to player for login with the token containing the player id and group id
  //   const payload = {
  //     playerId: player.id,
  //     email: player.email,
  //     groupId: groupId,
  //     type: "player-login",
  //   };

  //   const token = jwt.sign(payload, authConfig.jwtSecret, {
  //     expiresIn: Number(authConfig.jwtExpiresIn) || "5h",
  //   });

  //   // send email to player with the token

  //   await this.emailService.sendEmail({
  //     to: player.email,
  //     from: "abdullahkhalid1398@gmail.com",
  //     replyTo: "abdullahkhalid1398@gmail.com",
  //     subject: "Invitation to join group",
  //     html: `
  //           <p>You have been invited to join a group as a Player.</p>
  //           <p>Group: ${group.name}</p>
  //           <p>Please click the following link to complete your registration:</p>
  //           <p><a href="http://localhost:3000/verify-email-player/${token}">Verify Email</a></p>
  //         `,
  //   });

  //   // Save the player
  //   await this.playerRepository.save(player);
  //   return player;
  // }

  async createPlayer(
    groupId: number,
    playerData: {
      first_name: string;
      last_name: string;
      number?: number;
      jersey_colour?: JerseyColor;
      date_of_birth?: string;
      gender?: Gender;
      groupId: number;
      headshot?: string;
      primary_position_id?: number;
      secondary_position_id?: number;
      height?: number;
      weight?: number;
      hand?: Hand;
      email?: string;
      secondary_email?: string;
      foot?: Foot;
      level?: string;
      zone?: string;
      categories?: any[];
      team_id?: number;
      check_in?: boolean;
      archived?: boolean;
      custom_field_1?: string;
      custom_field_2?: string;
      custom_field_3?: string;
      custom_field_4?: string;
      playerList?: number[];
      user_id?: number;
    }
  ): Promise<Player> {
    console.log("=== CREATE PLAYER FUNCTION START ===");
    console.log("GroupId parameter:", groupId);
    console.log("PlayerData received:", playerData);

    // Validate required fields
    if (!playerData.email) {
      console.log("ERROR: No email provided");
      throw new Error("Email is required");
    }

    console.log("Email to check:", playerData.email);

    // Use transaction for data consistency
    return await this.playerRepository.manager.transaction(
      async (transactionalEntityManager) => {
        console.log("=== TRANSACTION STARTED ===");

        try {
          // Get repositories within the transaction
          const groupRepo = transactionalEntityManager.getRepository(Group);
          const playerRepo = transactionalEntityManager.getRepository(Player);
          const positionRepo =
            transactionalEntityManager.getRepository(Position);
          const teamRepo = transactionalEntityManager.getRepository(Team);
          const playerListRepo =
            transactionalEntityManager.getRepository(PlayerList);
          const userRepo = transactionalEntityManager.getRepository(User);

          // Verify group exists
          console.log("=== CHECKING GROUP EXISTS ===");
          const group = await groupRepo.findOne({
            where: { id: groupId },
          });

          console.log(
            "Group found:",
            group ? `Yes - ID: ${group.id}, Name: ${group.name}` : "No"
          );

          if (!group) {
            console.log("ERROR: Group not found with ID:", groupId);
            throw new Error("Group not found");
          }

          // Check if player already exists - check by email globally first, then by group
          console.log("=== CHECKING FOR EXISTING PLAYER ===");
          console.log("Searching for email:", playerData.email);

          // First check if email exists globally
          const globalExistingPlayer = await playerRepo.findOne({
            where: {
              email: playerData.email!.trim().toLowerCase(),
            },
            relations: ["group"],
          });

          if (globalExistingPlayer) {
            console.log("=== PLAYER WITH THIS EMAIL EXISTS GLOBALLY ===");
            console.log("Player ID:", globalExistingPlayer.id);
            console.log(
              "Player Name:",
              globalExistingPlayer.first_name,
              globalExistingPlayer.last_name
            );
            console.log("Player Email:", globalExistingPlayer.email);
            console.log("Player Group ID:", globalExistingPlayer.group?.id);
            console.log("Player Group Name:", globalExistingPlayer.group?.name);

            if (globalExistingPlayer.group?.id === groupId) {
              throw new Error(
                `Player with email ${playerData.email} already exists in group "${globalExistingPlayer.group.name}" (Player ID: ${globalExistingPlayer.id})`
              );
            } else {
              throw new Error(
                `Player with email ${playerData.email} already exists in a different group "${globalExistingPlayer.group?.name}" (Player ID: ${globalExistingPlayer.id}). Use a different email address.`
              );
            }
          }

          console.log("No existing player found with this email");

          console.log("=== VALIDATING JERSEY NUMBER UNIQUENESS ===");
          if (playerData.number) {
            console.log("Checking jersey number:", playerData.number);
            const existingPlayerWithNumber = await playerRepo.findOne({
              where: {
                number: playerData.number,
                group: { id: groupId },
              },
            });

            if (existingPlayerWithNumber) {
              console.log("ERROR: Jersey number already taken");
              throw new Error(
                `Jersey number ${playerData.number} is already taken by another player in this group`
              );
            }
          }

          console.log("=== VALIDATING PRIMARY POSITION ===");
          let primaryPosition = null;
          if (playerData.primary_position_id) {
            console.log(
              "Looking for primary position ID:",
              playerData.primary_position_id
            );
            primaryPosition = await positionRepo.findOne({
              where: {
                id: playerData.primary_position_id,
                group: { id: groupId },
              },
            });
            console.log(
              "Primary position found:",
              primaryPosition ? `Yes - ${primaryPosition.name}` : "No"
            );

            if (!primaryPosition) {
              console.log(
                "ERROR: Primary position not found or doesn't belong to group"
              );
              throw new Error(
                `Primary position with ID ${playerData.primary_position_id} not found in group ${groupId}`
              );
            }
          }

          console.log("=== VALIDATING SECONDARY POSITION ===");
          let secondaryPosition = null;
          if (playerData.secondary_position_id) {
            console.log(
              "Looking for secondary position ID:",
              playerData.secondary_position_id
            );

            secondaryPosition = await positionRepo.findOne({
              where: {
                id: playerData.secondary_position_id,
                group: { id: groupId },
              },
            });
            console.log(
              "Secondary position found:",
              secondaryPosition ? `Yes - ${secondaryPosition.name}` : "No"
            );

            if (!secondaryPosition) {
              console.log(
                "ERROR: Secondary position not found or doesn't belong to group"
              );
              throw new Error(
                `Secondary position with ID ${playerData.secondary_position_id} not found in group ${groupId}`
              );
            }
          }

          console.log("=== VALIDATING TEAM ===");
          let team = null;
          if (playerData.team_id) {
            console.log("Looking for team ID:", playerData.team_id);
            team = await teamRepo.findOne({
              where: {
                id: playerData.team_id,
                group: { id: groupId },
              },
            });
            console.log("Team found:", team ? `Yes - ${team.name}` : "No");

            if (!team) {
              console.log("ERROR: Team not found or doesn't belong to group");
              throw new Error(
                `Team with ID ${playerData.team_id} not found in group ${groupId}`
              );
            }
          }

          console.log("=== VALIDATING USER ===");
          let user = null;
          if (playerData.user_id) {
            console.log("Looking for user ID:", playerData.user_id);
            user = await userRepo.findOne({
              where: {
                id: playerData.user_id,
              },
            });
            console.log(
              "User found:",
              user ? `Yes - ${user.email || user.id}` : "No"
            );

            if (!user) {
              console.log("ERROR: User not found");
              throw new Error(`User with ID ${playerData.user_id} not found`);
            }
          }

          console.log("=== VALIDATING PLAYER LISTS ===");
          let playerLists: PlayerList[] = [];
          if (playerData.playerList && playerData.playerList.length > 0) {
            console.log("Player list IDs:", playerData.playerList);

            playerLists = await playerListRepo.findBy({
              id: In(playerData.playerList),
              group: { id: groupId },
            });

            console.log(
              "Player lists found:",
              playerLists.length,
              "out of",
              playerData.playerList.length
            );

            if (playerLists.length !== playerData.playerList.length) {
              console.log("ERROR: Not all player lists found");
              const foundIds = playerLists.map((pl) => pl.id);
              const missingIds = playerData.playerList.filter(
                (id) => !foundIds.includes(id)
              );
              throw new Error(
                `Player lists not found with IDs: ${missingIds.join(", ")}`
              );
            }
          }

          console.log("=== CREATING PLAYER OBJECT ===");

          // Create player object with explicit relationship handling
          const player = new Player();

          // Set basic fields with proper type handling
          player.first_name = playerData.first_name;
          player.last_name = playerData.last_name;
          player.email = playerData.email!.trim().toLowerCase();
          player.check_in = playerData.check_in || false;
          player.archived = playerData.archived || false;

          // Handle optional fields that can be undefined
          if (playerData.number !== undefined) {
            player.number = playerData.number;
          }

          if (playerData.jersey_colour !== undefined) {
            player.jersey_colour = playerData.jersey_colour;
          }

          if (playerData.date_of_birth) {
            player.date_of_birth = new Date(playerData.date_of_birth);
          }

          if (playerData.gender !== undefined) {
            player.gender = playerData.gender;
          }

          if (playerData.headshot !== undefined) {
            player.headshot = playerData.headshot;
          }

          if (playerData.height !== undefined) {
            player.height = playerData.height;
          }

          if (playerData.weight !== undefined) {
            player.weight = playerData.weight;
          }

          if (playerData.hand !== undefined) {
            player.hand = playerData.hand;
          }

          if (playerData.secondary_email !== undefined) {
            player.secondary_email = playerData.secondary_email;
          }

          if (playerData.foot !== undefined) {
            player.foot = playerData.foot;
          }

          if (playerData.level !== undefined) {
            player.level = playerData.level;
          }

          if (playerData.zone !== undefined) {
            player.zone = playerData.zone;
          }

          if (playerData.custom_field_1 !== undefined) {
            player.custom_field_1 = playerData.custom_field_1;
          }

          if (playerData.custom_field_2 !== undefined) {
            player.custom_field_2 = playerData.custom_field_2;
          }

          if (playerData.custom_field_3 !== undefined) {
            player.custom_field_3 = playerData.custom_field_3;
          }

          if (playerData.custom_field_4 !== undefined) {
            player.custom_field_4 = playerData.custom_field_4;
          }

          // Set relationships
          player.group = group;
          player.primary_position = primaryPosition;
          player.secondary_position = secondaryPosition;
          player.team = team;
          player.user = user;

          console.log("Player object created (before save):", {
            first_name: player.first_name,
            last_name: player.last_name,
            email: player.email,
            group_id: player.group?.id,
            primary_position_id: player.primary_position?.id,
            secondary_position_id: player.secondary_position?.id,
            team_id: player.team?.id,
            user_id: player.user?.id,
          });

          console.log("=== SAVING PLAYER TO DATABASE ===");

          // Save player first without many-to-many relationships
          const savedPlayer = await playerRepo.save(player);
          console.log("Player saved with ID:", savedPlayer.id);

          // Now handle many-to-many relationships separately
          console.log("=== ASSIGNING PLAYER LISTS ===");

          if (playerLists.length > 0) {
            try {
              // Create the junction table entries directly
              await transactionalEntityManager
                .createQueryBuilder()
                .relation(Player, "player_lists")
                .of(savedPlayer.id)
                .add(playerLists.map((pl) => pl.id));

              console.log("Player lists assigned successfully");
            } catch (error) {
              console.error("Failed to assign player lists:", error);
              throw new Error("Failed to assign player lists");
            }
          }

          // Handle categories similarly
          if (playerData.categories && playerData.categories.length > 0) {
            console.log("=== PROCESSING CATEGORIES ===");
            try {
              await transactionalEntityManager
                .createQueryBuilder()
                .relation(Player, "categories")
                .of(savedPlayer.id)
                .add(playerData.categories);

              console.log("Categories assigned successfully");
            } catch (error) {
              console.error("Failed to assign categories:", error);
              throw new Error("Failed to assign categories");
            }
          }

          console.log("=== TRANSACTION COMMITTED ===");

          // Generate token after successful transaction
          console.log("=== GENERATING JWT TOKEN ===");
          const payload = {
            playerId: savedPlayer.id,
            email: savedPlayer.email,
            groupId: groupId,
            type: "player-login",
          };

          const token = jwt.sign(payload, authConfig.jwtSecret, {
            expiresIn: Number(authConfig.jwtExpiresIn) || "5h",
          });

          console.log("Token generated for player ID:", savedPlayer.id);

          // Send email after transaction (non-blocking)
          console.log("=== SENDING EMAIL ===");
          setImmediate(async () => {
            try {
              await this.emailService.sendEmail({
                to: savedPlayer.email || "default@example.com",
                from: "abdullahkhalid1398@gmail.com",
                replyTo: "abdullahkhalid1398@gmail.com",
                subject: "Invitation to join group",
                html: `
              <p>You have been invited to join a group as a Player.</p>
              <p>Group: ${group.name}</p>
              <p>Please click the following link to complete your registration:</p>
              <p><a href="http://localhost:3000/verify-email-player/${token}">Verify Email</a></p>
            `,
              });
              console.log("Email sent successfully to:", savedPlayer.email);
            } catch (emailError) {
              console.log("ERROR: Failed to send email:", emailError);
              // Log error but don't affect the response since player is already created
            }
          });

          console.log("=== CREATE PLAYER FUNCTION END ===");

          // Return the player with all relations loaded
          const finalPlayer = await playerRepo.findOne({
            where: { id: savedPlayer.id },
            relations: [
              "group",
              "primary_position",
              "secondary_position",
              "team",
              "user",
              "player_lists",
              "categories",
            ],
          });

          console.log("Final player:", {
            id: finalPlayer?.id,
            name: `${finalPlayer?.first_name} ${finalPlayer?.last_name}`,
            email: finalPlayer?.email,
            group: group.name,
            player_lists_count: finalPlayer?.player_lists?.length || 0,
            categories_count: finalPlayer?.categories?.length || 0,
          });

          return finalPlayer || savedPlayer;
        } catch (error) {
          console.log("=== ERROR IN TRANSACTION - ROLLING BACK ===");
          console.error("Error details:", error);
          throw error; // This will trigger transaction rollback
        }
      }
    );
  }

  async getGroupPlayers(
    groupId: number,
    filters?: {
      search?: string;
      position?: string;
      teamId?: number;
      isArchived?: boolean;
    }
  ): Promise<Player[]> {
    let query = this.playerRepository
      .createQueryBuilder("player")
      .leftJoinAndSelect("player.primary_position", "primaryPosition")
      .leftJoinAndSelect("player.secondary_position", "secondaryPosition")
      .leftJoinAndSelect("player.team", "team")
      .leftJoinAndSelect("player.categories", "categories") // This should work if relationship is properly defined
      .where("player.groupId = :groupId", { groupId });

    if (filters) {
      if (filters.search) {
        query = query.andWhere(
          "(player.first_name ILIKE :search OR player.last_name ILIKE :search OR player.email ILIKE :search)",
          { search: `%${filters.search}%` }
        );
      }

      if (filters.position) {
        query = query.andWhere(
          "(player.primary_positionId = :positionId OR player.secondary_positionId = :positionId)",
          { positionId: filters.position }
        );
      }

      if (filters.teamId) {
        query = query.andWhere("player.teamId = :teamId", {
          teamId: filters.teamId,
        });
      }

      if (filters.isArchived !== undefined) {
        query = query.andWhere("player.archived = :isArchived", {
          isArchived: filters.isArchived,
        });
      } else {
        query = query.andWhere("player.archived = false");
      }
    } else {
      query = query.andWhere("player.archived = false");
    }

    query = query
      .orderBy("player.last_name", "ASC")
      .addOrderBy("player.first_name", "ASC");

    // Debug the generated SQL
    console.log(query.getSql());

    const players = await query.getMany();

    // Debug the returned data
    console.log(
      "Players with categories:",
      players.map((p) => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        categoryCount: p.categories?.length || 0,
      }))
    );

    return players;
  }

  async updatePlayer(
    groupId: number,
    playerId: number,
    playerData: PlayerUpdateData
  ): Promise<Player> {
    try {
      // Find the player with relations to ensure we don't lose existing data
      const player = await this.playerRepository.findOne({
        where: {
          id: playerId,
          group: { id: groupId },
        },
        relations: ["categories", "player_lists"],
      });

      if (!player) {
        throw new EntityNotFoundError(Player, { id: playerId, groupId });
      }

      // Process all updates in a transaction
      return this.dataSource.transaction(async (transactionalEntityManager) => {
        const playerRepository =
          transactionalEntityManager.getRepository(Player);
        const positionRepository =
          transactionalEntityManager.getRepository(Position);
        const teamRepository = transactionalEntityManager.getRepository(Team);
        const categoryRepository =
          transactionalEntityManager.getRepository(Category);
        // Use playerListRepository only if you're going to use player lists
        // const playerListRepository = transactionalEntityManager.getRepository(PlayerList);

        // Update basic fields using a selective approach (only update what's provided)
        const fieldsToUpdate = [
          "first_name",
          "last_name",
          "number",
          "jersey_colour",
          "gender",
          "headshot",
          "height",
          "weight",
          "hand",
          "email",
          "secondary_email",
          "foot",
          "level",
          "zone",
          "custom_field_1",
          "custom_field_2",
          "custom_field_3",
          "custom_field_4",
          "check_in",
          "archived",
        ] as const;

        fieldsToUpdate.forEach((field) => {
          if (playerData[field] !== undefined) {
            (player as any)[field] = playerData[field];
          }
        });

        // Handle special date field
        if (playerData.date_of_birth !== undefined) {
          player.date_of_birth = playerData.date_of_birth
            ? new Date(playerData.date_of_birth)
            : (null as unknown as Date); // TypeORM handles null as needed
        }

        // Update primary position
        if (playerData.primary_position !== undefined) {
          if (playerData.primary_position === null) {
            // Actually set to null, not to itself
            player.primary_position = null;
          } else {
            const primaryPosition = await positionRepository.findOne({
              where: {
                id: playerData.primary_position,
                group: { id: groupId },
              },
            });

            if (!primaryPosition) {
              throw new EntityNotFoundError(Position, {
                id: playerData.primary_position,
                message: `Primary position not found`,
              });
            }

            player.primary_position = primaryPosition;
          }
        }

        // Update secondary position
        if (playerData.secondary_position !== undefined) {
          if (playerData.secondary_position === null) {
            // Actually set to null, not to itself
            player.secondary_position = null;
          } else {
            const secondaryPosition = await positionRepository.findOne({
              where: {
                id: playerData.secondary_position,
                group: { id: groupId },
              },
            });

            if (!secondaryPosition) {
              throw new EntityNotFoundError(Position, {
                id: playerData.secondary_position,
                message: `Secondary position not found`,
              });
            }

            player.secondary_position = secondaryPosition;
          }
        }

        // Update team
        if (playerData.team_id !== undefined) {
          if (playerData.team_id === null) {
            // Actually set to null, not to itself
            player.team = null;
          } else {
            const team = await teamRepository.findOne({
              where: {
                id: playerData.team_id,
                group: { id: groupId },
              },
            });

            if (!team) {
              throw new EntityNotFoundError(Team, {
                id: playerData.team_id,
                message: `Team not found`,
              });
            }

            player.team = team;
          }
        }

        // Update categories
        if (playerData.categories !== undefined) {
          if (!playerData.categories || playerData.categories.length === 0) {
            player.categories = [];
          } else {
            const categories = await categoryRepository.find({
              where: {
                id: In(playerData.categories),
                group: { id: groupId },
              },
            });

            if (categories.length !== playerData.categories.length) {
              const foundIds = categories.map((c) => c.id);
              const missingIds = playerData.categories.filter(
                (id) => !foundIds.includes(id)
              );
              throw new EntityNotFoundError(Category, {
                ids: missingIds,
                message: `Categories not found: ${missingIds.join(", ")}`,
              });
            }

            player.categories = categories;
          }
        }

        // Player Lists handling is commented out. If you want to handle player lists,
        // uncomment this section and the playerListRepository initialization

        // Save the updated player
        const updatedPlayer = await playerRepository.save(player);

        // Return player with full relations loaded
        // Remove "player_lists" from relations if you're not handling player lists
        return playerRepository.findOne({
          where: { id: updatedPlayer.id },
          relations: [
            "primary_position",
            "secondary_position",
            "team",
            "categories",
            "player_lists", // You may want to remove this if player_lists handling is removed
          ],
        }) as Promise<Player>; // Type assertion since findOne can return undefined
      });
    } catch (error) {
      // Log the error for debugging
      console.error(`Error updating player ${playerId}:`, error);

      // Rethrow with better typing if needed
      if (error instanceof EntityNotFoundError) {
        throw error;
      }

      // Include original error message for better debugging
      throw new Error(`Failed to update player`);
    }
  }

  async getPlayerById(groupId: number, playerId: number): Promise<Player> {
    const player = await this.playerRepository.findOne({
      where: {
        id: playerId,
        group: { id: groupId },
      },
      relations: [
        "primary_position",
        "secondary_position",
        "team",
        "categories",
        "group",
        "player_lists",
      ],
    });

    if (!player) {
      throw new EntityNotFoundError(Player, { id: playerId, groupId });
    }

    return player;
  }

  async deletePlayer(groupId: number, playerId: number): Promise<void> {
    const player = await this.playerRepository.find({
      where: {
        id: playerId,
        group: { id: groupId },
      },
    });

    if (!player) {
      throw new Error("Player not found");
    }

    await this.playerRepository.remove(player);
  }

  async addPlayersToTeam(
    groupId: number,
    playerIds: number | number[],
    teamId: number
  ): Promise<void> {
    // Ensure playerIds is always an array
    const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];

    // Validate inputs
    if (playerIdArray.length === 0) {
      throw new Error("No players specified");
    }

    // Find the team
    const team = await this.teamRepository.findOne({
      where: {
        id: teamId,
        group: { id: groupId },
      },
    });

    if (!team) {
      throw new EntityNotFoundError(Team, { id: teamId, groupId });
    }

    // Find the players
    const players = await this.playerRepository.findBy({
      id: In(playerIdArray),
      group: { id: groupId },
    });

    if (!players || players.length === 0) {
      throw new EntityNotFoundError(Player, { ids: playerIdArray });
    }

    // Check if any requested players weren't found
    if (players.length !== playerIdArray.length) {
      const foundIds = players.map((p) => p.id);
      const missingIds = playerIdArray.filter((id) => !foundIds.includes(id));
      throw new EntityNotFoundError(Player, {
        ids: missingIds,
        message: `Players not found: ${missingIds.join(", ")}`,
      });
    }

    // Use transaction for data integrity
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      // Based on your Player entity structure, we should update the player's team directly
      // rather than using a join table

      // Update each player's team
      for (const player of players) {
        // Skip if player is already in this team
        if (player.team && player.team.id === teamId) {
          continue;
        }

        // Update player's team
        player.team = team;
        await transactionalEntityManager.save(player);
      }
    });
  }

  async removePlayersFromTeam(
    groupId: number,
    playerIds: number | number[],
    teamId: number
  ): Promise<void> {
    // Ensure playerIds is always an array
    const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];

    // Validate inputs
    if (playerIdArray.length === 0) {
      throw new Error("No players specified");
    }

    // Find the team
    const team = await this.teamRepository.findOne({
      where: {
        id: teamId,
        group: { id: groupId },
      },
    });

    if (!team) {
      throw new EntityNotFoundError(Team, { id: teamId, groupId });
    }

    // Find the players
    const players = await this.playerRepository.findBy({
      id: In(playerIdArray),
      team: { id: teamId },
      group: { id: groupId },
    });

    // No players found that are in the team
    if (!players || players.length === 0) {
      throw new Error("No specified players found in this team");
    }

    // Use transaction for data integrity
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      // Update each player to remove team association
      for (const player of players) {
        player.team = null;
        await transactionalEntityManager.save(player);
      }
    });

    return;
  }

  async createPlayerAccount(password: string, token: string): Promise<void> {
    try {
      // Validate and decode token
      let decodedToken: TokenPayload;
      try {
        decodedToken = jwt.verify(token, authConfig.jwtSecret) as TokenPayload;

        // Validate token type
        if (decodedToken.type !== "player-login") {
          throw new Error("Invalid token type");
        }
      } catch (jwtError) {
        throw new Error(`Invalid or expired token`);
      }

      const { playerId, groupId } = decodedToken;

      // Find player with validation
      const player = await this.playerRepository.findOne({
        where: {
          id: playerId,
          group: { id: groupId },
        },
        relations: ["user"], // Important to check if player already has a user
      });

      if (!player) {
        throw new Error("Player not found or belongs to a different group");
      }

      // Check if player already has a user account
      if (player.user) {
        throw new Error("Player already has a user account");
      }

      if (!player.email) {
        throw new Error("Player must have an email to create an account");
      }

      // Validate email in token (if included)
      if (decodedToken.email && decodedToken.email !== player.email) {
        throw new Error("Token email does not match player email");
      }

      // Check if a user with this email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: player.email },
      });

      // Validate password
      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      await this.dataSource.transaction(async (transactionalEntityManager) => {
        const playerRepo = transactionalEntityManager.getRepository(Player);
        const userRepo = transactionalEntityManager.getRepository(User);

        if (existingUser) {
          // Link existing user to player
          player.user = existingUser;
          await playerRepo.save(player);
        } else {
          // Create new user
          const passwordHash = await bcrypt.hash(password, 12);

          const user = userRepo.create({
            email: player.email,
            passwordHash,
            firstName: player.first_name,
            lastName: player.last_name,
            emailVerified: false,
          });

          const savedUser = await userRepo.save(user);

          // Link user to player
          player.user = savedUser;
          await playerRepo.save(player);
        }
      });

      // Optionally: Invalidate the token after use for better security
      // await this.invalidateToken(token);
    } catch (error) {
      // Log the error for debugging
      console.error(`Error creating player account:`, error);

      // Throw with consistent error messaging
      throw new Error(`Failed to create player account`);
    }
  }

  async getPlayersByGroup(groupId: number): Promise<Player[]> {
    try {
      return await this.playerRepository.find({
        where: { group: { id: groupId } },
      });
    } catch (error) {
      throw error;
    }
  }

  async getCategoriesandPositionsByGroup(
    groupId: number
  ): Promise<{ categories: Category[]; positions: Position[] }> {
    try {
      const [categories, positions] = await Promise.all([
        this.categoryRepository.find({
          where: { group: { id: groupId } },
        }),
        this.positionRepository.find({
          where: { group: { id: groupId } },
        }),
      ]);

      return { categories, positions };
    } catch (error) {
      throw error;
    }
  }
}
