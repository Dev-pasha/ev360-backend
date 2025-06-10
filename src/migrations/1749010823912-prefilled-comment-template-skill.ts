import { MigrationInterface, QueryRunner } from "typeorm";

export class PrefilledCommentTemplateSkill1749010823912
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the table
    await queryRunner.query(`
            CREATE TABLE "group_template_skill_comments" (
                "id" SERIAL NOT NULL,
                "skillId" integer NOT NULL,
                "comment" text NOT NULL,
                "category" varchar(255),
                "order" integer NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_group_template_skill_comments" PRIMARY KEY ("id")
            )
        `);

    // Create foreign key constraint
    await queryRunner.query(`
            ALTER TABLE "group_template_skill_comments" 
            ADD CONSTRAINT "FK_skill_comments_skill" 
            FOREIGN KEY ("skillId") 
            REFERENCES "group_template_skills"("id") 
            ON DELETE CASCADE
        `);

    // Create index for better query performance
    await queryRunner.query(`
            CREATE INDEX "IDX_skill_comments_skill_active" 
            ON "group_template_skill_comments" ("skillId", "isActive")
        `);

    // Create index for ordering
    await queryRunner.query(`
            CREATE INDEX "IDX_skill_comments_order" 
            ON "group_template_skill_comments" ("skillId", "order")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_skill_comments_order"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_skill_comments_skill_active"`
    );

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "group_template_skill_comments" DROP CONSTRAINT IF EXISTS "FK_skill_comments_skill"`
    );

    // Drop table
    await queryRunner.query(
      `DROP TABLE IF EXISTS "group_template_skill_comments"`
    );
  }
}
