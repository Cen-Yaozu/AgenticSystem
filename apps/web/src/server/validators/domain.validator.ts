import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_DOMAIN_DESCRIPTION_LENGTH,
  MAX_DOMAIN_NAME_LENGTH,
  MAX_PAGE_SIZE,
} from '@agentic-rag/shared';
import { z } from 'zod';

/**
 * 系统保留的 MCP Server 名称（不允许用户覆盖）
 */
export const SYSTEM_RESERVED_MCP_NAMES = ['promptx', 'retriever'] as const;

/**
 * MCP 命令白名单（安全考虑，只允许特定命令）
 */
export const MCP_COMMAND_WHITELIST = ['npx', 'node', 'python', 'python3', 'deno', 'bun'] as const;

/**
 * MCP Server 配置验证 Schema
 */
const mcpServerConfigSchema = z.object({
  command: z
    .string()
    .min(1, 'Command is required')
    .refine(
      (cmd) => MCP_COMMAND_WHITELIST.includes(cmd as typeof MCP_COMMAND_WHITELIST[number]),
      `Command must be one of: ${MCP_COMMAND_WHITELIST.join(', ')}`
    ),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  enabled: z.boolean().optional(),
});

/**
 * MCP Servers 配置验证 Schema
 * 验证用户不能覆盖系统保留的 MCP Server 名称
 */
const mcpServersConfigSchema = z
  .record(mcpServerConfigSchema)
  .optional()
  .refine(
    (config) => {
      if (!config) return true;
      const userKeys = Object.keys(config);
      const reservedKeys = userKeys.filter((key) =>
        SYSTEM_RESERVED_MCP_NAMES.includes(key as typeof SYSTEM_RESERVED_MCP_NAMES[number])
      );
      return reservedKeys.length === 0;
    },
    {
      message: `Cannot override system reserved MCP servers: ${SYSTEM_RESERVED_MCP_NAMES.join(', ')}`,
    }
  );

/**
 * 领域设置验证 Schema
 */
const domainSettingsSchema = z.object({
  // 基础设置
  responseStyle: z.enum(['detailed', 'concise']).optional(),
  tone: z.enum(['formal', 'friendly']).optional(),
  language: z.string().min(2).max(10).optional(),
  maxTokens: z.number().int().min(100).max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  retrievalTopK: z.number().int().min(1).max(20).optional(),
  retrievalThreshold: z.number().min(0).max(1).optional(),

  // 🆕 角色驱动配置
  primaryRoleId: z
    .string()
    .min(1, 'Primary role ID cannot be empty')
    .max(100, 'Primary role ID must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Primary role ID can only contain letters, numbers, underscores and hyphens')
    .optional(),
  subRoleIds: z
    .array(
      z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Sub role ID can only contain letters, numbers, underscores and hyphens')
    )
    .max(10, 'Cannot have more than 10 sub roles')
    .optional(),
  mcpServers: mcpServersConfigSchema,
}).strict();

/**
 * 创建领域请求验证 Schema
 */
export const createDomainSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(MAX_DOMAIN_NAME_LENGTH, `Name must not exceed ${MAX_DOMAIN_NAME_LENGTH} characters`)
    .trim(),
  description: z
    .string()
    .max(MAX_DOMAIN_DESCRIPTION_LENGTH, `Description must not exceed ${MAX_DOMAIN_DESCRIPTION_LENGTH} characters`)
    .trim()
    .optional(),
  expertise: z
    .string()
    .max(50, 'Expertise must not exceed 50 characters')
    .trim()
    .optional(),
  settings: domainSettingsSchema.optional(),
}).strict();

/**
 * 更新领域请求验证 Schema
 */
export const updateDomainSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(MAX_DOMAIN_NAME_LENGTH, `Name must not exceed ${MAX_DOMAIN_NAME_LENGTH} characters`)
    .trim()
    .optional(),
  description: z
    .string()
    .max(MAX_DOMAIN_DESCRIPTION_LENGTH, `Description must not exceed ${MAX_DOMAIN_DESCRIPTION_LENGTH} characters`)
    .trim()
    .nullable()
    .optional(),
  expertise: z
    .string()
    .max(50, 'Expertise must not exceed 50 characters')
    .trim()
    .nullable()
    .optional(),
  settings: domainSettingsSchema.optional(),
}).strict();

/**
 * 领域列表查询参数验证 Schema
 */
export const listDomainsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : DEFAULT_PAGE))
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : DEFAULT_PAGE_SIZE))
    .pipe(z.number().int().min(1).max(MAX_PAGE_SIZE)),
  expertise: z
    .string()
    .max(50)
    .trim()
    .optional(),
});

/**
 * 领域 ID 参数验证 Schema
 * 支持新的 dom_ 前缀和旧的 ast_ 前缀（向后兼容）
 */
export const domainIdSchema = z.object({
  id: z
    .string()
    .min(1, 'Domain ID is required')
    .regex(/^(dom|ast)_[a-zA-Z0-9]+$/, 'Invalid domain ID format'),
});

// 导出类型
export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type UpdateDomainInput = z.infer<typeof updateDomainSchema>;
export type ListDomainsQuery = z.infer<typeof listDomainsSchema>;
export type DomainIdParams = z.infer<typeof domainIdSchema>;

// 向后兼容别名（将在未来版本移除）
/** @deprecated 使用 createDomainSchema 代替 */
export const createAssistantSchema = createDomainSchema;
/** @deprecated 使用 updateDomainSchema 代替 */
export const updateAssistantSchema = updateDomainSchema;
/** @deprecated 使用 listDomainsSchema 代替 */
export const listAssistantsSchema = listDomainsSchema;
/** @deprecated 使用 domainIdSchema 代替 */
export const assistantIdSchema = domainIdSchema;
/** @deprecated 使用 CreateDomainInput 代替 */
export type CreateAssistantInput = CreateDomainInput;
/** @deprecated 使用 UpdateDomainInput 代替 */
export type UpdateAssistantInput = UpdateDomainInput;
/** @deprecated 使用 ListDomainsQuery 代替 */
export type ListAssistantsQuery = ListDomainsQuery;
/** @deprecated 使用 DomainIdParams 代替 */
export type AssistantIdParams = DomainIdParams;
