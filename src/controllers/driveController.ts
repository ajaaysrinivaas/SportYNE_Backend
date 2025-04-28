// controllers/driveController.ts
import { Request, Response } from "express";
import { DriveService } from "../services/driveService";
import { TopicService } from "../services/topicsService";
import { Hierarchy } from "../models/hierarchy";
import { SearchResult } from "../interfaces/searchResult";

const driveService = DriveService.getInstance();
const topicService = new TopicService();

async function fetchRootStructure(_: Request, res: Response): Promise<void> {
  try {
    console.log("Fetching root folder structure...");
    const structure = await topicService.ListTopics();
    res.status(200).json(structure);
  } catch (error) {
    console.error("Error in fetchRootStructure:", (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
}

async function fetchFolderContentsByTopic(req: Request, res: Response): Promise<void> {
  const folderId = req.params.folderId;
  if (!folderId) {
    res.status(400).json({ error: "Folder ID is required." });
    return;
  }
  try {
    console.log(`Fetching contents for folder ID: ${folderId}`);
    const folderContents = await driveService.getFolderContentsById(folderId);
    res.status(200).json(folderContents);
  } catch (error) {
    console.error(`Error in fetchFolderContentsByTopic for folder ID: ${folderId}:`, (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
}

async function fetchGoogleDocAsHTML(req: Request, res: Response): Promise<void> {
  const fileId = req.params.fileId;
  if (!fileId) {
    res.status(400).json({ error: "File ID is required." });
    return;
  }
  try {
    console.log(`Fetching Google Doc as HTML for file ID: ${fileId}`);
    const htmlContent = await driveService.getGoogleDocAsHTML(fileId);
    res.status(200).send(htmlContent);
  } catch (error) {
    console.error(`Error fetching Google Doc as HTML for file ID ${fileId}:`, (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
}

function invalidateCache(_: Request, res: Response): void {
  try {
    console.log("Invalidating cache...");
    driveService.invalidateCachedStructure();
    res.status(200).json({ message: "Cache invalidated successfully." });
  } catch (error) {
    console.error("Error invalidating cache:", (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
}

async function refreshCacheHandler(_: Request, res: Response): Promise<void> {
  try {
    console.log("Refreshing cache...");
    const result = await driveService.refreshCache();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error refreshing cache:", (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
}

async function searchFiles(req: Request, res: Response): Promise<void> {
  const query = req.query.query?.toString().toLowerCase();
  if (!query) {
    res.status(400).json({ error: "Query parameter is required." });
    return;
  }
  try {
    const structure: Hierarchy[] | null = driveService.getCachedStructure();
    if (!structure) {
      res.status(503).json({ error: "Drive structure not available. Please try again later." });
      return;
    }
    const results: SearchResult[] = [];

    const findFolderPath = (items: Hierarchy[], fileId: string): string | null => {
      for (const item of items) {
        if (item.id === fileId) {
          return item.name || null;
        }
        if (item.type === "folder" && item.contents.length > 0) {
          const path = findFolderPath(item.contents, fileId);
          if (path) {
            return item.name ? `${item.name}/${path}` : path;
          }
        }
      }
      return null;
    };

    const searchRecursive = (items: Hierarchy[], currentTopic: string) => {
      items.forEach(item => {
        if (item.type === "file" && item.name?.toLowerCase().includes(query)) {
          const folderPath = findFolderPath(structure, item.id) || "Unknown";
          results.push({
            name: item.name!,
            fileId: item.id,
            url: item.link || "",
            topic: currentTopic,
            folder: folderPath,
          });
        } else if (item.type === "folder" && item.contents.length > 0) {
          const newTopic = item.name || currentTopic;
          searchRecursive(item.contents, newTopic);
        }
      });
    };

    searchRecursive(structure, "Root");
    res.status(200).json({ results });
  } catch (error) {
    console.error("Error in searchFiles:", (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
}

export {
  fetchRootStructure,
  fetchFolderContentsByTopic,
  fetchGoogleDocAsHTML,
  invalidateCache,
  refreshCacheHandler,
  searchFiles,
};
