import e, { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import logger from "../config/logger";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  Register = async (req: Request, res: Response): Promise<void> => {
    try {
      // const { email, password, firstName, lastName } = req.body;
      // const user = await this.authService.register({
      //   email,
      //   password,
      //   firstName,
      //   lastName,
      // });

      // // Remove password hash from response
      // const { passwordHash, ...userWithoutPassword } = user;

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

      res.json(successResponse(result));
    } catch (error) {
      logger.error("Error in login: ", error);
      res.status(500).json(errorResponse("Login failed", 500, error));
    }
  };

  Logout = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      await this.authService.logout(req.user.id);

      res.json(successResponse("Logged out successfully"));
    } catch (error) {
      logger.error("Error in logout: ", error);
      res.status(500).json(errorResponse("Logout failed", 500, error));
    }
  };

  RefreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Refresh token failed", 400, errors));
        return;
      }

      const { refreshToken } = req.body;

      console.log("Refresh token: ", refreshToken);

      if (!refreshToken) {
        res.status(400).json({ message: "Refresh token is required" });
        return;
      }

      // Generate new tokens
      const tokens = await this.authService.refreshToken(refreshToken);

      if (!tokens) {
        res.status(401).json(errorResponse("Invalid refresh token", 401));
        return;
      }

      res.json(successResponse(tokens));
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

      const user = await this.authService.getUserById(req.user.id);

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
}
