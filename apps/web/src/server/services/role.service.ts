/**
 * 角色服务
 * 管理 PromptX 角色的创建和配置
 * 通过女娲（nuwa）创建角色定义文件
 */

import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

/**
 * 角色定义接口
 */
export interface RoleDefinition {
  /** 角色 ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description?: string;
  /** 专业领域 */
  expertise?: string;
  /** 回复风格 */
  responseStyle?: 'detailed' | 'concise';
  /** 语气 */
  tone?: 'formal' | 'friendly';
  /** 语言 */
  language?: string;
  /** 子代理 ID 列表 */
  subRoleIds?: string[];
}

/**
 * 角色服务类
 */
export class RoleService {
  /**
   * 为领域创建主角色定义文件
   *
   * 角色定义文件存储在：
   * workspacePath/.promptx/resource/role/{roleId}.role.md
   *
   * @param workspacePath 工作区路径
   * @param roleDefinition 角色定义
   */
  async createRoleDefinition(
    workspacePath: string,
    roleDefinition: RoleDefinition
  ): Promise<string> {
    const rolePath = join(workspacePath, '.promptx', 'resource', 'role');
    const roleFilePath = join(rolePath, `${roleDefinition.id}.role.md`);

    try {
      // 检查目录是否存在
      if (!existsSync(rolePath)) {
        throw new Error(`Role directory does not exist: ${rolePath}`);
      }

      // 生成角色定义内容
      const roleContent = this.generateRoleContent(roleDefinition);

      // 写入角色定义文件
      writeFileSync(roleFilePath, roleContent, 'utf-8');

      logger.info(
        { roleId: roleDefinition.id, roleFilePath },
        'Created role definition file'
      );

      return roleFilePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { err: error, roleId: roleDefinition.id, workspacePath },
        `Failed to create role definition: ${errorMessage}`
      );
      throw new Error(`Failed to create role definition: ${errorMessage}`);
    }
  }

  /**
   * 生成角色定义内容（Markdown 格式）
   *
   * 这是一个简化的角色定义模板，实际生产环境中
   * 应该通过女娲（nuwa）来创建更完整的角色定义
   */
  private generateRoleContent(roleDefinition: RoleDefinition): string {
    const {
      id,
      name,
      description,
      expertise,
      responseStyle,
      tone,
      language,
      subRoleIds,
    } = roleDefinition;

    let content = `# ${name}\n\n`;

    // 元数据
    content += `---\n`;
    content += `id: ${id}\n`;
    content += `type: role\n`;
    content += `version: 1.0.0\n`;
    content += `---\n\n`;

    // 描述
    if (description) {
      content += `## 描述\n\n${description}\n\n`;
    }

    // 专业领域
    if (expertise) {
      content += `## 专业领域\n\n${expertise}\n\n`;
    }

    // 角色指令
    content += `## 角色指令\n\n`;
    content += `你是一个专业的 AI 助手`;
    if (expertise) {
      content += `，专注于${expertise}领域`;
    }
    content += `。\n\n`;

    // 回复风格
    content += `### 回复风格\n\n`;
    if (responseStyle === 'detailed') {
      content += `- 提供详细、全面的回答\n`;
      content += `- 包含相关背景信息和解释\n`;
      content += `- 使用示例来说明复杂概念\n`;
    } else {
      content += `- 提供简洁、直接的回答\n`;
      content += `- 聚焦于核心要点\n`;
      content += `- 避免不必要的冗余信息\n`;
    }
    content += `\n`;

    // 语气
    content += `### 语气\n\n`;
    if (tone === 'formal') {
      content += `- 使用正式、专业的语言\n`;
      content += `- 保持客观和中立\n`;
      content += `- 适合商务和学术场景\n`;
    } else {
      content += `- 使用友好、亲切的语言\n`;
      content += `- 保持轻松和易于理解\n`;
      content += `- 适合日常交流场景\n`;
    }
    content += `\n`;

    // 语言
    if (language) {
      content += `### 语言\n\n`;
      content += `使用 ${language} 进行回复。\n\n`;
    }

    // 子代理委派
    if (subRoleIds && subRoleIds.length > 0) {
      content += `## 子代理委派\n\n`;
      content += `当遇到以下情况时，可以委派给相应的子代理：\n\n`;
      subRoleIds.forEach((subRoleId) => {
        content += `- **${subRoleId}**: 处理与 ${subRoleId} 相关的专业问题\n`;
      });
      content += `\n`;
    }

    // 工具使用
    content += `## 可用工具\n\n`;
    content += `- **promptx_action**: 激活或切换角色\n`;
    content += `- **promptx_recall**: 检索相关记忆\n`;
    content += `- **promptx_remember**: 保存重要信息到记忆\n`;
    content += `- **search_documents**: 检索领域文档（如果有文档）\n`;
    content += `\n`;

    // 工作流程
    content += `## 工作流程\n\n`;
    content += `1. 分析用户问题，理解意图\n`;
    content += `2. 如果需要，使用 search_documents 检索相关文档\n`;
    content += `3. 如果需要，使用 promptx_recall 检索相关记忆\n`;
    content += `4. 综合信息，生成回答\n`;
    content += `5. 如果有重要信息，使用 promptx_remember 保存到记忆\n`;

    return content;
  }

  /**
   * 检查角色定义文件是否存在
   */
  roleDefinitionExists(workspacePath: string, roleId: string): boolean {
    const roleFilePath = join(
      workspacePath,
      '.promptx',
      'resource',
      'role',
      `${roleId}.role.md`
    );
    return existsSync(roleFilePath);
  }

  /**
   * 生成默认的角色 ID
   * 格式：{domainId}-domain
   */
  generateDefaultRoleId(domainId: string): string {
    // 移除 dom_ 前缀，生成更简洁的角色 ID
    const cleanId = domainId.replace(/^dom_/, '');
    return `${cleanId}-domain`;
  }
}

// 导出单例
export const roleService = new RoleService();
