import express from "express";
import routes from "./routes";
import cors from "cors";
import helmet from "helmet";
import { config } from "dotenv";
import { Application, Request, Response, NextFunction } from "express";

// Import middleware
import errorMiddleware from "./middleware/error.middleware";
import { requestLogger } from "./middleware/logger.middleware";

// Import routes

const app: Application = express();

// Load .env file
config();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Register routes

app.get("/test", (req: Request, res: Response) => {
  res.json({ message: "Auth route is working!" });
});
app.use("/api/v1", routes);
// app.use('/api/auth', authRoutes);
// app.use('/api', groupRoutes);
// app.use('/api', playerRoutes);
// app.use('/api', teamRoutes);
// app.use('/api', playerListRoutes);
// app.use('/api', categoryRoutes);
// app.use('/api', positionRoutes);
// app.use('/api', customLabelRoutes);

// Health check endpoint

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Apply error handling middleware
app.use(errorMiddleware);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Resource not found",
  });
});

export default app;
