import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_DOMAIN_DESCRIPTION_LENGTH,
  MAX_DOMAIN_NAME_LENGTH,
  MAX_PAGE_SIZE,
} from '@agentic-rag/shared';
import { z } from 'zod';

/**
 * 领域设置验证 Schema
 */
const domainSettingsSchema = z.object({
  responseStyle: z.enum(['detailed', 'concise']).optional(),
  tone: z.enum(['formal', 'friendly']).optional(),
  language: z.string().min(2).max(10).optional(),
  maxTokens: z.number().int().min(100).max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  retrievalTopK: z.number().int().min(1).max(20).optional(),
  retrievalThreshold: z.number().min(0).max(1).optional(),
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
