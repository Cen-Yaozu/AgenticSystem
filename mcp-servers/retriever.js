#!/usr/bin/env node

/**
 * Document Retrieval MCP Server
 *
 * 为 AgentX Agents 提供文档检索能力
 * 连接到 Qdrant 向量数据库进行语义搜索
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { QdrantClient } from '@qdrant/js-client-rest';

// 从环境变量读取配置
const DOMAIN_ID = process.env.DOMAIN_ID;
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'agentic_rag_documents';
const RETRIEVAL_TOP_K = parseInt(process.env.RETRIEVAL_TOP_K || '5', 10);
const RETRIEVAL_THRESHOLD = parseFloat(process.env.RETRIEVAL_THRESHOLD || '0.7');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// 验证必需的环境变量
if (!DOMAIN_ID) {
  console.error('Error: DOMAIN_ID environment variable is required');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// 初始化 Qdrant 客户端
const qdrant = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

/**
 * 生成查询向量（使用 OpenAI Embeddings）
 */
async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * 搜索文档
 */
async function searchDocuments(query, topK = RETRIEVAL_TOP_K, threshold = RETRIEVAL_THRESHOLD) {
  // 1. 生成查询向量
  const queryVector = await generateEmbedding(query);

  // 2. 在 Qdrant 中搜索
  const searchResult = await qdrant.search(QDRANT_COLLECTION, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
    with_vector: false,
    score_threshold: threshold,
    filter: {
      must: [
        {
          key: 'domainId',
          match: { value: DOMAIN_ID },
        },
      ],
    },
  });

  // 3. 格式化结果
  return searchResult.map((result) => ({
    documentId: result.payload.documentId,
    filename: result.payload.filename,
    content: result.payload.text,
    score: result.score,
    metadata: {
      chunkIndex: result.payload.chunkIndex,
      totalChunks: result.payload.totalChunks,
    },
  }));
}

// 创建 MCP Server
const server = new Server(
  {
    name: 'document-retriever',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_documents',
        description: `Search for relevant documents in the knowledge base for domain ${DOMAIN_ID}. Use this tool when you need to find information from uploaded documents to answer user questions.`,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query (will be converted to embeddings for semantic search)',
            },
            topK: {
              type: 'number',
              description: `Number of results to return (default: ${RETRIEVAL_TOP_K})`,
              default: RETRIEVAL_TOP_K,
            },
            threshold: {
              type: 'number',
              description: `Minimum similarity score threshold (default: ${RETRIEVAL_THRESHOLD})`,
              default: RETRIEVAL_THRESHOLD,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

// 注册工具调用处理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'search_documents') {
    try {
      const { query, topK, threshold } = args;
      const results = await searchDocuments(query, topK, threshold);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error.message,
              stack: error.stack,
            }),
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Document Retrieval MCP Server running for domain: ${DOMAIN_ID}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
