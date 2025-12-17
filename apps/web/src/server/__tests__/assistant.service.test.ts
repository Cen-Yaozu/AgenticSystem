/**
 * 助手服务单元测试
 */

import Database from 'better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 测试常量
const TEST_USER_ID = 'test-user-001';

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
      password_hash TEXT,
      api_key_hash TEXT UNIQUE,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 助手表
    CREATE TABLE IF NOT EXISTS assistants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      domain TEXT,
      settings TEXT DEFAULT '{}',
      status TEXT DEFAULT 'initializing' CHECK (status IN ('initializing', 'ready', 'processing', 'error')),
      document_count INTEGER DEFAULT 0,
      conversation_count INTEGER DEFAULT 0,
      workspace_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_assistants_user_name ON assistants(user_id, name);

    -- 插入测试用户
    INSERT INTO users (id, name, email, status, created_at, updated_at)
    VALUES (
      'test-user-001',
      'Test User',
      'test@example.com',
      'active',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  `);
}

// Mock 数据库模块 - 必须在导入 AssistantService 之前
vi.mock('../database/index.js', () => ({
  getDatabase: vi.fn(() => testDb),
}));

// Mock 工作区服务
vi.mock('../services/workspace.service.js', () => ({
  workspaceService: {
    createWorkspace: vi.fn().mockResolvedValue({
      assistantId: 'test-assistant-id',
      path: '/test/workspaces/test-assistant-id',
      promptxResourcePath: '/test/workspaces/test-assistant-id/.promptx/resource',
      mcpConfigPath: '/test/workspaces/test-assistant-id/mcp.json',
      documentsPath: '/test/workspaces/test-assistant-id/documents',
    }),
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
    getWorkspacePath: vi.fn().mockReturnValue('/test/workspaces/test-assistant-id'),
    workspaceExists: vi.fn().mockReturnValue(true),
  },
}));

// 导入错误类型
import {
  AssistantCannotDeleteError,
  AssistantLimitExceededError,
  AssistantNameDuplicateError,
  AssistantNotFoundError,
} from '../errors/business.error.js';

// 动态导入 AssistantService（在 mock 之后）
const { AssistantService } = await import('../services/assistant.service.js');

describe('AssistantService', () => {
  let service: typeof AssistantService.prototype;

  beforeAll(() => {
    // 创建内存数据库
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    createTestSchema(testDb);

    // 创建服务实例
    service = new AssistantService();
  });

  afterAll(() => {
    if (testDb) {
      testDb.close();
    }
  });

  beforeEach(() => {
    // 清空助手表数据
    testDb.exec('DELETE FROM assistants');
  });

  describe('createAssistant', () => {
    it('应该成功创建助手', async () => {
      const result = await service.createAssistant(TEST_USER_ID, {
        name: '测试助手',
        description: '这是一个测试助手',
        domain: 'test',
      });

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^ast_/);
      expect(result.name).toBe('测试助手');
      expect(result.description).toBe('这是一个测试助手');
      expect(result.domain).toBe('test');
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.status).toBe('initializing');
      expect(result.settings).toBeDefined();
      expect(result.settings.language).toBe('zh-CN');
      expect(result.workspacePath).toBeDefined();
    });

    it('应该使用默认设置创建助手', async () => {
      const result = await service.createAssistant(TEST_USER_ID, {
        name: '简单助手',
      });

      expect(result.settings).toEqual({
        responseStyle: 'detailed',
        tone: 'formal',
        language: 'zh-CN',
        maxTokens: 4000,
        temperature: 0.7,
        retrievalTopK: 5,
        retrievalThreshold: 0.7,
      });
    });

    it('应该在名称重复时抛出错误', async () => {
      await service.createAssistant(TEST_USER_ID, { name: '重复名称' });

      await expect(
        service.createAssistant(TEST_USER_ID, { name: '重复名称' })
      ).rejects.toThrow(AssistantNameDuplicateError);
    });

    it('应该在超过数量限制时抛出错误', async () => {
      // 创建 10 个助手（达到限制）
      for (let i = 0; i < 10; i++) {
        await service.createAssistant(TEST_USER_ID, { name: `助手${i}` });
      }

      await expect(
        service.createAssistant(TEST_USER_ID, { name: '第11个助手' })
      ).rejects.toThrow(AssistantLimitExceededError);
    });
  });

  describe('getAssistants', () => {
    beforeEach(async () => {
      // 创建测试数据
      await service.createAssistant(TEST_USER_ID, { name: '助手A', domain: 'legal' });
      await service.createAssistant(TEST_USER_ID, { name: '助手B', domain: 'medical' });
      await service.createAssistant(TEST_USER_ID, { name: '助手C', domain: 'legal' });
    });

    it('应该返回所有助手列表', async () => {
      const result = await service.getAssistants(TEST_USER_ID, {});

      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(3);
    });

    it('应该支持分页', async () => {
      const result = await service.getAssistants(TEST_USER_ID, {
        page: 1,
        pageSize: 2,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(2);
      expect(result.meta.totalPages).toBe(2);
    });

    it('应该支持按 domain 筛选', async () => {
      const result = await service.getAssistants(TEST_USER_ID, {
        domain: 'legal',
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(a => a.domain === 'legal')).toBe(true);
    });

    it('应该按创建时间倒序排列', async () => {
      const result = await service.getAssistants(TEST_USER_ID, {});

      // 验证返回了所有数据
      expect(result.data).toHaveLength(3);

      // 验证数据按 created_at 倒序排列
      const names = result.data.map(a => a.name);
      expect(names).toContain('助手A');
      expect(names).toContain('助手B');
      expect(names).toContain('助手C');

      // 验证时间戳是倒序的（或相等）
      for (let i = 0; i < result.data.length - 1; i++) {
        const current = new Date(result.data[i]!.createdAt).getTime();
        const next = new Date(result.data[i + 1]!.createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getAssistantById', () => {
    it('应该返回助手详情', async () => {
      const created = await service.createAssistant(TEST_USER_ID, {
        name: '详情测试',
      });

      const result = await service.getAssistantById(TEST_USER_ID, created.id);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('详情测试');
    });

    it('应该在助手不存在时抛出错误', async () => {
      await expect(
        service.getAssistantById(TEST_USER_ID, 'ast_nonexistent')
      ).rejects.toThrow(AssistantNotFoundError);
    });

    it('应该在访问其他用户助手时抛出错误', async () => {
      const created = await service.createAssistant(TEST_USER_ID, {
        name: '所有权测试',
      });

      await expect(
        service.getAssistantById('other-user-id', created.id)
      ).rejects.toThrow(AssistantNotFoundError);
    });
  });

  describe('updateAssistant', () => {
    it('应该成功更新助手', async () => {
      const created = await service.createAssistant(TEST_USER_ID, {
        name: '原始名称',
        description: '原始描述',
      });

      const result = await service.updateAssistant(TEST_USER_ID, created.id, {
        name: '新名称',
        description: '新描述',
      });

      expect(result.name).toBe('新名称');
      expect(result.description).toBe('新描述');
    });

    it('应该支持部分更新', async () => {
      const created = await service.createAssistant(TEST_USER_ID, {
        name: '部分更新测试',
        description: '原始描述',
        domain: 'test',
      });

      const result = await service.updateAssistant(TEST_USER_ID, created.id, {
        description: '只更新描述',
      });

      expect(result.name).toBe('部分更新测试');
      expect(result.description).toBe('只更新描述');
      expect(result.domain).toBe('test');
    });

    it('应该在更新为重复名称时抛出错误', async () => {
      await service.createAssistant(TEST_USER_ID, { name: '已存在的名称' });
      const created = await service.createAssistant(TEST_USER_ID, { name: '要更新的助手' });

      await expect(
        service.updateAssistant(TEST_USER_ID, created.id, { name: '已存在的名称' })
      ).rejects.toThrow(AssistantNameDuplicateError);
    });

    it('应该在助手不存在时抛出错误', async () => {
      await expect(
        service.updateAssistant(TEST_USER_ID, 'ast_nonexistent', { name: '新名称' })
      ).rejects.toThrow(AssistantNotFoundError);
    });
  });

  describe('deleteAssistant', () => {
    it('应该成功删除助手', async () => {
      const created = await service.createAssistant(TEST_USER_ID, {
        name: '要删除的助手',
      });

      await service.deleteAssistant(TEST_USER_ID, created.id);

      await expect(
        service.getAssistantById(TEST_USER_ID, created.id)
      ).rejects.toThrow(AssistantNotFoundError);
    });

    it('应该在助手不存在时抛出错误', async () => {
      await expect(
        service.deleteAssistant(TEST_USER_ID, 'ast_nonexistent')
      ).rejects.toThrow(AssistantNotFoundError);
    });

    it('应该在 processing 状态时抛出错误', async () => {
      const created = await service.createAssistant(TEST_USER_ID, {
        name: '处理中的助手',
      });

      // 手动更新状态为 processing
      testDb.prepare('UPDATE assistants SET status = ? WHERE id = ?').run('processing', created.id);

      await expect(
        service.deleteAssistant(TEST_USER_ID, created.id)
      ).rejects.toThrow(AssistantCannotDeleteError);
    });
  });
});
