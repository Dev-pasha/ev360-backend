import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptionToGroups1747663373644
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the subscription_id column to groups table
    await queryRunner.query(`
      ALTER TABLE "groups" 
      ADD COLUMN "subscription_id" INTEGER;
    `);

    // Add foreign key constraint to link with subscriptions table
    await queryRunner.query(`
      ALTER TABLE "groups"
      ADD CONSTRAINT "FK_groups_subscription" 
      FOREIGN KEY ("subscription_id") 
      REFERENCES "subscriptions" ("id") 
      ON DELETE SET NULL;
    `);

    // Create an index for faster joins
    await queryRunner.query(`
      CREATE INDEX "IDX_groups_subscription_id" ON "groups" ("subscription_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_groups_subscription_id";
    `);

    // Drop the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "groups"
      DROP CONSTRAINT IF EXISTS "FK_groups_subscription";
    `);

    // Drop the column
    await queryRunner.query(`
      ALTER TABLE "groups" 
      DROP COLUMN IF EXISTS "subscription_id";
    `);
  }
}
