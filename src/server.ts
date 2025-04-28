import dotenv from "dotenv";
import path from "path";
import app from "./app";
import config from "./config";
import cors from "cors";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Add CORS middleware
app.use(cors({
  origin: "https://sportyne-fe.onrender.com",
}));

// Start the server
app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
});
