import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import logger from "../config/logger";
import cookieParser from "cookie-parser";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  Register = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Registration failed", 400, errors));
        return;
      }

      const { email, password, firstName, lastName } = req.body;

      // Register user
      const user = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
      });

      const { verificationToken } =
        await this.authService.sendVerificationEmail(user.id);

      res.status(201).json(
        successResponse({
          message:
            "Registration successful. Please check your email to verify your account.",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          verificationToken,
        })
      );
    } catch (error) {
      logger.error("Error in registration: ", error);
      res.status(400).json(errorResponse("Registration failed", 400, error));
    }
  };

  Login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Login failed", 400, errors));
        return;
      }
      const { email, password } = req.body;

      const user = await this.authService.validateUser(email, password);

      if (!user) {
        res.status(401).json(errorResponse("Invalid credentials", 401));
        return;
      }

      const result = await this.authService.login(user);

      // Set cookies
      res.cookie("accessToken", result.accessToken, result.cookies.accessToken);
      res.cookie(
        "refreshToken",
        result.refreshToken,
        result.cookies.refreshToken
      );

      // Return tokens in response as well for clients that don't use cookies
      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (error) {
      logger.error("Error in login: ", error);
      res.status(500).json(errorResponse("Login failed", 500, error));
    }
  };

  Logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }

      const authService = new AuthService();
      await authService.logout(userId);

      // Clear cookies
      const logoutCookies = authService.getLogoutCookies();
      res.cookie("accessToken", "", logoutCookies.accessToken);
      res.cookie("refreshToken", "", logoutCookies.refreshToken);

      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      logger.error("Error in logout: ", error);
      res.status(500).json(errorResponse("Logout failed", 500, error));
    }
  };

  RefreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get token from cookie or request body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(400).json({ message: "Refresh token required" });
        return;
      }

      const authService = new AuthService();
      const result = await authService.refreshToken(refreshToken);

      // Set cookies
      res.cookie("accessToken", result.accessToken, result.cookies.accessToken);
      res.cookie(
        "refreshToken",
        result.refreshToken,
        result.cookies.refreshToken
      );

      // Return tokens in response as well
      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      logger.error("Error in refresh token: ", error);
      res.status(500).json(errorResponse("Refresh token failed", 500, error));
    }
  };

  RequestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      const user = await this.authService.requestPasswordReset(email);

      if (!user) {
        res.status(404).json(errorResponse("User not found", 404));
        return;
      }

      await this.authService.requestPasswordReset(email);

      res.json(successResponse("Password reset email sent"));
    } catch (error) {
      logger.error("Error in password reset request: ", error);
      res
        .status(500)
        .json(errorResponse("Password reset request failed", 500, error));
    }
  };

  ResetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      const success = await this.authService.resetPassword(token, newPassword);

      if (success) {
        res.json(successResponse("Password reset successfully"));
      } else {
        res.status(400).json(errorResponse("Invalid or expired token", 400));
      }
    } catch (error) {
      logger.error("Error in password reset: ", error);
      res.status(500).json(errorResponse("Password reset failed", 500, error));
    }
  };

  UpdateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Profile update failed", 400, errors));
        return;
      }

      const { firstName, lastName } = req.body;

      const updatedUser = await this.authService.updateProfile(req.user.id, {
        firstName,
        lastName,
      });

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = updatedUser;

      res.json(successResponse(userWithoutPassword));
    } catch (error) {
      logger.error("Error in profile update: ", error);
      res.status(500).json(errorResponse("Profile update failed", 500, error));
    }
  };

  VerifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Token is Invalid", 400, errors));
        return;
      }

      const { token } = req.params;

      const success = await this.authService.verifyEmail(token);

      console.log("Success: ", success);

      if (success) {
        res.json(successResponse("Email verified successfully"));
      } else {
        res.status(400).json(errorResponse("Invalid or expired token", 400));
      }
    } catch (error) {
      logger.error("Error in email verification: ", error);
      res
        .status(500)
        .json(errorResponse("Email verification failed", 500, error));
    }
  };

  GetProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const user = await this.authService.getUserById(Number(req.user.id));

      if (!user) {
        res.status(404).json(errorResponse("User not found", 404));
        return;
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      res.json(successResponse(userWithoutPassword));
    } catch (error) {
      logger.error("Error in getting profile: ", error);
      res.status(500).json(errorResponse("Failed to get profile", 500, error));
    }
  };

  ValidateInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Token is Invalid", 400, errors));
        return;
      }

      const { token } = req.params;

      const result = await this.authService.validateInvitationToken(token);

      res.json(
        successResponse({
          message: "Invitation validated successfully",
          result,
        })
      );
    } catch (error) {
      logger.error("Error in invitation validation: ", error);
      res
        .status(500)
        .json(errorResponse("Invitation validation failed", 500, error));
    }
  };

  GetPlayerProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const player = await this.authService.getPlayerProfile(req.user.id);

      if (!player) {
        res.status(404).json(errorResponse("Player not found", 404));
        return;
      }

      res.json(successResponse(player));
    } catch (error) {
      logger.error("Error in getting player profile: ", error);
      res
        .status(500)
        .json(errorResponse("Failed to get player profile", 500, error));
    }
  };

  UpdatePlayerProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Player profile update failed", 400, errors));
      }
      const { userId } = req.params;
      console.log(req.body)

      await this.authService.updatePlayerProfile(Number(userId), req.body);
      res.json(successResponse("Player profile updated successfully"));
    } catch (error) {
      logger.error("Error in updating player profile: ", error);
      res
        .status(500)
        .json(errorResponse("Failed to update player profile", 500, error));
    }
  };

  CompleteRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Token is Invalid", 400, errors));
        return;
      }

      const { token, password, firstName, lastName } = req.body;

      const result = await this.authService.completeRegistration(token, {
        password,
        firstName,
        lastName,
      });

      res.json(
        successResponse({
          message: "Registration completed successfully",
          result,
        })
      );
    } catch (error) {
      logger.error("Error in email verification: ", error);
      res
        .status(500)
        .json(errorResponse("Email verification failed", 500, error));
    }
  };
}
