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
import events from "./event.routes";
import subscriptionRoutes from "./subscription.routes";
import resourceRoutes from "./resource.routes";
import reportRoutes from "./report.routes";
import messageTemplateRoutes from "./message-template.routes";
import messageRoutes from "./message.routes";
import statsRoutes from "./stats.routes";

const router = Router();


// Mount routes
router.use('/stats', statsRoutes);
router.use("/auth", authRoutes);
router.use("/group", groupRoutes);
router.use("/evaluation-template", templates);
router.use("/group-templates", groupTemplateRoutes);
router.use("/group-position", positions);
router.use("/player-group", groupPlayer);
router.use("/team", team);
router.use("/player-list", playerListRoutes);
router.use("/events", events);
router.use("/subscriptions", subscriptionRoutes);
router.use("/resources", resourceRoutes);
router.use("/reports", reportRoutes);
router.use("/message-templates", messageTemplateRoutes);
router.use("/messages", messageRoutes);

router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});

export default router;
