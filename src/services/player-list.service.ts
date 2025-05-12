import { PlayerList } from "../entities/player-list.entity";
import AppDataSource from "../config/database";
import { Group } from "../entities/group.entity";
import { Player } from "../entities/player.entity";
import { DataSource, EntityNotFoundError, In, Not } from "typeorm";

export class PlayerListService {
  private playerRepository;
  private groupRepository;
  private playerListRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.playerRepository = this.dataSource.getRepository(Player);
    this.groupRepository = this.dataSource.getRepository(Group);
    this.playerListRepository = this.dataSource.getRepository(PlayerList);
  }

  /**
   * Create a new player list
   * @param groupId - The group ID
   * @param name - The list name
   * @returns The created player list
   */
  async createPlayerList(
    groupId: number,
    listData: { name: string }
  ): Promise<PlayerList> {
    try {
      // Verify group exists
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        throw new EntityNotFoundError(Group, { id: groupId });
      }

      // Check if list with same name already exists
      const existingList = await this.playerListRepository.findOne({
        where: {
          name: listData.name,
          group: { id: groupId },
        },
      });

      if (existingList) {
        throw new Error(
          `Player list with name "${listData.name}" already exists in this group`
        );
      }

      // Create new player list
      const playerList = this.playerListRepository.create({
        name: listData.name,
        group,
      });

      const savedList = await this.playerListRepository.save(playerList);

      return savedList;
    } catch (error) {
      console.error("Error creating player list:", error);
      throw error;
    }
  }

  /**
   * Update a player list
   * @param groupId - The group ID
   * @param listId - The list ID
   * @param listData - The data to update (name)
   * @returns The updated player list
   */
  async updatePlayerList(
    groupId: number,
    listId: number,
    listData: { name?: string }
  ): Promise<PlayerList> {
    try {
      // Find the player list
      const playerList = await this.playerListRepository.findOne({
        where: {
          id: listId,
          group: { id: groupId },
        },
      });

      if (!playerList) {
        throw new EntityNotFoundError(PlayerList, { id: listId, groupId });
      }

      // Update name if provided
      if (listData.name !== undefined) {
        // Check if another list with same name exists
        const existingList = await this.playerListRepository.findOne({
          where: {
            name: listData.name,
            group: { id: groupId },
            id: Not(listId), // Exclude current list
          },
        });

        if (existingList) {
          throw new Error(
            `Player list with name "${listData.name}" already exists in this group`
          );
        }

        playerList.name = listData.name;
      }

      const updatedList = await this.playerListRepository.save(playerList);

      return updatedList;
    } catch (error) {
      console.error("Error updating player list:", error);
      throw error;
    }
  }

  /**
   * Get all player lists for a group
   * @param groupId - The group ID
   * @returns Array of player lists
   */
  async getPlayerLists(groupId: number): Promise<PlayerList[]> {
    try {
      return await this.playerListRepository.find({
        where: { group: { id: groupId } },
        order: { name: "ASC" },
        relations: ["players"],
      });
    } catch (error) {
      console.error("Error fetching player lists:", error);
      throw error;
    }
  }

  /**
   * Get a single player list with players
   * @param groupId - The group ID
   * @param listId - The list ID
   * @returns The player list with players
   */
  async getPlayerListById(
    groupId: number,
    listId: number
  ): Promise<PlayerList> {
    try {
      const playerList = await this.playerListRepository.findOne({
        where: {
          id: listId,
          group: { id: groupId },
        },
        relations: ["players", "group"],
      });

      if (!playerList) {
        throw new EntityNotFoundError(PlayerList, { id: listId, groupId });
      }

      return playerList;
    } catch (error) {
      console.error("Error fetching player list:", error);
      throw error;
    }
  }

  /**
   * Delete a player list
   * @param groupId - The group ID
   * @param listId - The list ID
   * @returns void
   */
  async deletePlayerList(groupId: number, listId: number): Promise<boolean> {
    try {
      const playerList = await this.playerListRepository.findOne({
        where: {
          id: listId,
          group: { id: groupId },
        },
      });

      if (!playerList) {
        throw new EntityNotFoundError(PlayerList, { id: listId, groupId });
      }

      await this.playerListRepository.remove(playerList);

      return true;
    } catch (error) {
      console.error("Error deleting player list:", error);
      throw error;
    }
  }

  /**
   * Add players to a player list
   * @param groupId - The group ID
   * @param listId - The list ID
   * @param playerIds - Single player ID or array of player IDs
   * @returns Updated player list
   */
  async addPlayersToList(
    groupId: number,
    listId: number,
    playerIds: number | number[]
  ): Promise<{ added: number; skipped: number; errors: string[] }> {
    try {
      const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];

      if (playerIdArray.length === 0) {
        throw new Error("No players specified");
      }

      // Find the player list
      const playerList = await this.playerListRepository.findOne({
        where: {
          id: listId,
          group: { id: groupId },
        },
        relations: ["players"],
      });

      if (!playerList) {
        throw new EntityNotFoundError(PlayerList, { id: listId, groupId });
      }

      // Find players in the same group
      const players = await this.playerRepository.find({
        where: {
          id: In(playerIdArray),
          group: { id: groupId },
        },
      });


      // Check for missing players
      const foundIds = players.map((p) => p.id);
      const missingIds = playerIdArray.filter((id) => !foundIds.includes(id));

      // Check which players are already in the list
      const existingIds = playerList.players.map((p) => p.id);
      const playersToAdd = players.filter((p) => !existingIds.includes(p.id));

      // Add new players
      playerList.players = [...playerList.players, ...playersToAdd];
      await this.playerListRepository.save(playerList);

      return {
        added: playersToAdd.length,
        skipped: players.length - playersToAdd.length,
        errors: missingIds.map((id) => `Player ${id} not found in group`),
      };
    } catch (error) {
      console.error("Error adding players to list:", error);
      throw error;
    }
  }

  /**
   * Remove players from a player list
   * @param groupId - The group ID
   * @param listId - The list ID
   * @param playerIds - Single player ID or array of player IDs
   * @returns Updated player list
   */
  async removePlayersFromList(
    groupId: number,
    listId: number,
    playerIds: number | number[]
  ): Promise<{ removed: number; notInList: number }> {
    try {
      const playerIdArray = Array.isArray(playerIds) ? playerIds : [playerIds];

      if (playerIdArray.length === 0) {
        throw new Error("No players specified");
      }

      // Find the player list
      const playerList = await this.playerListRepository.findOne({
        where: {
          id: listId,
          group: { id: groupId },
        },
        relations: ["players"],
      });

      if (!playerList) {
        throw new EntityNotFoundError(PlayerList, { id: listId, groupId });
      }

      // Count how many players are actually in the list
      const existingIds = playerList.players.map((p) => p.id);
      const playersToRemove = playerIdArray.filter((id) =>
        existingIds.includes(id)
      );
      const notInList = playerIdArray.filter((id) => !existingIds.includes(id));

      // Remove players
      playerList.players = playerList.players.filter(
        (player) => !playerIdArray.includes(player.id)
      );

      await this.playerListRepository.save(playerList);

      return {
        removed: playersToRemove.length,
        notInList: notInList.length,
      };
    } catch (error) {
      console.error("Error removing players from list:", error);
      throw error;
    }
  }

  /**
   * Get player lists containing a specific player
   * @param groupId - The group ID
   * @param playerId - The player ID
   * @returns Array of player lists
   */
  async getPlayerListsByPlayer(
    groupId: number,
    playerId: number
  ): Promise<PlayerList[]> {
    try {
      const lists = await this.playerListRepository
        .createQueryBuilder("list")
        .innerJoin("list.players", "player")
        .where("list.groupId = :groupId", { groupId })
        .andWhere("player.id = :playerId", { playerId })
        .orderBy("list.name", "ASC")
        .getMany();

      return lists;
    } catch (error) {
      console.error("Error fetching player lists by player:", error);
      throw error;
    }
  }
}
