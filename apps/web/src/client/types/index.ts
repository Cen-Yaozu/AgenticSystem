/**
 * 前端类型定义
 * 从 @agentic-rag/shared 导入共享类型
 */

import type { SourceReference as SourceReferenceType } from '@agentic-rag/shared';

// 基础类型
export type {
  ID,
  Timestamp
} from '@agentic-rag/shared';

// 领域相关类型
export type {
  CreateDomainInput, Domain,
  DomainSettings,
  DomainStatus, MCPServerConfig,
  MCPServersConfig, UpdateDomainInput
} from '@agentic-rag/shared';

// 文档相关类型
export type {
  CreateDocumentInput, Document, DocumentListParams, DocumentMetadata, DocumentStatus,
  FileType, UpdateDocumentInput
} from '@agentic-rag/shared';

// 对话相关类型
export type {
  Conversation, CreateConversationInput, Message, MessageMetadata, MessageRole, SendMessageInput, SourceReference,
  TokenUsage
} from '@agentic-rag/shared';

// API 响应类型
export type {
  ApiErrorResponse, ApiResponse,
  ApiSuccessResponse, PaginatedResult, PaginationParams
} from '@agentic-rag/shared';

// SSE 事件类型
export type {
  ContentDeltaEvent,
  MessageCompleteEvent,
  SSEErrorEvent, SSEEvent, SSEEventType
} from '@agentic-rag/shared';

/**
 * 前端特有类型
 */

// WebSocket 连接状态
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// WebSocket 事件类型
export interface AgentXEvent {
  type: string;
  sessionId: string;
  data: unknown;
}

// 聊天消息（前端展示用）
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  sources?: SourceReferenceType[];
  createdAt: string;
}

// 表单状态
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
}

// 加载状态
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}
