import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 工作区根目录
 * 默认在项目根目录的 workspaces 文件夹下
 */
const WORKSPACES_ROOT = process.env.WORKSPACES_ROOT || join(__dirname, '../../../../../workspaces');

/**
 * 工作区接口
 */
export interface Workspace {
  domainId: string;
  /** @deprecated Use domainId instead */
  assistantId?: string;
  path: string;
  promptxResourcePath: string;
  mcpConfigPath: string;
  documentsPath: string;
}

/**
 * MCP 配置接口
 */
interface McpConfig {
  mcpServers: {
    promptx: {
      command: string;
      args: string[];
      env: {
        WORKSPACE_DIR: string;
      };
    };
  };
}

/**
 * 工作区服务类
 * 管理领域的工作区目录
 */
export class WorkspaceService {
  private workspacesRoot: string;

  constructor(workspacesRoot?: string) {
    this.workspacesRoot = workspacesRoot || WORKSPACES_ROOT;
  }

  /**
   * 获取工作区路径
   */
  getWorkspacePath(domainId: string): string {
    return join(this.workspacesRoot, domainId);
  }

  /**
   * 获取工作区详情
   */
  getWorkspace(domainId: string): Workspace {
    const basePath = this.getWorkspacePath(domainId);
    return {
      domainId,
      // 向后兼容
      assistantId: domainId,
      path: basePath,
      promptxResourcePath: join(basePath, '.promptx', 'resource'),
      mcpConfigPath: join(basePath, 'mcp.json'),
      documentsPath: join(basePath, 'documents'),
    };
  }

  /**
   * 创建工作区目录结构
   *
   * 目录结构：
   * workspaces/{domainId}/
   * ├── .promptx/
   * │   └── resource/
   * │       └── role/
   * ├── mcp.json
   * └── documents/
   */
  async createWorkspace(
    domainId: string,
    settings?: { retrievalTopK?: number; retrievalThreshold?: number }
  ): Promise<Workspace> {
    const workspace = this.getWorkspace(domainId);

    try {
      // 确保工作区根目录存在
      if (!existsSync(this.workspacesRoot)) {
        mkdirSync(this.workspacesRoot, { recursive: true });
        logger.info(`Created workspaces root directory: ${this.workspacesRoot}`);
      }

      // 创建工作区目录
      if (!existsSync(workspace.path)) {
        mkdirSync(workspace.path, { recursive: true });
        logger.info(`Created workspace directory: ${workspace.path}`);
      }

      // 创建 .promptx/resource/role 目录
      const rolePath = join(workspace.promptxResourcePath, 'role');
      if (!existsSync(rolePath)) {
        mkdirSync(rolePath, { recursive: true });
        logger.info(`Created PromptX resource directory: ${rolePath}`);
      }

      // 创建 documents 目录
      if (!existsSync(workspace.documentsPath)) {
        mkdirSync(workspace.documentsPath, { recursive: true });
        logger.info(`Created documents directory: ${workspace.documentsPath}`);
      }

      // 生成 MCP 配置文件
      this.generateMcpConfig(workspace, domainId, settings);

      logger.info(`Workspace created successfully for domain: ${domainId}`);
      return workspace;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error, domainId }, `Failed to create workspace for domain ${domainId}: ${errorMessage}`);
      // 尝试清理已创建的目录
      this.cleanupWorkspace(workspace.path);
      throw new Error(`Failed to create workspace: ${errorMessage}`);
    }
  }

  /**
   * 删除工作区目录
   */
  async deleteWorkspace(domainId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(domainId);

    try {
      if (existsSync(workspacePath)) {
        rmSync(workspacePath, { recursive: true, force: true });
        logger.info(`Deleted workspace directory: ${workspacePath}`);
      } else {
        logger.warn(`Workspace directory not found: ${workspacePath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error, domainId }, `Failed to delete workspace for domain ${domainId}: ${errorMessage}`);
      throw new Error(`Failed to delete workspace: ${errorMessage}`);
    }
  }

  /**
   * 检查工作区是否存在
   */
  workspaceExists(domainId: string): boolean {
    return existsSync(this.getWorkspacePath(domainId));
  }

  /**
   * 生成 MCP 配置文件
   */
  private generateMcpConfig(
    workspace: Workspace,
    domainId: string,
    settings?: { retrievalTopK?: number; retrievalThreshold?: number }
  ): void {
    const projectRoot = resolve(__dirname, '../../../../../');
    const retrieverPath = resolve(projectRoot, 'mcp-servers/retriever.js');

    const config: McpConfig = {
      mcpServers: {
        promptx: {
          command: 'npx',
          args: ['-y', 'promptx-mcp'],
          env: {
            WORKSPACE_DIR: resolve(workspace.path),
          },
        },
        retriever: {
          command: 'node',
          args: [retrieverPath],
          env: {
            DOMAIN_ID: domainId,
            QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
            QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
            QDRANT_COLLECTION: process.env.QDRANT_COLLECTION_NAME || 'agentic_rag_documents',
            RETRIEVAL_TOP_K: String(settings?.retrievalTopK || 5),
            RETRIEVAL_THRESHOLD: String(settings?.retrievalThreshold || 0.7),
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
            EMBEDDING_MODEL: process.env.DEFAULT_EMBEDDING_MODEL || 'text-embedding-3-small',
          },
        },
      },
    };

    writeFileSync(workspace.mcpConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    logger.info(`Generated MCP config: ${workspace.mcpConfigPath}`);
  }

  /**
   * 清理工作区（用于创建失败时的回滚）
   */
  private cleanupWorkspace(workspacePath: string): void {
    try {
      if (existsSync(workspacePath)) {
        rmSync(workspacePath, { recursive: true, force: true });
        logger.info(`Cleaned up workspace directory: ${workspacePath}`);
      }
    } catch (cleanupError) {
      const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
      logger.error({ err: cleanupError, workspacePath }, `Failed to cleanup workspace: ${workspacePath}: ${errorMessage}`);
    }
  }
}

// 导出单例
export const workspaceService = new WorkspaceService();
