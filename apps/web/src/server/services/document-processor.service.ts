/**
 * 文档处理器服务
 * 负责文档处理的完整流水线：解析 → 分块 → 向量化 → 存储
 */

import type { Document, DocumentChunk, FileType, VectorPoint } from '@agentic-rag/shared';
import { parseDocument } from '../parsers';
import { documentRepository } from '../repositories/document.repository';
import { ids } from '../utils/id';
import { logger } from '../utils/logger';
import { getEmbeddings } from './embedding.service';
import { deletePointsByDocument, upsertPoints } from './qdrant.service';

// 分块配置
const CHUNK_SIZE = 1000; // 每块字符数
const CHUNK_OVERLAP = 100; // 重叠字符数
const MAX_RETRY_COUNT = 3; // 最大重试次数

/**
 * 处理进度回调类型
 */
export type ProgressCallback = (progress: {
  stage: 'validation' | 'extraction' | 'cleaning' | 'chunking' | 'embedding' | 'indexing';
  progress: number;
  message?: string;
}) => void;

/**
 * 处理单个文档
 * @param document 文档记录
 * @param onProgress 进度回调（可选）
 */
export async function processDocument(
  document: Document,
  onProgress?: ProgressCallback
): Promise<void> {
  const { id: documentId, domainId, filename, fileType, filePath } = document;

  logger.info(`[Processor] 开始处理文档: ${filename} (${documentId})`);

  try {
    // 更新状态为处理中
    await documentRepository.markAsProcessing(documentId);

    // 阶段 1: 验证
    onProgress?.({ stage: 'validation', progress: 0, message: '验证文档...' });

    if (!filePath) {
      throw new Error('文档文件路径为空');
    }

    // 阶段 2: 提取文本
    onProgress?.({ stage: 'extraction', progress: 10, message: '提取文本内容...' });

    const parseResult = await parseDocument(filePath, fileType as FileType);

    if (!parseResult.success || !parseResult.content) {
      throw new Error(parseResult.error || '文档解析失败');
    }

    logger.info(`[Processor] 文本提取完成: ${filename}, 字数: ${parseResult.metadata.wordCount || 0}`);

    // 阶段 3: 清理文本
    onProgress?.({ stage: 'cleaning', progress: 30, message: '清理文本...' });

    const cleanedContent = cleanText(parseResult.content);

    // 阶段 4: 分块
    onProgress?.({ stage: 'chunking', progress: 40, message: '文本分块...' });

    const chunks = splitIntoChunks(cleanedContent, documentId);

    if (chunks.length === 0) {
      throw new Error('文档分块后无有效内容');
    }

    logger.info(`[Processor] 分块完成: ${filename}, 块数: ${chunks.length}`);

    // 阶段 5: 向量化
    onProgress?.({ stage: 'embedding', progress: 50, message: '生成向量...' });

    const chunkTexts = chunks.map((chunk) => chunk.content);
    const embeddings = await getEmbeddings(chunkTexts);

    if (embeddings.length !== chunks.length) {
      throw new Error(`向量数量不匹配: 期望 ${chunks.length}, 实际 ${embeddings.length}`);
    }

    logger.info(`[Processor] 向量化完成: ${filename}, 向量数: ${embeddings.length}`);

    // 阶段 6: 存储到向量数据库
    onProgress?.({ stage: 'indexing', progress: 80, message: '存储向量...' });

    // 先删除旧的向量（如果是重新处理）
    await deletePointsByDocument(domainId, documentId);

    // 构建向量点
    const vectorPoints: VectorPoint[] = chunks.map((chunk, index) => {
      const embedding = embeddings[index];
      if (!embedding) {
        throw new Error(`向量索引 ${index} 不存在`);
      }
      return {
        id: chunk.id,
        vector: embedding,
        payload: {
          documentId,
          documentName: filename,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
        },
      };
    });

    // 插入向量
    await upsertPoints(domainId, vectorPoints);

    logger.info(`[Processor] 向量存储完成: ${filename}`);

    // 更新文档状态为完成
    await documentRepository.markAsCompleted(documentId, chunks.length);

    onProgress?.({ stage: 'indexing', progress: 100, message: '处理完成' });

    logger.info(`[Processor] 文档处理完成: ${filename}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Processor] 文档处理失败: ${filename}, 错误: ${errorMessage}`);

    // 更新文档状态为失败
    await documentRepository.markAsFailed(documentId, errorMessage);

    throw error;
  }
}

/**
 * 重新处理文档
 * @param documentId 文档 ID
 */
export async function reprocessDocument(documentId: string): Promise<void> {
  const document = await documentRepository.findById(documentId);

  if (!document) {
    throw new Error('文档不存在');
  }

  // 检查重试次数
  if ((document.retryCount || 0) >= MAX_RETRY_COUNT) {
    throw new Error(`文档已达到最大重试次数 (${MAX_RETRY_COUNT})`);
  }

  // 重置状态
  await documentRepository.resetToQueued(documentId);

  // 重新处理
  await processDocument(document);
}

/**
 * 批量处理待处理的文档
 * @param domainId 领域 ID（可选，不传则处理所有）
 * @param limit 处理数量限制
 */
export async function processPendingDocuments(
  domainId?: string,
  limit: number = 10
): Promise<{ processed: number; failed: number }> {
  const pendingDocs = await documentRepository.findPendingDocuments(limit);

  // 如果指定了领域 ID，则过滤
  const docsToProcess = domainId
    ? pendingDocs.filter((doc) => doc.domainId === domainId)
    : pendingDocs;

  let processed = 0;
  let failed = 0;

  for (const doc of docsToProcess) {
    try {
      await processDocument(doc);
      processed++;
    } catch (error) {
      failed++;
      logger.error(`[Processor] 批量处理失败: ${doc.filename}`);
    }
  }

  logger.info(`[Processor] 批量处理完成: 成功 ${processed}, 失败 ${failed}`);
  return { processed, failed };
}

/**
 * 清理文本
 */
function cleanText(text: string): string {
  return (
    text
      // 移除控制字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 规范化空格
      .replace(/[ \t]+/g, ' ')
      // 规范化换行
      .replace(/\n{3,}/g, '\n\n')
      // 移除行首尾空格
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim()
  );
}

/**
 * 将文本分割成块
 * @param text 输入文本
 * @param documentId 文档 ID
 * @returns 文档块数组
 */
function splitIntoChunks(text: string, documentId: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let position = 0;
  let chunkIndex = 0;

  while (position < text.length) {
    // 计算块的结束位置
    let endPosition = Math.min(position + CHUNK_SIZE, text.length);

    // 如果不是最后一块，尝试在句子边界处分割
    if (endPosition < text.length) {
      const searchStart = Math.max(position + CHUNK_SIZE - 200, position);
      const searchText = text.slice(searchStart, endPosition);

      // 查找最后一个句子结束符
      const sentenceEnders = [
        searchText.lastIndexOf('。'),
        searchText.lastIndexOf('！'),
        searchText.lastIndexOf('？'),
        searchText.lastIndexOf('. '),
        searchText.lastIndexOf('! '),
        searchText.lastIndexOf('? '),
        searchText.lastIndexOf('\n'),
      ];

      const lastEnder = Math.max(...sentenceEnders);
      if (lastEnder > 0) {
        endPosition = searchStart + lastEnder + 1;
      }
    }

    // 提取块内容
    const chunkContent = text.slice(position, endPosition).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        id: ids.chunk(),
        documentId,
        content: chunkContent,
        chunkIndex,
        startPosition: position,
        endPosition,
      });
      chunkIndex++;
    }

    // 移动位置（考虑重叠）
    position = endPosition - CHUNK_OVERLAP;
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && position <= lastChunk.startPosition) {
      position = endPosition; // 避免无限循环
    }
  }

  return chunks;
}

// 导出服务对象
export const documentProcessorService = {
  processDocument,
  reprocessDocument,
  processPendingDocuments,
};
