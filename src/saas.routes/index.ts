import { Router } from "express";
import saasRoutes from "./saas-owner.routes";



const router = Router();

router.use('/', saasRoutes);

export default router;