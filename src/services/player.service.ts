import { GroupTemplateCategory } from "../entities/group-template-category.entity";
import AppDataSource from "../config/database";
import { Position } from "../entities/group-position.entity";
import { Group } from "../entities/group.entity";
import { Category } from "../entities/player-category.entity";
import {
  Foot,
  Gender,
  Hand,
  JerseyColor,
  Player,
} from "../entities/player.entity";
import { Team } from "../entities/team.entity";
import { DataSource, In } from "typeorm";

export class PlayerService {
  private groupRepository;
  private playerRepository;
  private positionRepository;
  private teamRepository;
  private categoryRepository;
  private groupTemplateCategoryRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.groupRepository = this.dataSource.getRepository(Group);
    this.playerRepository = this.dataSource.getRepository(Player);
    this.positionRepository = this.dataSource.getRepository(Position);
    this.teamRepository = this.dataSource.getRepository(Team);
    this.categoryRepository = this.dataSource.getRepository(Category);
    this.groupTemplateCategoryRepository = this.dataSource.getRepository(
      GroupTemplateCategory
    );
  }

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
      primary_position?: number;
      secondary_position?: number;
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
    }
  ): Promise<boolean> {
    // Verify group exists
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new Error("Group not found");
    }

    // player already exists
    const existingPlayer = await this.playerRepository.findOne({
      where: {
        email: playerData.email,
        group: { id: groupId },
      },
    });

    if (existingPlayer) {
      throw new Error("Player already exists");
    }

    console.log('"Player Data: ", playerData);', playerData);

    const PrimaryPostion = await this.positionRepository.findOne({
      where: {
        id: playerData.primary_position,
        group: { id: groupId },
      },
    });

    console.log("Primary Position: ", PrimaryPostion);

    // const player = this.playerRepository.create({
    //   first_name: playerData.first_name,
    //   last_name: playerData.last_name,
    //   number: playerData.number,
    //   jersey_colour: playerData.jersey_colour,
    //   date_of_birth: playerData.date_of_birth
    //     ? new Date(playerData.date_of_birth)
    //     : undefined,
    //   gender: playerData.gender,
    //   headshot: playerData.headshot,
    //   primary_position: PrimaryPostion,
    //   secondary_position: playerData.secondary_position
    //     ? await this.positionRepository.findOne({
    //         where: { id: playerData.secondary_position },
    //       })
    //     : undefined,
    //   height: playerData.height,
    //   weight: playerData.weight,
    //   hand: playerData.hand,
    //   email: playerData.email,
    //   secondary_email: playerData.secondary_email,
    //   foot: playerData.foot,
    //   level: playerData.level,
    //   zone: playerData.zone,
    //   custom_field_1: playerData.custom_field_1,
    //   custom_field_2: playerData.custom_field_2,
    //   custom_field_3: playerData.custom_field_3,
    //   custom_field_4: playerData.custom_field_4,
    //   check_in: playerData.check_in,
    //   archived: playerData.archived,
    //   group: group,
    //   team: playerData.team_id
    //     ? await this.teamRepository.findOne({
    //         where: { id: playerData.team_id },
    //       })
    //     : undefined,
    // } as Player);

    //   if (playerData.playerList && playerData.playerList.length > 0) {
    //   // Fetch the player lists by their IDs
    //   const playerLists = await this.playerListRepository.findByIds(playerData.playerList, {
    //     where: { group: { id: groupId } } // Ensure they belong to the correct group
    //   });

    //   // Check if all player lists were found
    //   if (playerLists.length !== playerData.playerList.length) {
    //     throw new Error("One or more player lists not found");
    //   }

    //   // Assign the player lists to the player
    //   player.player_lists = playerLists;
    // }

    // if (playerData.categories && playerData.categories.length > 0) {
    //   // Fetch the categories by their IDs
    //   const categories = await this.categoryRepository.findBy({
    //     id: In(playerData.categories),
    //     group: { id: groupId },
    //   });

    //   // Check if all categories were found
    //   if (categories.length !== playerData.categories.length) {
    //     throw new Error("One or more categories not found");
    //   }

    //   // Assign the categories to the player
    //   player.categories = categories;
    // }

    // Save the player
    // await this.playerRepository.save(player);
    // return player;

    return true
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
      .where("player.group = :groupId", { groupId });

    if (filters) {
      if (filters.search) {
        query = query.andWhere(
          "(player.first_name ILIKE :search OR player.last_name ILIKE :search OR player.email ILIKE :search)",
          { search: `%${filters.search}%` }
        );
      }

      if (filters.position) {
        query = query.andWhere(
          "(player.primary_position = :position OR player.secondary_position = :position)",
          { position: filters.position }
        );
      }

      if (filters.teamId) {
        query = query
          .innerJoin("player.team_players", "tp")
          .andWhere("tp.team = :teamId", { teamId: filters.teamId });
      }

      if (filters.isArchived !== undefined) {
        query = query.andWhere("player.is_archived = :isArchived", {
          isArchived: filters.isArchived,
        });
      } else {
        // Default to showing non-archived players
        query = query.andWhere("player.is_archived = false");
      }
    } else {
      // Default to showing non-archived players
      query = query.andWhere("player.is_archived = false");
    }

    return query.getMany();
  }

  async getPlayerById(groupId: number, playerId: number): Promise<Player> {
    const player = await this.playerRepository.findOne({
      where: {
        id: playerId,
        group: { id: groupId },
      },
      relations: ["team_players", "team_players.team"],
    });

    if (!player) {
      throw new Error("Player not found");
    }

    return player;
  }

  async updatePlayer(
    groupId: number,
    playerId: number,
    playerData: any
  ): Promise<Player> {
    const player = await this.playerRepository.findOne({
      where: {
        id: playerId,
        group: { id: groupId },
      },
    });

    if (!player) {
      throw new Error("Player not found");
    }

    Object.assign(player, {
      first_name: playerData.first_name,
      last_name: playerData.last_name,
      number: playerData.number,
      jersey_colour: playerData.jersey_colour,
      date_of_birth: playerData.date_of_birth
        ? new Date(playerData.date_of_birth)
        : undefined,
      gender: playerData.gender,
      headshot: playerData.headshot,
      height: playerData.height,
      weight: playerData.weight,
      hand: playerData.hand,
      email: playerData.email,
      secondary_email: playerData.secondary_email,
      foot: playerData.foot,
      level: playerData.level,
      zone: playerData.zone,
      custom_field_1: playerData.custom_field_1,
      custom_field_2: playerData.custom_field_2,
      custom_field_3: playerData.custom_field_3,
      custom_field_4: playerData.custom_field_4,
      check_in: playerData.check_in,
      archived: playerData.archived,
      primary_position: playerData.primary_position
        ? await this.positionRepository.findOne({
            where: { id: playerData.primary_position },
          })
        : undefined,
      secondary_position: playerData.secondary_position
        ? await this.positionRepository.findOne({
            where: { id: playerData.secondary_position },
          })
        : undefined,
      team: playerData.team_id
        ? await this.teamRepository.findOne({
            where: { id: playerData.team_id },
          })
        : undefined,
    });

    if (playerData.categories && playerData.categories.length > 0) {
      // Fetch the categories by their IDs
      const categories = await this.categoryRepository.findBy({
        id: In(playerData.categories),
        group: { id: groupId },
      });

      // Check if all categories were found
      if (categories.length !== playerData.categories.length) {
        throw new Error("One or more categories not found");
      }

      // Assign the categories to the player
      player.categories = categories;
    }

    // if (playerData.playerList && playerData.playerList.length > 0) {
    //   // Fetch the player lists by their IDs
    //   const playerLists = await this.playerListRepository.findByIds(playerData
    //     .playerList,
    //     {
    //       where: { group: { id: groupId } }, // Ensure they belong to the correct group
    //     }
    //   );
    //   // Check if all player lists were found
    //   if (playerLists.length !== playerData.playerList.length) {
    //     throw new Error("One or more player lists not found");
    //   }

    //   // Assign the player lists to the player
    //   player.player_lists = playerLists;
    // }

    await this.playerRepository.save(player);
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
}
