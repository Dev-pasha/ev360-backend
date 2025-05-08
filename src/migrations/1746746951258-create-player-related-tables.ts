import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlayerRelatedTables1746746951258
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums first
    await queryRunner.query(`
            CREATE TYPE "gender_enum" AS ENUM ('1', '2', '3')
        `);

    await queryRunner.query(`
            CREATE TYPE "jersey_color_enum" AS ENUM ('1', '2', '3', '4', '5', '6')
        `);

    await queryRunner.query(`
            CREATE TYPE "hand_enum" AS ENUM ('1', '2', '3')
        `);

    await queryRunner.query(`
            CREATE TYPE "foot_enum" AS ENUM ('1', '2', '3')
        `);

    // Create categories table
    await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "description" VARCHAR NULL,
                "groupId" INTEGER NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_categories_group" FOREIGN KEY ("groupId") 
                REFERENCES "groups"("id") ON DELETE CASCADE
            )
        `);

    // Create teams table
    await queryRunner.query(`
            CREATE TABLE "teams" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "description" VARCHAR NULL,
                "color" VARCHAR NULL,
                "logo_url" VARCHAR NULL,
                "is_active" BOOLEAN NOT NULL DEFAULT true,
                "groupId" INTEGER NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_teams_group" FOREIGN KEY ("groupId") 
                REFERENCES "groups"("id") ON DELETE CASCADE
            )
        `);

    // Create player_lists table
    await queryRunner.query(`
            CREATE TABLE "player_lists" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "description" VARCHAR NULL,
                "filter_criteria" JSONB NULL,
                "is_dynamic" BOOLEAN NOT NULL DEFAULT false,
                "groupId" INTEGER NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_player_lists_group" FOREIGN KEY ("groupId") 
                REFERENCES "groups"("id") ON DELETE CASCADE
            )
        `);

    // Create players table
    await queryRunner.query(`
            CREATE TABLE "players" (
                "id" SERIAL PRIMARY KEY,
                "first_name" VARCHAR NOT NULL,
                "last_name" VARCHAR NOT NULL,
                "number" INTEGER NULL,
                "jersey_colour" "jersey_color_enum" NULL,
                "date_of_birth" DATE NULL,
                "gender" "gender_enum" NULL,
                "headshot" VARCHAR NULL,
                "height" DECIMAL(5,2) NULL,
                "weight" DECIMAL(5,2) NULL,
                "hand" "hand_enum" NULL,
                "email" VARCHAR NULL,
                "secondary_email" VARCHAR NULL,
                "foot" "foot_enum" NULL,
                "level" VARCHAR NULL,
                "zone" VARCHAR NULL,
                "custom_field_1" VARCHAR NULL,
                "custom_field_2" VARCHAR NULL,
                "custom_field_3" VARCHAR NULL,
                "custom_field_4" VARCHAR NULL,
                "check_in" BOOLEAN NOT NULL DEFAULT false,
                "archived" BOOLEAN DEFAULT false,
                "groupId" INTEGER NOT NULL,
                "primary_positionId" INTEGER NULL,
                "secondary_positionId" INTEGER NULL,
                "teamId" INTEGER NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_players_group" FOREIGN KEY ("groupId") 
                REFERENCES "groups"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_players_primary_position" FOREIGN KEY ("primary_positionId") 
                REFERENCES "positions"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_players_secondary_position" FOREIGN KEY ("secondary_positionId") 
                REFERENCES "positions"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_players_team" FOREIGN KEY ("teamId") 
                REFERENCES "teams"("id") ON DELETE SET NULL
            )
        `);

    // Create team_players junction table
    await queryRunner.query(`
            CREATE TABLE "team_players" (
                "id" SERIAL PRIMARY KEY,
                "teamId" INTEGER NOT NULL,
                "playerId" INTEGER NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_team_players_team" FOREIGN KEY ("teamId") 
                REFERENCES "teams"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_team_players_player" FOREIGN KEY ("playerId") 
                REFERENCES "players"("id") ON DELETE CASCADE,
                CONSTRAINT "UQ_team_players_player" UNIQUE ("playerId")
            )
        `);

    // Create player_categories junction table
    await queryRunner.query(`
            CREATE TABLE "player_categories" (
                "player_id" INTEGER NOT NULL,
                "category_id" INTEGER NOT NULL,
                PRIMARY KEY ("player_id", "category_id"),
                CONSTRAINT "FK_player_categories_player" FOREIGN KEY ("player_id") 
                REFERENCES "players"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_player_categories_category" FOREIGN KEY ("category_id") 
                REFERENCES "categories"("id") ON DELETE CASCADE
            )
        `);

    // Create player_list_players junction table
    await queryRunner.query(`
            CREATE TABLE "player_list_players" (
                "player_list_id" INTEGER NOT NULL,
                "player_id" INTEGER NOT NULL,
                PRIMARY KEY ("player_list_id", "player_id"),
                CONSTRAINT "FK_player_list_players_player_list" FOREIGN KEY ("player_list_id") 
                REFERENCES "player_lists"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_player_list_players_player" FOREIGN KEY ("player_id") 
                REFERENCES "players"("id") ON DELETE CASCADE
            )
        `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_groupId" ON "categories" ("groupId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_teams_groupId" ON "teams" ("groupId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_lists_groupId" ON "player_lists" ("groupId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_groupId" ON "players" ("groupId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_primary_positionId" ON "players" ("primary_positionId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_secondary_positionId" ON "players" ("secondary_positionId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_teamId" ON "players" ("teamId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_players_teamId" ON "team_players" ("teamId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_categories_player_id" ON "player_categories" ("player_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_categories_category_id" ON "player_categories" ("category_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_list_players_player_list_id" ON "player_list_players" ("player_list_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_list_players_player_id" ON "player_list_players" ("player_id")`
    );

    // Create full-text search index on player names
    await queryRunner.query(`
            CREATE INDEX "IDX_players_name_search" ON "players" 
            USING GIN ((to_tsvector('english', first_name || ' ' || last_name)))
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_players_name_search"`);
    await queryRunner.query(`DROP INDEX "IDX_player_list_players_player_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_player_list_players_player_list_id"`
    );
    await queryRunner.query(`DROP INDEX "IDX_player_categories_category_id"`);
    await queryRunner.query(`DROP INDEX "IDX_player_categories_player_id"`);
    await queryRunner.query(`DROP INDEX "IDX_team_players_teamId"`);
    await queryRunner.query(`DROP INDEX "IDX_players_teamId"`);
    await queryRunner.query(`DROP INDEX "IDX_players_secondary_positionId"`);
    await queryRunner.query(`DROP INDEX "IDX_players_primary_positionId"`);
    await queryRunner.query(`DROP INDEX "IDX_players_groupId"`);
    await queryRunner.query(`DROP INDEX "IDX_player_lists_groupId"`);
    await queryRunner.query(`DROP INDEX "IDX_teams_groupId"`);
    await queryRunner.query(`DROP INDEX "IDX_categories_groupId"`);

    // Drop tables in reverse order (to handle foreign key constraints)
    await queryRunner.query(`DROP TABLE "player_list_players"`);
    await queryRunner.query(`DROP TABLE "player_categories"`);
    await queryRunner.query(`DROP TABLE "team_players"`);
    await queryRunner.query(`DROP TABLE "players"`);
    await queryRunner.query(`DROP TABLE "player_lists"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TABLE "categories"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "foot_enum"`);
    await queryRunner.query(`DROP TYPE "hand_enum"`);
    await queryRunner.query(`DROP TYPE "jersey_color_enum"`);
    await queryRunner.query(`DROP TYPE "gender_enum"`);
  }
}
