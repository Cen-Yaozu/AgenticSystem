import { ERROR_CODES } from '@agentic-rag/shared';
import { AppError } from '../middleware/error.js';

/**
 * 助手不存在错误
 */
export class AssistantNotFoundError extends AppError {
  constructor(assistantId?: string) {
    super(
      ERROR_CODES.ASSISTANT_NOT_FOUND,
      assistantId ? `Assistant ${assistantId} not found` : 'Assistant not found',
      404
    );
    this.name = 'AssistantNotFoundError';
  }
}

/**
 * 助手名称必填错误
 */
export class AssistantNameRequiredError extends AppError {
  constructor() {
    super(
      ERROR_CODES.ASSISTANT_NAME_REQUIRED,
      'Assistant name is required',
      400
    );
    this.name = 'AssistantNameRequiredError';
  }
}

/**
 * 助手名称过长错误
 */
export class AssistantNameTooLongError extends AppError {
  constructor(maxLength: number) {
    super(
      ERROR_CODES.ASSISTANT_NAME_TOO_LONG,
      `Assistant name must not exceed ${maxLength} characters`,
      400
    );
    this.name = 'AssistantNameTooLongError';
  }
}

/**
 * 助手名称重复错误
 */
export class AssistantNameDuplicateError extends AppError {
  constructor(name: string) {
    super(
      ERROR_CODES.ASSISTANT_NAME_DUPLICATE,
      `Assistant with name "${name}" already exists`,
      409
    );
    this.name = 'AssistantNameDuplicateError';
  }
}

/**
 * 助手数量超限错误
 */
export class AssistantLimitExceededError extends AppError {
  constructor(limit: number) {
    super(
      ERROR_CODES.ASSISTANT_LIMIT_EXCEEDED,
      `Maximum number of assistants (${limit}) exceeded`,
      403
    );
    this.name = 'AssistantLimitExceededError';
  }
}

/**
 * 助手无法删除错误（正在处理中）
 */
export class AssistantCannotDeleteError extends AppError {
  constructor(reason: string = 'Assistant is currently processing') {
    super(
      ERROR_CODES.ASSISTANT_CANNOT_DELETE,
      reason,
      409
    );
    this.name = 'AssistantCannotDeleteError';
  }
}

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
