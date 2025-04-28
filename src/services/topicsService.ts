// services/topicsService.ts
import { Topic } from "../models/topics";
import { DriveService } from "./driveService";

export class TopicService {
  private driveService: DriveService;

  constructor() {
    this.driveService = DriveService.getInstance();
  }

  async ListTopics(): Promise<Topic[]> {
    console.log("Fetching fresh data from Google Drive");
    const driveStructure = await this.driveService.getDriveStructure();
    const topics = driveStructure.map((hierarchy) => ({
      id: hierarchy.id,
      name: hierarchy.name || "",
      type: hierarchy.type,
      link: hierarchy.link || "",
      subTopics: (hierarchy.contents || []).map((subHierarchy) => ({
        id: subHierarchy.id,
        name: subHierarchy.name || "",
        type: subHierarchy.type,
        link: subHierarchy.link || "",
        posts: (subHierarchy.contents || [])
          .filter((post) => !!post.id) // Only include posts with a valid id
          .map((post) => ({
            id: post.id,
            name: post.name || "",
            type: post.type,
            link: post.link || "",
            url: post.link || "",
          })),
      })),
    }));
    return topics;
  }
}
