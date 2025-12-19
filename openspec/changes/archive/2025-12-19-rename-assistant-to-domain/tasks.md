# Tasks: rename-assistant-to-domain

## Phase 1: 数据库迁移

### 1.1 创建迁移脚本
- [ ] 创建数据库迁移文件
- [ ] 重命名表：`assistants` → `domains`
- [ ] 更新 `documents` 表外键：`assistant_id` → `domain_id`
- [ ] 更新 `conversations` 表外键（如存在）：`assistant_id` → `domain_id`
- [ ] 创建回滚脚本

### 1.2 更新数据库 Schema
- [ ] 更新 `apps/web/src/server/database/index.ts` 中的表定义
- [ ] 更新所有 SQL 查询中的表名和字段名

---

## Phase 2: 类型和接口重命名

### 2.1 共享类型
- [ ] 重命名 `packages/shared/src/types/index.ts` 中的类型
  - `Assistant` → `Domain`
  - `AssistantSettings` → `DomainSettings`
  - `AssistantStatus` → `DomainStatus`
  - `CreateAssistantRequest` → `CreateDomainRequest`
  - `UpdateAssistantRequest` → `UpdateDomainRequest`

### 2.2 常量
- [ ] 更新 `packages/shared/src/constants/index.ts` 中的常量
  - `ASSISTANT_*` → `DOMAIN_*`

---

## Phase 3: 后端代码重命名

### 3.1 Repository 层
- [ ] 重命名文件：`assistant.repository.ts` → `domain.repository.ts`
- [ ] 重命名类：`AssistantRepository` → `DomainRepository`
- [ ] 更新所有方法名和变量名

### 3.2 Service 层
- [ ] 重命名文件：`assistant.service.ts` → `domain.service.ts`
- [ ] 重命名类：`AssistantService` → `DomainService`
- [ ] 更新所有方法名和变量名

### 3.3 Validator 层
- [ ] 重命名文件：`assistant.validator.ts` → `domain.validator.ts`
- [ ] 更新验证函数名

### 3.4 Routes 层
- [ ] 重命名文件：`assistants.ts` → `domains.ts`
- [ ] 更新路由路径：`/api/assistants` → `/api/domains`
- [ ] 更新路由处理函数

### 3.5 错误码
- [ ] 更新 `business.error.ts` 中的错误码
  - `ASSISTANT_*` → `DOMAIN_*`

### 3.6 工具函数
- [ ] 更新 `id.ts` 中的 ID 生成函数
  - `generateAssistantId()` → `generateDomainId()`
  - ID 前缀：`ast_` → `dom_`

### 3.7 其他服务
- [ ] 更新 `workspace.service.ts` 中的引用
- [ ] 更新 `document.service.ts` 中的引用
- [ ] 更新 `document-processor.service.ts` 中的引用
- [ ] 更新 `qdrant.service.ts` 中的引用
- [ ] 更新 `document.repository.ts` 中的引用
- [ ] 更新 `document.validator.ts` 中的引用

### 3.8 主入口
- [ ] 更新 `apps/web/src/server/index.ts` 中的路由注册

---

## Phase 4: 测试更新

### 4.1 测试文件重命名
- [ ] 重命名 `assistant.service.test.ts` → `domain.service.test.ts`
- [ ] 重命名 `assistants.api.test.ts` → `domains.api.test.ts`

### 4.2 测试内容更新
- [ ] 更新所有测试用例中的类型和变量名
- [ ] 更新 API 路径
- [ ] 更新 setup.ts 中的引用

### 4.3 运行测试
- [ ] 运行所有测试确保通过

---

## Phase 5: 文档更新

### 5.1 OpenSpec 文档
- [ ] 重命名 spec 目录：`assistant-management` → `domain-management`
- [ ] 更新 spec 内容中的所有术语

### 5.2 设计文档
- [ ] 更新 `spec/design/*.md` 中的术语
- [ ] 更新 `spec/SPEC-*.md` 中的术语

### 5.3 Feature 文件
- [ ] 更新 `spec/features/assistant/*.feature` 目录名和内容

---

## Phase 6: 验证和清理

### 6.1 全局搜索验证
- [ ] 搜索所有 "assistant" 确保无遗漏
- [ ] 搜索所有 "Assistant" 确保无遗漏
- [ ] 搜索所有 "ast_" 确保无遗漏

### 6.2 功能验证
- [ ] 启动服务器测试 API
- [ ] 测试创建领域
- [ ] 测试查询领域
- [ ] 测试更新领域
- [ ] 测试删除领域
- [ ] 测试文档上传到领域

### 6.3 清理
- [ ] 删除旧的 assistant 相关文件（如有残留）
- [ ] 更新 .gitignore（如需要）

---

## 注意事项

1. **数据迁移**：如果数据库中有数据，需要先备份
2. **ID 兼容性**：考虑是否需要支持旧的 `ast_` 前缀 ID
3. **API 兼容性**：考虑是否需要提供旧 API 的重定向
4. **前端同步**：前端代码需要同步更新（不在本提案范围内）
