import type { CreateDomainInput, Domain, PaginatedResult, UpdateDomainInput } from '@agentic-rag/shared';
import {
  DOMAIN_STATUS,
  MAX_DOMAINS_PER_USER,
  MAX_DOMAIN_NAME_LENGTH
} from '@agentic-rag/shared';
import {
  DomainCannotDeleteError,
  DomainLimitExceededError,
  DomainNameDuplicateError,
  DomainNameRequiredError,
  DomainNameTooLongError,
  DomainNotFoundError,
} from '../errors/business.error.js';
import {
  domainRepository,
  type FindDomainsOptions
} from '../repositories/domain.repository.js';
import { logger } from '../utils/logger.js';
import { registerDomainDefinition, unregisterDomainDefinition } from './agentx.service.js';
import { roleService } from './role.service.js';
import { workspaceService } from './workspace.service.js';

/**
 * 领域服务类
 * 处理领域相关的业务逻辑
 */
export class DomainService {
  /**
   * 创建领域
   */
  async createDomain(userId: string, input: CreateDomainInput): Promise<Domain> {
    // 验证名称
    this.validateName(input.name);

    // 检查名称唯一性
    const existing = domainRepository.findByName(userId, input.name);
    if (existing) {
      throw new DomainNameDuplicateError(input.name);
    }

    // 检查数量限制
    const count = domainRepository.countByUserId(userId);
    if (count >= MAX_DOMAINS_PER_USER) {
      throw new DomainLimitExceededError(MAX_DOMAINS_PER_USER);
    }

    // 先创建领域记录（获取 ID）
    const domain = domainRepository.create({
      userId,
      name: input.name,
      description: input.description,
      expertise: input.expertise,
      settings: input.settings,
    });

    // 创建工作区目录
    try {
      const workspace = await workspaceService.createWorkspace(domain.id, {
        retrievalTopK: domain.settings.retrievalTopK,
        retrievalThreshold: domain.settings.retrievalThreshold,
      });
      // 更新领域的工作区路径
      domainRepository.update(domain.id, {
        workspacePath: workspace.path,
      });
      logger.info({ domainId: domain.id, workspacePath: workspace.path }, 'Workspace created for domain');
    } catch (error) {
      // 工作区创建失败，删除已创建的领域记录
      logger.error({ err: error, domainId: domain.id }, 'Failed to create workspace, rolling back domain creation');
      domainRepository.delete(domain.id);
      throw error;
    }

    // 重新获取领域信息（包含 workspacePath）
    let updatedDomain = domainRepository.findById(domain.id)!;

    // 创建默认角色定义文件（如果没有指定 primaryRoleId）
    if (updatedDomain.workspacePath) {
      try {
        // 生成默认角色 ID
        const defaultRoleId = input.settings?.primaryRoleId || roleService.generateDefaultRoleId(domain.id);

        // 创建角色定义文件
        await roleService.createRoleDefinition(updatedDomain.workspacePath, {
          id: defaultRoleId,
          name: input.name,
          description: input.description,
          expertise: input.expertise,
          responseStyle: input.settings?.responseStyle || 'detailed',
          tone: input.settings?.tone || 'friendly',
          language: input.settings?.language || 'zh-CN',
          subRoleIds: input.settings?.subRoleIds,
        });

        // 如果没有指定 primaryRoleId，更新领域设置
        if (!input.settings?.primaryRoleId) {
          const updatedSettings = {
            ...updatedDomain.settings,
            primaryRoleId: defaultRoleId,
          };
          domainRepository.update(domain.id, { settings: updatedSettings });
          updatedDomain = domainRepository.findById(domain.id)!;
        }

        logger.info({ domainId: domain.id, roleId: defaultRoleId }, 'Role definition created for domain');
      } catch (error) {
        // 角色创建失败，记录日志但不回滚（可以后续重试）
        logger.error({ err: error, domainId: domain.id }, 'Failed to create role definition');
      }
    }

    // 注册 AgentX Definition
    try {
      await registerDomainDefinition(updatedDomain);
      logger.info({ domainId: domain.id }, 'AgentX Definition registered for domain');
    } catch (error) {
      // Definition 注册失败，记录日志但不回滚（可以后续重试）
      logger.error({ err: error, domainId: domain.id }, 'Failed to register AgentX Definition');
    }

    // 异步标记为 ready（MVP 阶段直接标记，生产环境应在初始化完成后标记）
    setTimeout(() => {
      domainRepository.markAsReady(domain.id);
    }, 100);

    return updatedDomain;
  }

  /**
   * 获取领域列表
   */
  async getDomains(
    userId: string,
    options: FindDomainsOptions = {}
  ): Promise<PaginatedResult<Domain>> {
    const { page = 1, pageSize = 20, expertise } = options;

    const result = domainRepository.findByUserId(userId, {
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
   * 获取领域详情
   */
  async getDomainById(userId: string, domainId: string): Promise<Domain> {
    const domain = domainRepository.findById(domainId, userId);

    if (!domain) {
      throw new DomainNotFoundError(domainId);
    }

    return domain;
  }

  /**
   * 更新领域
   */
  async updateDomain(
    userId: string,
    domainId: string,
    input: UpdateDomainInput
  ): Promise<Domain> {
    // 验证领域存在且属于当前用户
    const domain = await this.getDomainById(userId, domainId);

    // 如果更新名称，验证名称
    if (input.name !== undefined) {
      this.validateName(input.name);

      // 检查名称唯一性（排除当前领域）
      if (input.name !== domain.name) {
        const existing = domainRepository.findByName(userId, input.name);
        if (existing) {
          throw new DomainNameDuplicateError(input.name);
        }
      }
    }

    // 更新领域
    const updated = domainRepository.update(domainId, {
      name: input.name,
      description: input.description,
      expertise: input.expertise,
      settings: input.settings,
    });

    if (!updated) {
      throw new DomainNotFoundError(domainId);
    }

    return updated;
  }

  /**
   * 删除领域
   */
  async deleteDomain(userId: string, domainId: string): Promise<void> {
    // 验证领域存在且属于当前用户
    const domain = await this.getDomainById(userId, domainId);

    // 检查状态：processing 时不能删除
    if (domain.status === DOMAIN_STATUS.PROCESSING) {
      throw new DomainCannotDeleteError('Cannot delete domain while it is processing');
    }

    // 注销 AgentX Definition
    try {
      unregisterDomainDefinition(domainId);
      logger.info({ domainId }, 'AgentX Definition unregistered for domain');
    } catch (error) {
      // Definition 注销失败，记录日志但继续删除
      logger.error({ err: error, domainId }, 'Failed to unregister AgentX Definition');
    }

    // 删除工作区目录
    try {
      await workspaceService.deleteWorkspace(domainId);
      logger.info({ domainId }, 'Workspace deleted for domain');
    } catch (error) {
      // 工作区删除失败，记录日志但继续删除领域记录
      logger.error({ err: error, domainId }, 'Failed to delete workspace, continuing with domain deletion');
    }

    // 删除领域（数据库外键约束会级联删除关联数据）
    const deleted = domainRepository.delete(domainId);

    if (!deleted) {
      throw new DomainNotFoundError(domainId);
    }

    // TODO: 清理向量数据库中的数据
    // 这需要在实现文档处理功能后添加
  }

  /**
   * 验证领域名称
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
   * 检查领域是否存在且属于指定用户
   */
  async checkOwnership(userId: string, domainId: string): Promise<Domain> {
    return this.getDomainById(userId, domainId);
  }
}

// 导出单例
export const domainService = new DomainService();

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 DomainService 代替 */
export const AssistantService = DomainService;
/** @deprecated 使用 domainService 代替 */
export const assistantService = domainService;
