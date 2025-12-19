/**
 * Embedding 服务
 * 负责将文本转换为向量
 */

import { logger } from '../utils/logger';

// OpenAI 配置
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// 向量维度
const VECTOR_DIMENSION = 1536;

// 批处理配置
const MAX_BATCH_SIZE = 100; // OpenAI 最大批处理数量
const MAX_TOKENS_PER_REQUEST = 8000; // 每次请求的最大 token 数

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * 检查 Embedding 服务是否可用
 */
export async function checkEmbeddingService(): Promise<boolean> {
  if (!OPENAI_API_KEY) {
    logger.warn('[Embedding] OPENAI_API_KEY 未配置');
    return false;
  }

  try {
    // 测试一个简单的 embedding 请求
    const result = await getEmbedding('test');
    return result.length === VECTOR_DIMENSION;
  } catch (error) {
    logger.error(`[Embedding] 服务检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * 获取单个文本的向量
 * @param text 输入文本
 * @returns 向量数组
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 未配置');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('输入文本不能为空');
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API 错误: ${response.status} - ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();

    if (!data.data || data.data.length === 0 || !data.data[0]) {
      throw new Error('OpenAI 返回空的 embedding 数据');
    }

    const firstEmbedding = data.data[0];
    logger.info(`[Embedding] 成功生成向量，使用 ${data.usage.total_tokens} tokens`);
    return firstEmbedding.embedding;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Embedding] 生成向量失败: ${errorMessage}`);
    throw new Error(`生成向量失败: ${errorMessage}`);
  }
}

/**
 * 批量获取文本的向量
 * @param texts 输入文本数组
 * @returns 向量数组的数组
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 未配置');
  }

  if (!texts || texts.length === 0) {
    return [];
  }

  // 过滤空文本
  const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (validTexts.length === 0) {
    return [];
  }

  const allEmbeddings: number[][] = [];

  // 分批处理
  for (let i = 0; i < validTexts.length; i += MAX_BATCH_SIZE) {
    const batch = validTexts.slice(i, i + MAX_BATCH_SIZE);
    const batchEmbeddings = await getBatchEmbeddings(batch);
    allEmbeddings.push(...batchEmbeddings);

    logger.info(
      `[Embedding] 批次 ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(validTexts.length / MAX_BATCH_SIZE)} 完成`
    );
  }

  return allEmbeddings;
}

/**
 * 获取一批文本的向量（内部方法）
 */
async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API 错误: ${response.status} - ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('OpenAI 返回空的 embedding 数据');
    }

    // 按 index 排序确保顺序正确
    const sortedData = data.data.sort((a, b) => a.index - b.index);

    logger.info(
      `[Embedding] 批量生成 ${texts.length} 个向量，使用 ${data.usage.total_tokens} tokens`
    );

    return sortedData.map((item) => item.embedding);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Embedding] 批量生成向量失败: ${errorMessage}`);
    throw new Error(`批量生成向量失败: ${errorMessage}`);
  }
}

/**
 * 估算文本的 token 数量（粗略估算）
 * @param text 输入文本
 * @returns 估算的 token 数量
 */
export function estimateTokens(text: string): number {
  // 粗略估算：英文约 4 字符/token，中文约 1.5 字符/token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 检查文本是否超过 token 限制
 * @param text 输入文本
 * @param maxTokens 最大 token 数
 */
export function isWithinTokenLimit(text: string, maxTokens: number = MAX_TOKENS_PER_REQUEST): boolean {
  return estimateTokens(text) <= maxTokens;
}

// 导出服务对象
export const embeddingService = {
  checkEmbeddingService,
  getEmbedding,
  getEmbeddings,
  estimateTokens,
  isWithinTokenLimit,
};
