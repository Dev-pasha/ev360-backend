import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { PositionController } from "../controllers/position.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const positionController = new PositionController();


router.post(
  "/:groupId",
  authMiddleware,
  // requirePermission("manage_group_settings") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    body("name").notEmpty().withMessage("Position name is required"),
    body("description").optional(),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean"),
  ],
  positionController.CreatePosition
);

router.get(
  "/:groupId",
  authMiddleware,
  // requirePermission("manage_group_settings") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  positionController.GetPositions
);

router.put(
  "/:groupId",
  authMiddleware,
  // requirePermission("manage_group_settings") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
    query("positionId").isInt().withMessage("Position ID must be an integer"),
    body("name").optional(),
    body("description").optional(),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean"),
  ],
  positionController.UpdatePosition
);

router.delete(
  "/:groupId",
  authMiddleware,
  // requirePermission("manage_group_settings") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
    query("positionId").isInt().withMessage("Position ID must be an integer"),
  ],
  positionController.DeletePosition
);

export default router;
