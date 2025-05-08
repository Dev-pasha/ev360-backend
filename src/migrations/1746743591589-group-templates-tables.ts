import { MigrationInterface, QueryRunner } from "typeorm";

export class GroupTemplatesTables1746743591589 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the group_templates table
    await queryRunner.query(`
            CREATE TABLE "group_templates" (
                "id" SERIAL PRIMARY KEY,
                "isCustomized" BOOLEAN NOT NULL DEFAULT false,
                "customName" VARCHAR NULL,
                "groupId" INTEGER,
                "baseTemplateId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_group_templates_group" FOREIGN KEY ("groupId") 
                REFERENCES "groups"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_group_templates_evaluation_template" FOREIGN KEY ("baseTemplateId") 
                REFERENCES "evaluation_templates"("id") ON DELETE SET NULL
            )
        `);

    // Create the group_template_categories table
    await queryRunner.query(`
            CREATE TABLE "group_template_categories" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "isCustom" BOOLEAN NOT NULL DEFAULT false,
                "groupTemplateId" INTEGER,
                "baseCategoryId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_group_template_categories_group_template" FOREIGN KEY ("groupTemplateId") 
                REFERENCES "group_templates"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_group_template_categories_template_category" FOREIGN KEY ("baseCategoryId") 
                REFERENCES "template_categories"("id") ON DELETE SET NULL
            )
        `);

    // Create the group_template_skills table
    await queryRunner.query(`
            CREATE TABLE "group_template_skills" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "isCustom" BOOLEAN NOT NULL DEFAULT false,
                "categoryId" INTEGER,
                "baseSkillId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_group_template_skills_group_template_category" FOREIGN KEY ("categoryId") 
                REFERENCES "group_template_categories"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_group_template_skills_template_skill" FOREIGN KEY ("baseSkillId") 
                REFERENCES "template_skills"("id") ON DELETE SET NULL
            )
        `);

    // Create the group_template_metrics table
    await queryRunner.query(`
            CREATE TABLE "group_template_metrics" (
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
                "isCustom" BOOLEAN NOT NULL DEFAULT false,
                "skillId" INTEGER,
                "baseMetricId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_group_template_metrics_group_template_skill" FOREIGN KEY ("skillId") 
                REFERENCES "group_template_skills"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_group_template_metrics_template_metric" FOREIGN KEY ("baseMetricId") 
                REFERENCES "template_metrics"("id") ON DELETE SET NULL
            )
        `);

    // Create the group_template_custom_labels table
    await queryRunner.query(`
            CREATE TABLE "group_template_custom_labels" (
                "id" SERIAL PRIMARY KEY,
                "label" VARCHAR NOT NULL,
                "type" "custom_label_type_enum" NOT NULL DEFAULT 'TEXT',
                "options" JSONB,
                "isCustom" BOOLEAN NOT NULL DEFAULT false,
                "groupTemplateId" INTEGER,
                "baseCustomLabelId" INTEGER,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_group_template_custom_labels_group_template" FOREIGN KEY ("groupTemplateId") 
                REFERENCES "group_templates"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_group_template_custom_labels_template_custom_label" FOREIGN KEY ("baseCustomLabelId") 
                REFERENCES "template_custom_labels"("id") ON DELETE SET NULL
            )
        `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_group_templates_groupId" ON "group_templates" ("groupId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_templates_baseTemplateId" ON "group_templates" ("baseTemplateId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_categories_groupTemplateId" ON "group_template_categories" ("groupTemplateId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_categories_baseCategoryId" ON "group_template_categories" ("baseCategoryId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_skills_categoryId" ON "group_template_skills" ("categoryId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_skills_baseSkillId" ON "group_template_skills" ("baseSkillId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_metrics_skillId" ON "group_template_metrics" ("skillId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_metrics_baseMetricId" ON "group_template_metrics" ("baseMetricId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_custom_labels_groupTemplateId" ON "group_template_custom_labels" ("groupTemplateId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_group_template_custom_labels_baseCustomLabelId" ON "group_template_custom_labels" ("baseCustomLabelId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_group_template_custom_labels_baseCustomLabelId"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_group_template_custom_labels_groupTemplateId"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_group_template_metrics_baseMetricId"`
    );
    await queryRunner.query(`DROP INDEX "IDX_group_template_metrics_skillId"`);
    await queryRunner.query(
      `DROP INDEX "IDX_group_template_skills_baseSkillId"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_group_template_skills_categoryId"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_group_template_categories_baseCategoryId"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_group_template_categories_groupTemplateId"`
    );
    await queryRunner.query(`DROP INDEX "IDX_group_templates_baseTemplateId"`);
    await queryRunner.query(`DROP INDEX "IDX_group_templates_groupId"`);

    // Drop tables in reverse order (to handle the foreign key constraints)
    await queryRunner.query(`DROP TABLE "group_template_custom_labels"`);
    await queryRunner.query(`DROP TABLE "group_template_metrics"`);
    await queryRunner.query(`DROP TABLE "group_template_skills"`);
    await queryRunner.query(`DROP TABLE "group_template_categories"`);
    await queryRunner.query(`DROP TABLE "group_templates"`);
  }
}
