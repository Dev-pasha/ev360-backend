import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReportingTable1747127417796 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension for PostgreSQL
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create reports table
    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "report_type" VARCHAR NOT NULL CHECK ("report_type" IN ('all_score', 'individual', 'self_assessment')),
        "optional_message" TEXT,
        "sent" TIMESTAMP,
        "groupId" INTEGER NOT NULL,
        "createdById" INTEGER NOT NULL,
        "preferred_positions_type" VARCHAR NOT NULL DEFAULT 'PRIMARY' CHECK ("preferred_positions_type" IN ('PRIMARY', 'SECONDARY', 'ALL')),
        "filters" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Add foreign key constraints for reports
    await queryRunner.query(`
      ALTER TABLE "reports" 
      ADD CONSTRAINT "FK_reports_group" 
      FOREIGN KEY ("groupId") 
      REFERENCES "groups" ("id") 
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "reports" 
      ADD CONSTRAINT "FK_reports_created_by" 
      FOREIGN KEY ("createdById") 
      REFERENCES "users" ("id") 
      ON DELETE RESTRICT
    `);

    // Create report_events junction table
    await queryRunner.query(`
      CREATE TABLE "report_events" (
        "reportId" INTEGER NOT NULL,
        "eventId" INTEGER NOT NULL,
        PRIMARY KEY ("reportId", "eventId")
      )
    `);

    // Add foreign key constraints for report_events
    await queryRunner.query(`
      ALTER TABLE "report_events" 
      ADD CONSTRAINT "FK_report_events_report" 
      FOREIGN KEY ("reportId") 
      REFERENCES "reports" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "report_events" 
      ADD CONSTRAINT "FK_report_events_event" 
      FOREIGN KEY ("eventId") 
      REFERENCES "events" ("id") 
      ON DELETE CASCADE
    `);

    // Create report_evaluators junction table
    await queryRunner.query(`
      CREATE TABLE "report_evaluators" (
        "reportId" INTEGER NOT NULL,
        "evaluatorId" INTEGER NOT NULL,
        PRIMARY KEY ("reportId", "evaluatorId")
      )
    `);

    // Add foreign key constraints for report_evaluators
    await queryRunner.query(`
      ALTER TABLE "report_evaluators" 
      ADD CONSTRAINT "FK_report_evaluators_report" 
      FOREIGN KEY ("reportId") 
      REFERENCES "reports" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "report_evaluators" 
      ADD CONSTRAINT "FK_report_evaluators_evaluator" 
      FOREIGN KEY ("evaluatorId") 
      REFERENCES "users" ("id") 
      ON DELETE CASCADE
    `);

    // Create report_confirmations table
    await queryRunner.query(`
      CREATE TABLE "report_confirmations" (
        "id" SERIAL PRIMARY KEY,
        "reportId" INTEGER NOT NULL,
        "playerId" INTEGER NOT NULL,
        "sent_at" TIMESTAMP,
        "viewed_at" TIMESTAMP,
        "confirmed_at" TIMESTAMP,
        "token" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Add foreign key constraints for report_confirmations
    await queryRunner.query(`
      ALTER TABLE "report_confirmations" 
      ADD CONSTRAINT "FK_report_confirmations_report" 
      FOREIGN KEY ("reportId") 
      REFERENCES "reports" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "report_confirmations" 
      ADD CONSTRAINT "FK_report_confirmations_player" 
      FOREIGN KEY ("playerId") 
      REFERENCES "players" ("id") 
      ON DELETE CASCADE
    `);

    // Create self_assessments table
    await queryRunner.query(`
      CREATE TABLE "self_assessments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" INTEGER NOT NULL,
        "playerId" INTEGER NOT NULL,
        "metricId" INTEGER NOT NULL,
        "value" DECIMAL(10,2) NOT NULL,
        "note" TEXT,
        "videos" JSONB,
        "multi_score" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Add foreign key constraints for self_assessments
    await queryRunner.query(`
      ALTER TABLE "self_assessments" 
      ADD CONSTRAINT "FK_self_assessments_event" 
      FOREIGN KEY ("eventId") 
      REFERENCES "events" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "self_assessments" 
      ADD CONSTRAINT "FK_self_assessments_player" 
      FOREIGN KEY ("playerId") 
      REFERENCES "players" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "self_assessments" 
      ADD CONSTRAINT "FK_self_assessments_metric" 
      FOREIGN KEY ("metricId") 
      REFERENCES "group_template_metrics" ("id") 
      ON DELETE CASCADE
    `);

    // Create unique constraint for self_assessments
    await queryRunner.query(`
      ALTER TABLE "self_assessments" 
      ADD CONSTRAINT "UQ_self_assessment" 
      UNIQUE ("eventId", "playerId", "metricId")
    `);

    // Create indexes for reports
    await queryRunner.query(`
      CREATE INDEX "IDX_reports_groupId" ON "reports" ("groupId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reports_createdById" ON "reports" ("createdById")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reports_report_type" ON "reports" ("report_type")
    `);

    // Create indexes for report_confirmations
    await queryRunner.query(`
      CREATE INDEX "IDX_report_confirmations_reportId" ON "report_confirmations" ("reportId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_report_confirmations_playerId" ON "report_confirmations" ("playerId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_report_confirmations_token" ON "report_confirmations" ("token")
    `);

    // Create indexes for self_assessments
    await queryRunner.query(`
      CREATE INDEX "IDX_self_assessments_eventId" ON "self_assessments" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_self_assessments_playerId" ON "self_assessments" ("playerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_self_assessments_metricId" ON "self_assessments" ("metricId")
    `);

    // Composite indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_self_assessments_event_player" ON "self_assessments" ("eventId", "playerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop composite indexes
    await queryRunner.query(`DROP INDEX "IDX_self_assessments_event_player"`);

    // Drop indexes for self_assessments
    await queryRunner.query(`DROP INDEX "IDX_self_assessments_metricId"`);
    await queryRunner.query(`DROP INDEX "IDX_self_assessments_playerId"`);
    await queryRunner.query(`DROP INDEX "IDX_self_assessments_eventId"`);

    // Drop indexes for report_confirmations
    await queryRunner.query(`DROP INDEX "IDX_report_confirmations_token"`);
    await queryRunner.query(`DROP INDEX "IDX_report_confirmations_playerId"`);
    await queryRunner.query(`DROP INDEX "IDX_report_confirmations_reportId"`);

    // Drop indexes for reports
    await queryRunner.query(`DROP INDEX "IDX_reports_report_type"`);
    await queryRunner.query(`DROP INDEX "IDX_reports_createdById"`);
    await queryRunner.query(`DROP INDEX "IDX_reports_groupId"`);

    // Drop unique constraint
    await queryRunner.query(
      `ALTER TABLE "self_assessments" DROP CONSTRAINT "UQ_self_assessment"`
    );

    // Drop foreign key constraints for self_assessments
    await queryRunner.query(
      `ALTER TABLE "self_assessments" DROP CONSTRAINT "FK_self_assessments_metric"`
    );
    await queryRunner.query(
      `ALTER TABLE "self_assessments" DROP CONSTRAINT "FK_self_assessments_player"`
    );
    await queryRunner.query(
      `ALTER TABLE "self_assessments" DROP CONSTRAINT "FK_self_assessments_event"`
    );

    // Drop foreign key constraints for report_confirmations
    await queryRunner.query(
      `ALTER TABLE "report_confirmations" DROP CONSTRAINT "FK_report_confirmations_player"`
    );
    await queryRunner.query(
      `ALTER TABLE "report_confirmations" DROP CONSTRAINT "FK_report_confirmations_report"`
    );

    // Drop foreign key constraints for report_evaluators
    await queryRunner.query(
      `ALTER TABLE "report_evaluators" DROP CONSTRAINT "FK_report_evaluators_evaluator"`
    );
    await queryRunner.query(
      `ALTER TABLE "report_evaluators" DROP CONSTRAINT "FK_report_evaluators_report"`
    );

    // Drop foreign key constraints for report_events
    await queryRunner.query(
      `ALTER TABLE "report_events" DROP CONSTRAINT "FK_report_events_event"`
    );
    await queryRunner.query(
      `ALTER TABLE "report_events" DROP CONSTRAINT "FK_report_events_report"`
    );

    // Drop foreign key constraints for reports
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_created_by"`
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_group"`
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "self_assessments"`);
    await queryRunner.query(`DROP TABLE "report_confirmations"`);
    await queryRunner.query(`DROP TABLE "report_evaluators"`);
    await queryRunner.query(`DROP TABLE "report_events"`);
    await queryRunner.query(`DROP TABLE "reports"`);
  }
}
