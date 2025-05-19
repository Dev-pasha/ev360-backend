import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEventEvaluatorTable1747055221582
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create evaluator status enum
    await queryRunner.query(`
      CREATE TYPE "evaluator_status_enum" AS ENUM ('invited', 'accepted', 'declined', 'completed');
    `);

    // Create event_evaluators table
    await queryRunner.query(`
      CREATE TABLE "event_evaluators" (
        "id" SERIAL PRIMARY KEY,
        "status" "evaluator_status_enum" NOT NULL DEFAULT 'invited',
        "invitation_sent_at" TIMESTAMP,
        "accepted_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "eventId" INTEGER,
        "evaluatorId" INTEGER
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "event_evaluators" 
      ADD CONSTRAINT "FK_event_evaluators_event" 
      FOREIGN KEY ("eventId") 
      REFERENCES "events" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "event_evaluators" 
      ADD CONSTRAINT "FK_event_evaluators_evaluator" 
      FOREIGN KEY ("evaluatorId") 
      REFERENCES "users" ("id") 
      ON DELETE CASCADE
    `);

    // Create unique constraint to prevent duplicate evaluator assignments
    await queryRunner.query(`
      ALTER TABLE "event_evaluators" 
      ADD CONSTRAINT "UQ_event_evaluator" 
      UNIQUE ("eventId", "evaluatorId")
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_event_evaluators_eventId" ON "event_evaluators" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_evaluators_evaluatorId" ON "event_evaluators" ("evaluatorId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_evaluators_status" ON "event_evaluators" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_event_evaluators_status"`);
    await queryRunner.query(`DROP INDEX "IDX_event_evaluators_evaluatorId"`);
    await queryRunner.query(`DROP INDEX "IDX_event_evaluators_eventId"`);

    // Drop unique constraint
    await queryRunner.query(
      `ALTER TABLE "event_evaluators" DROP CONSTRAINT "UQ_event_evaluator"`
    );

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "event_evaluators" DROP CONSTRAINT "FK_event_evaluators_evaluator"`
    );
    await queryRunner.query(
      `ALTER TABLE "event_evaluators" DROP CONSTRAINT "FK_event_evaluators_event"`
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "event_evaluators"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "evaluator_status_enum"`);
  }
}
