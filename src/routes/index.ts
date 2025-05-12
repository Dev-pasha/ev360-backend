/**
 * API Routes Index
 *
 * This file aggregates all API routes.
 */

import { Router } from "express";
import authRoutes from "./auth.routes";
import groupRoutes from "./group.routes";
import templates from "./evaluation-template.routes";
import groupTemplateRoutes from "./group-template.routes";
import positions from "./position.routes";
import groupPlayer from "./player.routes";
import team from "./team.routes";
import playerListRoutes from "./player-list.routes";
const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/group", groupRoutes);
router.use("/evaluation-template", templates);
router.use("/group-template", groupTemplateRoutes);
router.use("/group-position", positions);
router.use("/player-group", groupPlayer);
router.use("/team", team);
router.use("/player-list", playerListRoutes);
// router.use("/player", playerRoutes);
// router.use("/team", teamRoutes);
router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});

export default router;
