import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_DOMAIN_DESCRIPTION_LENGTH,
  MAX_DOMAIN_NAME_LENGTH,
  MAX_PAGE_SIZE
} from '@agentic-rag/shared';
import { z } from 'zod';

/**
 * 助手/领域设置验证 Schema
 */
const assistantSettingsSchema = z.object({
  responseStyle: z.enum(['detailed', 'concise']).optional(),
  tone: z.enum(['formal', 'friendly']).optional(),
  language: z.string().min(2).max(10).optional(),
  maxTokens: z.number().int().min(100).max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  retrievalTopK: z.number().int().min(1).max(20).optional(),
  retrievalThreshold: z.number().min(0).max(1).optional(),
}).strict();

/**
 * @deprecated 使用 createDomainSchema 代替
 * 创建助手请求验证 Schema
 */
export const createAssistantSchema = z.object({
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
  settings: assistantSettingsSchema.optional(),
}).strict();

/**
 * @deprecated 使用 updateDomainSchema 代替
 * 更新助手请求验证 Schema
 */
export const updateAssistantSchema = z.object({
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
  settings: assistantSettingsSchema.optional(),
}).strict();

/**
 * @deprecated 使用 listDomainsSchema 代替
 * 助手列表查询参数验证 Schema
 */
export const listAssistantsSchema = z.object({
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
 * @deprecated 使用 domainIdSchema 代替
 * 助手 ID 参数验证 Schema
 */
export const assistantIdSchema = z.object({
  id: z
    .string()
    .min(1, 'Assistant ID is required')
    .regex(/^(dom|ast)_[a-zA-Z0-9]+$/, 'Invalid assistant ID format'),
});

// 导出类型
export type CreateAssistantInput = z.infer<typeof createAssistantSchema>;
export type UpdateAssistantInput = z.infer<typeof updateAssistantSchema>;
export type ListAssistantsQuery = z.infer<typeof listAssistantsSchema>;
export type AssistantIdParams = z.infer<typeof assistantIdSchema>;
