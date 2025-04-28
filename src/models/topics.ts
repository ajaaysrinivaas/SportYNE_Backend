// models/topics.ts
export interface Topic {
    id: string;
    name: string;
    type: "folder" | "file";
    link: string;
    subTopics: SubTopic[];
  }
  
  export interface SubTopic {
    id: string;
    name: string;
    type: "folder" | "file";
    link: string;
    posts: Post[];
  }
  
  export interface Post {
    id: string;
    name: string;
    type: "folder" | "file";
    link: string;
    url: string;
  }
  