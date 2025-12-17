import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * 统一成功响应格式
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * 统一错误响应格式
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * 发送成功响应
 */
export function success<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json<SuccessResponse<T>>(
    {
      success: true,
      data,
    },
    status
  );
}

/**
 * 发送分页成功响应
 */
export function successWithPagination<T>(
  c: Context,
  data: T[],
  pagination: { page: number; pageSize: number; total: number }
) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  return c.json<SuccessResponse<T[]>>({
    success: true,
    data,
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
    },
  });
}

/**
 * 发送错误响应
 */
export function error(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown
) {
  return c.json<ErrorResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    status
  );
}

/**
 * 常用错误响应
 */
export const errors = {
  notFound: (c: Context, resource: string) =>
    error(c, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} not found`, 404),

  badRequest: (c: Context, message: string, details?: unknown) =>
    error(c, 'BAD_REQUEST', message, 400, details),

  unauthorized: (c: Context) =>
    error(c, 'UNAUTHORIZED', 'Authentication required', 401),

  forbidden: (c: Context) =>
    error(c, 'FORBIDDEN', 'Access denied', 403),

  conflict: (c: Context, message: string) =>
    error(c, 'CONFLICT', message, 409),

  internal: (c: Context, message = 'Internal server error') =>
    error(c, 'INTERNAL_ERROR', message, 500),
};
