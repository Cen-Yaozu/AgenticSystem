import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@agentic-rag/shared';
import { z } from 'zod';

/**
 * 支持的文件类型
 */
export const SUPPORTED_FILE_TYPES = ['pdf', 'docx', 'txt', 'md', 'xlsx'] as const;

/**
 * 支持的 MIME 类型映射
 */
export const MIME_TYPE_MAP: Record<string, (typeof SUPPORTED_FILE_TYPES)[number]> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

/**
 * 文件扩展名映射
 */
export const EXTENSION_MAP: Record<string, (typeof SUPPORTED_FILE_TYPES)[number]> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.txt': 'txt',
  '.md': 'md',
  '.xlsx': 'xlsx',
};

/**
 * 最大文件大小（10MB）
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 每个领域最大文档数量
 */
export const MAX_DOCUMENTS_PER_DOMAIN = 100;

/**
 * @deprecated Use MAX_DOCUMENTS_PER_DOMAIN instead
 */
export const MAX_DOCUMENTS_PER_ASSISTANT = MAX_DOCUMENTS_PER_DOMAIN;

/**
 * 文档状态验证 Schema
 */
const documentStatusSchema = z.enum(['uploading', 'queued', 'processing', 'completed', 'failed']);

/**
 * 文档列表查询参数验证 Schema
 */
export const listDocumentsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : DEFAULT_PAGE))
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : DEFAULT_PAGE_SIZE))
    .pipe(z.number().int().min(1).max(MAX_PAGE_SIZE)),
  status: z
    .string()
    .optional()
    .transform((val) => val as typeof documentStatusSchema._type | undefined)
    .pipe(documentStatusSchema.optional()),
});

/**
 * 文档 ID 参数验证 Schema
 */
export const documentIdSchema = z.object({
  docId: z
    .string()
    .min(1, 'Document ID is required')
    .regex(/^doc_[a-zA-Z0-9]+$/, 'Invalid document ID format'),
});

/**
 * 领域 ID 参数验证 Schema（用于文档路由）
 */
export const domainIdParamSchema = z.object({
  domainId: z
    .string()
    .min(1, 'Domain ID is required')
    .regex(/^(dom|ast)_[a-zA-Z0-9]+$/, 'Invalid domain ID format'),
});

/**
 * @deprecated Use domainIdParamSchema instead
 */
export const assistantIdParamSchema = z.object({
  id: z
    .string()
    .min(1, 'Assistant ID is required')
    .regex(/^(dom|ast)_[a-zA-Z0-9]+$/, 'Invalid assistant ID format'),
});

/**
 * 文档路由参数验证 Schema（包含领域 ID 和文档 ID）
 */
export const documentParamsSchema = z.object({
  domainId: z
    .string()
    .min(1, 'Domain ID is required')
    .regex(/^(dom|ast)_[a-zA-Z0-9]+$/, 'Invalid domain ID format'),
  docId: z
    .string()
    .min(1, 'Document ID is required')
    .regex(/^doc_[a-zA-Z0-9]+$/, 'Invalid document ID format'),
});

/**
 * 验证文件类型
 */
export function validateFileType(mimeType: string, filename: string): {
  valid: boolean;
  fileType?: (typeof SUPPORTED_FILE_TYPES)[number];
  error?: string;
} {
  // 首先尝试通过 MIME 类型判断
  if (MIME_TYPE_MAP[mimeType]) {
    return { valid: true, fileType: MIME_TYPE_MAP[mimeType] };
  }

  // 回退到文件扩展名判断
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && EXTENSION_MAP[ext]) {
    return { valid: true, fileType: EXTENSION_MAP[ext] };
  }

  return {
    valid: false,
    error: `Unsupported file type. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`,
  };
}

/**
 * 验证文件大小
 */
export function validateFileSize(size: number): {
  valid: boolean;
  error?: string;
} {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

// 导出类型
export type ListDocumentsQuery = z.infer<typeof listDocumentsSchema>;
export type DocumentIdParams = z.infer<typeof documentIdSchema>;
export type DomainIdParams = z.infer<typeof domainIdParamSchema>;
/** @deprecated Use DomainIdParams instead */
export type AssistantIdParams = z.infer<typeof assistantIdParamSchema>;
export type DocumentParams = z.infer<typeof documentParamsSchema>;
