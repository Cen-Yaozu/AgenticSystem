import type { CreateDomainInput, Domain, PaginatedResult, UpdateDomainInput } from '@agentic-rag/shared';
import {
  DOMAIN_STATUS,
  MAX_DOMAIN_NAME_LENGTH,
  MAX_DOMAINS_PER_USER
} from '@agentic-rag/shared';
import {
  DomainCannotDeleteError,
  DomainLimitExceededError,
  DomainNameDuplicateError,
  DomainNameRequiredError,
  DomainNameTooLongError,
  DomainNotFoundError
} from '../errors/business.error.js';
import {
  assistantRepository,
  type FindAssistantsOptions
} from '../repositories/assistant.repository.js';
import { logger } from '../utils/logger.js';
import { workspaceService } from './workspace.service.js';

/**
 * @deprecated 使用 DomainService 代替
 * 助手服务类
 * 处理助手相关的业务逻辑
 */
export class AssistantService {
  /**
   * 创建助手
   */
  async createAssistant(userId: string, input: CreateDomainInput): Promise<Domain> {
    // 验证名称
    this.validateName(input.name);

    // 检查名称唯一性
    const existing = assistantRepository.findByName(userId, input.name);
    if (existing) {
      throw new DomainNameDuplicateError(input.name);
    }

    // 检查数量限制
    const count = assistantRepository.countByUserId(userId);
    if (count >= MAX_DOMAINS_PER_USER) {
      throw new DomainLimitExceededError(MAX_DOMAINS_PER_USER);
    }

    // 先创建助手记录（获取 ID）
    const assistant = assistantRepository.create({
      userId,
      name: input.name,
      description: input.description,
      expertise: input.expertise,
      settings: input.settings,
    });

    // 创建工作区目录
    try {
      const workspace = await workspaceService.createWorkspace(assistant.id);
      // 更新助手的工作区路径
      assistantRepository.update(assistant.id, {
        workspacePath: workspace.path,
      });
      logger.info({ assistantId: assistant.id, workspacePath: workspace.path }, 'Workspace created for assistant');
    } catch (error) {
      // 工作区创建失败，删除已创建的助手记录
      logger.error({ err: error, assistantId: assistant.id }, 'Failed to create workspace, rolling back assistant creation');
      assistantRepository.delete(assistant.id);
      throw error;
    }

    // 异步标记为 ready（MVP 阶段直接标记，生产环境应在初始化完成后标记）
    setTimeout(() => {
      assistantRepository.markAsReady(assistant.id);
    }, 100);

    // 重新获取助手信息（包含 workspacePath）
    return assistantRepository.findById(assistant.id)!;
  }

  /**
   * 获取助手列表
   */
  async getAssistants(
    userId: string,
    options: FindAssistantsOptions = {}
  ): Promise<PaginatedResult<Domain>> {
    const { page = 1, pageSize = 20, expertise } = options;

    const result = assistantRepository.findByUserId(userId, {
      page,
      pageSize,
      expertise,
    });

    return {
      data: result.data,
      meta: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize),
      },
    };
  }

  /**
   * 获取助手详情
   */
  async getAssistantById(userId: string, assistantId: string): Promise<Domain> {
    const assistant = assistantRepository.findById(assistantId, userId);

    if (!assistant) {
      throw new DomainNotFoundError(assistantId);
    }

    return assistant;
  }

  /**
   * 更新助手
   */
  async updateAssistant(
    userId: string,
    assistantId: string,
    input: UpdateDomainInput
  ): Promise<Domain> {
    // 验证助手存在且属于当前用户
    const assistant = await this.getAssistantById(userId, assistantId);

    // 如果更新名称，验证名称
    if (input.name !== undefined) {
      this.validateName(input.name);

      // 检查名称唯一性（排除当前助手）
      if (input.name !== assistant.name) {
        const existing = assistantRepository.findByName(userId, input.name);
        if (existing) {
          throw new DomainNameDuplicateError(input.name);
        }
      }
    }

    // 更新助手
    const updated = assistantRepository.update(assistantId, {
      name: input.name,
      description: input.description,
      expertise: input.expertise,
      settings: input.settings,
    });

    if (!updated) {
      throw new DomainNotFoundError(assistantId);
    }

    return updated;
  }

  /**
   * 删除助手
   */
  async deleteAssistant(userId: string, assistantId: string): Promise<void> {
    // 验证助手存在且属于当前用户
    const assistant = await this.getAssistantById(userId, assistantId);

    // 检查状态：processing 时不能删除
    if (assistant.status === DOMAIN_STATUS.PROCESSING) {
      throw new DomainCannotDeleteError('Cannot delete domain while it is processing');
    }

    // 先删除工作区目录
    try {
      await workspaceService.deleteWorkspace(assistantId);
      logger.info({ assistantId }, 'Workspace deleted for assistant');
    } catch (error) {
      // 工作区删除失败，记录日志但继续删除助手记录
      logger.error({ err: error, assistantId }, 'Failed to delete workspace, continuing with assistant deletion');
    }

    // 删除助手（数据库外键约束会级联删除关联数据）
    const deleted = assistantRepository.delete(assistantId);

    if (!deleted) {
      throw new DomainNotFoundError(assistantId);
    }

    // TODO: 清理向量数据库中的数据
    // 这需要在实现文档处理功能后添加
  }

  /**
   * 验证助手名称
   */
  private validateName(name: string | undefined): void {
    if (!name || name.trim().length === 0) {
      throw new DomainNameRequiredError();
    }

    if (name.length > MAX_DOMAIN_NAME_LENGTH) {
      throw new DomainNameTooLongError(MAX_DOMAIN_NAME_LENGTH);
    }
  }

  /**
   * 检查助手是否存在且属于指定用户
   */
  async checkOwnership(userId: string, assistantId: string): Promise<Domain> {
    return this.getAssistantById(userId, assistantId);
  }
}

// 导出单例
export const assistantService = new AssistantService();
