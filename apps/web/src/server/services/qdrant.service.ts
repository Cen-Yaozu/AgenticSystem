/**
 * Qdrant 向量数据库服务
 * 负责向量的存储、检索和管理
 */

import type { VectorPoint } from '@agentic-rag/shared';
import { QdrantClient } from '@qdrant/js-client-rest';
import { logger } from '../utils/logger';

// Qdrant 配置
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// 向量维度（OpenAI text-embedding-3-small）
const VECTOR_DIMENSION = 1536;

// Collection 命名规则：domain_{domainId}
// 向后兼容：同时支持 assistant_{id} 格式
const getCollectionName = (domainId: string): string => `domain_${domainId}`;

/**
 * Qdrant 客户端单例
 */
let qdrantClient: QdrantClient | null = null;

/**
 * 获取 Qdrant 客户端实例
 */
function getClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
    logger.info(`[Qdrant] 客户端已初始化，连接到: ${QDRANT_URL}`);
  }
  return qdrantClient;
}

/**
 * 检查 Qdrant 服务是否可用
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const client = getClient();
    await client.getCollections();
    return true;
  } catch (error) {
    logger.error(`[Qdrant] 健康检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * 创建领域的向量 Collection
 * @param domainId 领域 ID
 */
export async function createCollection(domainId: string): Promise<void> {
  const client = getClient();
  const collectionName = getCollectionName(domainId);

  try {
    // 检查 collection 是否已存在
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (exists) {
      logger.info(`[Qdrant] Collection "${collectionName}" 已存在`);
      return;
    }

    // 创建新的 collection
    await client.createCollection(collectionName, {
      vectors: {
        size: VECTOR_DIMENSION,
        distance: 'Cosine',
      },
      // 优化配置
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });

    logger.info(`[Qdrant] Collection "${collectionName}" 创建成功`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Qdrant] 创建 Collection 失败: ${errorMessage}`);
    throw new Error(`创建向量集合失败: ${errorMessage}`);
  }
}

/**
 * 删除领域的向量 Collection
 * @param domainId 领域 ID
 */
export async function deleteCollection(domainId: string): Promise<void> {
  const client = getClient();
  const collectionName = getCollectionName(domainId);

  try {
    // 检查 collection 是否存在
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      logger.info(`[Qdrant] Collection "${collectionName}" 不存在，无需删除`);
      return;
    }

    await client.deleteCollection(collectionName);
    logger.info(`[Qdrant] Collection "${collectionName}" 删除成功`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Qdrant] 删除 Collection 失败: ${errorMessage}`);
    throw new Error(`删除向量集合失败: ${errorMessage}`);
  }
}

/**
 * 批量插入/更新向量点
 * @param domainId 领域 ID
 * @param points 向量点数组
 */
export async function upsertPoints(
  domainId: string,
  points: VectorPoint[]
): Promise<void> {
  if (points.length === 0) {
    return;
  }

  const client = getClient();
  const collectionName = getCollectionName(domainId);

  try {
    // 确保 collection 存在
    await createCollection(domainId);

    // 转换为 Qdrant 格式
    const qdrantPoints = points.map((point) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload,
    }));

    // 批量插入（每批最多 100 个点）
    const batchSize = 100;
    for (let i = 0; i < qdrantPoints.length; i += batchSize) {
      const batch = qdrantPoints.slice(i, i + batchSize);
      await client.upsert(collectionName, {
        wait: true,
        points: batch,
      });
      logger.info(
        `[Qdrant] 插入向量批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(qdrantPoints.length / batchSize)}, 数量: ${batch.length}`
      );
    }

    logger.info(`[Qdrant] 成功插入 ${points.length} 个向量点到 "${collectionName}"`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Qdrant] 插入向量失败: ${errorMessage}`);
    throw new Error(`插入向量失败: ${errorMessage}`);
  }
}

/**
 * 删除指定文档的所有向量
 * @param domainId 领域 ID
 * @param documentId 文档 ID
 */
export async function deletePointsByDocument(
  domainId: string,
  documentId: string
): Promise<void> {
  const client = getClient();
  const collectionName = getCollectionName(domainId);

  try {
    // 检查 collection 是否存在
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      logger.info(`[Qdrant] Collection "${collectionName}" 不存在，无需删除向量`);
      return;
    }

    // 按 documentId 过滤删除
    await client.delete(collectionName, {
      wait: true,
      filter: {
        must: [
          {
            key: 'documentId',
            match: {
              value: documentId,
            },
          },
        ],
      },
    });

    logger.info(`[Qdrant] 成功删除文档 "${documentId}" 的所有向量`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Qdrant] 删除文档向量失败: ${errorMessage}`);
    throw new Error(`删除文档向量失败: ${errorMessage}`);
  }
}

/**
 * 搜索相似向量
 * @param domainId 领域 ID
 * @param queryVector 查询向量
 * @param limit 返回数量限制
 * @param scoreThreshold 相似度阈值（0-1）
 */
export async function searchSimilar(
  domainId: string,
  queryVector: number[],
  limit: number = 5,
  scoreThreshold: number = 0.7
): Promise<Array<{
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}>> {
  const client = getClient();
  const collectionName = getCollectionName(domainId);

  try {
    // 检查 collection 是否存在
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      logger.warn(`[Qdrant] Collection "${collectionName}" 不存在，返回空结果`);
      return [];
    }

    const results = await client.search(collectionName, {
      vector: queryVector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });

    logger.info(`[Qdrant] 搜索完成，找到 ${results.length} 个相似结果`);

    return results.map((result) => ({
      id: String(result.id),
      score: result.score,
      payload: result.payload as VectorPoint['payload'],
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Qdrant] 搜索向量失败: ${errorMessage}`);
    throw new Error(`搜索向量失败: ${errorMessage}`);
  }
}

/**
 * 获取 Collection 统计信息
 * @param domainId 领域 ID
 */
export async function getCollectionInfo(domainId: string): Promise<{
  exists: boolean;
  pointsCount: number;
  vectorsCount: number;
} | null> {
  const client = getClient();
  const collectionName = getCollectionName(domainId);

  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      return { exists: false, pointsCount: 0, vectorsCount: 0 };
    }

    const info = await client.getCollection(collectionName);
    return {
      exists: true,
      pointsCount: info.points_count || 0,
      vectorsCount: info.indexed_vectors_count || info.points_count || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Qdrant] 获取 Collection 信息失败: ${errorMessage}`);
    return null;
  }
}

// 导出服务对象
export const qdrantService = {
  checkHealth,
  createCollection,
  deleteCollection,
  upsertPoints,
  deletePointsByDocument,
  searchSimilar,
  getCollectionInfo,
};
