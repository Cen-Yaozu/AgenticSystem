# Change: 添加助手管理功能

## Why

项目基础设施已完成，需要实现第一个核心业务功能：助手管理。

助手（Assistant）是系统的核心实体，用户通过创建专业领域的 AI 助手来获得该领域的专业服务。助手管理是后续文档处理、对话系统等功能的基础。

参考需求文档：[SPEC-002 助手管理](../../spec/SPEC-002-ASSISTANT-MANAGEMENT.md)

## What Changes

### 新增内容

- **API 端点**
  - `POST /api/v1/assistants` - 创建助手
  - `GET /api/v1/assistants` - 获取助手列表（支持分页、筛选）
  - `GET /api/v1/assistants/:id` - 获取助手详情
  - `PUT /api/v1/assistants/:id` - 更新助手
  - `DELETE /api/v1/assistants/:id` - 删除助手（级联删除）

- **业务逻辑**
  - 助手 CRUD 操作
  - 名称唯一性校验（同一用户下）
  - 数量限制校验（每用户最多 10 个）
  - 状态管理（initializing → ready → processing → error）
  - 级联删除关联数据

- **数据验证**
  - 名称：必填，1-100 字符
  - 描述：可选，最多 500 字符
  - 设置：可选，使用默认值

## Impact

- **Affected specs**: 新增 `assistant-management` 能力
- **Affected code**:
  - `apps/web/src/server/routes/assistants.ts` - 路由定义
  - `apps/web/src/server/services/assistant.service.ts` - 业务逻辑
  - `apps/web/src/server/validators/assistant.validator.ts` - 数据验证
  - `packages/shared/src/types/assistant.ts` - 类型定义

## Dependencies

- 数据库表 `assistants` 已存在（在 project-infrastructure 中创建）
- 需要实现简化的认证机制（MVP 阶段使用固定 API Key）

## References

- [SPEC-002 助手管理](../../spec/SPEC-002-ASSISTANT-MANAGEMENT.md)
- [API 参考](../../spec/design/API-REFERENCE.md)
- [Gherkin 特性文件](../../spec/features/assistant/)
