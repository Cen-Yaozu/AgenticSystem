/**
 * Document Service
 * 文档业务逻辑服务
 */

import type {
  Document,
  DocumentListParams,
  DocumentStatus,
  FileType
} from '@agentic-rag/shared';
import * as fs from 'fs';
import * as path from 'path';
import { AssistantNotFoundError } from '../errors/business.error';
import { AppError } from '../middleware/error';
import { assistantRepository } from '../repositories/assistant.repository';
import {
  documentRepository,
  type CreateDocumentData,
  type FindDocumentsOptions,
} from '../repositories/document.repository';
import { ids } from '../utils/id';
import { logger } from '../utils/logger';
import { processDocument as processDocumentAsync } from './document-processor.service';
import { qdrantService } from './qdrant.service';

// 文档存储目录
const DOCUMENTS_DIR = path.join(process.cwd(), 'data', 'documents');

// 支持的文件类型映射
const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/markdown': 'md',
};

const FILE_TYPE_TO_EXT: Record<FileType, string> = {
  pdf: '.pdf',
  docx: '.docx',
  xlsx: '.xlsx',
  txt: '.txt',
  md: '.md',
};

// 最大文件大小 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * 文档不存在错误
 */
export class DocumentNotFoundError extends AppError {
  constructor(documentId?: string) {
    super(
      'DOCUMENT_NOT_FOUND',
      documentId ? `Document ${documentId} not found` : 'Document not found',
      404
    );
    this.name = 'DocumentNotFoundError';
  }
}

/**
 * 文件类型不支持错误
 */
export class UnsupportedFileTypeError extends AppError {
  constructor(mimeType: string) {
    super(
      'UNSUPPORTED_FILE_TYPE',
      `Unsupported file type: ${mimeType}. Supported types: PDF, DOCX, XLSX, TXT, MD`,
      400
    );
    this.name = 'UnsupportedFileTypeError';
  }
}

/**
 * 文件过大错误
 */
export class FileTooLargeError extends AppError {
  constructor(size: number, maxSize: number) {
    super(
      'FILE_TOO_LARGE',
      `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      400
    );
    this.name = 'FileTooLargeError';
  }
}

/**
 * 文档正在处理中错误
 */
export class DocumentProcessingError extends AppError {
  constructor(documentId: string) {
    super('DOCUMENT_PROCESSING', `Document ${documentId} is currently being processed`, 409);
    this.name = 'DocumentProcessingError';
  }
}

/**
 * 文件不存在错误
 */
export class FileNotFoundError extends AppError {
  constructor(documentId: string) {
    super('FILE_NOT_FOUND', `File for document ${documentId} not found`, 404);
    this.name = 'FileNotFoundError';
  }
}

/**
 * 确保文档目录存在
 */
function ensureDocumentsDir(): void {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }
}

/**
 * 获取助手的文档目录
 */
function getAssistantDocumentsDir(assistantId: string): string {
  const dir = path.join(DOCUMENTS_DIR, assistantId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 生成文档存储路径
 */
function generateDocumentPath(assistantId: string, documentId: string, fileType: FileType): string {
  const dir = getAssistantDocumentsDir(assistantId);
  const ext = FILE_TYPE_TO_EXT[fileType];
  return path.join(dir, `${documentId}${ext}`);
}

/**
 * 从 MIME 类型获取文件类型
 */
function getFileTypeFromMimeType(mimeType: string): FileType | null {
  return MIME_TO_FILE_TYPE[mimeType] || null;
}

/**
 * 验证文件类型
 */
function validateFileType(mimeType: string): FileType {
  const fileType = getFileTypeFromMimeType(mimeType);
  if (!fileType) {
    throw new UnsupportedFileTypeError(mimeType);
  }
  return fileType;
}

/**
 * 验证文件大小
 */
function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new FileTooLargeError(size, MAX_FILE_SIZE);
  }
}

export const documentService = {
  /**
   * 上传文档
   * 保存文件 + 创建记录 + 触发异步处理
   */
  async uploadDocument(
    assistantId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }
  ): Promise<Document> {
    // 验证助手存在
    const assistant = assistantRepository.findById(assistantId);
    if (!assistant) {
      throw new AssistantNotFoundError(assistantId);
    }

    // 验证文件
    const fileType = validateFileType(file.mimetype);
    validateFileSize(file.size);

    // 确保目录存在
    ensureDocumentsDir();

    // 生成文档 ID 和路径
    const documentId = ids.document();
    const filePath = generateDocumentPath(assistantId, documentId, fileType);

    try {
      // 保存文件到磁盘
      fs.writeFileSync(filePath, file.buffer);
      logger.info(`文档文件已保存: ${filePath}`);

      // 创建数据库记录
      const input: CreateDocumentData = {
        assistantId,
        filename: file.originalname,
        fileType,
        fileSize: file.size,
        filePath,
      };

      const document = documentRepository.create(input);
      logger.info(`文档记录已创建: ${document.id}`);

      // 异步触发文档处理（不等待完成）
      this.triggerProcessing(document.id).catch((error: Error) => {
        logger.error(`文档处理触发失败: ${document.id} - ${error.message}`);
      });

      return document;
    } catch (error) {
      // 如果创建失败，清理已保存的文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  },

  /**
   * 触发文档处理
   */
  async triggerProcessing(documentId: string): Promise<void> {
    try {
      const document = documentRepository.findById(documentId);
      if (document) {
        await processDocumentAsync(document);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`文档处理失败: ${documentId} - ${errorMessage}`);
      // 错误已在 processor 中处理，这里只记录日志
    }
  },

  /**
   * 获取文档列表
   */
  listDocuments(
    assistantId: string,
    params: DocumentListParams
  ): { data: Document[]; total: number } {
    // 验证助手存在
    const assistant = assistantRepository.findById(assistantId);
    if (!assistant) {
      throw new AssistantNotFoundError(assistantId);
    }

    const options: FindDocumentsOptions = {
      assistantId,
      ...params,
    };

    return documentRepository.findByAssistantId(options);
  },

  /**
   * 获取文档详情
   */
  getDocument(assistantId: string, documentId: string): Document {
    const document = documentRepository.findById(documentId, assistantId);

    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    return document;
  },

  /**
   * 删除文档
   * 删除文件 + 删除向量 + 删除记录
   */
  async deleteDocument(assistantId: string, documentId: string): Promise<void> {
    // 获取文档信息
    const document = this.getDocument(assistantId, documentId);

    try {
      // 1. 删除向量数据
      try {
        await qdrantService.deletePointsByDocument(assistantId, documentId);
        logger.info(`文档向量已删除: ${documentId}`);
      } catch (error) {
        // 向量删除失败不阻止后续操作
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`删除文档向量失败: ${documentId} - ${errorMessage}`);
      }

      // 2. 删除文件
      if (document.filePath && fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
        logger.info(`文档文件已删除: ${document.filePath}`);
      }

      // 3. 删除数据库记录
      const deleted = documentRepository.delete(documentId);
      if (!deleted) {
        throw new AppError('DELETE_FAILED', `Failed to delete document record: ${documentId}`, 500);
      }

      logger.info(`文档已完全删除: ${documentId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`删除文档失败: ${documentId} - ${errorMessage}`);
      throw error;
    }
  },

  /**
   * 重新处理文档
   */
  async reprocessDocument(assistantId: string, documentId: string): Promise<Document> {
    // 获取文档信息
    const document = this.getDocument(assistantId, documentId);

    // 检查文档状态
    if (document.status === 'processing') {
      throw new DocumentProcessingError(documentId);
    }

    // 检查文件是否存在
    if (!document.filePath || !fs.existsSync(document.filePath)) {
      throw new FileNotFoundError(documentId);
    }

    // 重置为队列状态
    documentRepository.resetToQueued(documentId);

    // 异步触发重新处理
    this.triggerProcessing(documentId).catch((error: Error) => {
      logger.error(`文档重新处理触发失败: ${documentId} - ${error.message}`);
    });

    // 返回更新后的文档
    return this.getDocument(assistantId, documentId);
  },

  /**
   * 批量删除助手的所有文档
   */
  async deleteAllDocuments(assistantId: string): Promise<number> {
    // 获取所有文档
    const result = documentRepository.findByAssistantId({
      assistantId,
      page: 1,
      pageSize: 1000,
    });

    let deletedCount = 0;

    for (const document of result.data) {
      try {
        await this.deleteDocument(assistantId, document.id);
        deletedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`批量删除文档失败: ${document.id} - ${errorMessage}`);
      }
    }

    // 删除助手的文档目录
    const assistantDir = path.join(DOCUMENTS_DIR, assistantId);
    if (fs.existsSync(assistantDir)) {
      fs.rmSync(assistantDir, { recursive: true, force: true });
    }

    return deletedCount;
  },

  /**
   * 获取文档统计信息
   */
  getDocumentStats(assistantId: string): {
    total: number;
    byStatus: Record<DocumentStatus, number>;
    totalSize: number;
    totalChunks: number;
  } {
    // 验证助手存在
    const assistant = assistantRepository.findById(assistantId);
    if (!assistant) {
      throw new AssistantNotFoundError(assistantId);
    }

    // 获取所有文档
    const result = documentRepository.findByAssistantId({
      assistantId,
      page: 1,
      pageSize: 10000,
    });

    const stats = {
      total: result.total,
      byStatus: {
        uploading: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      } as Record<DocumentStatus, number>,
      totalSize: 0,
      totalChunks: 0,
    };

    for (const doc of result.data) {
      stats.byStatus[doc.status]++;
      stats.totalSize += doc.fileSize;
      stats.totalChunks += doc.chunkCount || 0;
    }

    return stats;
  },

  /**
   * 下载文档
   */
  downloadDocument(
    assistantId: string,
    documentId: string
  ): {
    buffer: Buffer;
    filename: string;
    fileType: FileType;
  } {
    const document = this.getDocument(assistantId, documentId);

    if (!document.filePath || !fs.existsSync(document.filePath)) {
      throw new FileNotFoundError(documentId);
    }

    const buffer = fs.readFileSync(document.filePath);

    return {
      buffer,
      filename: document.filename,
      fileType: document.fileType,
    };
  },
};
