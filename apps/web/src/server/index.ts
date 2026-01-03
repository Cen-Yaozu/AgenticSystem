import { config } from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { createServer } from 'http';
import { resolve } from 'path';

import { initDatabase } from './database/index.js';
import { errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import conversationsRoutes from './routes/conversations.js';
import documentsRoutes from './routes/documents.js';
import domainsRoutes from './routes/domains.js';
import { initAgentX } from './services/agentx.service.js';
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

// 挂载对话路由
app.route('/api/v1', conversationsRoutes);

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

    // 创建 HTTP Server（AgentX 需要）
    const server = createServer((req, res) => {
      // 将请求转发给 Hono
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      Promise.resolve(
        app.fetch(
          new Request(`http://${req.headers.host || `${host}:${port}`}${req.url}`, {
            method: req.method || 'GET',
            headers: req.headers as HeadersInit,
            body: hasBody ? req : undefined,
            // Node.js 22+ 要求在有 body 时设置 duplex
            ...(hasBody && { duplex: 'half' }),
          } as RequestInit)
        )
      ).then(async (honoRes: Response) => {
        // 将 Hono 响应转发回客户端
        res.writeHead(honoRes.status, Object.fromEntries(honoRes.headers.entries()));
        if (honoRes.body) {
          const reader = honoRes.body.getReader();
          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(value);
            return pump();
          };
          await pump();
        } else {
          res.end();
        }
      }).catch((error: unknown) => {
        logger.error({ err: error }, 'Error handling request');
        res.writeHead(500);
        res.end('Internal Server Error');
      });
    });

    // 初始化 AgentX
    logger.info('Initializing AgentX...');
    await initAgentX({
      llm: {
        apiKey: process.env.ANTHROPIC_API_KEY!,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        model: process.env.ANTHROPIC_MODEL,
      },
      agentxDir: resolve(process.cwd(), '../../data/agentx'),
      server,
    });
    logger.info('AgentX initialized successfully');

    // 启动服务器
    logger.info(`Starting server on http://${host}:${port}`);
    server.listen(port, host, () => {
      logger.info(`🚀 Server is running on http://${host}:${port}`);
      logger.info(`📋 Health check: http://${host}:${port}/health`);
      logger.info(`🔌 AgentX WebSocket: ws://${host}:${port}/ws`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

main();

export default app;
export type AppType = typeof app;
