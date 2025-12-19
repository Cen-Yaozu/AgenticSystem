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
// 领域相关类型
// ============================================

export interface DomainSettings {
  responseStyle: 'detailed' | 'concise';
  tone: 'formal' | 'friendly';
  language: string;
  maxTokens: number;
  temperature: number;
  retrievalTopK: number;
  retrievalThreshold: number;
}

export type DomainStatus = 'initializing' | 'ready' | 'processing' | 'error';

export interface Domain {
  id: ID;
  userId: ID;
  name: string;
  description?: string;
  expertise?: string;
  settings: DomainSettings;
  status: DomainStatus;
  documentCount: number;
  conversationCount: number;
  workspacePath?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateDomainInput {
  name: string;
  description?: string;
  expertise?: string;
  settings?: Partial<DomainSettings>;
}

export interface UpdateDomainInput {
  name?: string;
  description?: string | null;
  expertise?: string | null;
  settings?: Partial<DomainSettings>;
}

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 DomainSettings 代替 */
export type AssistantSettings = DomainSettings;
/** @deprecated 使用 Domain 代替 */
export type Assistant = Domain;
/** @deprecated 使用 CreateDomainInput 代替 */
export type CreateAssistantInput = CreateDomainInput;
/** @deprecated 使用 UpdateDomainInput 代替 */
export type UpdateAssistantInput = UpdateDomainInput;

// ============================================
// 文档相关类型
// ============================================

export type DocumentStatus = 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'xlsx';

export interface DocumentMetadata {
  title?: string;
  author?: string;
  pageCount?: number;
  [key: string]: unknown;
}

export interface Document {
  id: ID;
  domainId: ID;
  /** @deprecated 使用 domainId 代替 */
  assistantId?: ID;
  filename: string;
  fileType: FileType;
  fileSize: number;
  filePath: string;
  status: DocumentStatus;
  progress: number;
  errorMessage?: string;
  chunkCount: number;
  retryCount: number;
  metadata: DocumentMetadata;
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
}

export interface CreateDocumentInput {
  filename: string;
  fileType: FileType;
  fileSize: number;
  filePath: string;
}

export interface UpdateDocumentInput {
  status?: DocumentStatus;
  progress?: number;
  errorMessage?: string | null;
  chunkCount?: number;
  retryCount?: number;
  metadata?: DocumentMetadata;
  processedAt?: Timestamp;
}

export interface DocumentListParams extends PaginationParams {
  status?: DocumentStatus;
}

// ============================================
// 文档处理相关类型
// ============================================

export interface ParseResult {
  success: boolean;
  content: string;
  metadata: DocumentMetadata;
  error?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: ID;
  content: string;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    documentId: string;
    documentName: string;
    content: string;
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
  };
}

export interface ProcessingProgress {
  stage: 'validation' | 'extraction' | 'cleaning' | 'chunking' | 'embedding' | 'indexing';
  progress: number;
  message?: string;
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
  domainId: ID;
  title: string;
  status: 'active' | 'archived';
  messageCount: number;
  startedAt: Timestamp;
  lastMessageAt?: Timestamp;
}

export interface CreateConversationInput {
  domainId: ID;
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
  domainId: ID;
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
