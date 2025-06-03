import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMessageTables1747700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      CREATE TYPE "recipient_type_enum" AS ENUM ('PLAYERS', 'EVALUATORS');
      CREATE TYPE "message_status_enum" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
    `);

    // Create message_templates table
    await queryRunner.query(`
      CREATE TABLE "message_templates" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "subject" VARCHAR NOT NULL,
        "body" TEXT NOT NULL,
        "group_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_message_templates_group" FOREIGN KEY ("group_id") 
        REFERENCES "groups"("id") ON DELETE CASCADE
      )
    `);

    // Create messages table
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" SERIAL PRIMARY KEY,
        "subject" VARCHAR NOT NULL,
        "body" TEXT NOT NULL,
        "recipient_type" "recipient_type_enum" NOT NULL,
        "group_id" INTEGER NOT NULL,
        "reply_to_id" INTEGER NOT NULL,
        "sent_date" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_messages_group" FOREIGN KEY ("group_id") 
        REFERENCES "groups"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_reply_to" FOREIGN KEY ("reply_to_id") 
        REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create message_recipients table
    await queryRunner.query(`
      CREATE TABLE "message_recipients" (
        "id" SERIAL PRIMARY KEY,
        "message_id" INTEGER NOT NULL,
        "player_id" INTEGER,
        "evaluator_id" INTEGER,
        "email" VARCHAR NOT NULL,
        "status" "message_status_enum" NOT NULL DEFAULT 'PENDING',
        "last_updated_date" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_message_recipients_message" FOREIGN KEY ("message_id") 
        REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_recipients_player" FOREIGN KEY ("player_id") 
        REFERENCES "players"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_message_recipients_evaluator" FOREIGN KEY ("evaluator_id") 
        REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_message_templates_group_id" ON "message_templates" ("group_id");
      CREATE INDEX "IDX_messages_group_id" ON "messages" ("group_id");
      CREATE INDEX "IDX_messages_reply_to_id" ON "messages" ("reply_to_id");
      CREATE INDEX "IDX_message_recipients_message_id" ON "message_recipients" ("message_id");
      CREATE INDEX "IDX_message_recipients_player_id" ON "message_recipients" ("player_id");
      CREATE INDEX "IDX_message_recipients_evaluator_id" ON "message_recipients" ("evaluator_id");
      CREATE INDEX "IDX_message_recipients_status" ON "message_recipients" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`
      DROP TABLE IF EXISTS "message_recipients";
      DROP TABLE IF EXISTS "messages";
      DROP TABLE IF EXISTS "message_templates";
      
      DROP TYPE IF EXISTS "message_status_enum";
      DROP TYPE IF EXISTS "recipient_type_enum";
    `);
  }
}