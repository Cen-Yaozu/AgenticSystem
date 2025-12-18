import type {
  CreateDocumentInput,
  Document,
  DocumentListParams,
  DocumentMetadata,
  DocumentStatus,
  FileType,
  UpdateDocumentInput,
} from '@agentic-rag/shared';
import { getDatabase } from '../database/index.js';
import { generateId } from '../utils/id.js';

/**
 * 数据库中的文档记录类型
 */
interface DocumentRow {
  id: string;
  assistant_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_path: string | null;
  status: string;
  progress: number;
  error_message: string | null;
  chunk_count: number;
  retry_count: number;
  metadata: string;
  uploaded_at: string;
  processed_at: string | null;
}

/**
 * 创建文档的输入数据（仓库层）
 */
export interface CreateDocumentData extends CreateDocumentInput {
  assistantId: string;
}

/**
 * 查询文档列表的选项
 */
export interface FindDocumentsOptions extends DocumentListParams {
  assistantId: string;
}

/**
 * 将数据库行转换为 Document 对象
 */
function rowToDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    assistantId: row.assistant_id,
    filename: row.filename,
    fileType: row.file_type as FileType,
    fileSize: row.file_size,
    filePath: row.file_path || '',
    status: row.status as DocumentStatus,
    progress: row.progress,
    errorMessage: row.error_message || undefined,
    chunkCount: row.chunk_count,
    retryCount: row.retry_count,
    metadata: JSON.parse(row.metadata) as DocumentMetadata,
    uploadedAt: row.uploaded_at,
    processedAt: row.processed_at || undefined,
  };
}

/**
 * 文档仓库类
 */
export class DocumentRepository {
  /**
   * 按 ID 查询文档
   */
  findById(id: string, assistantId?: string): Document | null {
    const db = getDatabase();

    let sql = 'SELECT * FROM documents WHERE id = ?';
    const params: string[] = [id];

    if (assistantId) {
      sql += ' AND assistant_id = ?';
      params.push(assistantId);
    }

    const row = db.prepare(sql).get(...params) as DocumentRow | undefined;
    return row ? rowToDocument(row) : null;
  }

  /**
   * 按助手 ID 查询文档列表
   */
  findByAssistantId(options: FindDocumentsOptions): { data: Document[]; total: number } {
    const db = getDatabase();
    const { assistantId, page = 1, pageSize = 20, status } = options;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = 'WHERE assistant_id = ?';
    const params: (string | number)[] = [assistantId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as count FROM documents ${whereClause}`;
    const countResult = db.prepare(countSql).get(...params) as { count: number };
    const total = countResult.count;

    // 查询数据
    const dataSql = `
      SELECT * FROM documents
      ${whereClause}
      ORDER BY uploaded_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset) as DocumentRow[];

    return {
      data: rows.map(rowToDocument),
      total,
    };
  }

  /**
   * 统计助手的文档数量
   */
  countByAssistantId(assistantId: string): number {
    const db = getDatabase();
    const sql = 'SELECT COUNT(*) as count FROM documents WHERE assistant_id = ?';
    const result = db.prepare(sql).get(assistantId) as { count: number };
    return result.count;
  }

  /**
   * 按状态统计文档数量
   */
  countByStatus(assistantId: string, status: DocumentStatus): number {
    const db = getDatabase();
    const sql = 'SELECT COUNT(*) as count FROM documents WHERE assistant_id = ? AND status = ?';
    const result = db.prepare(sql).get(assistantId, status) as { count: number };
    return result.count;
  }

  /**
   * 创建文档
   */
  create(data: CreateDocumentData): Document {
    const db = getDatabase();
    const id = generateId('doc');
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO documents (
        id, assistant_id, filename, file_type, file_size, file_path,
        status, progress, error_message, chunk_count, retry_count, metadata,
        uploaded_at, processed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'queued', 0, NULL, 0, 0, '{}', ?, NULL)
    `;

    db.prepare(sql).run(
      id,
      data.assistantId,
      data.filename,
      data.fileType,
      data.fileSize,
      data.filePath,
      now
    );

    return this.findById(id)!;
  }

  /**
   * 更新文档
   */
  update(id: string, data: UpdateDocumentInput): Document | null {
    const db = getDatabase();

    // 获取当前文档
    const current = this.findById(id);
    if (!current) {
      return null;
    }

    // 构建更新字段
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.progress !== undefined) {
      updates.push('progress = ?');
      params.push(data.progress);
    }

    if (data.errorMessage !== undefined) {
      updates.push('error_message = ?');
      params.push(data.errorMessage);
    }

    if (data.chunkCount !== undefined) {
      updates.push('chunk_count = ?');
      params.push(data.chunkCount);
    }

    if (data.retryCount !== undefined) {
      updates.push('retry_count = ?');
      params.push(data.retryCount);
    }

    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(data.metadata));
    }

    if (data.processedAt !== undefined) {
      updates.push('processed_at = ?');
      params.push(data.processedAt);
    }

    if (updates.length === 0) {
      return current;
    }

    params.push(id);

    const sql = `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    return this.findById(id);
  }

  /**
   * 删除文档
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const sql = 'DELETE FROM documents WHERE id = ?';
    const result = db.prepare(sql).run(id);
    return result.changes > 0;
  }

  /**
   * 按助手 ID 删除所有文档
   */
  deleteByAssistantId(assistantId: string): number {
    const db = getDatabase();
    const sql = 'DELETE FROM documents WHERE assistant_id = ?';
    const result = db.prepare(sql).run(assistantId);
    return result.changes;
  }

  /**
   * 更新文档状态
   */
  updateStatus(id: string, status: DocumentStatus, errorMessage?: string): Document | null {
    return this.update(id, {
      status,
      errorMessage: errorMessage || null,
    });
  }

  /**
   * 更新处理进度
   */
  updateProgress(id: string, progress: number): Document | null {
    return this.update(id, { progress });
  }

  /**
   * 标记为处理中
   */
  markAsProcessing(id: string): Document | null {
    return this.update(id, {
      status: 'processing',
      progress: 0,
      errorMessage: null,
    });
  }

  /**
   * 标记为完成
   */
  markAsCompleted(id: string, chunkCount: number): Document | null {
    return this.update(id, {
      status: 'completed',
      progress: 100,
      chunkCount,
      processedAt: new Date().toISOString(),
    });
  }

  /**
   * 标记为失败
   */
  markAsFailed(id: string, errorMessage: string): Document | null {
    const current = this.findById(id);
    if (!current) return null;

    return this.update(id, {
      status: 'failed',
      errorMessage,
      retryCount: current.retryCount + 1,
    });
  }

  /**
   * 重置为队列状态（用于重试）
   */
  resetToQueued(id: string): Document | null {
    return this.update(id, {
      status: 'queued',
      progress: 0,
      errorMessage: null,
    });
  }

  /**
   * 查找需要处理的文档（状态为 queued）
   */
  findPendingDocuments(limit: number = 10): Document[] {
    const db = getDatabase();
    const sql = `
      SELECT * FROM documents
      WHERE status = 'queued'
      ORDER BY uploaded_at ASC
      LIMIT ?
    `;
    const rows = db.prepare(sql).all(limit) as DocumentRow[];
    return rows.map(rowToDocument);
  }

  /**
   * 查找失败且可重试的文档（重试次数 < 3）
   */
  findRetryableDocuments(limit: number = 10): Document[] {
    const db = getDatabase();
    const sql = `
      SELECT * FROM documents
      WHERE status = 'failed' AND retry_count < 3
      ORDER BY uploaded_at ASC
      LIMIT ?
    `;
    const rows = db.prepare(sql).all(limit) as DocumentRow[];
    return rows.map(rowToDocument);
  }
}

// 导出单例
export const documentRepository = new DocumentRepository();
