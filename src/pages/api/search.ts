import type { NextApiRequest, NextApiResponse } from "next";

interface File {
  id: string;
  name: string;
  mimeType: string;
}

interface SubTopic {
  id: string;
  name: string;
  files: File[];
}

interface Topic {
  id: string;
  name: string;
  subTopics: SubTopic[];
}

interface DriveStructure {
  topics: Topic[];
}

let cachedStructure: DriveStructure | null = null;
const API_ENDPOINT = "http://localhost:5000/api/drive/structure";

async function fetchDriveStructure(): Promise<DriveStructure | null> {
  if (!cachedStructure) {
    try {
      const response = await fetch(API_ENDPOINT);
      cachedStructure = await response.json();
    } catch (error) {
      console.error("Error fetching drive structure:", error);
      return null;
    }
  }
  return cachedStructure;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  try {
    const structure = await fetchDriveStructure();
    if (!structure) {
      res.status(500).json({ error: "Unable to fetch drive structure" });
      return;
    }

    // Collect all Google Doc files
    const files: { name: string; url: string; topic: string; subTopic: string }[] = [];
    for (const topic of structure.topics) {
      for (const subTopic of topic.subTopics) {
        for (const file of subTopic.files) {
          if (file.mimeType === "application/vnd.google-apps.document") {
            files.push({
              name: file.name,
              url: `https://drive.google.com/file/d/${file.id}/view`,
              topic: topic.name,
              subTopic: subTopic.name,
            });
          }
        }
      }
    }

    // Filter files based on query
    const results = files.filter((file) =>
      file.name.toLowerCase().includes(q.toLowerCase())
    );

    res.status(200).json({ results });
  } catch (error) {
    console.error("Error handling search request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
