import { MigrationInterface, QueryRunner } from "typeorm";

export class NoteFieldToEvaluationResult1748948632585 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<void> {
        // Add note column to evaluation_results table
        await queryRunner.query(`
            ALTER TABLE "evaluation_results"
            ADD COLUMN "note" TEXT;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop note column
        await queryRunner.query(`
            ALTER TABLE "evaluation_results"
            DROP COLUMN IF EXISTS "note";
        `);
    }

}
