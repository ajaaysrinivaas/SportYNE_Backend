export interface FolderContents {
    name: string | null | undefined;
    id: string; // Non-nullable
    type: "folder" | "file";
    link: string | null | undefined;
  }
  