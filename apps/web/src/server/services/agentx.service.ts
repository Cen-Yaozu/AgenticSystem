/**
 * AgentX 服务
 * 管理 AgentX 实例的初始化、Definition 注册和 Session 管理
 */

import type { MCPServersConfig } from '@agentic-rag/shared';
import { Server } from 'http';
import { logger } from '../utils/logger.js';

// AgentX 类型定义（基于设计文档）
interface AgentXConfig {
  llm: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
  agentxDir: string;
  server?: Server;
}

interface AgentDefinitionConfig {
  name: string;
  systemPrompt: string;
  mcpServers?: MCPServersConfig;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface AgentDefinition {
  name: string;
  config: AgentDefinitionConfig;
}

interface AgentImage {
  imageId: string;
  definitionName: string;
  name: string;
}

interface AgentSession {
  sessionId: string;
  imageId: string;
  userId: string;
}

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface Agent {
  receive(content: string): Promise<void>;
  react(handlers: {
    onTextDelta?: (e: { data: { text: string } }) => void;
    onAssistantMessage?: (e: { data: AgentMessage }) => void;
    onError?: (e: { error: Error }) => void;
  }): void;
}

interface AgentXInstance {
  request(type: string, data: any): Promise<any>;
  on(event: string, handler: (event: any) => void): void;
  dispose(): Promise<void>;
}

// 全局 AgentX 实例
let agentxInstance: AgentXInstance | null = null;

/**
 * 定义 Agent（创建 Definition 配置）
 */
export function defineAgent(config: AgentDefinitionConfig): AgentDefinition {
  return {
    name: config.name,
    config,
  };
}

/**
 * 初始化 AgentX 实例
 */
export async function initAgentX(config: AgentXConfig): Promise<AgentXInstance> {
  if (agentxInstance) {
    logger.warn('AgentX already initialized');
    return agentxInstance;
  }

  logger.info('Initializing AgentX...');

  try {
    // 动态导入 agentxjs
    const { createAgentX } = await import('agentxjs');

    agentxInstance = await createAgentX({
      llm: {
        apiKey: config.llm.apiKey,
        baseUrl: config.llm.baseUrl || 'https://api.anthropic.com',
        model: config.llm.model || 'claude-sonnet-4-20250514',
      },
      agentxDir: config.agentxDir,
      server: config.server,
    });

    logger.info('AgentX initialized successfully');
    return agentxInstance;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize AgentX');
    throw error;
  }
}

/**
 * 获取 AgentX 实例
 */
export function getAgentX(): AgentXInstance {
  if (!agentxInstance) {
    throw new Error('AgentX not initialized. Call initAgentX() first.');
  }
  return agentxInstance;
}

/**
 * 检查 AgentX 是否已初始化
 */
export function isAgentXInitialized(): boolean {
  return agentxInstance !== null;
}

/**
 * 构建 MCP Servers 配置
 * 合并系统级 MCP、内置检索 MCP 和用户自定义 MCP
 */
export function buildMCPServers(domain: {
  id: string;
  workspacePath?: string;
  documentCount: number;
  settings: {
    retrievalTopK?: number;
    retrievalThreshold?: number;
    mcpServers?: MCPServersConfig;
  };
}): MCPServersConfig {
  // 1. 系统级 MCP（始终启用，不可覆盖）
  const systemMCP: MCPServersConfig = {};

  // 只有当 workspacePath 存在时才添加 promptx MCP
  if (domain.workspacePath) {
    systemMCP.promptx = {
      command: 'npx',
      args: ['promptx-mcp'],
      env: {
        PROMPTX_PROJECT_DIR: domain.workspacePath,
      },
    };
  }

  // 2. 内置检索 MCP（如果领域有文档）
  const retrieverMCP: MCPServersConfig = domain.documentCount > 0 ? {
    retriever: {
      command: 'node',
      args: ['./mcp-servers/retriever.js'],
      env: {
        DOMAIN_ID: domain.id,
        QDRANT_COLLECTION: `domain_${domain.id}`,
        RETRIEVAL_TOP_K: String(domain.settings.retrievalTopK || 5),
        RETRIEVAL_THRESHOLD: String(domain.settings.retrievalThreshold || 0.7),
      },
    },
  } : {};

  // 3. 用户自定义 MCP
  const userMCP = domain.settings.mcpServers || {};

  // 4. 合并（系统级优先级最高）
  return {
    ...userMCP,      // 用户自定义（优先级最低）
    ...retrieverMCP, // 内置检索（中等优先级）
    ...systemMCP,    // 系统级（最高优先级，不可覆盖）
  };
}

/**
 * 构建 System Prompt
 * 提供最小引导，角色能力由 PromptX 注入
 */
export function buildSystemPrompt(domain: {
  settings: {
    primaryRoleId?: string;
    responseStyle?: string;
    tone?: string;
    language?: string;
  };
  expertise?: string;
  documentCount: number;
}): string {
  const { settings, expertise, documentCount } = domain;

  let prompt = `你是一个 AI 助手。\n\n`;

  // 如果有主角色，引导 AI 激活角色
  if (settings.primaryRoleId) {
    prompt += `对话开始时，请先调用 promptx_action 激活角色 "${settings.primaryRoleId}"。\n`;
    prompt += `激活角色后，你将获得该角色的完整能力和指导。\n\n`;
  }

  // 添加领域专业知识
  if (expertise) {
    prompt += `你的专业领域是：${expertise}\n\n`;
  }

  // 添加回复风格指导
  if (settings.responseStyle || settings.tone || settings.language) {
    prompt += `回复要求：\n`;
    if (settings.responseStyle) {
      prompt += `- 风格：${settings.responseStyle === 'detailed' ? '详细' : '简洁'}\n`;
    }
    if (settings.tone) {
      prompt += `- 语气：${settings.tone === 'formal' ? '正式' : '友好'}\n`;
    }
    if (settings.language) {
      prompt += `- 语言：${settings.language}\n`;
    }
    prompt += '\n';
  }

  // 列出可用的 MCP 工具
  prompt += `可用的 MCP 工具：\n`;
  if (settings.primaryRoleId) {
    prompt += `- promptx_action: 激活/切换角色\n`;
    prompt += `- promptx_recall: 检索记忆\n`;
    prompt += `- promptx_remember: 保存记忆\n`;
  }
  if (documentCount > 0) {
    prompt += `- search_documents: 检索文档\n`;
  }

  return prompt;
}

/**
 * 为领域注册 AgentX Definition
 */
export async function registerDomainDefinition(domain: {
  id: string;
  name: string;
  description?: string;
  workspacePath?: string;
  expertise?: string;
  documentCount: number;
  settings: {
    primaryRoleId?: string;
    responseStyle?: string;
    tone?: string;
    language?: string;
    maxTokens?: number;
    temperature?: number;
    retrievalTopK?: number;
    retrievalThreshold?: number;
    mcpServers?: MCPServersConfig;
  };
}): Promise<void> {
  const agentx = getAgentX();
  const containerId = `domain_${domain.id}`;

  try {
    // 1. 创建 Container（领域容器）
    await agentx.request('container_create_request', {
      requestId: `create_${containerId}`,
      containerId,
    });
    logger.info({ domainId: domain.id, containerId }, 'Created AgentX container for domain');

    // 2. 构建 MCP Servers 配置
    const mcpServers = buildMCPServers(domain);

    // 3. 创建 Image（Agent 配置）
    const imageResponse = await agentx.request('image_create_request', {
      requestId: `create_image_${containerId}`,
      containerId,
      config: {
        name: domain.name,
        description: domain.description || `Agent for ${domain.name}`,
        systemPrompt: buildSystemPrompt(domain),
        mcpServers,
      },
    });

    logger.info({
      domainId: domain.id,
      containerId,
      imageId: imageResponse.data.record.id
    }, 'Created AgentX image for domain');
  } catch (error) {
    logger.error({ err: error, domainId: domain.id }, 'Failed to register AgentX container/image');
    throw error;
  }
}

/**
 * 注销领域的 AgentX Container
 */
export async function unregisterDomainDefinition(domainId: string): Promise<void> {
  try {
    // Container 删除会自动级联删除其下的所有 Images 和 Sessions
    // 这里我们不需要显式调用API，因为 AgentX 数据存储在独立目录
    // 当 workspace 被删除时，AgentX 数据也会被清理
    logger.info({ domainId }, 'AgentX container will be cleaned up with workspace');
  } catch (error) {
    logger.error({ err: error, domainId }, 'Failed to unregister AgentX container');
    throw error;
  }
}

/**
 * 为领域创建 Session
 */
export async function createDomainSession(
  domainId: string,
  userId: string
): Promise<AgentSession> {
  const agentx = getAgentX();
  const definitionName = `domain_${domainId}`;

  // 获取或创建 MetaImage
  const image = await agentx.images.getMetaImage(definitionName);

  // 创建 Session
  const session = await agentx.sessions.create(image.imageId, userId);

  logger.info({ domainId, sessionId: session.sessionId, userId }, 'Created AgentX session for domain');

  return session;
}

/**
 * 获取 Session 并恢复 Agent
 */
export async function resumeSession(sessionId: string): Promise<Agent> {
  const agentx = getAgentX();
  const session = await agentx.sessions.get(sessionId);
  return session.resume();
}

/**
 * 获取 Session 的消息历史
 */
export async function getSessionMessages(sessionId: string): Promise<AgentMessage[]> {
  const agentx = getAgentX();
  return agentx.sessions.getMessages(sessionId);
}

/**
 * 删除 Session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const agentx = getAgentX();
  await agentx.sessions.delete(sessionId);
  logger.info({ sessionId }, 'Deleted AgentX session');
}

// 导出类型（MCPServerConfig 和 MCPServersConfig 从 @agentic-rag/shared 重新导出）
export type {
    Agent,
    AgentDefinition,
    AgentDefinitionConfig,
    AgentImage,
    AgentMessage,
    AgentSession,
    AgentXConfig,
    AgentXInstance
};

// 重新导出共享类型
  export type { MCPServerConfig, MCPServersConfig } from '@agentic-rag/shared';

