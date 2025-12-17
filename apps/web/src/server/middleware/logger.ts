import type { MiddlewareHandler } from 'hono';
import { logger } from '../utils/logger.js';

/**
 * 请求日志中间件
 * 记录请求的详细信息和响应时间
 */
export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now();
    const requestId = crypto.randomUUID();
    
    // 添加请求 ID 到上下文
    c.set('requestId', requestId);
    
    // 记录请求开始
    logger.info({
      requestId,
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
      userAgent: c.req.header('user-agent'),
    }, 'Request started');

    try {
      await next();
    } finally {
      const duration = Date.now() - start;
      const status = c.res.status;
      
      // 记录请求完成
      const logData = {
        requestId,
        method: c.req.method,
        path: c.req.path,
        status,
        duration: `${duration}ms`,
      };

      if (status >= 500) {
        logger.error(logData, 'Request failed');
      } else if (status >= 400) {
        logger.warn(logData, 'Request error');
      } else {
        logger.info(logData, 'Request completed');
      }
    }
  };
};