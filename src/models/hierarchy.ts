// models/hierarchy.ts
export interface Hierarchy {
  id: string;
  name?: string;
  type: "folder" | "file";
  link?: string;
  contents: Hierarchy[];
}
