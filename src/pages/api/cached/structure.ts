import { NextApiRequest, NextApiResponse } from 'next';
import { DriveService } from '../../../services/driveService';

// Obtain the singleton instance
const driveService = DriveService.getInstance();

/**
 * API handler for fetching the cached Google Drive folder structure or refreshing the cache.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === "GET") {
      console.log("Fetching cached Google Drive structure...");
      const structure = await driveService.getDriveStructure(); // Fetches the cached folder structure
      res.status(200).json(structure);
    } 
    else if (method === "POST") {
      console.log("Refreshing cache...");
      const result = await driveService.refreshCache(); // Refreshes the entire cache
      res.status(200).json(result);
    }
    else {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).json({ error: `Method ${method} not allowed` });
    }
  }
  catch (error) {
    console.error("Error in API handler:", (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
}