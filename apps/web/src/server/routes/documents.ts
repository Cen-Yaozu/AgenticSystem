/**
 * 文档路由
 * 嵌套在助手路由下：/api/v1/assistants/:assistantId/documents
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { authMiddleware, getCurrentUser } from '../middleware/auth.js';
import { assistantService } from '../services/assistant.service.js';
import { documentService } from '../services/document.service.js';
import { success, successWithPagination } from '../utils/response.js';
import { listDocumentsSchema } from '../validators/document.validator.js';

// 创建带有 assistantId 参数的路由
const documents = new Hono<{
  Variables: {
    assistantId: string;
  };
}>();

// 所有路由都需要认证
documents.use('*', authMiddleware());

// 验证助手存在且属于当前用户的中间件
documents.use('*', async (c, next) => {
  const user = getCurrentUser(c);
  const assistantId = c.req.param('assistantId');

  if (!assistantId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Assistant ID is required',
        },
      },
      400
    );
  }

  // 验证助手存在且属于当前用户
  await assistantService.getAssistantById(user.userId, assistantId);

  // 将 assistantId 存储到上下文中
  c.set('assistantId', assistantId);

  await next();
});

/**
 * POST /api/v1/assistants/:assistantId/documents - 上传文档
 */
documents.post('/', async (c) => {
  const assistantId = c.get('assistantId');

  // 解析 multipart/form-data
  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'File is required',
        },
      },
      400
    );
  }

  // 读取文件内容
  const buffer = Buffer.from(await file.arrayBuffer());

  const document = await documentService.uploadDocument(assistantId, {
    buffer,
    originalname: file.name,
    mimetype: file.type,
    size: file.size,
  });

  return success(c, document, 201);
});

/**
 * GET /api/v1/assistants/:assistantId/documents - 获取文档列表
 */
documents.get('/', zValidator('query', listDocumentsSchema), async (c) => {
  const assistantId = c.get('assistantId');
  const query = c.req.valid('query');

  const result = documentService.listDocuments(assistantId, {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
  });

  return successWithPagination(c, result.data, {
    page: query.page || 1,
    pageSize: query.pageSize || 20,
    total: result.total,
  });
});

/**
 * GET /api/v1/assistants/:assistantId/documents/stats - 获取文档统计
 */
documents.get('/stats', async (c) => {
  const assistantId = c.get('assistantId');

  const stats = documentService.getDocumentStats(assistantId);

  return success(c, stats);
});

/**
 * GET /api/v1/assistants/:assistantId/documents/:documentId - 获取文档详情
 */
documents.get('/:documentId', async (c) => {
  const assistantId = c.get('assistantId');
  const documentId = c.req.param('documentId');

  const document = documentService.getDocument(assistantId, documentId);

  return success(c, document);
});

/**
 * GET /api/v1/assistants/:assistantId/documents/:documentId/download - 下载文档
 */
documents.get('/:documentId/download', async (c) => {
  const assistantId = c.get('assistantId');
  const documentId = c.req.param('documentId');

  const downloadResult = documentService.downloadDocument(assistantId, documentId);

  // 设置响应头
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    md: 'text/markdown',
  };

  c.header('Content-Type', mimeTypes[downloadResult.fileType] || 'application/octet-stream');
  c.header(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(downloadResult.filename)}"`
  );
  c.header('Content-Length', downloadResult.buffer.length.toString());

  // 将 Buffer 转换为 Uint8Array
  const uint8Array = new Uint8Array(downloadResult.buffer);

  return new Response(uint8Array, {
    status: 200,
    headers: c.res.headers,
  });
});

/**
 * DELETE /api/v1/assistants/:assistantId/documents/:documentId - 删除文档
 */
documents.delete('/:documentId', async (c) => {
  const assistantId = c.get('assistantId');
  const documentId = c.req.param('documentId');

  await documentService.deleteDocument(assistantId, documentId);

  return c.body(null, 204);
});

/**
 * POST /api/v1/assistants/:assistantId/documents/:documentId/reprocess - 重新处理文档
 */
documents.post('/:documentId/reprocess', async (c) => {
  const assistantId = c.get('assistantId');
  const documentId = c.req.param('documentId');

  const document = await documentService.reprocessDocument(assistantId, documentId);

  return success(c, document);
});

export default documents;
