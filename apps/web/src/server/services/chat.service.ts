/**
 * 聊天服务
 * 处理与 AgentX Image 的消息交互
 *
 * 核心原则：1 Conversation = 1 Image
 * - 每个对话有自己的 imageId
 * - 使用对话的 imageId 发送消息和获取历史
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
  imageId: string;
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

    // 1. 验证对话并获取 imageId 和 title
    const conversation = db
      .prepare(
        `
        SELECT c.id, c.image_id as imageId, c.domain_id as domainId, c.title
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as
      | { id: string; imageId: string; domainId: string; title: string | null }
      | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    let titleGenerated = false;

    try {
      // 2. 使用对话自己的 imageId 发送消息
      // message_send_request 会自动激活 Agent（如果离线）
      const messageId = `msg_${nanoid()}`;

      const sendResponse = await agentx.request('message_send_request', {
        requestId: `send_${nanoid()}`,
        imageId: conversation.imageId, // 使用对话自己的 imageId
        content,
      });

      const agentId = sendResponse.data.agentId;
      logger.info({ conversationId, imageId: conversation.imageId, agentId }, 'Message sent to AgentX');

      // 3. 更新对话的 updated_at，如果没有标题则自动生成
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

      logger.info({ conversationId, messageId, imageId: conversation.imageId }, 'Message sent successfully');

      return {
        messageId,
        imageId: conversation.imageId,
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

    // 验证对话并获取 imageId
    const conversation = db
      .prepare(
        `
        SELECT c.image_id as imageId
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as { imageId: string } | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    try {
      // 使用对话自己的 imageId 获取消息
      const messagesResponse = await agentx.request('image_messages_request', {
        requestId: `messages_${nanoid()}`,
        imageId: conversation.imageId,
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

    // 验证对话并获取 imageId
    const conversation = db
      .prepare(
        `
        SELECT c.image_id as imageId
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as { imageId: string } | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    try {
      // 发送中断请求到 AgentX（使用 agent_interrupt_request + imageId）
      // AgentX 会自动找到对应的 Agent
      await agentx.request('agent_interrupt_request', {
        requestId: `abort_${nanoid()}`,
        imageId: conversation.imageId,
      });

      logger.info({ conversationId, imageId: conversation.imageId }, 'Generation aborted');

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
