//     "seed:saas": "ts-node src/seeder/SaasOwnerSeeder.ts",

import { DataSource } from "typeorm";
import bcrypt from "bcrypt";
import { SaasOwner } from "../entities/saas-owner.entity";
import { AppDataSource } from "../config/database";
import Logger from "../config/logger";

export class SaasOwnerSeeder {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
  }

  async run(): Promise<void> {
    try {
      Logger.info("Starting SaaS Owner seeder...");

      // Check if SaaS owner already exists
      const saasOwnerRepository = this.dataSource.getRepository(SaasOwner);
      const existingOwner = await saasOwnerRepository.findOne({
        where: {}
      });

      if (existingOwner) {
        Logger.warn("SaaS owner already exists. Skipping seeder.");
        console.log("Existing SaaS Owner:", {
          id: existingOwner.id,
          email: existingOwner.email,
          fullName: existingOwner.fullName,
          companyName: existingOwner.companyName,
          createdAt: existingOwner.createdAt
        });
        return;
      }

      // Create SaaS owner with secure password
      const password = "Admin123!@#"; // Strong default password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const saasOwnerData = {
        email: "admin@evolve360.com",
        passwordHash,
        firstName: "SaaS",
        lastName: "Owner",
        companyName: "Evolve 360",
        isActive: true,
      };

      const saasOwner = saasOwnerRepository.create(saasOwnerData);
      const savedOwner = await saasOwnerRepository.save(saasOwner);

      Logger.info("SaaS Owner created successfully!");
      
      console.log("\n🎉 SaaS Owner Seeder Completed!");
      console.log("==========================================");
      console.log("📧 Email:", savedOwner.email);
      console.log("🔑 Password:", password);
      console.log("👤 Name:", savedOwner.fullName);
      console.log("🏢 Company:", savedOwner.companyName);
      console.log("🆔 ID:", savedOwner.id);
      console.log("📅 Created:", savedOwner.createdAt);
      console.log("==========================================");
      console.log("⚠️  IMPORTANT: Change the password after first login!");
      console.log("🔗 Login URL: /api/v1/saas/auth/login");
      console.log("==========================================\n");

    } catch (error) {
      Logger.error("Error running SaaS Owner seeder:", error);
      throw error;
    }
  }
}

// Standalone seeder script
export const runSaasOwnerSeeder = async (): Promise<void> => {
  try {
    // Initialize database connection if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("Database connection initialized for seeding.");
    }

    // Run the seeder
    const seeder = new SaasOwnerSeeder();
    await seeder.run();

    // Close connection if we initialized it
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("Database connection closed.");
    }

  } catch (error) {
    console.error("Seeder failed:", error);
    process.exit(1);
  }
};

// If this file is run directly
if (require.main === module) {
  runSaasOwnerSeeder();
}