/**
 * 聊天服务
 * 处理与 AgentX Session 的消息交互
 *
 * 注意：流式响应通过 AgentX WebSocket 直接传输给客户端，
 * 不通过后端 API。后端只负责验证权限和发送消息。
 */

import type { Message } from '@agentic-rag/shared';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database/index.js';
import { ConversationNotFoundError } from '../errors/business.error.js';
import { logger } from '../utils/logger.js';
import { getAgentX } from './agentx.service.js';

interface SendMessageInput {
  conversationId: string;
  userId: string;
  content: string;
}

interface SendMessageResult {
  messageId: string;
  sessionId: string;
  titleGenerated?: boolean;
}

/**
 * 生成对话标题
 * 基于用户消息内容生成简短标题
 */
function generateTitle(content: string): string {
  // 移除多余空白字符
  const cleaned = content.replace(/\s+/g, ' ').trim();

  // 截取前 50 个字符
  const maxLength = 50;
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // 尝试在单词边界截断（对于英文）
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // 如果找到空格且不是太靠前，在空格处截断
  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // 否则直接截断
  return truncated + '...';
}

/**
 * 聊天服务类
 */
export class ChatService {
  /**
   * 发送消息
   *
   * 流程：
   * 1. 验证对话存在且用户有权限
   * 2. 通过 AgentX 恢复 Session
   * 3. 发送用户消息到 Agent
   * 4. 返回 messageId 和 sessionId（客户端通过 WebSocket 接收响应）
   */
  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const { conversationId, userId, content } = input;

    const db = getDatabase();
    const agentx = getAgentX();

    // 1. 验证对话并获取 sessionId 和 title
    const conversation = db
      .prepare(
        `
        SELECT c.id, c.session_id as sessionId, c.domain_id as domainId, c.title
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as
      | { id: string; sessionId: string; domainId: string; title: string | null }
      | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    let titleGenerated = false;

    try {
      // 2. 获取 imageId（sessionId 存储的是 imageId）
      // 使用 message_send_request 直接发送消息，它会自动激活 Agent
      const containerId = `domain_${conversation.domainId}`;

      // 2.1 获取 Container 下的 Image 列表
      const imageListResponse = await agentx.request('image_list_request', {
        requestId: `list_${nanoid()}`,
        containerId,
      });

      const images = imageListResponse.data.records || [];
      if (images.length === 0) {
        throw new Error(`No images found for container ${containerId}`);
      }

      // 找到匹配的 image（通过 sessionId 或使用第一个）
      const imageId = images[0].imageId;

      // 3. 发送消息到 Agent（使用 message_send_request，推荐使用 imageId）
      // message_send_request 会自动激活 Agent（如果离线）
      const messageId = `msg_${nanoid()}`;

      const sendResponse = await agentx.request('message_send_request', {
        requestId: `send_${nanoid()}`,
        imageId, // 使用 imageId（推荐），会自动激活 Agent
        content,
      });

      const agentId = sendResponse.data.agentId;
      logger.info({ conversationId, imageId, agentId }, 'Message sent to AgentX');

      // 如果 agentId 与保存的 sessionId 不同，更新数据库
      if (agentId !== conversation.sessionId) {
        db.prepare('UPDATE conversations SET session_id = ? WHERE id = ?').run(agentId, conversationId);
        logger.info({ conversationId, oldSessionId: conversation.sessionId, newSessionId: agentId }, 'Updated session ID');
      }

      // 4. 更新对话的 updated_at，如果没有标题则自动生成
      const now = new Date().toISOString();

      if (!conversation.title) {
        // 自动生成标题（基于首条消息）
        const title = generateTitle(content);
        db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(
          title,
          now,
          conversationId
        );
        titleGenerated = true;
        logger.info({ conversationId, title }, 'Auto-generated conversation title');
      } else {
        db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(
          now,
          conversationId
        );
      }

      logger.info({ conversationId, messageId, sessionId: conversation.sessionId }, 'Message sent successfully');

      return {
        messageId,
        sessionId: conversation.sessionId,
        titleGenerated,
      };
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to send message');
      throw error;
    }
  }

  /**
   * 获取对话历史消息
   * 从 AgentX Image 中获取消息列表
   */
  async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    const db = getDatabase();
    const agentx = getAgentX();

    // 验证对话并获取 domainId
    const conversation = db
      .prepare(
        `
        SELECT c.session_id as sessionId, c.domain_id as domainId
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as { sessionId: string; domainId: string } | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    try {
      // 获取 Container 下的 Image 列表
      const containerId = `domain_${conversation.domainId}`;
      const imageListResponse = await agentx.request('image_list_request', {
        requestId: `list_${nanoid()}`,
        containerId,
      });

      const images = imageListResponse.data.records || [];
      if (images.length === 0) {
        logger.warn({ conversationId, containerId }, 'No images found for container');
        return [];
      }

      // 使用第一个 image 的 imageId
      const imageId = images[0].imageId;

      // 从 AgentX 获取消息列表（使用 image_messages_request）
      const messagesResponse = await agentx.request('image_messages_request', {
        requestId: `messages_${nanoid()}`,
        imageId,
      });

      const messages = messagesResponse.data.messages || [];

      // 转换为标准 Message 格式
      return messages.map((msg: any) => ({
        id: msg.id || `msg_${nanoid()}`,
        conversationId,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        metadata: {
          sources: msg.sources || [],
          tokensUsed: msg.tokensUsed,
        },
        createdAt: msg.timestamp || new Date().toISOString(),
      }));
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get messages');
      return [];
    }
  }

  /**
   * 中断生成
   * 停止 Agent 的当前响应生成
   */
  async abortGeneration(conversationId: string, userId: string): Promise<{ aborted: boolean }> {
    const db = getDatabase();
    const agentx = getAgentX();

    // 验证对话并获取 sessionId
    const conversation = db
      .prepare(
        `
        SELECT c.session_id as sessionId
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as { sessionId: string } | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    try {
      // 发送中断请求到 AgentX（使用 agent_interrupt_request）
      await agentx.request('agent_interrupt_request', {
        requestId: `abort_${nanoid()}`,
        agentId: conversation.sessionId, // sessionId 存储的是 agentId
      });

      logger.info({ conversationId, sessionId: conversation.sessionId }, 'Generation aborted');

      return { aborted: true };
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to abort generation');
      // 即使中断失败也返回 false，不抛出错误
      return { aborted: false };
    }
  }
}

// 导出单例
export const chatService = new ChatService();
