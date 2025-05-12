import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUseridToPlayer1747041758128 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add userId column to players table
    await queryRunner.query(`
      ALTER TABLE "players" 
      ADD COLUMN "userId" INTEGER NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "players" 
      ADD CONSTRAINT "FK_players_user" 
      FOREIGN KEY ("userId") 
      REFERENCES "users" ("id") 
      ON DELETE SET NULL
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_players_user" ON "players" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX "IDX_players_user"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "players" 
      DROP CONSTRAINT "FK_players_user"
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "players" 
      DROP COLUMN "userId"
    `);
  }
}
