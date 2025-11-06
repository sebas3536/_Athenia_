export interface SearchResult {
  document_id: number;
  filename: string;
  score: number;
  snippet: string;
}

export interface AssistantQuery {
  query: string;
  top_k?: number;
}