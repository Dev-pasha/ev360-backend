import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body, param } from "express-validator";

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new staff user
 * @access  Public
 */
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Must be a valid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
  ],
  authController.Register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login
 * @access  Public
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Must be a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  authController.Login
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout
 * @access  Private
 */

router.post("/logout", authMiddleware, authController.Logout);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh token
 * @access  Private
 *
 */

router.post(
  "/refresh-token",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  authMiddleware,
  authController.RefreshToken
);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get(
  "/verify-email/:token",
  [param("token").notEmpty().withMessage("Token is required")],
  authController.VerifyEmail
);

/**
 * @route   POST /api/v1/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */

router.post(
  "/request-password-reset",
  [body("email").isEmail().withMessage("Must be a valid email address")],
  authController.RequestPasswordReset
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  authController.ResetPassword
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */

router.get("/profile", authMiddleware, authController.GetProfile);

router.get(
  "/invitation/:token",
  [param("token").notEmpty().withMessage("Token is required")],
  authController.ValidateInvitation
);

router.post(
  "/complete-registration",
  [
    body("token").notEmpty().withMessage("Token is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
  ],
  authController.CompleteRegistration
);

export default router;
