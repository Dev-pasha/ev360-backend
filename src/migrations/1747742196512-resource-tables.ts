import { MigrationInterface, QueryRunner } from "typeorm";

export class ResourceTables1747742196512 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // For ResourceType, we'll use numeric type instead of enum since it uses numbers
    // For ScoreComparison, we'll use enum as it uses string values
    await queryRunner.query(`
      CREATE TYPE "score_comparison_enum" AS ENUM ('<', '<=', '=', '>=', '>');
    `);

    // Create resources table
    await queryRunner.query(`
      CREATE TABLE "resources" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "description" TEXT,
        "link" VARCHAR NOT NULL,
        "type" SMALLINT NOT NULL DEFAULT 3,
        "group_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        
        CONSTRAINT "FK_resources_group" FOREIGN KEY ("group_id") 
          REFERENCES "groups" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_resource_type" CHECK ("type" IN (1, 2, 3))
      );

      -- Add indexes for resources
      CREATE INDEX "IDX_resources_group_id" ON "resources" ("group_id");
      CREATE INDEX "IDX_resources_type" ON "resources" ("type");
    `);

    // Create resource_visibilities table
    await queryRunner.query(`
      CREATE TABLE "resource_visibilities" (
        "id" SERIAL PRIMARY KEY,
        "resource_id" INTEGER NOT NULL,
        "all_players" BOOLEAN NOT NULL DEFAULT false,
        "player_list_id" INTEGER,
        "team_id" INTEGER,
        "metric_id" INTEGER,
        "skill_id" INTEGER,
        "score_criteria" DECIMAL(5,2),
        "score_comparison" score_comparison_enum,
        
        CONSTRAINT "FK_resource_visibilities_resource" FOREIGN KEY ("resource_id") 
          REFERENCES "resources" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_resource_visibilities_player_list" FOREIGN KEY ("player_list_id") 
          REFERENCES "player_lists" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_resource_visibilities_team" FOREIGN KEY ("team_id") 
          REFERENCES "teams" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_resource_visibilities_metric" FOREIGN KEY ("metric_id") 
          REFERENCES "group_template_metrics" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_resource_visibilities_skill" FOREIGN KEY ("skill_id") 
          REFERENCES "group_template_skills" ("id") ON DELETE SET NULL
      );

      -- Add indexes for resource_visibilities
      CREATE INDEX "IDX_resource_visibilities_resource_id" ON "resource_visibilities" ("resource_id");
      CREATE INDEX "IDX_resource_visibilities_player_list_id" ON "resource_visibilities" ("player_list_id");
      CREATE INDEX "IDX_resource_visibilities_team_id" ON "resource_visibilities" ("team_id");
      CREATE INDEX "IDX_resource_visibilities_metric_id" ON "resource_visibilities" ("metric_id");
      CREATE INDEX "IDX_resource_visibilities_skill_id" ON "resource_visibilities" ("skill_id");
    `);

    // Add constraints to prevent duplicates and ensure data integrity
    await queryRunner.query(`
      -- Create rule to prevent duplicate visibility criteria per resource
      CREATE UNIQUE INDEX "UQ_resource_visibility_criteria_player_list" ON "resource_visibilities" 
        ("resource_id", "player_list_id") 
        WHERE "player_list_id" IS NOT NULL;
        
      CREATE UNIQUE INDEX "UQ_resource_visibility_criteria_team" ON "resource_visibilities" 
        ("resource_id", "team_id") 
        WHERE "team_id" IS NOT NULL;
        
      CREATE UNIQUE INDEX "UQ_resource_visibility_criteria_metric" ON "resource_visibilities" 
        ("resource_id", "metric_id", "score_criteria", "score_comparison") 
        WHERE "metric_id" IS NOT NULL AND "score_criteria" IS NOT NULL AND "score_comparison" IS NOT NULL;
        
      CREATE UNIQUE INDEX "UQ_resource_visibility_criteria_skill" ON "resource_visibilities" 
        ("resource_id", "skill_id") 
        WHERE "skill_id" IS NOT NULL;
        
      CREATE UNIQUE INDEX "UQ_resource_visibility_criteria_all_players" ON "resource_visibilities" 
        ("resource_id", "all_players") 
        WHERE "all_players" = true;

      -- Create a constraint to ensure only one visibility criterion is set
      ALTER TABLE "resource_visibilities"
      ADD CONSTRAINT "CHK_resource_visibility_single_criterion"
      CHECK (
        (("player_list_id" IS NOT NULL)::integer +
         ("team_id" IS NOT NULL)::integer +
         ("metric_id" IS NOT NULL)::integer +
         ("skill_id" IS NOT NULL)::integer +
         ("all_players" = true)::integer) <= 1
      );
      
      -- Ensure score criteria and comparison are set together with metric
      ALTER TABLE "resource_visibilities"
      ADD CONSTRAINT "CHK_resource_visibility_score_criteria"
      CHECK (
        ("metric_id" IS NULL AND "score_criteria" IS NULL AND "score_comparison" IS NULL) OR
        ("metric_id" IS NOT NULL AND "score_criteria" IS NOT NULL AND "score_comparison" IS NOT NULL)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`
      -- First drop constraints
      ALTER TABLE "resource_visibilities" DROP CONSTRAINT IF EXISTS "CHK_resource_visibility_score_criteria";
      ALTER TABLE "resource_visibilities" DROP CONSTRAINT IF EXISTS "CHK_resource_visibility_single_criterion";
      
      -- Drop unique indexes
      DROP INDEX IF EXISTS "UQ_resource_visibility_criteria_all_players";
      DROP INDEX IF EXISTS "UQ_resource_visibility_criteria_skill";
      DROP INDEX IF EXISTS "UQ_resource_visibility_criteria_metric";
      DROP INDEX IF EXISTS "UQ_resource_visibility_criteria_team";
      DROP INDEX IF EXISTS "UQ_resource_visibility_criteria_player_list";
      
      -- Drop tables
      DROP TABLE IF EXISTS "resource_visibilities";
      DROP TABLE IF EXISTS "resources";
      
      -- Drop enum types
      DROP TYPE IF EXISTS "score_comparison_enum";
    `);
  }
}
