import { AppDataSource } from '../src/config/database';
import * as path from 'path';
import * as fs from 'fs';

async function runSpecificMigration() {
  // Get migration name from command line
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    console.error('Please provide a migration name (e.g., 1746739135110-evaluation-templates-entities)');
    process.exit(1);
  }
  
  try {
    // Initialize the data source
    await AppDataSource.initialize();
    console.log('Database connection established');
    
    // Find the migration file
    const migrationsDir = path.join(__dirname, '../src/migrations');
    console.log(`Looking for migrations in: ${migrationsDir}`);
    
    const files = fs.readdirSync(migrationsDir);
    console.log(`Found files: ${files.join(', ')}`);
    
    const migrationFiles = files.filter(file => 
      file.endsWith('.ts') && file.includes(migrationName)
    );
    
    if (migrationFiles.length === 0) {
      console.error(`No migration files found matching: ${migrationName}`);
      process.exit(1);
    }
    
    const migrationFile = migrationFiles[0];
    console.log(`Found migration file: ${migrationFile}`);
    
    // Dynamically import the migration
    const migrationPath = path.join(migrationsDir, migrationFile);
    console.log(`Importing migration from: ${migrationPath}`);
    
    const migrationModule = await import(migrationPath);
    
    // Find the migration class (the first class that implements MigrationInterface)
    const MigrationClass = Object.values(migrationModule).find((exp: any) => 
      typeof exp === 'function' && 
      exp.prototype && 
      typeof exp.prototype.up === 'function' && 
      typeof exp.prototype.down === 'function'
    );
    
    if (!MigrationClass) {
      console.error('Could not find a valid migration class in the file');
      process.exit(1);
    }
    
    const migration = new (MigrationClass as any)();
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      console.log('Executing migration...');
      await migration.up(queryRunner);
      
      // Extract timestamp and name from filename
      const filenameParts = path.basename(migrationFile, '.ts').split('-');
      const timestamp = filenameParts[0];
      const name = filenameParts.slice(1).join('-');
      
      // Check if migrations table exists
      const tableExists = await queryRunner.hasTable('migrations');
      if (!tableExists) {
        console.log('Creating migrations table...');
        await queryRunner.query(`
          CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            timestamp VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL
          )
        `);
      }
      
      // Update migrations table
      console.log(`Recording migration in migrations table: ${timestamp}, ${name}`);
      await queryRunner.query(`
        INSERT INTO migrations(timestamp, name) 
        VALUES($1, $2)
        ON CONFLICT DO NOTHING
      `, [timestamp, name]);
      
      await queryRunner.commitTransaction();
      console.log('Migration executed and recorded successfully');
    } catch (error) {
      console.error('Error during migration execution:', error);
      await queryRunner.rollbackTransaction();
      process.exit(1);
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

runSpecificMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});