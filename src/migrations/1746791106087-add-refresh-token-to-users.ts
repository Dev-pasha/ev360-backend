import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenToUsers1746791106087 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add refreshToken column to users table
    await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "refreshToken" VARCHAR NULL
        `);

    // Adding an index to improve lookup performance on refreshToken
    await queryRunner.query(`
            CREATE INDEX "IDX_users_refreshToken" ON "users" ("refreshToken")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
            DROP INDEX "IDX_users_refreshToken"
        `);

    // Remove the refreshToken column
    await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "refreshToken"
        `);
  }
}
