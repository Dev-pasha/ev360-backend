import { MigrationInterface, QueryRunner } from "typeorm";

export class MetricsAddToEvent1748694767912 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create event_metrics join table
    await queryRunner.query(`
      CREATE TABLE "event_metrics" (
        "event_id" INTEGER NOT NULL,
        "metric_id" INTEGER NOT NULL,
        
        CONSTRAINT "PK_event_metrics" PRIMARY KEY ("event_id", "metric_id"),
        CONSTRAINT "FK_event_metrics_event" FOREIGN KEY ("event_id") 
          REFERENCES "events" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_metrics_metric" FOREIGN KEY ("metric_id") 
          REFERENCES "group_template_metrics" ("id") ON DELETE CASCADE
      );

      -- Add indexes for event_metrics
      CREATE INDEX "IDX_event_metrics_event_id" ON "event_metrics" ("event_id");
      CREATE INDEX "IDX_event_metrics_metric_id" ON "event_metrics" ("metric_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop event_metrics table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "event_metrics";
    `);
  }
}
