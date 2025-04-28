// app.ts

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import driveRoutes from "./routes/driveRoutes";
import foodRoutes from "./routes/foodRoutes"; // Ensure foodRoutes.ts exists
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Enable CORS for requests from frontend
app.use(cors({
  origin: "https://sportyne-fe.onrender.com", // Allow requests from this origin
}));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Server is running smoothly");
});

// Routes
app.use("/api/drive", driveRoutes); // Google Drive routes
app.use("/api/foods", foodRoutes);  // Food Tracker routes

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
