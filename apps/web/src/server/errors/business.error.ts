import { ERROR_CODES } from '@agentic-rag/shared';
import { AppError } from '../middleware/error.js';

// ============================================
// 领域相关错误
// ============================================

/**
 * 领域不存在错误
 */
export class DomainNotFoundError extends AppError {
  constructor(domainId?: string) {
    super(
      ERROR_CODES.DOMAIN_NOT_FOUND,
      domainId ? `Domain ${domainId} not found` : 'Domain not found',
      404
    );
    this.name = 'DomainNotFoundError';
  }
}

/**
 * 领域名称必填错误
 */
export class DomainNameRequiredError extends AppError {
  constructor() {
    super(
      ERROR_CODES.DOMAIN_NAME_REQUIRED,
      'Domain name is required',
      400
    );
    this.name = 'DomainNameRequiredError';
  }
}

/**
 * 领域名称过长错误
 */
export class DomainNameTooLongError extends AppError {
  constructor(maxLength: number) {
    super(
      ERROR_CODES.DOMAIN_NAME_TOO_LONG,
      `Domain name must not exceed ${maxLength} characters`,
      400
    );
    this.name = 'DomainNameTooLongError';
  }
}

/**
 * 领域名称重复错误
 */
export class DomainNameDuplicateError extends AppError {
  constructor(name: string) {
    super(
      ERROR_CODES.DOMAIN_NAME_DUPLICATE,
      `Domain with name "${name}" already exists`,
      409
    );
    this.name = 'DomainNameDuplicateError';
  }
}

/**
 * 领域数量超限错误
 */
export class DomainLimitExceededError extends AppError {
  constructor(limit: number) {
    super(
      ERROR_CODES.DOMAIN_LIMIT_EXCEEDED,
      `Maximum number of domains (${limit}) exceeded`,
      403
    );
    this.name = 'DomainLimitExceededError';
  }
}

/**
 * 领域无法删除错误（正在处理中）
 */
export class DomainCannotDeleteError extends AppError {
  constructor(reason: string = 'Domain is currently processing') {
    super(
      ERROR_CODES.DOMAIN_CANNOT_DELETE,
      reason,
      409
    );
    this.name = 'DomainCannotDeleteError';
  }
}

// ============================================
// 对话相关错误
// ============================================

/**
 * 对话不存在错误
 */
export class ConversationNotFoundError extends AppError {
  constructor(conversationId?: string) {
    super(
      'CONVERSATION_NOT_FOUND',
      conversationId ? `Conversation ${conversationId} not found` : 'Conversation not found',
      404
    );
    this.name = 'ConversationNotFoundError';
  }
}

// ============================================
// 向后兼容别名（将在未来版本移除）
// ============================================

/** @deprecated 使用 DomainNotFoundError 代替 */
export const AssistantNotFoundError = DomainNotFoundError;
/** @deprecated 使用 DomainNameRequiredError 代替 */
export const AssistantNameRequiredError = DomainNameRequiredError;
/** @deprecated 使用 DomainNameTooLongError 代替 */
export const AssistantNameTooLongError = DomainNameTooLongError;
/** @deprecated 使用 DomainNameDuplicateError 代替 */
export const AssistantNameDuplicateError = DomainNameDuplicateError;
/** @deprecated 使用 DomainLimitExceededError 代替 */
export const AssistantLimitExceededError = DomainLimitExceededError;
/** @deprecated 使用 DomainCannotDeleteError 代替 */
export const AssistantCannotDeleteError = DomainCannotDeleteError;

// ============================================
// 通用错误
// ============================================

/**
 * 未授权错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(
      ERROR_CODES.UNAUTHORIZED,
      message,
      401
    );
    this.name = 'UnauthorizedError';
  }
}
