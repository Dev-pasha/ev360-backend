import { MigrationInterface, QueryRunner } from "typeorm";

export class ResourceVisibiltyCriterion1748741675042
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the old restrictive constraint
    await queryRunner.query(`
      ALTER TABLE "resource_visibilities" 
      DROP CONSTRAINT IF EXISTS "CHK_resource_visibility_single_criterion";
    `);

    // Add new constraint that allows base visibility types with optional score criteria
    await queryRunner.query(`
      ALTER TABLE "resource_visibilities"
      ADD CONSTRAINT "CHK_resource_visibility_valid_combinations"
      CHECK (
        -- Type 1: All players (with or without score criteria)
        (all_players = true AND player_list_id IS NULL AND team_id IS NULL) OR
        
        -- Type 2: Player list (with or without score criteria)  
        (all_players = false AND player_list_id IS NOT NULL AND team_id IS NULL) OR
        
        -- Type 3: Team-based (with or without score criteria, if still needed)
        (all_players = false AND player_list_id IS NULL AND team_id IS NOT NULL)
      );
    `);

    // Ensure score criteria are complete when used
    await queryRunner.query(`
      ALTER TABLE "resource_visibilities"
      ADD CONSTRAINT "CHK_resource_visibility_score_complete"
      CHECK (
        -- Either no score criteria at all
        (metric_id IS NULL AND skill_id IS NULL AND score_criteria IS NULL AND score_comparison IS NULL) OR
        
        -- Or complete metric-based criteria
        (metric_id IS NOT NULL AND skill_id IS NULL AND score_criteria IS NOT NULL AND score_comparison IS NOT NULL) OR
        
        -- Or complete skill-based criteria  
        (metric_id IS NULL AND skill_id IS NOT NULL AND score_criteria IS NOT NULL AND score_comparison IS NOT NULL)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the new constraints
    await queryRunner.query(`
      ALTER TABLE "resource_visibilities" 
      DROP CONSTRAINT IF EXISTS "CHK_resource_visibility_score_complete";
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_visibilities" 
      DROP CONSTRAINT IF EXISTS "CHK_resource_visibility_valid_combinations";
    `);

    // Restore the original constraint
    await queryRunner.query(`
      ALTER TABLE "resource_visibilities"
      ADD CONSTRAINT "CHK_resource_visibility_single_criterion"
      CHECK (
        (("player_list_id" IS NOT NULL)::integer +
         ("team_id" IS NOT NULL)::integer +
         ("metric_id" IS NOT NULL)::integer +
         ("skill_id" IS NOT NULL)::integer +
         ("all_players" = true)::integer) <= 1
      );
    `);
  }
}
