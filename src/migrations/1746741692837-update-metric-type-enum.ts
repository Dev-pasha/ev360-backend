import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateMetricTypeEnum1746741692837 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Create a new enum type with the updated values
        await queryRunner.query(`
            CREATE TYPE "metric_type_enum_new" AS ENUM ('1', '2', '3', '4')
        `);

        // Step 2: Add a temporary column with the new enum type
        await queryRunner.query(`
            ALTER TABLE "template_metrics" 
            ADD COLUMN "metric_type_new" "metric_type_enum_new"
        `);

        // Step 3: Copy data from old enum to new enum with value mapping - WITH PROPER CASTING
        await queryRunner.query(`
            UPDATE "template_metrics" 
            SET "metric_type_new" = 
                CASE 
                    WHEN "metric_type" = '1' THEN '1'::"metric_type_enum_new"
                    WHEN "metric_type" = '2' THEN '2'::"metric_type_enum_new"
                    WHEN "metric_type" = '4' THEN '3'::"metric_type_enum_new"
                    WHEN "metric_type" = '5' THEN '4'::"metric_type_enum_new"
                    ELSE '1'::"metric_type_enum_new"
                END
        `);

        // Step 4: Drop the old column
        await queryRunner.query(`
            ALTER TABLE "template_metrics" DROP COLUMN "metric_type"
        `);

        // Step 5: Rename the new column to the original name
        await queryRunner.query(`
            ALTER TABLE "template_metrics" 
            RENAME COLUMN "metric_type_new" TO "metric_type"
        `);

        // Step 6: Add any constraints back (like NOT NULL or default)
        await queryRunner.query(`
            ALTER TABLE "template_metrics" 
            ALTER COLUMN "metric_type" SET DEFAULT '1'::"metric_type_enum_new"
        `);

        // Step 7: Drop the old enum type
        await queryRunner.query(`
            DROP TYPE "metric_type_enum"
        `);

        // Step 8: Rename the new enum type to the original name
        await queryRunner.query(`
            ALTER TYPE "metric_type_enum_new" RENAME TO "metric_type_enum"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Create the old enum type again
        await queryRunner.query(`
            CREATE TYPE "metric_type_enum_old" AS ENUM ('1', '2', '4', '5')
        `);

        // Step 2: Add a temporary column with the old enum type
        await queryRunner.query(`
            ALTER TABLE "template_metrics" 
            ADD COLUMN "metric_type_old" "metric_type_enum_old"
        `);

        // Step 3: Copy data back with the reverse mapping - WITH PROPER CASTING
        await queryRunner.query(`
            UPDATE "template_metrics" 
            SET "metric_type_old" = 
                CASE 
                    WHEN "metric_type" = '1' THEN '1'::"metric_type_enum_old"
                    WHEN "metric_type" = '2' THEN '2'::"metric_type_enum_old"
                    WHEN "metric_type" = '3' THEN '4'::"metric_type_enum_old"
                    WHEN "metric_type" = '4' THEN '5'::"metric_type_enum_old"
                    ELSE '1'::"metric_type_enum_old"
                END
        `);

        // Step 4: Drop the new column
        await queryRunner.query(`
            ALTER TABLE "template_metrics" DROP COLUMN "metric_type"
        `);

        // Step 5: Rename the old column to the original name
        await queryRunner.query(`
            ALTER TABLE "template_metrics" 
            RENAME COLUMN "metric_type_old" TO "metric_type"
        `);

        // Step 6: Add constraints back
        await queryRunner.query(`
            ALTER TABLE "template_metrics" 
            ALTER COLUMN "metric_type" SET DEFAULT '1'::"metric_type_enum_old"
        `);

        // Step 7: Drop the new enum type
        await queryRunner.query(`
            DROP TYPE "metric_type_enum"
        `);

        // Step 8: Rename the old enum type back to the original name
        await queryRunner.query(`
            ALTER TYPE "metric_type_enum_old" RENAME TO "metric_type_enum"
        `);
    }
}
