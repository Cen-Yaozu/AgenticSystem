import type { Assistant, AssistantSettings } from '@agentic-rag/shared';
import { ASSISTANT_STATUS, DEFAULT_ASSISTANT_SETTINGS } from '@agentic-rag/shared';
import { getDatabase } from '../database/index.js';
import { generateId } from '../utils/id.js';

/**
 * 数据库中的助手记录类型
 */
interface AssistantRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  domain: string | null;
  settings: string;
  status: string;
  document_count: number;
  conversation_count: number;
  workspace_path: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 创建助手的输入数据
 */
export interface CreateAssistantData {
  userId: string;
  name: string;
  description?: string;
  domain?: string;
  settings?: Partial<AssistantSettings>;
  workspacePath?: string;
}

/**
 * 更新助手的输入数据
 */
export interface UpdateAssistantData {
  name?: string;
  description?: string | null;
  domain?: string | null;
  settings?: Partial<AssistantSettings>;
  status?: Assistant['status'];
  workspacePath?: string | null;
}

/**
 * 查询助手列表的选项
 */
export interface FindAssistantsOptions {
  page?: number;
  pageSize?: number;
  domain?: string;
}

/**
 * 将数据库行转换为 Assistant 对象
 */
function rowToAssistant(row: AssistantRow): Assistant {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || undefined,
    domain: row.domain || undefined,
    settings: JSON.parse(row.settings) as AssistantSettings,
    status: row.status as Assistant['status'],
    documentCount: row.document_count,
    conversationCount: row.conversation_count,
    workspacePath: row.workspace_path || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 助手仓库类
 */
export class AssistantRepository {
  /**
   * 按 ID 查询助手
   */
  findById(id: string, userId?: string): Assistant | null {
    const db = getDatabase();

    let sql = 'SELECT * FROM assistants WHERE id = ?';
    const params: (string | undefined)[] = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    const row = db.prepare(sql).get(...params) as AssistantRow | undefined;
    return row ? rowToAssistant(row) : null;
  }

  /**
   * 按用户 ID 查询助手列表
   */
  findByUserId(userId: string, options: FindAssistantsOptions = {}): { data: Assistant[]; total: number } {
    const db = getDatabase();
    const { page = 1, pageSize = 20, domain } = options;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = 'WHERE user_id = ?';
    const params: (string | number)[] = [userId];

    if (domain) {
      whereClause += ' AND domain = ?';
      params.push(domain);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as count FROM assistants ${whereClause}`;
    const countResult = db.prepare(countSql).get(...params) as { count: number };
    const total = countResult.count;

    // 查询数据
    const dataSql = `
      SELECT * FROM assistants
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset) as AssistantRow[];

    return {
      data: rows.map(rowToAssistant),
      total,
    };
  }

  /**
   * 按名称查询助手（用于唯一性检查）
   */
  findByName(userId: string, name: string): Assistant | null {
    const db = getDatabase();
    const sql = 'SELECT * FROM assistants WHERE user_id = ? AND name = ?';
    const row = db.prepare(sql).get(userId, name) as AssistantRow | undefined;
    return row ? rowToAssistant(row) : null;
  }

  /**
   * 统计用户的助手数量
   */
  countByUserId(userId: string): number {
    const db = getDatabase();
    const sql = 'SELECT COUNT(*) as count FROM assistants WHERE user_id = ?';
    const result = db.prepare(sql).get(userId) as { count: number };
    return result.count;
  }

  /**
   * 创建助手
   */
  create(data: CreateAssistantData): Assistant {
    const db = getDatabase();
    const id = generateId('ast');
    const now = new Date().toISOString();

    // 合并默认设置
    const settings: AssistantSettings = {
      ...DEFAULT_ASSISTANT_SETTINGS,
      ...data.settings,
    };

    const sql = `
      INSERT INTO assistants (id, user_id, name, description, domain, settings, status, document_count, conversation_count, workspace_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `;

    db.prepare(sql).run(
      id,
      data.userId,
      data.name,
      data.description || null,
      data.domain || null,
      JSON.stringify(settings),
      ASSISTANT_STATUS.INITIALIZING,
      data.workspacePath || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * 更新助手
   */
  update(id: string, data: UpdateAssistantData): Assistant | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 获取当前助手
    const current = this.findById(id);
    if (!current) {
      return null;
    }

    // 构建更新字段
    const updates: string[] = ['updated_at = ?'];
    const params: (string | null)[] = [now];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description || null);
    }

    if (data.domain !== undefined) {
      updates.push('domain = ?');
      params.push(data.domain || null);
    }

    if (data.settings !== undefined) {
      const mergedSettings = {
        ...current.settings,
        ...data.settings,
      };
      updates.push('settings = ?');
      params.push(JSON.stringify(mergedSettings));
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.workspacePath !== undefined) {
      updates.push('workspace_path = ?');
      params.push(data.workspacePath || null);
    }

    params.push(id);

    const sql = `UPDATE assistants SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    return this.findById(id);
  }

  /**
   * 删除助手
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const sql = 'DELETE FROM assistants WHERE id = ?';
    const result = db.prepare(sql).run(id);
    return result.changes > 0;
  }

  /**
   * 更新助手状态为 ready（当初始化完成时）
   */
  markAsReady(id: string): Assistant | null {
    return this.update(id, { status: ASSISTANT_STATUS.READY as Assistant['status'] });
  }

  /**
   * 更新助手状态为 processing
   */
  markAsProcessing(id: string): Assistant | null {
    return this.update(id, { status: ASSISTANT_STATUS.PROCESSING as Assistant['status'] });
  }

  /**
   * 更新助手状态为 error
   */
  markAsError(id: string): Assistant | null {
    return this.update(id, { status: ASSISTANT_STATUS.ERROR as Assistant['status'] });
  }

  /**
   * 增加文档计数
   */
  incrementDocumentCount(id: string): void {
    const db = getDatabase();
    const sql = 'UPDATE assistants SET document_count = document_count + 1, updated_at = ? WHERE id = ?';
    db.prepare(sql).run(new Date().toISOString(), id);
  }

  /**
   * 减少文档计数
   */
  decrementDocumentCount(id: string): void {
    const db = getDatabase();
    const sql = 'UPDATE assistants SET document_count = MAX(0, document_count - 1), updated_at = ? WHERE id = ?';
    db.prepare(sql).run(new Date().toISOString(), id);
  }

  /**
   * 增加对话计数
   */
  incrementConversationCount(id: string): void {
    const db = getDatabase();
    const sql = 'UPDATE assistants SET conversation_count = conversation_count + 1, updated_at = ? WHERE id = ?';
    db.prepare(sql).run(new Date().toISOString(), id);
  }
}

// 导出单例
export const assistantRepository = new AssistantRepository();
