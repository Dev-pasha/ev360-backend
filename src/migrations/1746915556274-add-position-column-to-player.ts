import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPositionColumnToPlayer1746915556274
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add primary_position_id column to players table
    await queryRunner.query(`
      ALTER TABLE "players" 
      ADD COLUMN "primary_position_id" INTEGER NULL
    `);

    // Add secondary_position_id column to players table
    await queryRunner.query(`
      ALTER TABLE "players" 
      ADD COLUMN "secondary_position_id" INTEGER NULL
    `);

    // Add foreign key constraint for primary_position_id
    await queryRunner.query(`
      ALTER TABLE "players" 
      ADD CONSTRAINT "FK_players_primary_position" 
      FOREIGN KEY ("primary_position_id") 
      REFERENCES "positions" ("id") 
      ON DELETE SET NULL
    `);

    // Add foreign key constraint for secondary_position_id
    await queryRunner.query(`
      ALTER TABLE "players" 
      ADD CONSTRAINT "FK_players_secondary_position" 
      FOREIGN KEY ("secondary_position_id") 
      REFERENCES "positions" ("id") 
      ON DELETE SET NULL
    `);

    // Add indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_players_primary_position" ON "players" ("primary_position_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_players_secondary_position" ON "players" ("secondary_position_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX "IDX_players_primary_position"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_players_secondary_position"
    `);

    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "players" 
      DROP CONSTRAINT "FK_players_primary_position"
    `);

    await queryRunner.query(`
      ALTER TABLE "players" 
      DROP CONSTRAINT "FK_players_secondary_position"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "players" 
      DROP COLUMN "primary_position_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "players" 
      DROP COLUMN "secondary_position_id"
    `);
  }
}
