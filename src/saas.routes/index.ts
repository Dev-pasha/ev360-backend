import { Router } from "express";
import saasRoutes from "./saas-owner.routes";
import trialExpirationRoutes from "./trial-expiration.routes";



const router = Router();

router.use('/', saasRoutes);
router.use('/trial-expiration', trialExpirationRoutes)

export default router;