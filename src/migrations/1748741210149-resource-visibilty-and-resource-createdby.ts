import { MigrationInterface, QueryRunner } from "typeorm";

export class ResourceVisibiltyAndResourceCreatedby1748741210149
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add created_by_id column to resources table
    await queryRunner.query(`
      ALTER TABLE "resources"
      ADD COLUMN "created_by_id" INTEGER;
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "resources"
      ADD CONSTRAINT "FK_resources_created_by"
      FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL;
    `);

    // Add index for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_resources_created_by_id" ON "resources" ("created_by_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_resources_created_by_id";
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "resources"
      DROP CONSTRAINT IF EXISTS "FK_resources_created_by";
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "resources"
      DROP COLUMN IF EXISTS "created_by_id";
    `);
  }
}
