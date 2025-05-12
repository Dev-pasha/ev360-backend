import { MigrationInterface, QueryRunner } from "typeorm";

export class InvitationSentAt1747057729863 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add invitation_sent_at column to events table
    await queryRunner.query(`
      ALTER TABLE "event_evaluators" 
      ADD COLUMN "invitation_sent_at" BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove invitation_sent_at column
    await queryRunner.query(`
      ALTER TABLE "events" 
      DROP COLUMN "send_invites"
    `);
  }
}
