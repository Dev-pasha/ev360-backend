import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPositionColumnToPlayer1746915556274
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if primary_position_id column exists
    const primaryPositionColumnExists = await this.columnExists(
      queryRunner,
      "players",
      "primary_position_id"
    );
    if (!primaryPositionColumnExists) {
      // Add primary_position_id column if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE "players" 
        ADD COLUMN "primary_position_id" INTEGER NULL
      `);
    }

    // Check if secondary_position_id column exists
    const secondaryPositionColumnExists = await this.columnExists(
      queryRunner,
      "players",
      "secondary_position_id"
    );
    if (!secondaryPositionColumnExists) {
      // Add secondary_position_id column if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE "players" 
        ADD COLUMN "secondary_position_id" INTEGER NULL
      `);
    }

    // Check if primary position foreign key constraint exists
    const primaryFkExists = await this.constraintExists(
      queryRunner,
      "players",
      "FK_players_primary_position"
    );
    if (!primaryFkExists) {
      // Add foreign key constraint for primary_position_id if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE "players" 
        ADD CONSTRAINT "FK_players_primary_position" 
        FOREIGN KEY ("primary_position_id") 
        REFERENCES "positions" ("id") 
        ON DELETE SET NULL
      `);
    }

    // Check if secondary position foreign key constraint exists
    const secondaryFkExists = await this.constraintExists(
      queryRunner,
      "players",
      "FK_players_secondary_position"
    );
    if (!secondaryFkExists) {
      // Add foreign key constraint for secondary_position_id if it doesn't exist
      await queryRunner.query(`
        ALTER TABLE "players" 
        ADD CONSTRAINT "FK_players_secondary_position" 
        FOREIGN KEY ("secondary_position_id") 
        REFERENCES "positions" ("id") 
        ON DELETE SET NULL
      `);
    }

    // Add indexes for better query performance if they don't exist
    const primaryIndexExists = await this.indexExists(
      queryRunner,
      "players",
      "IDX_players_primary_position"
    );
    if (!primaryIndexExists) {
      await queryRunner.query(`
        CREATE INDEX "IDX_players_primary_position" ON "players" ("primary_position_id")
      `);
    }

    const secondaryIndexExists = await this.indexExists(
      queryRunner,
      "players",
      "IDX_players_secondary_position"
    );
    if (!secondaryIndexExists) {
      await queryRunner.query(`
        CREATE INDEX "IDX_players_secondary_position" ON "players" ("secondary_position_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need to drop anything in down since we only added things conditionally
    // But if you want to ensure cleanup, you can add the drop statements here
  }

  // Helper method to check if column exists
  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = '${column}'
      );
    `);
    return result[0].exists;
  }

  // Helper method to check if constraint exists
  private async constraintExists(
    queryRunner: QueryRunner,
    table: string,
    constraint: string
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = '${constraint}' AND table_name = '${table}'
      );
    `);
    return result[0].exists;
  }

  // Helper method to check if index exists
  private async indexExists(
    queryRunner: QueryRunner,
    table: string,
    index: string
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = '${index}' AND tablename = '${table}'
      );
    `);
    return result[0].exists;
  }
}
