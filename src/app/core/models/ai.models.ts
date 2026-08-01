export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface AiChatContext {
  subjectTitle?: string;
  topicTitle?: string;
  subjectId?: string;
  topicId?: string;
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  subjectTitle?: string;
  topicTitle?: string;
  subjectId?: string;
  topicId?: string;
  messages: AiChatMessage[];
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  context?: Pick<AiChatContext, 'subjectTitle' | 'topicTitle'>;
}

export interface AiChatResponse {
  reply: string;
}

export interface AiChatError {
  error: string;
  detail?: string;
}

/** Max conversations kept in localStorage per account. */
export const AI_CHAT_MAX_CONVERSATIONS = 40;

/** Max messages sent to the API per request (server also enforces this). */
export const AI_CHAT_MAX_API_MESSAGES = 20;
