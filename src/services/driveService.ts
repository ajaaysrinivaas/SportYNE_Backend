// services/driveService.ts
import { drive_v3, google } from "googleapis";
import config from "../config";
import { Hierarchy } from "../models/hierarchy";
import { InvalidConfigError } from "../models/invalidConfigError";

export class DriveService {
  private static instance: DriveService;
  private cachedStructure: Hierarchy[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

  // In-memory file content cache
  private documentCache: { [key: string]: string } = {};
  private cacheSize = 0;
  private readonly MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10 MB

  private drive: drive_v3.Drive;

  private constructor() {
    if (!config.GOOGLE_DRIVE_KEY_PATH) {
      throw new InvalidConfigError("GOOGLE_DRIVE_KEY_PATH is not set in the environment variables.");
    }
    const credentials = require(config.GOOGLE_DRIVE_KEY_PATH);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    this.drive = google.drive({ version: "v3", auth });
  }

  public static getInstance(): DriveService {
    if (!DriveService.instance) {
      DriveService.instance = new DriveService();
    }
    return DriveService.instance;
  }

  public getCachedStructure(): Hierarchy[] | null {
    return this.cachedStructure;
  }

  private addToCache(fileId: string, content: string): void {
    const contentSize = Buffer.byteLength(content, "utf8");
    // Evict oldest entries if needed.
    while (this.cacheSize + contentSize > this.MAX_CACHE_SIZE) {
      const oldestFileId = Object.keys(this.documentCache)[0];
      if (!oldestFileId) break;
      const oldestContentSize = Buffer.byteLength(this.documentCache[oldestFileId], "utf8");
      delete this.documentCache[oldestFileId];
      this.cacheSize -= oldestContentSize;
      console.log(`Evicted file with ID: ${oldestFileId} from cache.`);
    }
    this.documentCache[fileId] = content;
    this.cacheSize += contentSize;
    console.log(`Added file with ID: ${fileId} to cache.`);
  }

  async getGoogleDocAsHTML(fileId: string): Promise<string> {
    if (this.documentCache[fileId]) {
      console.log(`Serving file with ID: ${fileId} from cache.`);
      return this.documentCache[fileId];
    }
    try {
      console.log(`Fetching file metadata for ID: ${fileId}`);
      const metadata = await this.drive.files.get({
        fileId,
        fields: "name, mimeType",
      });
      if (metadata.data.mimeType !== "application/vnd.google-apps.document") {
        throw new Error(`File with ID ${fileId} is not a Google Docs document.`);
      }
      const res = await this.drive.files.export({
        fileId,
        mimeType: "text/html",
      });
      const content = res.data as string;
      this.addToCache(fileId, content);
      return content;
    } catch (error) {
      console.error(`Error fetching file with ID ${fileId}:`, (error as Error).message);
      throw new Error(`Failed to fetch file content for fileId ${fileId}: ${(error as Error).message}`);
    }
  }

  async fetchAllFiles(): Promise<drive_v3.Schema$File[]> {
    try {
      console.log("Fetching all files from Google Drive...");
      let files: drive_v3.Schema$File[] = [];
      let pageToken: string | null | undefined = null;

      do {
        const params: drive_v3.Params$Resource$Files$List = {
          q: "trashed = false",
          fields: "nextPageToken, files(id, name, mimeType, parents, webViewLink, webContentLink)",
          pageSize: 1000,
        };

        if (pageToken) {
          params.pageToken = pageToken;
        }

        const res = await this.drive.files.list(params);
        if (res.data.files && res.data.files.length > 0) {
          files = files.concat(res.data.files);
        }
        pageToken = res.data.nextPageToken;
      } while (pageToken);

      return files;
    } catch (error) {
      console.error("Error fetching files:", (error as Error).message);
      throw new InvalidConfigError("Failed to fetch files.");
    }
  }

  private buildHierarchy(files: drive_v3.Schema$File[], parentId: string): Hierarchy[] {
    return files
      .filter((file) => (file.parents || []).includes(parentId))
      .map((file) => ({
        name: file.name || '',
        type: file.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file",
        id: file.id!, // non-null assertion
        link: file.webViewLink || file.webContentLink || undefined,
        contents:
          file.mimeType === "application/vnd.google-apps.folder"
            ? this.buildHierarchy(files, file.id!)
            : [],
      }));
  }

  async getDriveStructure(): Promise<Hierarchy[]> {
    const rootFolderId = config.GOOGLE_DRIVE_FOLDER_ID;
    if (!rootFolderId) {
      throw new InvalidConfigError("GOOGLE_DRIVE_FOLDER_ID is not set in the environment variables");
    }
    const now = Date.now();
    if (this.cachedStructure && this.cacheTimestamp && now - this.cacheTimestamp < this.CACHE_REFRESH_INTERVAL) {
      return this.cachedStructure;
    }
    try {
      console.log("Refreshing root folder structure cache...");
      const files = await this.fetchAllFiles();
      this.cachedStructure = this.buildHierarchy(files, rootFolderId);
      this.cacheTimestamp = now;
      return this.cachedStructure;
    } catch (error) {
      console.error("Error fetching and caching root structure:", (error as Error).message);
      throw new InvalidConfigError("Failed to fetch and cache root structure.");
    }
  }

  async getFolderContentsById(folderId: string): Promise<Hierarchy[]> {
    if (this.cachedStructure) {
      const folder = this.findFolderInCache(this.cachedStructure, folderId);
      if (folder) {
        console.log(`Found folder contents for folder ID: ${folderId} in cache.`);
        return folder.contents.map((item) => ({ ...item, contents: [] }));
      }
    }
    try {
      console.log(`Fetching contents of folder ID: ${folderId} from Google Drive.`);
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, webViewLink, webContentLink)",
        pageSize: 1000,
      });
      if (!res.data.files) {
        return [];
      }
      const folderContents: Hierarchy[] = res.data.files.map((file) => ({
        name: file.name || '',
        type: file.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file",
        id: file.id!,
        link: file.webViewLink || file.webContentLink || undefined,
        contents: [],
      }));
      if (this.cachedStructure) {
        const folder = this.findFolderInCache(this.cachedStructure, folderId);
        if (folder) {
          folder.contents = folderContents;
        }
      }
      return folderContents;
    } catch (error) {
      console.error(`Error fetching folder contents for ID ${folderId}:`, (error as Error).message);
      throw new InvalidConfigError("Failed to fetch folder contents.");
    }
  }

  private findFolderInCache(structure: Hierarchy[], folderId: string): Hierarchy | null {
    if (!structure || !Array.isArray(structure)) return null;
    for (const item of structure) {
      if (item.id === folderId) {
        return item;
      }
      if (item.contents && item.contents.length > 0) {
        const result = this.findFolderInCache(item.contents, folderId);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  async refreshCache(): Promise<{ message: string }> {
    if (!config.GOOGLE_DRIVE_FOLDER_ID) {
      throw new InvalidConfigError("GOOGLE_DRIVE_FOLDER_ID is not set in the environment variables.");
    }
    try {
      console.log("Refreshing entire cache...");
      const files = await this.fetchAllFiles();
      this.cachedStructure = this.buildHierarchy(files, config.GOOGLE_DRIVE_FOLDER_ID);
      this.cacheTimestamp = Date.now();
      this.documentCache = {};
      this.cacheSize = 0;
      console.log("Cache refreshed successfully.");
      return { message: "Cache refreshed successfully." };
    } catch (error) {
      console.error("Error refreshing cache:", (error as Error).message);
      throw new InvalidConfigError("Failed to refresh cache.");
    }
  }

  invalidateCachedStructure(): void {
    this.cachedStructure = null;
    this.cacheTimestamp = null;
    console.log("Cache invalidated.");
  }
}
