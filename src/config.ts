import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Export configuration
const config = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_KEY_PATH: process.env.GOOGLE_DRIVE_KEY_PATH,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT || "5432", 10),
  DB_NAME: process.env.DB_NAME,
};

if (!config.GOOGLE_DRIVE_KEY_PATH) {
  throw new Error(
    "Google Drive credentials are missing or not properly configured in the .env file."
  );
}

if (!config.GOOGLE_DRIVE_FOLDER_ID) {
  throw new Error("Google Drive root folder ID is not configured in the .env file.");
}

export default config;