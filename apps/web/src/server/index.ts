import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { initDatabase } from './database/index';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/logger';
import { logger } from './utils/logger';

// 加载环境变量
config();

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

// API 路由占位
app.get('/api', (c) => {
  return c.json({
    message: 'AgentX Agentic RAG API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      assistants: '/api/assistants',
      documents: '/api/documents',
      conversations: '/api/conversations',
    },
  });
});

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
