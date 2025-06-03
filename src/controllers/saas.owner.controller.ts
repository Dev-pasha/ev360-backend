import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { SaasOwnerService } from "../services/saas-owner.service";
import { errorResponse, successResponse } from "../utils/response";
import Logger from "../config/logger";
import { EmailService } from "../services/email.service";

export class SaasOwnerController {
  private saasOwnerService: SaasOwnerService;
  private emailService: EmailService;

  constructor() {
    this.saasOwnerService = new SaasOwnerService();
    this.emailService = new EmailService();
  }

  /**
   * Bootstrap - Create the first SaaS owner
   * POST /api/v1/bootstrap/create-saas-owner
   */
  createSaasOwner = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { email, password, firstName, lastName, companyName } = req.body;

      // Check if SaaS owner already exists
      const exists = await this.saasOwnerService.saasOwnerExists();
      if (exists) {
        res.status(409).json(errorResponse("SaaS owner already exists", 409));
        return;
      }

      const saasOwner = await this.saasOwnerService.createSaasOwner({
        email,
        password,
        firstName,
        lastName,
        companyName,
      });

      // Don't return password hash
      const {
        passwordHash,
        passwordResetToken,
        passwordResetExpires,
        ...ownerData
      } = saasOwner;

      res
        .status(201)
        .json(successResponse(ownerData, "SaaS owner created successfully"));
    } catch (error) {
      Logger.error("Error creating SaaS owner:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to create SaaS owner",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * SaaS owner login
   * POST /api/v1/saas/auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { email, password } = req.body;

      const authResponse = await this.saasOwnerService.login({
        email,
        password,
      });

      res.status(200).json(successResponse(authResponse, "Login successful"));
    } catch (error) {
      Logger.error("Error during SaaS owner login:", error);
      res
        .status(401)
        .json(
          errorResponse(
            "Login failed",
            401,
            error instanceof Error ? error.message : "Invalid credentials"
          )
        );
    }
  };

  /**
   * Get SaaS owner profile
   * GET /api/v1/saas/profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const saasOwner = (req as any).saasOwner;

      const profile = await this.saasOwnerService.getProfile(saasOwner.id);

      // Don't return sensitive data
      const {
        passwordHash,
        passwordResetToken,
        passwordResetExpires,
        ...profileData
      } = profile;

      res
        .status(200)
        .json(successResponse(profileData, "Profile retrieved successfully"));
    } catch (error) {
      Logger.error("Error fetching SaaS owner profile:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch profile",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Update SaaS owner profile
   * PATCH /api/v1/saas/profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const saasOwner = (req as any).saasOwner;
      const { firstName, lastName, companyName } = req.body;

      const updatedProfile = await this.saasOwnerService.updateProfile(
        saasOwner.id,
        {
          firstName,
          lastName,
          companyName,
        }
      );

      // Don't return sensitive data
      const {
        passwordHash,
        passwordResetToken,
        passwordResetExpires,
        ...profileData
      } = updatedProfile;

      res
        .status(200)
        .json(successResponse(profileData, "Profile updated successfully"));
    } catch (error) {
      Logger.error("Error updating SaaS owner profile:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to update profile",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Change SaaS owner password
   * POST /api/v1/saas/change-password
   */
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const saasOwner = (req as any).saasOwner;
      const { currentPassword, newPassword } = req.body;

      await this.saasOwnerService.changePassword(saasOwner.id, {
        currentPassword,
        newPassword,
      });

      res
        .status(200)
        .json(successResponse(null, "Password changed successfully"));
    } catch (error) {
      Logger.error("Error changing SaaS owner password:", error);
      res
        .status(400)
        .json(
          errorResponse(
            "Failed to change password",
            400,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Request password reset
   * POST /api/v1/saas/forgot-password
   */
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { email } = req.body;

      const resetToken =
        await this.saasOwnerService.generatePasswordResetToken(email);

      if (!resetToken) {
        res
          .status(404)
          .json(
            errorResponse(
              "Email not found",
              404,
              "No account associated with this email"
            )
          );

        return;
      }

      await this.emailService.sendPasswordResetEmail(email, resetToken);
      res
        .status(200)
        .json(
          successResponse(
            { message: "If the email exists, a reset link has been sent" },
            "Password reset initiated"
          )
        );
    } catch (error) {
      Logger.error("Error generating password reset token:", error);
      // Always return success to prevent email enumeration
      res
        .status(200)
        .json(
          successResponse(
            { message: "If the email exists, a reset link has been sent" },
            "Password reset initiated"
          )
        );
    }
  };

  /**
   * Reset password with token
   * POST /api/v1/saas/reset-password
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { token, newPassword } = req.body;

      await this.saasOwnerService.resetPassword({
        token,
        newPassword,
      });

      res
        .status(200)
        .json(successResponse(null, "Password reset successfully"));
    } catch (error) {
      Logger.error("Error resetting password:", error);
      res
        .status(400)
        .json(
          errorResponse(
            "Failed to reset password",
            400,
            error instanceof Error ? error.message : "Invalid or expired token"
          )
        );
    }
  };

  /**
   * Get account statistics
   * GET /api/v1/saas/stats
   */
  getAccountStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const saasOwner = (req as any).saasOwner;

      const stats = await this.saasOwnerService.getLoginStats(saasOwner.id);

      res
        .status(200)
        .json(successResponse(stats, "Account stats retrieved successfully"));
    } catch (error) {
      Logger.error("Error fetching account stats:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch account stats",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Check if SaaS owner exists (for frontend routing)
   * GET /api/v1/bootstrap/check
   */
  checkSaasOwnerExists = async (req: Request, res: Response): Promise<void> => {
    try {
      const exists = await this.saasOwnerService.saasOwnerExists();

      res
        .status(200)
        .json(successResponse({ exists }, "Status retrieved successfully"));
    } catch (error) {
      Logger.error("Error checking SaaS owner existence:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to check status",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Logout (client-side token deletion, but track on server)
   * POST /api/v1/saas/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const saasOwner = (req as any).saasOwner;

      // Log the logout event
      Logger.info(`SaaS owner logged out: ${saasOwner.email}`);

      res.status(200).json(successResponse(null, "Logged out successfully"));
    } catch (error) {
      Logger.error("Error during logout:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Logout failed",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };
}
