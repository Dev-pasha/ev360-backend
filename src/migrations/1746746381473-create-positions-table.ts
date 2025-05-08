import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePositionsTable1746746381473 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the positions table
    await queryRunner.query(`
            CREATE TABLE "positions" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "description" VARCHAR NULL,
                "is_active" BOOLEAN NOT NULL DEFAULT true,
                "groupId" INTEGER,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_positions_group" FOREIGN KEY ("groupId") 
                REFERENCES "groups"("id") ON DELETE SET NULL
            )
        `);

    // Create an index for the foreign key for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_positions_groupId" ON "positions" ("groupId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`DROP INDEX "IDX_positions_groupId"`);

    // Drop the table
    await queryRunner.query(`DROP TABLE "positions"`);
  }
}
