import type { Context, ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger } from '../utils/logger.js';

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: ContentfulStatusCode = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 全局错误处理中间件
 */
export const errorHandler: ErrorHandler = (err, c: Context) => {
  // 记录错误日志
  logger.error({
    err,
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
  }, 'Request error');

  // 处理 HTTPException
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: err.message,
      },
    }, err.status);
  }

  // 处理应用错误
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    }, err.statusCode);
  }

  // 处理 Zod 验证错误
  if (err.name === 'ZodError') {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: (err as any).errors,
      },
    }, 400);
  }

  // 处理未知错误
  const isDev = process.env.NODE_ENV !== 'production';

  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'Internal server error',
      details: isDev ? err.stack : undefined,
    },
  }, 500);
};
