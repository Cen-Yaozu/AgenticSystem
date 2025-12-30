/**
 * 对话服务
 * 管理对话生命周期，与 AgentX Session 集成
 */

import type { Conversation, PaginatedResult } from '@agentic-rag/shared';
import { nanoid } from 'nanoid';
import { getDatabase } from '../database/index.js';
import {
  ConversationNotFoundError,
  DomainNotFoundError,
} from '../errors/business.error.js';
import { domainRepository } from '../repositories/domain.repository.js';
import { logger } from '../utils/logger.js';
import { getAgentX } from './agentx.service.js';

interface CreateConversationInput {
  domainId: string;
  userId: string;
  title?: string;
}

interface FindConversationsOptions {
  page?: number;
  pageSize?: number;
}

/**
 * 对话服务类
 */
export class ConversationService {
  /**
   * 创建对话
   *
   * 流程：
   * 1. 验证领域存在且属于用户
   * 2. 通过 AgentX 创建 Session（使用领域的 MetaImage）
   * 3. 在数据库中创建对话记录
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const { domainId, userId, title } = input;

    // 1. 验证领域
    const domain = domainRepository.findById(domainId, userId);
    if (!domain) {
      throw new DomainNotFoundError(domainId);
    }

    // 2. 通过 AgentX 创建 Session
    const agentx = getAgentX();
    const containerId = `domain_${domainId}`;

    try {
      // 2.1 获取 Container 下的 Image 列表
      const imageListResponse = await agentx.request('image_list_request', {
        requestId: `list_${nanoid()}`,
        containerId,
      });

      const images = imageListResponse.data.records || [];
      if (images.length === 0) {
        throw new Error(`No images found for container ${containerId}`);
      }

      // 使用第一个 Image（领域创建时创建的 Image）
      // ImageRecord 的 ID 字段是 imageId 而不是 id
      const imageId = images[0].imageId;
      logger.info({ domainId, containerId, imageId }, 'Found image for domain');

      // 2.2 使用 image_run_request 运行 Image，创建 Agent
      const runResponse = await agentx.request('image_run_request', {
        requestId: `run_${nanoid()}`,
        imageId,
      });

      // AgentX 返回 agentId，我们用它作为 sessionId
      const agentId = runResponse.data.agentId;
      logger.info({ domainId, imageId, agentId }, 'Created AgentX agent for conversation');

      // 3. 在数据库中创建对话记录
      const conversationId = `conv_${nanoid()}`;
      const now = new Date().toISOString();

      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO conversations (id, domain_id, session_id, title, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `);

      // 使用 agentId 作为 session_id
      stmt.run(conversationId, domainId, agentId, title || null, now, now);

      // 返回创建的对话
      return {
        id: conversationId,
        domainId,
        sessionId: agentId,
        title: title || null,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error({ err: error, domainId }, 'Failed to create conversation');
      throw error;
    }
  }

  /**
   * 获取领域的对话列表
   */
  async getConversations(
    userId: string,
    domainId: string,
    options: FindConversationsOptions = {}
  ): Promise<PaginatedResult<Conversation>> {
    // 验证领域
    const domain = domainRepository.findById(domainId, userId);
    if (!domain) {
      throw new DomainNotFoundError(domainId);
    }

    const { page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    const db = getDatabase();

    // 查询对话列表
    const conversations = db
      .prepare(
        `
        SELECT id, domain_id as domainId, session_id as sessionId,
               title, status, created_at as createdAt, updated_at as updatedAt
        FROM conversations
        WHERE domain_id = ?
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(domainId, pageSize, offset) as Conversation[];

    // 查询总数
    const total = (
      db.prepare('SELECT COUNT(*) as count FROM conversations WHERE domain_id = ?').get(domainId) as {
        count: number;
      }
    ).count;

    return {
      data: conversations,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取对话详情（包含消息）
   */
  async getConversationById(
    userId: string,
    conversationId: string
  ): Promise<Conversation & { messages: any[] }> {
    const db = getDatabase();

    // 查询对话
    const conversation = db
      .prepare(
        `
        SELECT c.id, c.domain_id as domainId, c.session_id as sessionId,
               c.title, c.status, c.created_at as createdAt, c.updated_at as updatedAt
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as Conversation | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // 从 AgentX 获取消息（使用 image_messages_request）
    const agentx = getAgentX();
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
        return {
          ...conversation,
          messages: [],
        };
      }

      // 使用第一个 image 的 imageId
      const imageId = images[0].imageId;

      // 从 AgentX 获取消息列表（使用 image_messages_request）
      const messagesResponse = await agentx.request('image_messages_request', {
        requestId: `messages_${nanoid()}`,
        imageId,
      });

      const messages = messagesResponse.data.messages || [];

      // 转换消息格式
      const formattedMessages = messages.map((msg: any) => ({
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

      return {
        ...conversation,
        messages: formattedMessages,
      };
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to fetch messages from AgentX');
      // 即使获取消息失败，也返回对话基本信息
      return {
        ...conversation,
        messages: [],
      };
    }
  }

  /**
   * 删除对话
   */
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const db = getDatabase();

    // 查询对话（验证权限）
    const conversation = db
      .prepare(
        `
        SELECT c.id, c.session_id as sessionId
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId) as { id: string; sessionId: string } | undefined;

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // 删除 AgentX Session
    const agentx = getAgentX();
    try {
      await agentx.request('agent_destroy_request', {
        requestId: `destroy_${nanoid()}`,
        sessionId: conversation.sessionId,
      });
      logger.info({ conversationId, sessionId: conversation.sessionId }, 'Destroyed AgentX session');
    } catch (error) {
      // Session 删除失败不应阻止数据库记录删除
      logger.error({ err: error, conversationId }, 'Failed to destroy AgentX session');
    }

    // 删除数据库记录
    const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);

    if (result.changes === 0) {
      throw new ConversationNotFoundError(conversationId);
    }

    logger.info({ conversationId }, 'Deleted conversation');
  }

  /**
   * 更新对话标题
   */
  async updateConversationTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<Conversation> {
    const db = getDatabase();

    // 验证权限
    const conversation = db
      .prepare(
        `
        SELECT c.id
        FROM conversations c
        INNER JOIN domains d ON c.domain_id = d.id
        WHERE c.id = ? AND d.user_id = ?
      `
      )
      .get(conversationId, userId);

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // 更新标题
    const now = new Date().toISOString();
    db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(
      title,
      now,
      conversationId
    );

    // 返回更新后的对话
    const updated = db
      .prepare(
        `
        SELECT id, domain_id as domainId, session_id as sessionId,
               title, status, created_at as createdAt, updated_at as updatedAt
        FROM conversations
        WHERE id = ?
      `
      )
      .get(conversationId) as Conversation;

    return updated;
  }
}

// 导出单例
export const conversationService = new ConversationService();
