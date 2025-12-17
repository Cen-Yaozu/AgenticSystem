# Tasks: 添加助手管理功能

## 1. 基础设施准备

- [x] 1.1 创建共享类型定义 `packages/shared/src/types/index.ts`
  - Assistant 接口
  - AssistantSettings 接口
  - CreateAssistantInput/UpdateAssistantInput 类型
  - AssistantListQuery 类型

- [x] 1.2 创建共享常量 `packages/shared/src/constants/index.ts`
  - 助手状态枚举
  - 默认设置值
  - 错误码常量
  - 限制常量（名称长度、数量限制）

- [x] 1.3 创建简化认证中间件 `apps/web/src/server/middleware/auth.ts`
  - 从 Header 提取 API Key
  - 验证 API Key（MVP 阶段使用环境变量配置）
  - 注入用户信息到请求上下文

## 2. 数据访问层

- [x] 2.1 创建助手仓库 `apps/web/src/server/repositories/assistant.repository.ts`
  - findById(id, userId) - 按 ID 查询
  - findByUserId(userId, options) - 按用户查询列表
  - findByName(userId, name) - 按名称查询
  - countByUserId(userId) - 统计用户助手数量
  - create(data) - 创建助手
  - update(id, data) - 更新助手
  - delete(id) - 删除助手

## 3. 业务逻辑层

- [x] 3.1 创建助手服务 `apps/web/src/server/services/assistant.service.ts`
  - createAssistant(userId, data) - 创建助手
    - 验证名称唯一性
    - 验证数量限制
    - 设置默认值
    - 返回创建结果
  - getAssistants(userId, query) - 获取列表
    - 支持分页
    - 支持按 domain 筛选
    - 按创建时间倒序
  - getAssistantById(userId, id) - 获取详情
    - 验证所有权
  - updateAssistant(userId, id, data) - 更新助手
    - 验证所有权
    - 验证名称唯一性（如果修改）
  - deleteAssistant(userId, id) - 删除助手
    - 验证所有权
    - 验证状态（processing 时不能删除）
    - 级联删除关联数据

## 4. 数据验证层

- [x] 4.1 创建验证器 `apps/web/src/server/validators/assistant.validator.ts`
  - createAssistantSchema - 创建请求验证
  - updateAssistantSchema - 更新请求验证
  - listAssistantsSchema - 列表查询验证
  - 使用 Zod 进行验证

## 5. API 路由层

- [x] 5.1 创建助手路由 `apps/web/src/server/routes/assistants.ts`
  - POST /api/v1/assistants - 创建助手
  - GET /api/v1/assistants - 获取列表
  - GET /api/v1/assistants/:id - 获取详情
  - PUT /api/v1/assistants/:id - 更新助手
  - DELETE /api/v1/assistants/:id - 删除助手

- [x] 5.2 注册路由到主应用 `apps/web/src/server/index.ts`
  - 导入助手路由
  - 挂载到 /api/v1 路径

## 6. 错误处理

- [x] 6.1 创建业务错误类 `apps/web/src/server/errors/business.error.ts`
  - AssistantNotFoundError
  - AssistantNameRequiredError
  - AssistantNameTooLongError
  - AssistantNameDuplicateError
  - AssistantLimitExceededError
  - AssistantCannotDeleteError

- [x] 6.2 更新错误处理中间件
  - 处理业务错误（AppError 基类已支持）
  - 返回正确的 HTTP 状态码和错误码

## 7. 测试

- [x] 7.1 创建单元测试 `apps/web/src/server/__tests__/assistant.service.test.ts`
  - 测试创建助手（成功、失败场景）
  - 测试查询助手
  - 测试更新助手
  - 测试删除助手

- [x] 7.2 创建集成测试 `apps/web/src/server/__tests__/assistants.api.test.ts`
  - 测试 API 端点
  - 测试错误响应

## 验收标准

- [x] `POST /api/v1/assistants` 可创建助手，返回 201
- [x] `GET /api/v1/assistants` 可获取列表，支持分页和筛选
- [x] `GET /api/v1/assistants/:id` 可获取详情
- [x] `PUT /api/v1/assistants/:id` 可更新助手
- [x] `DELETE /api/v1/assistants/:id` 可删除助手，返回 204
- [x] 名称为空时返回 400 和 ASSISTANT_NAME_REQUIRED
- [x] 名称超长时返回 400 和 ASSISTANT_NAME_TOO_LONG
- [x] 名称重复时返回 409 和 ASSISTANT_NAME_DUPLICATE
- [x] 超过数量限制时返回 403 和 ASSISTANT_LIMIT_EXCEEDED
- [x] 删除 processing 状态助手时返回 409 和 ASSISTANT_CANNOT_DELETE
