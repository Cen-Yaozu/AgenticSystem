import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { authMiddleware, getCurrentUser } from '../middleware/auth.js';
import { domainService } from '../services/domain.service.js';
import { success, successWithPagination } from '../utils/response.js';
import {
  createDomainSchema,
  listDomainsSchema,
  updateDomainSchema,
} from '../validators/domain.validator.js';

/**
 * 领域路由
 */
const domains = new Hono();

// 所有路由都需要认证
domains.use('*', authMiddleware());

/**
 * POST /api/v1/domains - 创建领域
 */
domains.post(
  '/',
  zValidator('json', createDomainSchema),
  async (c) => {
    const user = getCurrentUser(c);
    const input = c.req.valid('json');

    const domain = await domainService.createDomain(user.userId, input);

    return success(c, domain, 201);
  }
);

/**
 * GET /api/v1/domains - 获取领域列表
 */
domains.get(
  '/',
  zValidator('query', listDomainsSchema),
  async (c) => {
    const user = getCurrentUser(c);
    const query = c.req.valid('query');

    const result = await domainService.getDomains(user.userId, {
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
 * GET /api/v1/domains/:id - 获取领域详情
 */
domains.get('/:id', async (c) => {
  const user = getCurrentUser(c);
  const domainId = c.req.param('id');

  const domain = await domainService.getDomainById(user.userId, domainId);

  return success(c, domain);
});

/**
 * PUT /api/v1/domains/:id - 更新领域
 */
domains.put(
  '/:id',
  zValidator('json', updateDomainSchema),
  async (c) => {
    const user = getCurrentUser(c);
    const domainId = c.req.param('id');
    const input = c.req.valid('json');

    const domain = await domainService.updateDomain(user.userId, domainId, input);

    return success(c, domain);
  }
);

/**
 * DELETE /api/v1/domains/:id - 删除领域
 */
domains.delete('/:id', async (c) => {
  const user = getCurrentUser(c);
  const domainId = c.req.param('id');

  await domainService.deleteDomain(user.userId, domainId);

  return c.body(null, 204);
});

export default domains;
