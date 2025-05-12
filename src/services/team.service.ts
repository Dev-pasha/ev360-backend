import AppDataSource from "../config/database";
import { Group } from "../entities/group.entity";
import { Player } from "../entities/player.entity";
import { TeamPlayer } from "../entities/team-player.entity";
import { Team } from "../entities/team.entity";
import { User } from "../entities/user.entity";
import { DataSource, EntityNotFoundError, In } from "typeorm";

export class TeamService {
  private groupRepository;
  private playerRepository;
  private teamRepository;
  private teamPlayerRepository;
  private userRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.groupRepository = this.dataSource.getRepository(Group);
    this.playerRepository = this.dataSource.getRepository(Player);
    this.teamRepository = this.dataSource.getRepository(Team);
    this.teamPlayerRepository = this.dataSource.getRepository(TeamPlayer);
    this.userRepository = this.dataSource.getRepository(User);
  }

  async createTeam(
    groupId: number,
    teamData: {
      name: string;
      coach_id?: number;
      player_ids?: number[];
    }
  ): Promise<Team> {
    try {
      // Validate group exists
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        throw new EntityNotFoundError(Group, { id: groupId });
      }

      // Validate coach if provided
      let coach = null;
      if (teamData.coach_id) {
        coach = await this.userRepository.findOne({
          where: { id: teamData.coach_id },
        });

        if (!coach) {
          throw new EntityNotFoundError(User, { id: teamData.coach_id });
        }
      }

      // Create the team
      const team = this.teamRepository.create({
        group,
        name: teamData.name,
        coach: coach,
      });

      // Save the team
      const savedTeam = await this.teamRepository.save(team);

      // If there are player IDs, check if they're already on teams
      if (teamData.player_ids && teamData.player_ids.length > 0) {
        const players = await this.playerRepository.find({
          where: {
            id: In(teamData.player_ids),
            group: { id: groupId },
          },
          relations: ["team"], // Load current team relationships
        });

        if (players.length !== teamData.player_ids.length) {
          const foundIds = players.map((p) => p.id);
          const missingIds = teamData.player_ids.filter(
            (id) => !foundIds.includes(id)
          );
          throw new Error(
            `Players not found or don't belong to this group: ${missingIds.join(", ")}`
          );
        }

        // Check if any players are already on other teams
        const playersOnOtherTeams = players.filter((p) => p.team !== null);

        if (playersOnOtherTeams.length > 0) {
          const playerDetails = playersOnOtherTeams.map(
            (p) =>
              `${p.first_name} ${p.last_name} (currently on team: ${p.team!.name})`
          );
          throw new Error(
            `Cannot create team with players already on other teams: ${playerDetails.join(", ")}`
          );
        }

        // All players are free to assign
        await this.dataSource.transaction(
          async (transactionalEntityManager) => {
            const playerRepo = transactionalEntityManager.getRepository(Player);

            for (const player of players) {
              player.team = savedTeam;
              await playerRepo.save(player);
            }
          }
        );
      }

      // Return the team with all relations loaded
      const teamWithRelations = await this.teamRepository.findOne({
        where: { id: savedTeam.id },
        relations: ["group", "players", "coach"],
      });

      if (!teamWithRelations) {
        throw new Error("Team was created but could not be retrieved");
      }

      return teamWithRelations;
    } catch (error) {
      console.error(`Error creating team:`, error);
      throw error;
    }
  }

  async getGroupTeams(
    groupId: number,
    options?: {
      search?: string;
      includeEmpty?: boolean;
      skip?: number;
      take?: number;
      relations?: string[];
    }
  ): Promise<{ teams: Team[]; total: number }> {
    try {
      // Verify group exists
      const groupExists = await this.groupRepository.exist({
        where: { id: groupId },
      });

      if (!groupExists) {
        throw new EntityNotFoundError(Group, { id: groupId });
      }

      // Build query
      const queryBuilder = this.teamRepository
        .createQueryBuilder("team")
        .where("team.groupId = :groupId", { groupId });

      // Add search filter if provided
      if (options?.search) {
        queryBuilder.andWhere("team.name ILIKE :search", {
          search: `%${options.search}%`,
        });
      }

      // Filter out empty teams if requested
      if (options?.includeEmpty === false) {
        queryBuilder.andWhere(
          "EXISTS (SELECT 1 FROM players p WHERE p.teamId = team.id)"
        );
      }

      // Add relations
      const relations = options?.relations || ["players", "group"];
      relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`team.${relation}`, relation);
      });

      // Add sorting
      queryBuilder.orderBy("team.name", "ASC");

      // Add pagination
      if (options?.skip !== undefined) {
        queryBuilder.skip(options.skip);
      }
      if (options?.take !== undefined) {
        queryBuilder.take(options.take);
      }

      // Execute query
      const [teams, total] = await queryBuilder.getManyAndCount();

      return { teams, total };
    } catch (error) {
      console.error(`Error fetching teams for group ${groupId}:`, error);
      throw error;
    }
  }

  async getTeamById(groupId: number, teamId: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: {
        id: teamId,
        group: { id: groupId },
      },
      relations: ["players", "group"],
      order: {
        players: {
          last_name: "ASC",
        },
      },
    });

    if (!team) {
      throw new EntityNotFoundError(Team, { id: teamId, groupId });
    }

    return team;
  }

  async getGroupTeamsWithPlayerCount(groupId: number): Promise<any[]> {
    const query = this.teamRepository
      .createQueryBuilder("team")
      .leftJoin("team.players", "player")
      .select([
        "team.id as id",
        "team.name as name",
        "COUNT(player.id) as playerCount",
      ])
      .where("team.groupId = :groupId", { groupId })
      .groupBy("team.id, team.name")
      .orderBy("team.name", "ASC");

    return query.getRawMany();
  }

  async getTeamWithPlayers(groupId: number, teamId: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: {
        id: teamId,
        group: { id: groupId },
      },
      relations: ["group", "players"],
    });

    if (!team) {
      throw new Error("Team not found");
    }

    return team;
  }

  async deleteTeam(groupId: number, teamId: number): Promise<boolean> {
    try {
      // First verify the team exists and belongs to the group
      const team = await this.teamRepository.findOne({
        where: {
          id: teamId,
          group: { id: groupId },
        },
        relations: ["players"],
      });

      if (!team) {
        throw new EntityNotFoundError(Team, { id: teamId, groupId });
      }

      // Use transaction to ensure atomic deletion
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        const teamRepo = transactionalEntityManager.getRepository(Team);
        const teamPlayerRepo =
          transactionalEntityManager.getRepository(TeamPlayer);

        // Delete all team-player relationships first
        await teamPlayerRepo.delete({ team: { id: teamId } });

        // Then delete the team itself
        await teamRepo.remove(team);
      });

      console.log(`Successfully deleted team ${teamId} from group ${groupId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting team ${teamId}:`, error);
      throw error;
    }
  }

  async addPlayersToTeamBatch(
  groupId: number,
  teamId: number,
  playerIds: number | number[]
): Promise<{ added: number }> {
  try {
    const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];
    
    if (playerIdArray.length === 0) {
      throw new Error("No players specified");
    }

    // Verify team exists
    const teamExists = await this.teamRepository.exist({
      where: { id: teamId, group: { id: groupId } }
    });

    if (!teamExists) {
      throw new EntityNotFoundError(Team, { id: teamId, groupId });
    }

    // Verify players exist and belong to the group
    const validPlayerCount = await this.playerRepository.count({
      where: {
        id: In(playerIdArray),
        group: { id: groupId }
      }
    });

    if (validPlayerCount !== playerIdArray.length) {
      throw new Error("Some players not found or don't belong to this group");
    }

    const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
      // Update players to assign them to the team
      const updateResult = await transactionalEntityManager
        .createQueryBuilder()
        .update(Player)
        .set({ team: { id: teamId } })
        .where("id IN (:...playerIds)", { playerIds: playerIdArray })
        .andWhere("groupId = :groupId", { groupId })
        .execute();
      
      return {
        added: updateResult.affected || 0
      };
    });

    return result;
    
  } catch (error) {
    console.error(`Error batch adding players to team ${teamId}:`, error);
    throw error;
  }
}

  async removePlayersFromTeamBatch(
    groupId: number,
    teamId: number,
    playerIds: number | number[]
  ): Promise<{ removed: number }> {
    try {
      const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];

      if (playerIdArray.length === 0) {
        throw new Error("No players specified");
      }

      // Verify team exists
      const teamExists = await this.teamRepository.exist({
        where: { id: teamId, group: { id: groupId } },
      });

      if (!teamExists) {
        throw new EntityNotFoundError(Team, { id: teamId, groupId });
      }

      const result = await this.dataSource.transaction(
        async (transactionalEntityManager) => {
          // Since we're using direct relationships, update the Player entities
          const updateResult = await transactionalEntityManager
            .createQueryBuilder()
            .update(Player)
            .set({ team: null })
            .where("teamId = :teamId", { teamId })
            .andWhere("id IN (:...playerIds)", { playerIds: playerIdArray })
            .andWhere("groupId = :groupId", { groupId }) // Extra safety check
            .execute();

          return {
            removed: updateResult.affected || 0,
          };
        }
      );

      return result;
    } catch (error) {
      console.error(`Error batch removing players from team ${teamId}:`, error);
      throw error;
    }
  }
  async getTeamPlayers(groupId: number, teamId: number): Promise<Player[]> {
    const teamPlayers = await this.teamPlayerRepository.find({
      where: {
        team: { id: teamId, group: { id: groupId } },
      },
      relations: ["player"],
      order: {
        player: {
          last_name: "ASC",
          first_name: "ASC",
        },
      },
    });

    return teamPlayers.map((tp) => tp.player);
  }

  async movePlayersBetweenTeams(
    groupId: number,
    fromTeamId: number,
    toTeamId: number,
    playerIds: number | number[]
  ): Promise<{ moved: number }> {
    try {
      const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];

      // Get actual team players first
      const actualTeamPlayers = await this.teamPlayerRepository.find({
        where: {
          team: { id: fromTeamId },
          player: { id: In(playerIdArray) },
        },
        relations: ["player"],
      });

      // Extract player IDs that are actually in the source team
      const actualPlayerIds = actualTeamPlayers.map((tp) => tp.player.id);

      if (actualPlayerIds.length === 0) {
        return { moved: 0 };
      }

      // Remove from current team
      await this.removePlayersFromTeamBatch(
        groupId,
        fromTeamId,
        actualPlayerIds
      );

      // Add to new team
      const addResult = await this.addPlayersToTeamBatch(
        groupId,
        toTeamId,
        actualPlayerIds
      );

      return { moved: addResult.added };
    } catch (error) {
      console.error(`Error moving players between teams:`, error);
      throw error;
    }
  }

  async updateTeam(
    groupId: number,
    teamId: number,
    teamData: {
      name?: string;
      description?: string;
      color?: string;
      logo_url?: string;
      coach_id?: number | null; // null to remove, number to assign, undefined to keep unchanged
    }
  ): Promise<Team> {
    try {
      // Verify team exists
      const team = await this.teamRepository.findOne({
        where: { id: teamId, group: { id: groupId } },
        relations: ["coach"], // Load current coach to see current state
      });

      if (!team) {
        throw new EntityNotFoundError(Team, { id: teamId, groupId });
      }

      // Update simple properties
      if (teamData.name !== undefined) team.name = teamData.name;
      if (teamData.description !== undefined)
        team.description = teamData.description;
      if (teamData.color !== undefined) team.color = teamData.color;
      if (teamData.logo_url !== undefined) team.logo_url = teamData.logo_url;

      // Handle coach assignment/deassignment
      if (teamData.coach_id !== undefined) {
        if (teamData.coach_id === null) {
          // Remove coach (deassign)
          team.coach = null;
          console.log(`Removed coach from team ${teamId}`);
        } else {
          // Assign new coach
          // Optional: Validate coach exists
          const coach = await this.userRepository.findOne({
            where: { id: teamData.coach_id },
          });

          if (!coach) {
            throw new EntityNotFoundError(User, {
              id: teamData.coach_id,
              message: "Coach user not found",
            });
          }

          team.coach = coach;
          console.log(`Assigned coach ${teamData.coach_id} to team ${teamId}`);
        }
      }
      // If coach_id is undefined, we don't touch the coach field at all

      // Save the updated team
      const updatedTeam = await this.teamRepository.save(team);

      // Return with all relations loaded
      return this.teamRepository.findOne({
        where: { id: updatedTeam.id },
        relations: ["coach", "group", "players"],
      }) as Promise<Team>;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error);
      throw error;
    }
  }
}
