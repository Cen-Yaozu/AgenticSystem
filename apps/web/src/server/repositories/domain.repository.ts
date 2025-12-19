import type { Domain, DomainSettings } from '@agentic-rag/shared';
import { DEFAULT_DOMAIN_SETTINGS, DOMAIN_STATUS } from '@agentic-rag/shared';
import { getDatabase } from '../database/index.js';
import { generateId } from '../utils/id.js';

/**
 * 数据库中的领域记录类型
 */
interface DomainRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  expertise: string | null;
  settings: string;
  status: string;
  document_count: number;
  conversation_count: number;
  workspace_path: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 创建领域的输入数据
 */
export interface CreateDomainData {
  userId: string;
  name: string;
  description?: string;
  expertise?: string;
  settings?: Partial<DomainSettings>;
  workspacePath?: string;
}

/**
 * 更新领域的输入数据
 */
export interface UpdateDomainData {
  name?: string;
  description?: string | null;
  expertise?: string | null;
  settings?: Partial<DomainSettings>;
  status?: Domain['status'];
  workspacePath?: string | null;
}

/**
 * 查询领域列表的选项
 */
export interface FindDomainsOptions {
  page?: number;
  pageSize?: number;
  expertise?: string;
}

/**
 * 将数据库行转换为 Domain 对象
 */
function rowToDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || undefined,
    expertise: row.expertise || undefined,
    settings: JSON.parse(row.settings) as DomainSettings,
    status: row.status as Domain['status'],
    documentCount: row.document_count,
    conversationCount: row.conversation_count,
    workspacePath: row.workspace_path || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 领域仓库类
 */
export class DomainRepository {
  /**
   * 按 ID 查询领域
   */
  findById(id: string, userId?: string): Domain | null {
    const db = getDatabase();

    let sql = 'SELECT * FROM domains WHERE id = ?';
    const params: (string | undefined)[] = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    const row = db.prepare(sql).get(...params) as DomainRow | undefined;
    return row ? rowToDomain(row) : null;
  }

  /**
   * 按用户 ID 查询领域列表
   */
  findByUserId(userId: string, options: FindDomainsOptions = {}): { data: Domain[]; total: number } {
    const db = getDatabase();
    const { page = 1, pageSize = 20, expertise } = options;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = 'WHERE user_id = ?';
    const params: (string | number)[] = [userId];

    if (expertise) {
      whereClause += ' AND expertise = ?';
      params.push(expertise);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as count FROM domains ${whereClause}`;
    const countResult = db.prepare(countSql).get(...params) as { count: number };
    const total = countResult.count;

    // 查询数据
    const dataSql = `
      SELECT * FROM domains
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset) as DomainRow[];

    return {
      data: rows.map(rowToDomain),
      total,
    };
  }

  /**
   * 按名称查询领域（用于唯一性检查）
   */
  findByName(userId: string, name: string): Domain | null {
    const db = getDatabase();
    const sql = 'SELECT * FROM domains WHERE user_id = ? AND name = ?';
    const row = db.prepare(sql).get(userId, name) as DomainRow | undefined;
    return row ? rowToDomain(row) : null;
  }

  /**
   * 统计用户的领域数量
   */
  countByUserId(userId: string): number {
    const db = getDatabase();
    const sql = 'SELECT COUNT(*) as count FROM domains WHERE user_id = ?';
    const result = db.prepare(sql).get(userId) as { count: number };
    return result.count;
  }

  /**
   * 创建领域
   */
  create(data: CreateDomainData): Domain {
    const db = getDatabase();
    const id = generateId('dom');
    const now = new Date().toISOString();

    // 合并默认设置
    const settings: DomainSettings = {
      ...DEFAULT_DOMAIN_SETTINGS,
      ...data.settings,
    };

    const sql = `
      INSERT INTO domains (id, user_id, name, description, expertise, settings, status, document_count, conversation_count, workspace_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `;

    db.prepare(sql).run(
      id,
      data.userId,
      data.name,
      data.description || null,
      data.expertise || null,
      JSON.stringify(settings),
      DOMAIN_STATUS.INITIALIZING,
      data.workspacePath || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * 更新领域
   */
  update(id: string, data: UpdateDomainData): Domain | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 获取当前领域
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

    if (data.expertise !== undefined) {
      updates.push('expertise = ?');
      params.push(data.expertise || null);
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

    const sql = `UPDATE domains SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    return this.findById(id);
  }

  /**
   * 删除领域
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const sql = 'DELETE FROM domains WHERE id = ?';
    const result = db.prepare(sql).run(id);
    return result.changes > 0;
  }

  /**
   * 更新领域状态为 ready（当初始化完成时）
   */
  markAsReady(id: string): Domain | null {
    return this.update(id, { status: DOMAIN_STATUS.READY as Domain['status'] });
  }

  /**
   * 更新领域状态为 processing
   */
  markAsProcessing(id: string): Domain | null {
    return this.update(id, { status: DOMAIN_STATUS.PROCESSING as Domain['status'] });
  }

  /**
   * 更新领域状态为 error
   */
  markAsError(id: string): Domain | null {
    return this.update(id, { status: DOMAIN_STATUS.ERROR as Domain['status'] });
  }

  /**
   * 增加文档计数
   */
  incrementDocumentCount(id: string): void {
    const db = getDatabase();
    const sql = 'UPDATE domains SET document_count = document_count + 1, updated_at = ? WHERE id = ?';
    db.prepare(sql).run(new Date().toISOString(), id);
  }

  /**
   * 减少文档计数
   */
  decrementDocumentCount(id: string): void {
    const db = getDatabase();
    const sql = 'UPDATE domains SET document_count = MAX(0, document_count - 1), updated_at = ? WHERE id = ?';
    db.prepare(sql).run(new Date().toISOString(), id);
  }

  /**
   * 增加对话计数
   */
  incrementConversationCount(id: string): void {
    const db = getDatabase();
    const sql = 'UPDATE domains SET conversation_count = conversation_count + 1, updated_at = ? WHERE id = ?';
    db.prepare(sql).run(new Date().toISOString(), id);
  }
}

// 导出单例
export const domainRepository = new DomainRepository();

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 DomainRepository 代替 */
export const AssistantRepository = DomainRepository;
/** @deprecated 使用 domainRepository 代替 */
export const assistantRepository = domainRepository;
/** @deprecated 使用 CreateDomainData 代替 */
export type CreateAssistantData = CreateDomainData;
/** @deprecated 使用 UpdateDomainData 代替 */
export type UpdateAssistantData = UpdateDomainData;
/** @deprecated 使用 FindDomainsOptions 代替 */
export type FindAssistantsOptions = FindDomainsOptions;
