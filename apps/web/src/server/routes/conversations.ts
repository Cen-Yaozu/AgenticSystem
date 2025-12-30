import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, getCurrentUser } from '../middleware/auth.js';
import { chatService } from '../services/chat.service.js';
import { conversationService } from '../services/conversation.service.js';
import { success, successWithPagination } from '../utils/response.js';

/**
 * 对话路由
 */
const conversations = new Hono();

// 所有路由都需要认证
conversations.use('*', authMiddleware());

// ============================================
// 领域级别的对话路由
// ============================================

/**
 * POST /api/v1/domains/:domainId/conversations - 创建对话
 */
conversations.post(
  '/domains/:domainId/conversations',
  zValidator(
    'json',
    z.object({
      title: z.string().optional(),
    })
  ),
  async (c) => {
    const user = getCurrentUser(c);
    const domainId = c.req.param('domainId');
    const input = c.req.valid('json');

    const conversation = await conversationService.createConversation({
      domainId,
      userId: user.userId,
      title: input.title,
    });

    return success(c, conversation, 201);
  }
);

/**
 * GET /api/v1/domains/:domainId/conversations - 获取领域的对话列表
 */
conversations.get(
  '/domains/:domainId/conversations',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
    })
  ),
  async (c) => {
    const user = getCurrentUser(c);
    const domainId = c.req.param('domainId');
    const query = c.req.valid('query');

    const result = await conversationService.getConversations(user.userId, domainId, {
      page: query.page,
      pageSize: query.pageSize,
    });

    return successWithPagination(c, result.data, result.meta);
  }
);

// ============================================
// 对话级别的路由
// ============================================

/**
 * GET /api/v1/conversations/:id - 获取对话详情（包含消息）
 */
conversations.get('/conversations/:id', async (c) => {
  const user = getCurrentUser(c);
  const conversationId = c.req.param('id');

  const conversation = await conversationService.getConversationById(user.userId, conversationId);

  return success(c, conversation);
});

/**
 * PATCH /api/v1/conversations/:id/title - 更新对话标题
 */
conversations.patch(
  '/conversations/:id/title',
  zValidator(
    'json',
    z.object({
      title: z.string().min(1).max(200),
    })
  ),
  async (c) => {
    const user = getCurrentUser(c);
    const conversationId = c.req.param('id');
    const { title } = c.req.valid('json');

    const conversation = await conversationService.updateConversationTitle(
      user.userId,
      conversationId,
      title
    );

    return success(c, conversation);
  }
);

/**
 * DELETE /api/v1/conversations/:id - 删除对话
 */
conversations.delete('/conversations/:id', async (c) => {
  const user = getCurrentUser(c);
  const conversationId = c.req.param('id');

  await conversationService.deleteConversation(user.userId, conversationId);

  return success(c, { deleted: true });
});

// ============================================
// 消息级别的路由
// ============================================

/**
 * POST /api/v1/conversations/:id/messages - 发送消息
 *
 * 注意：此接口只负责发送消息和验证权限，
 * 流式响应通过 AgentX WebSocket (ws://localhost:3000/ws) 直接传输给客户端。
 * 客户端需要：
 * 1. 调用此 API 发送消息
 * 2. 连接到 WebSocket 并监听返回的 sessionId 的事件
 */
conversations.post(
  '/conversations/:id/messages',
  zValidator(
    'json',
    z.object({
      content: z.string().min(1),
    })
  ),
  async (c) => {
    const user = getCurrentUser(c);
    const conversationId = c.req.param('id');
    const { content } = c.req.valid('json');

    const result = await chatService.sendMessage({
      conversationId,
      userId: user.userId,
      content,
    });

    return success(c, result, 201);
  }
);

/**
 * GET /api/v1/conversations/:id/messages - 获取历史消息
 */
conversations.get('/conversations/:id/messages', async (c) => {
  const user = getCurrentUser(c);
  const conversationId = c.req.param('id');

  const messages = await chatService.getMessages(conversationId, user.userId);

  return success(c, messages);
});

/**
 * POST /api/v1/conversations/:id/abort - 中断生成
 *
 * 停止 Agent 的当前响应生成。
 * 用于用户主动取消正在进行的 AI 响应。
 */
conversations.post('/conversations/:id/abort', async (c) => {
  const user = getCurrentUser(c);
  const conversationId = c.req.param('id');

  const result = await chatService.abortGeneration(conversationId, user.userId);

  return success(c, result);
});

export default conversations;
