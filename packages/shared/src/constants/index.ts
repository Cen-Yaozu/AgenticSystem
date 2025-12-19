// ============================================
// 文件类型常量
// ============================================

export const SUPPORTED_FILE_TYPES = ['pdf', 'docx', 'txt', 'md', 'xlsx'] as const;

export const FILE_TYPE_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const MIME_TYPE_FILE_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

// ============================================
// 文件大小限制
// ============================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_MB = 10;

// ============================================
// 状态常量
// ============================================

export const DOMAIN_STATUS = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  PROCESSING: 'processing',
  ERROR: 'error',
} as const;

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 DOMAIN_STATUS 代替 */
export const ASSISTANT_STATUS = DOMAIN_STATUS;

export const DOCUMENT_STATUS = {
  UPLOADING: 'uploading',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

// ============================================
// 错误码常量
// ============================================

export const ERROR_CODES = {
  // 通用错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 领域相关
  DOMAIN_NOT_FOUND: 'DOMAIN_NOT_FOUND',
  DOMAIN_NAME_REQUIRED: 'DOMAIN_NAME_REQUIRED',
  DOMAIN_NAME_TOO_LONG: 'DOMAIN_NAME_TOO_LONG',
  DOMAIN_LIMIT_EXCEEDED: 'DOMAIN_LIMIT_EXCEEDED',
  DOMAIN_NAME_DUPLICATE: 'DOMAIN_NAME_DUPLICATE',
  DOMAIN_CANNOT_DELETE: 'DOMAIN_CANNOT_DELETE',

  // 向后兼容别名（将在未来版本移除）
  /** @deprecated 使用 DOMAIN_NOT_FOUND 代替 */
  ASSISTANT_NOT_FOUND: 'DOMAIN_NOT_FOUND',
  /** @deprecated 使用 DOMAIN_NAME_REQUIRED 代替 */
  ASSISTANT_NAME_REQUIRED: 'DOMAIN_NAME_REQUIRED',
  /** @deprecated 使用 DOMAIN_NAME_TOO_LONG 代替 */
  ASSISTANT_NAME_TOO_LONG: 'DOMAIN_NAME_TOO_LONG',
  /** @deprecated 使用 DOMAIN_LIMIT_EXCEEDED 代替 */
  ASSISTANT_LIMIT_EXCEEDED: 'DOMAIN_LIMIT_EXCEEDED',
  /** @deprecated 使用 DOMAIN_NAME_DUPLICATE 代替 */
  ASSISTANT_NAME_DUPLICATE: 'DOMAIN_NAME_DUPLICATE',
  /** @deprecated 使用 DOMAIN_CANNOT_DELETE 代替 */
  ASSISTANT_CANNOT_DELETE: 'DOMAIN_CANNOT_DELETE',

  // 文档相关
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_TOO_LARGE: 'DOCUMENT_TOO_LARGE',
  DOCUMENT_TYPE_NOT_SUPPORTED: 'DOCUMENT_TYPE_NOT_SUPPORTED',
  DOCUMENT_LIMIT_EXCEEDED: 'DOCUMENT_LIMIT_EXCEEDED',
  DOCUMENT_PROCESSING_FAILED: 'DOCUMENT_PROCESSING_FAILED',
  DOCUMENT_ALREADY_PROCESSING: 'DOCUMENT_ALREADY_PROCESSING',

  // 对话相关
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  MESSAGE_CONTENT_REQUIRED: 'MESSAGE_CONTENT_REQUIRED',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  GENERATION_TIMEOUT: 'GENERATION_TIMEOUT',
  GENERATION_ABORTED: 'GENERATION_ABORTED',
  LLM_SERVICE_ERROR: 'LLM_SERVICE_ERROR',

  // 角色相关
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  ROLE_NAME_DUPLICATE: 'ROLE_NAME_DUPLICATE',
  ROLE_LIMIT_EXCEEDED: 'ROLE_LIMIT_EXCEEDED',
  CANNOT_DELETE_DEFAULT_ROLE: 'CANNOT_DELETE_DEFAULT_ROLE',

  // 记忆相关
  MEMORY_NOT_FOUND: 'MEMORY_NOT_FOUND',
} as const;

// ============================================
// 分页默认值
// ============================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================
// 领域限制
// ============================================

export const MAX_DOMAINS_PER_USER = 10;
export const MAX_DOMAIN_NAME_LENGTH = 100;
export const MAX_DOMAIN_DESCRIPTION_LENGTH = 500;

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 MAX_DOMAINS_PER_USER 代替 */
export const MAX_ASSISTANTS_PER_USER = MAX_DOMAINS_PER_USER;
/** @deprecated 使用 MAX_DOMAIN_NAME_LENGTH 代替 */
export const MAX_ASSISTANT_NAME_LENGTH = MAX_DOMAIN_NAME_LENGTH;
/** @deprecated 使用 MAX_DOMAIN_DESCRIPTION_LENGTH 代替 */
export const MAX_ASSISTANT_DESCRIPTION_LENGTH = MAX_DOMAIN_DESCRIPTION_LENGTH;

// ============================================
// 文档限制
// ============================================

export const MAX_DOCUMENTS_PER_DOMAIN = 100;

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 MAX_DOCUMENTS_PER_DOMAIN 代替 */
export const MAX_DOCUMENTS_PER_ASSISTANT = MAX_DOCUMENTS_PER_DOMAIN;
export const MAX_DOCUMENT_RETRY_COUNT = 3;

// ============================================
// 对话限制
// ============================================

export const MAX_MESSAGES_PER_CONVERSATION = 1000;
export const MAX_MESSAGE_LENGTH = 10000;
export const CONTEXT_WINDOW_SIZE = 10; // 最近 10 条消息

// ============================================
// 角色限制
// ============================================

export const MAX_ROLES_PER_DOMAIN = 10;

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 MAX_ROLES_PER_DOMAIN 代替 */
export const MAX_ROLES_PER_ASSISTANT = MAX_ROLES_PER_DOMAIN;

// ============================================
// 默认设置
// ============================================

export const DEFAULT_DOMAIN_SETTINGS = {
  responseStyle: 'detailed' as const,
  tone: 'formal' as const,
  language: 'zh-CN',
  maxTokens: 4000,
  temperature: 0.7,
  retrievalTopK: 5,
  retrievalThreshold: 0.7,
};

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 DEFAULT_DOMAIN_SETTINGS 代替 */
export const DEFAULT_ASSISTANT_SETTINGS = DEFAULT_DOMAIN_SETTINGS;

// ============================================
// 文档处理配置
// ============================================

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;

// ============================================
// API 路径
// ============================================

export const API_PATHS = {
  HEALTH: '/health',
  DOMAINS: '/api/domains',
  DOCUMENTS: '/api/documents',
  CONVERSATIONS: '/api/conversations',
  MESSAGES: '/api/messages',
  ROLES: '/api/roles',
  MEMORIES: '/api/memories',

  // 向后兼容别名（将在未来版本移除）
  /** @deprecated 使用 DOMAINS 代替 */
  ASSISTANTS: '/api/domains',
} as const;
