import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSubscriptionsRelevantTables1747661739408
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      -- Create ENUM types for status fields
      CREATE TYPE "billing_cycle_enum" AS ENUM ('monthly', 'quarterly', 'annual');
      CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'past_due', 'canceled', 'trial', 'expired');
      CREATE TYPE "invoice_status_enum" AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
    `);

    // Create subscription_plans table
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "description" TEXT,
        "price" DECIMAL(10,2) NOT NULL,
        "billing_cycle" billing_cycle_enum NOT NULL DEFAULT 'monthly',
        "max_groups" INTEGER NOT NULL,
        "max_users_per_group" INTEGER NOT NULL,
        "max_players_per_group" INTEGER NOT NULL,
        "is_custom" BOOLEAN NOT NULL DEFAULT false,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );

      -- Add index for active plans
      CREATE INDEX "IDX_subscription_plans_is_active" ON "subscription_plans" ("is_active");
    `);

    // Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "plan_id" INTEGER NOT NULL,
        "status" subscription_status_enum NOT NULL DEFAULT 'active',
        "start_date" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP,
        "trial_end_date" TIMESTAMP,
        "external_subscription_id" VARCHAR,
        "metadata" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        
        CONSTRAINT "FK_subscriptions_user" FOREIGN KEY ("user_id") 
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscriptions_plan" FOREIGN KEY ("plan_id") 
          REFERENCES "subscription_plans" ("id") ON DELETE RESTRICT
      );

      -- Add indexes for common queries
      CREATE INDEX "IDX_subscriptions_user_id" ON "subscriptions" ("user_id");
      CREATE INDEX "IDX_subscriptions_plan_id" ON "subscriptions" ("plan_id");
      CREATE INDEX "IDX_subscriptions_status" ON "subscriptions" ("status");
    `);

    // Create billing_invoices table
    await queryRunner.query(`
      CREATE TABLE "billing_invoices" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "subscription_id" INTEGER NOT NULL,
        "external_invoice_id" VARCHAR,
        "amount" DECIMAL(10,2) NOT NULL,
        "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "total_amount" DECIMAL(10,2) NOT NULL,
        "status" invoice_status_enum NOT NULL DEFAULT 'draft',
        "due_date" TIMESTAMP NOT NULL,
        "paid_date" TIMESTAMP,
        "line_items" JSONB,
        "invoice_url" VARCHAR,
        "receipt_url" VARCHAR,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        
        CONSTRAINT "FK_billing_invoices_user" FOREIGN KEY ("user_id") 
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_billing_invoices_subscription" FOREIGN KEY ("subscription_id") 
          REFERENCES "subscriptions" ("id") ON DELETE CASCADE
      );

      -- Add indexes for common queries
      CREATE INDEX "IDX_billing_invoices_user_id" ON "billing_invoices" ("user_id");
      CREATE INDEX "IDX_billing_invoices_subscription_id" ON "billing_invoices" ("subscription_id");
      CREATE INDEX "IDX_billing_invoices_status" ON "billing_invoices" ("status");
      CREATE INDEX "IDX_billing_invoices_due_date" ON "billing_invoices" ("due_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (to respect foreign key constraints)
    await queryRunner.query(`
      DROP TABLE IF EXISTS "billing_invoices";
      DROP TABLE IF EXISTS "subscriptions";
      DROP TABLE IF EXISTS "subscription_plans";
      
      -- Drop ENUM types
      DROP TYPE IF EXISTS "invoice_status_enum";
      DROP TYPE IF EXISTS "subscription_status_enum";
      DROP TYPE IF EXISTS "billing_cycle_enum";
    `);
  }
}
