import express from "express";
import routes from "./routes";
import saasRoutes from "./saas.routes";
import cors from "cors";
import helmet from "helmet";
import { config } from "dotenv";
import { Application, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";

// Import middleware
import errorMiddleware from "./middleware/error.middleware";
import { requestLogger } from "./middleware/logger.middleware";

// Import routes

const app: Application = express();

// Load .env file
config();

// Apply middleware
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true, // This is crucial for cookies!
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies
app.use(requestLogger);

// Register routes


app.use('/api/v1/saas', saasRoutes);
app.use("/api/v1", routes);

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
