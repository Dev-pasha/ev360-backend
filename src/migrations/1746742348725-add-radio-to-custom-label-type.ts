import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRadioToCustomLabelType1746742348725 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // In PostgreSQL 9.6+, we can use ALTER TYPE ... ADD VALUE
        // This is a non-blocking operation that adds a new enum value
        await queryRunner.query(`
            ALTER TYPE "custom_label_type_enum" ADD VALUE IF NOT EXISTS 'RADIO'
        `);
        
        // If you're using an older version of PostgreSQL, or if your database
        // doesn't support the ADD VALUE command, you would use this approach instead:
        /*
        // Get the current type name in case it's different from our assumption
        const result = await queryRunner.query(`
            SELECT t.typname
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = 'custom_label_type_enum'
            LIMIT 1
        `);
        
        const typeName = result.length > 0 ? result[0].typname : 'custom_label_type_enum';
        
        // Create a new type with the additional value
        await queryRunner.query(`
            CREATE TYPE "${typeName}_new" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE', 'RADIO')
        `);
        
        // Update column to use the new type
        await queryRunner.query(`
            ALTER TABLE "template_custom_labels" 
            ALTER COLUMN "type" TYPE "${typeName}_new" 
            USING "type"::text::${typeName}_new
        `);
        
        // Drop old type
        await queryRunner.query(`
            DROP TYPE "${typeName}"
        `);
        
        // Rename new type to the old name
        await queryRunner.query(`
            ALTER TYPE "${typeName}_new" RENAME TO "${typeName}"
        `);
        */
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL doesn't allow removing enum values directly
        // We need to recreate the type without the 'RADIO' value
        
        // First, check if any rows use the 'RADIO' value
        const hasRadioValues = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM "template_custom_labels"
            WHERE "type" = 'RADIO'
        `);
        
        if (parseInt(hasRadioValues[0].count) > 0) {
            throw new Error(
                "Cannot revert migration: Some custom labels are using the 'RADIO' type. " +
                "Update these records before removing the enum value."
            );
        }
        
        // Create a new type without the 'RADIO' value
        await queryRunner.query(`
            CREATE TYPE "custom_label_type_enum_old" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE')
        `);
        
        // Update column to use the new type
        await queryRunner.query(`
            ALTER TABLE "template_custom_labels" 
            ALTER COLUMN "type" TYPE "custom_label_type_enum_old" 
            USING "type"::text::custom_label_type_enum_old
        `);
        
        // Drop old type
        await queryRunner.query(`
            DROP TYPE "custom_label_type_enum"
        `);
        
        // Rename new type to the old name
        await queryRunner.query(`
            ALTER TYPE "custom_label_type_enum_old" RENAME TO "custom_label_type_enum"
        `)

    };
}
