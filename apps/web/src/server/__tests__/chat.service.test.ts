/**
 * 聊天服务单元测试
 */

import Database from 'better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 测试常量
const TEST_USER_ID = 'test-user-001';
const TEST_CONVERSATION_ID = 'conv_test001';
const TEST_IMAGE_ID = 'img_test001';

// 测试数据库实例
let testDb: Database.Database;

/**
 * 创建测试数据库 Schema
 */
function createTestSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'ready',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      image_id TEXT NOT NULL UNIQUE,
      title TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO users (id, name, email) VALUES ('test-user-001', 'Test User', 'test@example.com');
    INSERT INTO domains (id, user_id, name) VALUES ('dom_test001', 'test-user-001', 'Test Domain');
    INSERT INTO conversations (id, domain_id, image_id, title)
    VALUES ('conv_test001', 'dom_test001', 'img_test001', 'Test Conversation');
  `);
}

// Mock 数据库模块
vi.mock('../database/index.js', () => ({
  getDatabase: vi.fn(() => testDb),
}));

// Mock AgentX 服务
const mockAgentXRequest = vi.fn();
vi.mock('../services/agentx.service.js', () => ({
  getAgentX: vi.fn(() => ({
    request: mockAgentXRequest,
  })),
}));

// 导入错误类型
import { ConversationNotFoundError } from '../errors/business.error.js';

// 动态导入 ChatService（在 mock 之后）
const { ChatService } = await import('../services/chat.service.js');

describe('ChatService', () => {
  let service: typeof ChatService.prototype;

  beforeAll(() => {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    createTestSchema(testDb);
    service = new ChatService();
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 mock AgentX 响应
    mockAgentXRequest.mockResolvedValue({
      success: true,
      data: {
        record: {
          imageId: TEST_IMAGE_ID,
          sessionId: 'session_test001',
        },
      },
    });
  });

  describe('sendMessage', () => {
    it('应该成功发送消息', async () => {
      const result = await service.sendMessage({
        conversationId: TEST_CONVERSATION_ID,
        userId: TEST_USER_ID,
        content: 'Hello, AI!',
      });

      expect(result).toBeDefined();
      expect(result.messageId).toMatch(/^msg_/);
      expect(result.imageId).toBeDefined();

      // 验证 AgentX 请求被正确调用
      expect(mockAgentXRequest).toHaveBeenCalledTimes(2);

      // 第一次调用：恢复 Session (image_run_request)
      expect(mockAgentXRequest).toHaveBeenNthCalledWith(1, 'image_run_request', expect.objectContaining({
        imageId: TEST_IMAGE_ID,
      }));

      // 第二次调用：发送消息 (session_send_request)
      expect(mockAgentXRequest).toHaveBeenNthCalledWith(2, 'session_send_request', expect.objectContaining({
        imageId: TEST_IMAGE_ID,
        content: 'Hello, AI!',
      }));
    });

    it('应该在对话不存在时抛出错误', async () => {
      await expect(
        service.sendMessage({
          conversationId: 'conv_nonexistent',
          userId: TEST_USER_ID,
          content: 'Hello',
        })
      ).rejects.toThrow(ConversationNotFoundError);
    });

    it('应该在用户无权访问对话时抛出错误', async () => {
      await expect(
        service.sendMessage({
          conversationId: TEST_CONVERSATION_ID,
          userId: 'other-user-id',
          content: 'Hello',
        })
      ).rejects.toThrow(ConversationNotFoundError);
    });

    it('应该在 AgentX Session 恢复失败时抛出错误', async () => {
      mockAgentXRequest.mockRejectedValue(new Error('Session resume failed'));

      await expect(
        service.sendMessage({
          conversationId: TEST_CONVERSATION_ID,
          userId: TEST_USER_ID,
          content: 'Hello',
        })
      ).rejects.toThrow('Session resume failed');
    });

    it('应该在 AgentX 消息发送失败时抛出错误', async () => {
      // 第一次调用成功（恢复 Session），第二次调用失败（发送消息）
      mockAgentXRequest
        .mockResolvedValueOnce({
          success: true,
          data: { record: { imageId: TEST_IMAGE_ID, sessionId: 'session_test001' } },
        })
        .mockRejectedValueOnce(new Error('Message send failed'));

      await expect(
        service.sendMessage({
          conversationId: TEST_CONVERSATION_ID,
          userId: TEST_USER_ID,
          content: 'Hello',
        })
      ).rejects.toThrow('Message send failed');
    });

    it('应该更新对话的 updated_at 时间戳', async () => {
      const beforeSend = testDb
        .prepare('SELECT updated_at FROM conversations WHERE id = ?')
        .get(TEST_CONVERSATION_ID) as { updated_at: string };

      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));

      await service.sendMessage({
        conversationId: TEST_CONVERSATION_ID,
        userId: TEST_USER_ID,
        content: 'Hello',
      });

      const afterSend = testDb
        .prepare('SELECT updated_at FROM conversations WHERE id = ?')
        .get(TEST_CONVERSATION_ID) as { updated_at: string };

      expect(afterSend.updated_at).not.toBe(beforeSend.updated_at);
    });
  });

  describe('getMessages', () => {
    it('应该返回消息列表', async () => {
      mockAgentXRequest.mockResolvedValue({
        success: true,
        data: {
          messages: [
            {
              id: 'msg_001',
              role: 'user',
              content: 'Hello',
              timestamp: '2024-01-01T00:00:00Z',
            },
            {
              id: 'msg_002',
              role: 'assistant',
              content: 'Hi there!',
              sources: ['doc_001'],
              tokensUsed: 150,
              timestamp: '2024-01-01T00:00:01Z',
            },
          ],
        },
      });

      const result = await service.getMessages(TEST_CONVERSATION_ID, TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0]?.role).toBe('user');
      expect(result[1]?.role).toBe('assistant');
      expect(result[1]?.metadata?.sources).toEqual(['doc_001']);
      expect(result[1]?.metadata?.tokensUsed).toBe(150);

      // 验证 AgentX 请求
      expect(mockAgentXRequest).toHaveBeenCalledWith('image_messages_request', expect.objectContaining({
        imageId: TEST_IMAGE_ID,
      }));
    });

    it('应该在对话不存在时抛出错误', async () => {
      await expect(
        service.getMessages('conv_nonexistent', TEST_USER_ID)
      ).rejects.toThrow(ConversationNotFoundError);
    });

    it('应该在用户无权访问时抛出错误', async () => {
      await expect(
        service.getMessages(TEST_CONVERSATION_ID, 'other-user-id')
      ).rejects.toThrow(ConversationNotFoundError);
    });

    it('应该在 AgentX 失败时返回空数组', async () => {
      mockAgentXRequest.mockRejectedValue(new Error('AgentX failed'));

      const result = await service.getMessages(TEST_CONVERSATION_ID, TEST_USER_ID);

      expect(result).toEqual([]);
    });

    it('应该处理没有消息的情况', async () => {
      mockAgentXRequest.mockResolvedValue({
        success: true,
        data: { messages: [] },
      });

      const result = await service.getMessages(TEST_CONVERSATION_ID, TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });
});
