import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoachRelationInTeam1747031203420 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add coach_id column to teams table
    await queryRunner.query(`
      ALTER TABLE "teams" 
      ADD COLUMN "coach_id" INTEGER NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "teams" 
      ADD CONSTRAINT "FK_teams_coach" 
      FOREIGN KEY ("coach_id") 
      REFERENCES "users" ("id") 
      ON DELETE SET NULL
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_teams_coach" ON "teams" ("coach_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX "IDX_teams_coach"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "teams" 
      DROP CONSTRAINT "FK_teams_coach"
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "teams" 
      DROP COLUMN "coach_id"
    `);
  }
}
