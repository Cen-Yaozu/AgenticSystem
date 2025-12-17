import type { Context, Next } from 'hono';
import { UnauthorizedError } from '../errors/business.error.js';

/**
 * 用户上下文类型
 */
export interface UserContext {
  userId: string;
  email?: string;
}

/**
 * 扩展 Hono Context 的变量类型
 */
declare module 'hono' {
  interface ContextVariableMap {
    user: UserContext;
  }
}

/**
 * MVP 阶段的简化认证中间件
 *
 * 认证方式：
 * 1. 从 Authorization header 提取 Bearer token
 * 2. 验证 token 是否与环境变量 API_KEY 匹配
 * 3. 如果匹配，注入默认用户信息到上下文
 *
 * 生产环境应替换为 JWT 验证
 */
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is required');
    }

    // 提取 Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    const token = parts[1];

    // MVP 阶段：验证 API Key
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      // 开发环境：如果没有配置 API_KEY，使用默认用户
      if (process.env.NODE_ENV === 'development') {
        c.set('user', {
          userId: 'user_dev_default',
          email: 'dev@example.com',
        });
        return next();
      }
      throw new UnauthorizedError('API_KEY not configured');
    }

    if (token !== apiKey) {
      throw new UnauthorizedError('Invalid API key');
    }

    // 注入用户信息到上下文
    // MVP 阶段使用固定用户 ID，生产环境应从 JWT 解析
    c.set('user', {
      userId: 'default-user-001',
      email: 'default@agentic-rag.local',
    });

    await next();
  };
}

/**
 * 获取当前用户
 */
export function getCurrentUser(c: Context): UserContext {
  const user = c.get('user');
  if (!user) {
    throw new UnauthorizedError('User not authenticated');
  }
  return user;
}

/**
 * 可选认证中间件（不强制要求认证）
 */
export function optionalAuthMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const apiKey = process.env.API_KEY;

        if (apiKey && token === apiKey) {
          c.set('user', {
            userId: 'user_default',
            email: 'user@example.com',
          });
        }
      }
    }

    await next();
  };
}
