import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEvaluationResultTable1747055240577
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create evaluation_results table
    await queryRunner.query(`
      CREATE TABLE "evaluation_results" (
        "id" SERIAL PRIMARY KEY,
        "score" DECIMAL(10,2),
        "comment" TEXT,
        "choice_value" INTEGER,
        "attempt_number" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "eventId" INTEGER,
        "playerId" INTEGER,
        "evaluatorId" INTEGER,
        "metricId" INTEGER
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "evaluation_results" 
      ADD CONSTRAINT "FK_evaluation_results_event" 
      FOREIGN KEY ("eventId") 
      REFERENCES "events" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results" 
      ADD CONSTRAINT "FK_evaluation_results_player" 
      FOREIGN KEY ("playerId") 
      REFERENCES "players" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results" 
      ADD CONSTRAINT "FK_evaluation_results_evaluator" 
      FOREIGN KEY ("evaluatorId") 
      REFERENCES "users" ("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results" 
      ADD CONSTRAINT "FK_evaluation_results_metric" 
      FOREIGN KEY ("metricId") 
      REFERENCES "group_template_metrics" ("id") 
      ON DELETE CASCADE
    `);

    // Create unique constraint to ensure one evaluation per player/evaluator/metric combo per event
    await queryRunner.query(`
      ALTER TABLE "evaluation_results" 
      ADD CONSTRAINT "UQ_evaluation_result" 
      UNIQUE ("eventId", "playerId", "evaluatorId", "metricId")
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_eventId" ON "evaluation_results" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_playerId" ON "evaluation_results" ("playerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_evaluatorId" ON "evaluation_results" ("evaluatorId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_metricId" ON "evaluation_results" ("metricId")
    `);

    // Composite index for common queries
    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_event_player" ON "evaluation_results" ("eventId", "playerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_event_evaluator" ON "evaluation_results" ("eventId", "evaluatorId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_evaluation_results_event_evaluator"`
    );
    await queryRunner.query(`DROP INDEX "IDX_evaluation_results_event_player"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_results_metricId"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_results_evaluatorId"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_results_playerId"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_results_eventId"`);

    // Drop unique constraint
    await queryRunner.query(
      `ALTER TABLE "evaluation_results" DROP CONSTRAINT "UQ_evaluation_result"`
    );

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "evaluation_results" DROP CONSTRAINT "FK_evaluation_results_metric"`
    );
    await queryRunner.query(
      `ALTER TABLE "evaluation_results" DROP CONSTRAINT "FK_evaluation_results_evaluator"`
    );
    await queryRunner.query(
      `ALTER TABLE "evaluation_results" DROP CONSTRAINT "FK_evaluation_results_player"`
    );
    await queryRunner.query(
      `ALTER TABLE "evaluation_results" DROP CONSTRAINT "FK_evaluation_results_event"`
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "evaluation_results"`);
  }
}
