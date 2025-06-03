import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { SaasOwner } from "../entities/saas-owner.entity";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Logger from "../config/logger";
import authConfig from "../config/auth";

export interface CreateSaasOwnerDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface SaasOwnerAuthResponse {
  token: string;
  owner: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    fullName: string;
  };
}

export class SaasOwnerService {
  private saasOwnerRepository: Repository<SaasOwner>;
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;

  constructor() {
    this.saasOwnerRepository = AppDataSource.getRepository(SaasOwner);
    this.JWT_SECRET = authConfig.jwtSecret;
    this.JWT_EXPIRES_IN = authConfig.jwtExpiresIn;
  }

  /**
   * Check if any SaaS owner exists (for bootstrap protection)
   */
  async saasOwnerExists(): Promise<boolean> {
    try {
      const count = await this.saasOwnerRepository.count();
      return count > 0;
    } catch (error) {
      Logger.error("Error checking if SaaS owner exists:", error);
      throw error;
    }
  }

  /**
   * Create the first SaaS owner (bootstrap)
   */
  async createSaasOwner(ownerData: CreateSaasOwnerDto): Promise<SaasOwner> {
    try {
      // Check if SaaS owner already exists
      const exists = await this.saasOwnerExists();
      if (exists) {
        throw new Error(
          "SaaS owner already exists. Only one SaaS owner is allowed."
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ownerData.email)) {
        throw new Error("Invalid email format");
      }

      // Validate password strength
      if (ownerData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Hash the password
      const saltRounds = 12; // Higher for SaaS owner
      const passwordHash = await bcrypt.hash(ownerData.password, saltRounds);

      // Create SaaS owner
      const saasOwner = this.saasOwnerRepository.create({
        email: ownerData.email.toLowerCase().trim(),
        passwordHash,
        firstName: ownerData.firstName?.trim(),
        lastName: ownerData.lastName?.trim(),
        companyName: ownerData.companyName?.trim(),
        isActive: true,
      });

      const savedOwner = await this.saasOwnerRepository.save(saasOwner);

      Logger.info(`SaaS owner created successfully: ${savedOwner.email}`);
      return savedOwner;
    } catch (error) {
      Logger.error("Error creating SaaS owner:", error);
      throw error;
    }
  }

  /**
   * Authenticate SaaS owner login
   */
  async login(loginData: LoginDto): Promise<SaasOwnerAuthResponse> {
    try {
      const { email, password } = loginData;

      // Find SaaS owner by email
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });

      if (!saasOwner) {
        throw new Error("Invalid email or password");
      }

      if (!saasOwner.isActive) {
        throw new Error("Account is deactivated");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        password,
        saasOwner.passwordHash
      );
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Update last login time
      saasOwner.lastLoginAt = new Date();
      await this.saasOwnerRepository.save(saasOwner);

      const payload = {
        id: saasOwner.id,
        email: saasOwner.email,
        type: "saas_owner",
      };

      // Generate JWT token
      const token = jwt.sign(payload, authConfig.jwtSecret, {
        expiresIn: Number(authConfig.jwtExpiresIn) || "10h", // Default to 2 hours if not set
      });

      Logger.info(`SaaS owner logged in: ${saasOwner.email}`);

      return {
        token,
        owner: {
          id: saasOwner.id,
          email: saasOwner.email,
          firstName: saasOwner.firstName,
          lastName: saasOwner.lastName,
          companyName: saasOwner.companyName,
          fullName: saasOwner.fullName,
        },
      };
    } catch (error) {
      Logger.error("Error during SaaS owner login:", error);
      throw error;
    }
  }

  /**
   * Get SaaS owner profile
   */
  async getProfile(ownerId: number): Promise<SaasOwner> {
    try {
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { id: ownerId },
      });

      if (!saasOwner) {
        throw new Error("SaaS owner not found");
      }

      return saasOwner;
    } catch (error) {
      Logger.error("Error fetching SaaS owner profile:", error);
      throw error;
    }
  }

  /**
   * Update SaaS owner profile
   */
  async updateProfile(
    ownerId: number,
    updateData: {
      firstName?: string;
      lastName?: string;
      companyName?: string;
    }
  ): Promise<SaasOwner> {
    try {
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { id: ownerId },
      });

      if (!saasOwner) {
        throw new Error("SaaS owner not found");
      }

      // Update fields
      if (updateData.firstName !== undefined) {
        saasOwner.firstName = updateData.firstName.trim();
      }
      if (updateData.lastName !== undefined) {
        saasOwner.lastName = updateData.lastName.trim();
      }
      if (updateData.companyName !== undefined) {
        saasOwner.companyName = updateData.companyName.trim();
      }

      const updatedOwner = await this.saasOwnerRepository.save(saasOwner);

      Logger.info(`SaaS owner profile updated: ${updatedOwner.email}`);
      return updatedOwner;
    } catch (error) {
      Logger.error("Error updating SaaS owner profile:", error);
      throw error;
    }
  }

  /**
   * Change SaaS owner password
   */
  async changePassword(
    ownerId: number,
    passwordData: ChangePasswordDto
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = passwordData;

      // Find SaaS owner
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { id: ownerId },
      });

      if (!saasOwner) {
        throw new Error("SaaS owner not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        saasOwner.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters long");
      }

      if (newPassword === currentPassword) {
        throw new Error("New password must be different from current password");
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      saasOwner.passwordHash = newPasswordHash;
      await this.saasOwnerRepository.save(saasOwner);

      Logger.info(`SaaS owner password changed: ${saasOwner.email}`);
    } catch (error) {
      Logger.error("Error changing SaaS owner password:", error);
      throw error;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    try {
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });

      if (!saasOwner) {
        throw new Error("SaaS owner not found");
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

      // Save token
      saasOwner.passwordResetToken = resetToken;
      saasOwner.passwordResetExpires = resetExpires;
      await this.saasOwnerRepository.save(saasOwner);

      Logger.info(`Password reset token generated for: ${saasOwner.email}`);
      return resetToken;
    } catch (error) {
      Logger.error("Error generating password reset token:", error);
      throw error;
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetData: ResetPasswordDto): Promise<void> {
    try {
      const { token, newPassword } = resetData;

      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { passwordResetToken: token },
      });

      if (!saasOwner || !saasOwner.isPasswordResetTokenValid()) {
        throw new Error("Invalid or expired reset token");
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      saasOwner.passwordHash = passwordHash;
      saasOwner.passwordResetToken = null;
      saasOwner.passwordResetExpires = null;
      await this.saasOwnerRepository.save(saasOwner);

      Logger.info(`Password reset completed for: ${saasOwner.email}`);
    } catch (error) {
      Logger.error("Error resetting password:", error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, authConfig.jwtSecret);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  /**
   * Deactivate SaaS owner account (soft delete)
   */
  async deactivateAccount(ownerId: number): Promise<void> {
    try {
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { id: ownerId },
      });

      if (!saasOwner) {
        throw new Error("SaaS owner not found");
      }

      saasOwner.isActive = false;
      await this.saasOwnerRepository.save(saasOwner);

      Logger.info(`SaaS owner account deactivated: ${saasOwner.email}`);
    } catch (error) {
      Logger.error("Error deactivating SaaS owner account:", error);
      throw error;
    }
  }

  /**
   * Get login history/stats
   */
  async getLoginStats(ownerId: number): Promise<any> {
    try {
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { id: ownerId },
      });

      if (!saasOwner) {
        throw new Error("SaaS owner not found");
      }

      return {
        lastLoginAt: saasOwner.lastLoginAt,
        accountCreated: saasOwner.createdAt,
        isActive: saasOwner.isActive,
        daysSinceCreation: Math.floor(
          (Date.now() - saasOwner.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      };
    } catch (error) {
      Logger.error("Error getting login stats:", error);
      throw error;
    }
  }

  /**
   * Change SaaS owner email
   */
  async changeEmail(
    ownerId: number,
    changeEmailData: {
      password: string;
      newEmail: string;
    }
  ): Promise<SaasOwner> {
    try {
      const { password, newEmail } = changeEmailData;

      // Find SaaS owner
      const saasOwner = await this.saasOwnerRepository.findOne({
        where: { id: ownerId },
      });

      if (!saasOwner) {
        throw new Error("SaaS owner not found");
      }

      // Verify password for security
      const isPasswordValid = await bcrypt.compare(
        password,
        saasOwner.passwordHash
      );
      if (!isPasswordValid) {
        throw new Error("Password is incorrect");
      }

      // Validate new email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        throw new Error("Invalid email format");
      }

      const normalizedEmail = newEmail.toLowerCase().trim();

      // Check if new email is same as current
      if (normalizedEmail === saasOwner.email) {
        throw new Error("New email must be different from current email");
      }

      // Check if email already exists (shouldn't happen since only one SaaS owner, but good practice)
      const existingOwner = await this.saasOwnerRepository.findOne({
        where: { email: normalizedEmail },
      });

      if (existingOwner) {
        throw new Error("Email already exists");
      }

      // Update email
      saasOwner.email = normalizedEmail;
      const updatedOwner = await this.saasOwnerRepository.save(saasOwner);

      Logger.info(
        `SaaS owner email changed from ${saasOwner.email} to ${normalizedEmail}`
      );
      return updatedOwner;
    } catch (error) {
      Logger.error("Error changing SaaS owner email:", error);
      throw error;
    }
  }

  
}
