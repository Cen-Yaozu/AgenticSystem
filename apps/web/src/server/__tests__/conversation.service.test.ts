/**
 * 对话服务单元测试
 */

import Database from 'better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 测试常量
const TEST_USER_ID = 'test-user-001';
const TEST_DOMAIN_ID = 'dom_test001';
const TEST_IMAGE_ID = 'img_test001';

// 测试数据库实例
let testDb: Database.Database;

/**
 * 创建测试数据库 Schema
 */
function createTestSchema(db: Database.Database): void {
  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 领域表
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      expertise TEXT,
      settings TEXT DEFAULT '{}',
      status TEXT DEFAULT 'initializing',
      document_count INTEGER DEFAULT 0,
      conversation_count INTEGER DEFAULT 0,
      workspace_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 对话表
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      image_id TEXT NOT NULL UNIQUE,
      title TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_domain_id ON conversations(domain_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_image_id ON conversations(image_id);

    -- 插入测试数据
    INSERT INTO users (id, name, email, status)
    VALUES ('test-user-001', 'Test User', 'test@example.com', 'active');

    INSERT INTO domains (id, user_id, name, settings, status)
    VALUES ('dom_test001', 'test-user-001', 'Test Domain', '{}', 'ready');
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
  buildSystemPrompt: vi.fn(() => 'Test system prompt'),
  buildMCPServers: vi.fn(() => ({})),
}));

// 导入错误类型
import { ConversationNotFoundError, DomainNotFoundError } from '../errors/business.error.js';

// 动态导入 ConversationService（在 mock 之后）
const { ConversationService } = await import('../services/conversation.service.js');

describe('ConversationService', () => {
  let service: typeof ConversationService.prototype;

  beforeAll(() => {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    createTestSchema(testDb);
    service = new ConversationService();
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  beforeEach(() => {
    testDb.exec('DELETE FROM conversations');
    vi.clearAllMocks();

    // 默认 mock AgentX 响应 - image_create_request
    mockAgentXRequest.mockResolvedValue({
      success: true,
      data: {
        record: {
          imageId: TEST_IMAGE_ID,
        },
      },
    });
  });

  describe('createConversation', () => {
    it('应该成功创建对话', async () => {
      const result = await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '测试对话',
      });

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^conv_/);
      expect(result.domainId).toBe(TEST_DOMAIN_ID);
      expect(result.imageId).toBe(TEST_IMAGE_ID);
      expect(result.title).toBe('测试对话');
      expect(result.status).toBe('active');

      // 验证 AgentX 请求被正确调用
      expect(mockAgentXRequest).toHaveBeenCalledWith('image_create_request', expect.objectContaining({
        containerId: `domain_${TEST_DOMAIN_ID}`,
      }));
    });

    it('应该在领域不存在时抛出错误', async () => {
      await expect(
        service.createConversation({
          domainId: 'dom_nonexistent',
          userId: TEST_USER_ID,
        })
      ).rejects.toThrow(DomainNotFoundError);
    });

    it('应该在用户无权访问领域时抛出错误', async () => {
      await expect(
        service.createConversation({
          domainId: TEST_DOMAIN_ID,
          userId: 'other-user-id',
        })
      ).rejects.toThrow(DomainNotFoundError);
    });

    it('应该在 AgentX 失败时抛出错误', async () => {
      mockAgentXRequest.mockRejectedValue(new Error('AgentX failed'));

      await expect(
        service.createConversation({
          domainId: TEST_DOMAIN_ID,
          userId: TEST_USER_ID,
        })
      ).rejects.toThrow('AgentX failed');
    });
  });

  describe('getConversations', () => {
    beforeEach(async () => {
      // 创建测试对话
      await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '对话A',
      });

      mockAgentXRequest.mockResolvedValue({
        success: true,
        data: { record: { imageId: 'img_test002' } },
      });
      await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '对话B',
      });

      mockAgentXRequest.mockResolvedValue({
        success: true,
        data: { record: { imageId: 'img_test003' } },
      });
      await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '对话C',
      });
    });

    it('应该返回对话列表', async () => {
      const result = await service.getConversations(TEST_USER_ID, TEST_DOMAIN_ID, {
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(3);
      expect(result.meta.page).toBe(1);
    });

    it('应该支持分页', async () => {
      const result = await service.getConversations(TEST_USER_ID, TEST_DOMAIN_ID, {
        page: 1,
        pageSize: 2,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalPages).toBe(2);
    });

    it('应该按更新时间倒序排列', async () => {
      const result = await service.getConversations(TEST_USER_ID, TEST_DOMAIN_ID, {
        page: 1,
        pageSize: 10,
      });

      for (let i = 0; i < result.data.length - 1; i++) {
        const current = new Date(result.data[i]!.updatedAt).getTime();
        const next = new Date(result.data[i + 1]!.updatedAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('应该在用户无权访问领域时抛出错误', async () => {
      await expect(
        service.getConversations('other-user-id', TEST_DOMAIN_ID, {
          page: 1,
          pageSize: 10,
        })
      ).rejects.toThrow(DomainNotFoundError);
    });
  });

  describe('getConversationById', () => {
    it('应该返回对话详情', async () => {
      const created = await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '详情测试',
      });

      // Mock image_messages_request for getConversationById
      mockAgentXRequest.mockResolvedValue({
        success: true,
        data: { messages: [] },
      });

      const result = await service.getConversationById(TEST_USER_ID, created.id);

      expect(result.id).toBe(created.id);
      expect(result.title).toBe('详情测试');
      expect(result.imageId).toBe(TEST_IMAGE_ID);
    });

    it('应该在对话不存在时抛出错误', async () => {
      await expect(
        service.getConversationById(TEST_USER_ID, 'conv_nonexistent')
      ).rejects.toThrow(ConversationNotFoundError);
    });

    it('应该在用户无权访问时抛出错误', async () => {
      const created = await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '权限测试',
      });

      await expect(
        service.getConversationById('other-user-id', created.id)
      ).rejects.toThrow(ConversationNotFoundError);
    });
  });

  describe('updateConversationTitle', () => {
    it('应该成功更新标题', async () => {
      const created = await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '原标题',
      });

      // 添加小延迟确保时间戳变化
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await service.updateConversationTitle(
        TEST_USER_ID,
        created.id,
        '新标题'
      );

      expect(result.title).toBe('新标题');
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime()
      );
    });

    it('应该在对话不存在时抛出错误', async () => {
      await expect(
        service.updateConversationTitle(TEST_USER_ID, 'conv_nonexistent', '新标题')
      ).rejects.toThrow(ConversationNotFoundError);
    });
  });

  describe('deleteConversation', () => {
    it('应该成功删除对话', async () => {
      const created = await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '要删除的对话',
      });

      await service.deleteConversation(TEST_USER_ID, created.id);

      await expect(
        service.getConversationById(TEST_USER_ID, created.id)
      ).rejects.toThrow(ConversationNotFoundError);
    });

    it('应该在对话不存在时抛出错误', async () => {
      await expect(
        service.deleteConversation(TEST_USER_ID, 'conv_nonexistent')
      ).rejects.toThrow(ConversationNotFoundError);
    });

    it('应该在用户无权访问时抛出错误', async () => {
      const created = await service.createConversation({
        domainId: TEST_DOMAIN_ID,
        userId: TEST_USER_ID,
        title: '权限测试',
      });

      await expect(
        service.deleteConversation('other-user-id', created.id)
      ).rejects.toThrow(ConversationNotFoundError);
    });
  });
});
