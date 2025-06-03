import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSaasOwnerColumns1748965655050 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop and recreate the problematic columns with correct types
    await queryRunner.query(
      `ALTER TABLE "saas_owners" DROP COLUMN IF EXISTS "password_reset_token"`
    );
    await queryRunner.query(
      `ALTER TABLE "saas_owners" DROP COLUMN IF EXISTS "password_reset_expires"`
    );

    await queryRunner.query(
      `ALTER TABLE "saas_owners" ADD "password_reset_token" varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "saas_owners" ADD "password_reset_expires" timestamp NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saas_owners" DROP COLUMN "password_reset_expires"`
    );
    await queryRunner.query(
      `ALTER TABLE "saas_owners" DROP COLUMN "password_reset_token"`
    );
  }
}
