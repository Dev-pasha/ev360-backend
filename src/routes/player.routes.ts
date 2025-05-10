import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { PlayerController } from "../controllers/player.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const playerController = new PlayerController();

router.post(
  "/:groupId",
  authMiddleware,
  requirePermission("create_players") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],

  playerController.CreatePlayer
);



export default router