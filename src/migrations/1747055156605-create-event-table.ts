import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEventTable1747055156605 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create events table
    await queryRunner.query(`
      CREATE TYPE "event_type_enum" AS ENUM ('1', '2');
    `);

    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "event_type" "event_type_enum" NOT NULL DEFAULT '1',
        "event_datetime" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP NOT NULL,
        "hide_player_names" BOOLEAN NOT NULL DEFAULT false,
        "hide_preferred_positions" BOOLEAN NOT NULL DEFAULT false,
        "locked" BOOLEAN NOT NULL DEFAULT false,
        "send_invites" BOOLEAN NOT NULL DEFAULT true,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "groupId" INTEGER NOT NULL,
        "teamId" INTEGER,
        "created_by_id" INTEGER
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "events" 
      ADD CONSTRAINT "FK_events_group" 
      FOREIGN KEY ("groupId") 
      REFERENCES "groups" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "events" 
      ADD CONSTRAINT "FK_events_team" 
      FOREIGN KEY ("teamId") 
      REFERENCES "teams" ("id") 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "events" 
      ADD CONSTRAINT "FK_events_created_by" 
      FOREIGN KEY ("created_by_id") 
      REFERENCES "users" ("id") 
      ON DELETE SET NULL
    `);

    // Create event_players junction table
    await queryRunner.query(`
      CREATE TABLE "event_players" (
        "event_id" INTEGER NOT NULL,
        "player_id" INTEGER NOT NULL,
        PRIMARY KEY ("event_id", "player_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "event_players" 
      ADD CONSTRAINT "FK_event_players_event" 
      FOREIGN KEY ("event_id") 
      REFERENCES "events" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "event_players" 
      ADD CONSTRAINT "FK_event_players_player" 
      FOREIGN KEY ("player_id") 
      REFERENCES "players" ("id") 
      ON DELETE CASCADE
    `);

    // Create event_skills junction table
    await queryRunner.query(`
      CREATE TABLE "event_skills" (
        "event_id" INTEGER NOT NULL,
        "skill_id" INTEGER NOT NULL,
        PRIMARY KEY ("event_id", "skill_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "event_skills" 
      ADD CONSTRAINT "FK_event_skills_event" 
      FOREIGN KEY ("event_id") 
      REFERENCES "events" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "event_skills" 
      ADD CONSTRAINT "FK_event_skills_skill" 
      FOREIGN KEY ("skill_id") 
      REFERENCES "group_template_skills" ("id") 
      ON DELETE CASCADE
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_events_groupId" ON "events" ("groupId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_teamId" ON "events" ("teamId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_created_by" ON "events" ("created_by_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_event_datetime" ON "events" ("event_datetime")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_is_active" ON "events" ("is_active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_events_is_active"`);
    await queryRunner.query(`DROP INDEX "IDX_events_event_datetime"`);
    await queryRunner.query(`DROP INDEX "IDX_events_created_by"`);
    await queryRunner.query(`DROP INDEX "IDX_events_teamId"`);
    await queryRunner.query(`DROP INDEX "IDX_events_groupId"`);

    // Drop junction tables
    await queryRunner.query(`DROP TABLE "event_skills"`);
    await queryRunner.query(`DROP TABLE "event_players"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_events_created_by"`
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_events_team"`
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_events_group"`
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "events"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "event_type_enum"`);
  }
}
