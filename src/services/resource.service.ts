import { EntityManager, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Resource, ResourceType } from "../entities/resource.entity";
import {
  ResourceVisibility,
  ScoreComparison,
} from "../entities/resource-visibility.entity";
import Logger from "../config/logger";

export interface ResourceVisibilityInput {
  all_players: boolean;
  player_list_id?: number | null;
  team_id?: number | null;
  metric_id?: number | null;
  skill_id?: number | null;
  score_criteria?: number | null;
  score_comparison?: string | null;
  player_list_ids?: number[] | null; // For multiple player lists
}

export interface ResourceInput {
  name: string;
  description?: string;
  link: string;
  type: number;
  visibilities: ResourceVisibilityInput[];
}

export class ResourceService {
  private resourceRepository: Repository<Resource>;
  private visibilityRepository: Repository<ResourceVisibility>;

  constructor() {
    this.resourceRepository = AppDataSource.getRepository(Resource);
    this.visibilityRepository = AppDataSource.getRepository(ResourceVisibility);
  }

  async createResource(
    groupId: number,
    resourceData: ResourceInput
  ): Promise<Resource> {
    Logger.debug(`Creating resource for group ${groupId}`, resourceData);

    // Validate visibility rules before transaction
    this.validateVisibilityRules(resourceData.visibilities);

    return this.resourceRepository.manager.transaction(
      async (transactionalEntityManager) => {
        try {
          // Create and save the resource
          const resource = transactionalEntityManager.create(Resource, {
            name: resourceData.name,
            description: resourceData.description || "",
            link: resourceData.link,
            type: resourceData.type,
            group: { id: groupId },
          });

          const savedResource = await transactionalEntityManager.save(resource);
          Logger.debug(`Resource saved with ID: ${savedResource.id}`);

          // Create and save visibilities
          if (resourceData.visibilities?.length) {
            await this.createVisibilities(
              transactionalEntityManager,
              savedResource.id,
              resourceData.visibilities
            );
          }

          return savedResource;
        } catch (error) {
          Logger.error("Transaction failed:", error);
          throw new Error(`Failed to create resource: ${error}`);
        }
      }
    );
  }

  private validateVisibilityRules(
    visibilities: ResourceVisibilityInput[]
  ): void {
    if (!visibilities?.length) {
      throw new Error("At least one visibility rule is required");
    }

    visibilities.forEach((v, index) => {
      // Check mutual exclusivity
      if (v.all_players && (v.player_list_id || v.team_id)) {
        throw new Error(
          `Visibility rule ${index + 1}: Cannot set player_list_id or team_id when all_players=true`
        );
      }

      if (v.player_list_id && v.team_id) {
        throw new Error(
          `Visibility rule ${index + 1}: player_list_id and team_id are mutually exclusive`
        );
      }

      // Check score criteria requirements
      const metricId = v.metric_id ? Number(v.metric_id) : null;
      const skillId = v.skill_id ? Number(v.skill_id) : null;
      const hasScoreTarget = metricId || skillId;
      const comparison = v.score_comparison
        ? String(v.score_comparison).trim()
        : null;
      const isValidComparison =
        comparison &&
        Object.values(ScoreComparison).includes(comparison as ScoreComparison);

      if (hasScoreTarget) {
        if (v.score_criteria === undefined || v.score_criteria === null) {
          throw new Error(
            `Visibility rule ${index + 1}: score_criteria is required when metric_id or skill_id is set`
          );
        }
        if (!isValidComparison) {
          throw new Error(
            `Visibility rule ${index + 1}: Valid score_comparison is required when metric_id or skill_id is set`
          );
        }
      }

      if (
        (v.score_criteria !== null || v.score_comparison !== null) &&
        !hasScoreTarget
      ) {
        throw new Error(
          `Visibility rule ${index + 1}: score_criteria/comparison requires metric_id or skill_id`
        );
      }
    });
  }

  private async createVisibilities(
    entityManager: EntityManager,
    resourceId: number,
    visibilities: ResourceVisibilityInput[]
  ): Promise<void> {
    // Flatten visibilities for player_list_ids
    const visibilityEntities: ResourceVisibility[] = [];
    visibilities.forEach((v) => {
      // If player_list_ids is provided and is an array, create one visibility per id
      if (Array.isArray(v.player_list_ids) && v.player_list_ids.length > 0) {
        v.player_list_ids.forEach((playerListId) => {
          const metricId = v.metric_id ? Number(v.metric_id) : null; // ✅
          const skillId = v.skill_id ? Number(v.skill_id) : null; // ✅ Fix here
          const hasScoreTarget = metricId || skillId;
          const scoreCriteria = hasScoreTarget
            ? Number(v.score_criteria)
            : null;
          const scoreComparison = hasScoreTarget
            ? (v.score_comparison as ScoreComparison)
            : null;

          visibilityEntities.push(
            entityManager.create(ResourceVisibility, {
              resource: { id: resourceId },
              all_players: v.all_players,
              player_list_id: playerListId,
              team_id: null,
              metric_id: metricId,
              skill_id: skillId,
              score_criteria: scoreCriteria,
              score_comparison: scoreComparison,
            })
          );
        });
      } else {
        const playerListId = v.all_players ? null : v.player_list_id || null;
        const teamId = v.all_players ? null : v.team_id || null;
        const metricId = v.metric_id ? Number(v.metric_id) : null; // ✅
        const skillId = v.skill_id ? Number(v.skill_id) : null; // ✅ Fix here
        const hasScoreTarget = metricId || skillId;
        const scoreCriteria = hasScoreTarget ? Number(v.score_criteria) : null;
        const scoreComparison = hasScoreTarget
          ? (v.score_comparison as ScoreComparison)
          : null;

        visibilityEntities.push(
          entityManager.create(ResourceVisibility, {
            resource: { id: resourceId },
            all_players: v.all_players,
            player_list_id: playerListId,
            team_id: teamId,
            metric_id: metricId,
            skill_id: skillId,
            score_criteria: scoreCriteria,
            score_comparison: scoreComparison,
          })
        );
      }
    });

    // Log final visibility payloads for debugging
    visibilityEntities.forEach((v, i) => {
      Logger.debug(`Creating visibility ${i + 1}:`, {
        resource_id: resourceId,
        all_players: v.all_players,
        player_list_id: v.player_list_id,
        team_id: v.team_id,
        metric_id: v.metric_id,
        skill_id: v.skill_id,
        score_criteria: v.score_criteria,
        score_comparison: v.score_comparison,
      });
    });

    await entityManager.save(visibilityEntities);
  }

  /**
   * Get resource by ID
   */
  async getResourceById(id: number): Promise<Resource> {
    Logger.debug(`Fetching resource by ID: ${id}`);

    const resource = await this.resourceRepository.findOne({
      where: { id },
      relations: [
        "visibilities",
        "visibilities.player_list",
        "visibilities.metric",
        "visibilities.skill",
      ],
    });

    if (!resource) {
      Logger.warn(`Resource not found with ID: ${id}`);
      throw new Error(`Resource with ID ${id} not found`);
    }

    // Transform visibility data for client if needed
    resource.visibilities = resource.visibilities?.map((v) => ({
      ...v,
      // Convert all_players=false with empty player_list to all_players=true for client
      all_players: v.all_players || (!v.player_list_id && !v.team_id),
    }));

    return resource;
  }

  /**
   * Get all resources for a group
   */
  async getGroupResources(groupId: number): Promise<Resource[]> {
    try {
      return await this.resourceRepository.find({
        where: { group: { id: groupId } },
        relations: ["visibilities"],
        order: { created_at: "DESC" },
      });
    } catch (error) {
      Logger.error(`Error getting resources for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Update a resource
   */
  // async updateResource(
  //   resourceId: number,
  //   resourceData: Partial<ResourceInput>
  // ): Promise<Resource> {
  //   try {
  //     const resource = await this.getResourceById(resourceId);

  //     // Update basic resource properties
  //     if (resourceData.name) resource.name = resourceData.name;
  //     if (resourceData.description !== undefined)
  //       resource.description = resourceData.description;
  //     if (resourceData.link) resource.link = resourceData.link;
  //     if (resourceData.type) resource.type = resourceData.type as ResourceType;

  //     await this.resourceRepository.save(resource);

  //     // Update visibilities if provided
  //     if (resourceData.visibilities) {
  //       // Delete existing visibilities
  //       await this.visibilityRepository.delete({
  //         resource: { id: resourceId },
  //       });

  //       // Create new visibilities
  //       const visibilities = resourceData.visibilities.map((v) => {
  //         return this.visibilityRepository.create({
  //           resource: { id: resourceId },
  //           all_players: v.all_players,
  //           player_list_id: v.player_list_id || null,
  //           team_id: v.team_id || null,
  //           metric_id: v.metric_id || null,
  //           skill_id: v.skill_id || null,
  //           score_criteria: v.score_criteria || null,
  //           score_comparison: (v.score_comparison as ScoreComparison) || null,
  //         });
  //       });

  //       await this.visibilityRepository.save(visibilities);
  //     }

  //     // Return updated resource
  //     return this.getResourceById(resourceId);
  //   } catch (error) {
  //     Logger.error(`Error updating resource ${resourceId}:`, error);
  //     throw error;
  //   }
  // }

  async updateResource(
    resourceId: number,
    resourceData: Partial<ResourceInput>
  ): Promise<Resource> {
    return this.resourceRepository.manager.transaction(
      async (transactionalEntityManager) => {
        try {
          Logger.debug(
            `Updating resource ${resourceId} with data:`,
            resourceData
          );

          // 1. Validate visibility rules if provided
          if (resourceData.visibilities) {
            this.validateVisibilityRules(resourceData.visibilities);
          }

          // 2. Fetch existing resource with relations
          const resource = await transactionalEntityManager.findOne(Resource, {
            where: { id: resourceId },
            relations: ["visibilities"],
          });

          if (!resource) {
            throw new Error(`Resource with ID ${resourceId} not found`);
          }

          // 3. Update basic resource properties
          const updates: Partial<Resource> = {
            name: resourceData.name ?? resource.name,
            description: resourceData.description ?? resource.description,
            link: resourceData.link ?? resource.link,
            type: (resourceData.type as ResourceType) ?? resource.type,
          };

          await transactionalEntityManager.update(
            Resource,
            resourceId,
            updates
          );

          // 4. Handle visibility updates
          if (resourceData.visibilities) {
            // Clear existing visibilities
            await transactionalEntityManager.delete(ResourceVisibility, {
              resource: { id: resourceId },
            });

            // Create new visibilities with proper null handling
            const visibilityEntities = resourceData.visibilities.map((v) => {
              return transactionalEntityManager.create(ResourceVisibility, {
                resource: { id: resourceId },
                all_players: v.all_players,
                player_list_id: v.all_players ? null : v.player_list_id || null,
                team_id: v.all_players ? null : v.team_id || null,
                metric_id: v.metric_id || null,
                skill_id: v.skill_id || null,
                score_criteria:
                  v.metric_id || v.skill_id ? v.score_criteria : null,
                score_comparison:
                  v.metric_id || v.skill_id
                    ? (v.score_comparison as ScoreComparison)
                    : null,
              });
            });

            await transactionalEntityManager.save(visibilityEntities);
          }

          // 5. Return the fully updated resource with relations
          const updatedResource = await transactionalEntityManager.findOne(
            Resource,
            {
              where: { id: resourceId },
              relations: [
                "visibilities",
                "visibilities.player_list",
                "visibilities.team",
                "visibilities.metric",
                "visibilities.skill",
              ],
            }
          );

          if (!updatedResource) {
            throw new Error("Failed to fetch updated resource");
          }

          Logger.debug(`Successfully updated resource ${resourceId}`);
          return updatedResource;
        } catch (error) {
          Logger.error(`Transaction failed for resource ${resourceId}:`, error);
          throw new Error(`Failed to update resource: ${error}`);
        }
      }
    );
  }

  /**
   * Delete a resource
   */
  async deleteResource(resourceId: number): Promise<boolean> {
    try {
      const result = await this.resourceRepository.delete(resourceId);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      Logger.error(`Error deleting resource ${resourceId}:`, error);
      throw error;
    }
  }

  /**
   * Get resources visible to a player
   */
  async getPlayerVisibleResources(
    playerId: number,
    groupId: number
  ): Promise<Resource[]> {
    try {
      // Get player's teams, lists, and scores
      const player = await AppDataSource.getRepository("Player").findOne({
        where: { id: playerId },
        relations: [
          "teams",
          "playerLists",
          "evaluationResults",
          "evaluationResults.metric",
          "evaluationResults.metric.skill",
        ],
      });

      if (!player) {
        throw new Error(`Player with ID ${playerId} not found`);
      }

      // Get all resources for the group
      const resources = await this.getGroupResources(groupId);

      // Filter resources based on visibility criteria
      return resources.filter((resource) => {
        // Check each visibility rule
        for (const visibility of resource.visibilities) {
          // All players
          if (visibility.all_players) {
            // Check score criteria if applicable
            if (
              visibility.skill_id &&
              visibility.score_criteria &&
              visibility.score_comparison
            ) {
              const playerSkillScore = this.calculatePlayerSkillScore(
                player,
                visibility.skill_id
              );

              if (
                this.compareScores(
                  playerSkillScore,
                  visibility.score_criteria,
                  visibility.score_comparison
                )
              ) {
                return true;
              }
            } else if (
              visibility.metric_id &&
              visibility.score_criteria &&
              visibility.score_comparison
            ) {
              const playerMetricScore = this.calculatePlayerMetricScore(
                player,
                visibility.metric_id
              );

              if (
                this.compareScores(
                  playerMetricScore,
                  visibility.score_criteria,
                  visibility.score_comparison
                )
              ) {
                return true;
              }
            } else {
              return true; // No score criteria, visible to all
            }
          }

          // Player list
          if (
            visibility.player_list_id &&
            player.playerLists.some(
              (list: { id: any }) => list.id === visibility.player_list_id
            )
          ) {
            return true;
          }

          // Team
          if (
            visibility.team_id &&
            player.teams.some(
              (team: { id: any }) => team.id === visibility.team_id
            )
          ) {
            return true;
          }
        }

        return false; // No visibility rules matched
      });
    } catch (error) {
      Logger.error(
        `Error getting visible resources for player ${playerId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Calculate player's score for a skill
   */
  private calculatePlayerSkillScore(player: any, skillId: number): number {
    const skillResults = player.evaluationResults.filter(
      (result: any) => result.metric.skill.id === skillId
    );

    if (skillResults.length === 0) return 0;

    const sum = skillResults.reduce(
      (total: number, result: any) => total + (result.score || 0),
      0
    );

    return sum / skillResults.length;
  }

  /**
   * Calculate player's score for a metric
   */
  private calculatePlayerMetricScore(player: any, metricId: number): number {
    const metricResults = player.evaluationResults.filter(
      (result: any) => result.metric.id === metricId
    );

    if (metricResults.length === 0) return 0;

    const sum = metricResults.reduce(
      (total: number, result: any) => total + (result.score || 0),
      0
    );

    return sum / metricResults.length;
  }

  /**
   * Compare scores based on comparison operator
   */
  private compareScores(
    playerScore: number,
    criteriaScore: number,
    comparison: string
  ): boolean {
    switch (comparison) {
      case "<":
        return playerScore < criteriaScore;
      case "<=":
        return playerScore <= criteriaScore;
      case "=":
        return playerScore === criteriaScore;
      case ">=":
        return playerScore >= criteriaScore;
      case ">":
        return playerScore > criteriaScore;
      default:
        return false;
    }
  }
}
