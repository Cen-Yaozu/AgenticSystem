// ============================================
// 基础类型
// ============================================

/**
 * 通用 ID 类型
 */
export type ID = string;

/**
 * 时间戳类型
 */
export type Timestamp = string; // ISO 8601 格式

// ============================================
// 用户相关类型
// ============================================

export interface User {
  id: ID;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// 助手相关类型
// ============================================

export interface AssistantSettings {
  responseStyle: 'detailed' | 'concise';
  tone: 'formal' | 'friendly';
  language: string;
  maxTokens: number;
  temperature: number;
  retrievalTopK: number;
  retrievalThreshold: number;
}

export interface Assistant {
  id: ID;
  userId: ID;
  name: string;
  description?: string;
  domain?: string;
  settings: AssistantSettings;
  status: 'initializing' | 'ready' | 'processing' | 'error';
  documentCount: number;
  conversationCount: number;
  workspacePath?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateAssistantInput {
  name: string;
  description?: string;
  domain?: string;
  settings?: Partial<AssistantSettings>;
}

export interface UpdateAssistantInput {
  name?: string;
  description?: string | null;
  domain?: string | null;
  settings?: Partial<AssistantSettings>;
}

// ============================================
// 文档相关类型
// ============================================

export type DocumentStatus = 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'xlsx';

export interface Document {
  id: ID;
  assistantId: ID;
  filename: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  progress: number;
  errorMessage?: string;
  chunkCount: number;
  metadata: Record<string, unknown>;
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
}

// ============================================
// 对话相关类型
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface SourceReference {
  documentId: ID;
  documentName: string;
  content: string;
  relevanceScore: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface MessageMetadata {
  sources?: SourceReference[];
  tokensUsed?: TokenUsage;
}

export interface Message {
  id: ID;
  conversationId: ID;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata;
  createdAt: Timestamp;
}

export interface Conversation {
  id: ID;
  assistantId: ID;
  title: string;
  status: 'active' | 'archived';
  messageCount: number;
  startedAt: Timestamp;
  lastMessageAt?: Timestamp;
}

export interface CreateConversationInput {
  assistantId: ID;
  title?: string;
}

export interface SendMessageInput {
  content: string;
}

// ============================================
// 角色相关类型
// ============================================

export interface RolePersonality {
  tone: 'formal' | 'friendly' | 'professional';
  verbosity: 'concise' | 'detailed' | 'balanced';
  expertise: string[];
}

export interface Role {
  id: ID;
  assistantId: ID;
  name: string;
  description?: string;
  promptTemplate?: string;
  capabilities: string[];
  personality: RolePersonality;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: Timestamp;
}

// ============================================
// 记忆相关类型
// ============================================

export type MemoryType = 'preference' | 'habit' | 'insight' | 'fact';

export interface Memory {
  id: ID;
  roleId: ID;
  type: MemoryType;
  content: string;
  schema?: string;
  strength: number;
  accessCount: number;
  createdAt: Timestamp;
  lastAccessedAt?: Timestamp;
}

// ============================================
// API 响应类型
// ============================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// 分页类型
// ============================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// SSE 事件类型
// ============================================

export type SSEEventType =
  | 'message_start'
  | 'content_delta'
  | 'source_reference'
  | 'message_complete'
  | 'error';

export interface SSEEvent<T = unknown> {
  event: SSEEventType;
  data: T;
}

export interface ContentDeltaEvent {
  delta: string;
}

export interface MessageCompleteEvent {
  messageId: ID;
  tokensUsed: TokenUsage;
}

export interface SSEErrorEvent {
  code: string;
  message: string;
}
