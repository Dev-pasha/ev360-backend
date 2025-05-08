import { MigrationInterface, QueryRunner } from "typeorm";

export class EvaluationTemplatesEntities1746739135110
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
            CREATE TYPE "metric_type_enum" AS ENUM ('1', '2', '4', '5')
        `);

    await queryRunner.query(`
            CREATE TYPE "custom_label_type_enum" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE')
        `);

    // Create evaluation_templates table
    await queryRunner.query(`
            CREATE TABLE "evaluation_templates" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "is_custom" BOOLEAN NOT NULL DEFAULT false,
                "sport" INTEGER NOT NULL,
                "level" INTEGER NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

    // Create template_categories table
    await queryRunner.query(`
            CREATE TABLE "template_categories" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "templateId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_template_categories_template" FOREIGN KEY ("templateId") 
                REFERENCES "evaluation_templates"("id") ON DELETE CASCADE
            )
        `);

    // Create template_skills table
    await queryRunner.query(`
            CREATE TABLE "template_skills" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "categoryId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_template_skills_category" FOREIGN KEY ("categoryId") 
                REFERENCES "template_categories"("id") ON DELETE CASCADE
            )
        `);

    // Create template_metrics table
    await queryRunner.query(`
            CREATE TABLE "template_metrics" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "order" INTEGER NOT NULL,
                "metric_type" "metric_type_enum" NOT NULL DEFAULT '1',
                "min_value" DECIMAL(10,2),
                "max_value" DECIMAL(10,2),
                "step" DECIMAL(10,2),
                "units" VARCHAR,
                "lower_score_is_better" BOOLEAN NOT NULL DEFAULT false,
                "info" TEXT,
                "meta" JSONB,
                "skillId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_template_metrics_skill" FOREIGN KEY ("skillId") 
                REFERENCES "template_skills"("id") ON DELETE CASCADE
            )
        `);

    // Create template_custom_labels table
    await queryRunner.query(`
            CREATE TABLE "template_custom_labels" (
                "id" SERIAL PRIMARY KEY,
                "label" VARCHAR NOT NULL,
                "type" "custom_label_type_enum" NOT NULL DEFAULT 'TEXT',
                "options" JSONB,
                "templateId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_template_custom_labels_template" FOREIGN KEY ("templateId") 
                REFERENCES "evaluation_templates"("id") ON DELETE CASCADE
            )
        `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_evaluation_templates_name" ON "evaluation_templates" ("name")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_evaluation_templates_sport" ON "evaluation_templates" ("sport")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_evaluation_templates_level" ON "evaluation_templates" ("level")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_template_categories_templateId" ON "template_categories" ("templateId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_template_skills_categoryId" ON "template_skills" ("categoryId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_template_metrics_skillId" ON "template_metrics" ("skillId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_template_custom_labels_templateId" ON "template_custom_labels" ("templateId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_template_custom_labels_templateId"`
    );
    await queryRunner.query(`DROP INDEX "IDX_template_metrics_skillId"`);
    await queryRunner.query(`DROP INDEX "IDX_template_skills_categoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_template_categories_templateId"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_templates_level"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_templates_sport"`);
    await queryRunner.query(`DROP INDEX "IDX_evaluation_templates_name"`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "template_custom_labels"`);
    await queryRunner.query(`DROP TABLE "template_metrics"`);
    await queryRunner.query(`DROP TABLE "template_skills"`);
    await queryRunner.query(`DROP TABLE "template_categories"`);
    await queryRunner.query(`DROP TABLE "evaluation_templates"`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE "custom_label_type_enum"`);
    await queryRunner.query(`DROP TYPE "metric_type_enum"`);
  }
}
