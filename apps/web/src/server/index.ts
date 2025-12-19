import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { resolve } from 'path';

import { initDatabase } from './database/index.js';
import { errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import documentsRoutes from './routes/documents.js';
import domainsRoutes from './routes/domains.js';
import { logger } from './utils/logger.js';

// 加载环境变量（从项目根目录）
config({ path: resolve(process.cwd(), '../../.env') });

// 创建 Hono 应用
const app = new Hono();

// 全局中间件
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use('*', honoLogger());
app.use('*', prettyJSON());
app.use('*', requestLogger());

// 错误处理
app.onError(errorHandler);

// 健康检查端点
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API 路由
app.get('/api', (c) => {
  return c.json({
    message: 'AgentX Agentic RAG API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      domains: '/api/v1/domains',
      documents: '/api/v1/domains/:domainId/documents',
      conversations: '/api/v1/conversations',
      // 向后兼容（将在未来版本移除）
      assistants: '/api/v1/assistants (deprecated, use /api/v1/domains)',
    },
  });
});

// 挂载领域路由
app.route('/api/v1/domains', domainsRoutes);

// 挂载文档路由（嵌套在领域下）
app.route('/api/v1/domains/:domainId/documents', documentsRoutes);

// 向后兼容：旧的 assistants 路由重定向到 domains
// 这样旧的客户端仍然可以工作
app.route('/api/v1/assistants', domainsRoutes);
app.route('/api/v1/assistants/:assistantId/documents', documentsRoutes);

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
  }, 404);
});

// 启动服务器
const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || 'localhost';

async function main() {
  try {
    // 初始化数据库
    logger.info('Initializing database...');
    await initDatabase();
    logger.info('Database initialized successfully');

    // 启动服务器
    logger.info(`Starting server on http://${host}:${port}`);

    serve({
      fetch: app.fetch,
      port,
      hostname: host,
    }, (info) => {
      logger.info(`🚀 Server is running on http://${info.address}:${info.port}`);
      logger.info(`📋 Health check: http://${info.address}:${info.port}/health`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

main();

export default app;
export type AppType = typeof app;
