import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class SaasOwner1748964206405 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create saas_owners table
    await queryRunner.createTable(
      new Table({
        name: "saas_owners",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "email",
            type: "varchar",
            length: "255",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "password_hash",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "first_name",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "last_name",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "company_name",
            type: "varchar",
            length: "200",
            isNullable: true,
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "last_login_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "password_reset_token",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "password_reset_expires",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true // if table already exists, drop it
    );

    // Create index on email for faster lookups
    await queryRunner.createIndex(
      "saas_owners",
      new TableIndex({
        name: "IDX_SAAS_OWNERS_EMAIL",
        columnNames: ["email"],
      })
    );

    // Create index on last_login_at for analytics
    await queryRunner.createIndex(
      "saas_owners",
      new TableIndex({
        name: "IDX_SAAS_OWNERS_LAST_LOGIN",
        columnNames: ["last_login_at"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex("saas_owners", "IDX_SAAS_OWNERS_LAST_LOGIN");
    await queryRunner.dropIndex("saas_owners", "IDX_SAAS_OWNERS_EMAIL");

    // Drop the table
    await queryRunner.dropTable("saas_owners");
  }
}
