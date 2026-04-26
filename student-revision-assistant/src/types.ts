export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  evaluation?: {
    score: number;
    feedback: string;
    idealAnswer: string;
  };
}

export interface IngestedContent {
  title: string;
  url: string;
  sourceType: string;
}
