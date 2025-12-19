import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { authMiddleware, getCurrentUser } from '../middleware/auth.js';
import { assistantService } from '../services/assistant.service.js';
import { success, successWithPagination } from '../utils/response.js';
import {
  createAssistantSchema,
  listAssistantsSchema,
  updateAssistantSchema,
} from '../validators/assistant.validator.js';

/**
 * 助手路由
 */
const assistants = new Hono();

// 所有路由都需要认证
assistants.use('*', authMiddleware());

/**
 * POST /api/v1/assistants - 创建助手
 */
assistants.post(
  '/',
  zValidator('json', createAssistantSchema),
  async (c) => {
    const user = getCurrentUser(c);
    const input = c.req.valid('json');

    const assistant = await assistantService.createAssistant(user.userId, input);

    return success(c, assistant, 201);
  }
);

/**
 * GET /api/v1/assistants - 获取助手列表
 */
assistants.get(
  '/',
  zValidator('query', listAssistantsSchema),
  async (c) => {
    const user = getCurrentUser(c);
    const query = c.req.valid('query');

    const result = await assistantService.getAssistants(user.userId, {
      page: query.page,
      pageSize: query.pageSize,
      expertise: query.expertise,
    });

    return successWithPagination(c, result.data, {
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      total: result.meta.total,
    });
  }
);

/**
 * GET /api/v1/assistants/:id - 获取助手详情
 */
assistants.get('/:id', async (c) => {
  const user = getCurrentUser(c);
  const assistantId = c.req.param('id');

  const assistant = await assistantService.getAssistantById(user.userId, assistantId);

  return success(c, assistant);
});

/**
 * PUT /api/v1/assistants/:id - 更新助手
 */
assistants.put(
  '/:id',
  zValidator('json', updateAssistantSchema),
  async (c) => {
    const user = getCurrentUser(c);
    const assistantId = c.req.param('id');
    const input = c.req.valid('json');

    const assistant = await assistantService.updateAssistant(user.userId, assistantId, input);

    return success(c, assistant);
  }
);

/**
 * DELETE /api/v1/assistants/:id - 删除助手
 */
assistants.delete('/:id', async (c) => {
  const user = getCurrentUser(c);
  const assistantId = c.req.param('id');

  await assistantService.deleteAssistant(user.userId, assistantId);

  return c.body(null, 204);
});

export default assistants;
