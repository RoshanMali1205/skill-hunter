export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatContext {
  subjectTitle?: string;
  topicTitle?: string;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  context?: AiChatContext;
}

export interface AiChatResponse {
  reply: string;
}

export interface AiChatError {
  error: string;
  detail?: string;
}
