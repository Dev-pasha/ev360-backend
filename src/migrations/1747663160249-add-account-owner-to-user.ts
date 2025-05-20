import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountOwnerToUser1747663160249 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the is_account_owner column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "is_account_owner" BOOLEAN NOT NULL DEFAULT false;
    `);

    // Create an index for faster queries filtering by account owners
    await queryRunner.query(`
      CREATE INDEX "IDX_users_is_account_owner" ON "users" ("is_account_owner");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_is_account_owner";
    `);

    // Drop the column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "is_account_owner";
    `);
  }
}
