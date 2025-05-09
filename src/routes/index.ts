/**
 * API Routes Index
 *
 * This file aggregates all API routes.
 */

import { Router } from "express";
import authRoutes from "./auth.routes";
const router = Router();

// Mount routes
router.use("/auth", authRoutes);
// router.use("/group", groupRoutes);
// router.use("/player", playerRoutes);
// router.use("/team", teamRoutes);
// router.use("/player-list", playerListRoutes);
router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});

export default router;
