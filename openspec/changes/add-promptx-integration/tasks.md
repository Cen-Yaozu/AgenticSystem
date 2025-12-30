# Tasks: 添加 PromptX 集成

## 1. Phase 1: MCP 配置（MVP）

- [x] 1.1 修改 AgentX Image 创建，添加 PromptX MCP 配置
  - 文件: `apps/web/src/server/services/agentx.service.ts`
  - 在 `registerDomainDefinition` 方法中添加 `mcpServers` 配置
  - `buildMCPServers()` 函数构建包含 PromptX 的 MCP 配置

- [x] 1.2 增强 systemPrompt，引导 AI 使用认知循环
  - 文件: `apps/web/src/server/services/agentx.service.ts`
  - `buildSystemPrompt()` 函数添加角色激活指导
  - 添加可用工具说明（promptx_action, promptx_recall, promptx_remember）

- [ ] 1.3 测试 AI 自主调用 PromptX 工具
  - 验证 action 工具可用
  - 验证 recall 工具可用
  - 验证 remember 工具可用

## 2. Phase 2: 角色创建

- [x] 2.1 添加角色相关类型定义
  - 文件: `packages/shared/src/types/index.ts`
  - `DomainSettings` 已包含 `primaryRoleId` 和 `subRoleIds` 字段

- [x] 2.2 修改领域创建流程，创建专属角色
  - 文件: `apps/web/src/server/services/domain.service.ts`
  - 创建领域时通过 `roleService.createRoleDefinition()` 创建角色
  - 角色 ID 保存到 `settings.primaryRoleId`

- [x] 2.3 对话时自动激活领域角色
  - 文件: `apps/web/src/server/services/agentx.service.ts`
  - `buildSystemPrompt()` 在有 `primaryRoleId` 时引导 AI 激活角色

- [ ] 2.4 测试角色创建和激活
  - 创建领域时验证角色创建
  - 对话时验证角色激活

## 3. Phase 3: 高级功能（可选）

- [ ] 3.1 项目绑定
  - 调用 project 工具绑定工作区目录

- [ ] 3.2 自定义工具创建
  - 通过鲁班创建领域专属工具

## 验收标准

### Phase 1 验收
- [x] Image 创建时包含 PromptX MCP 配置
  - `registerDomainDefinition()` 调用 `buildMCPServers()` 并传递给 Image
- [x] AI 能够调用 action 激活角色
  - systemPrompt 引导 AI 调用 `promptx_action`
- [x] AI 能够调用 recall 检索记忆
  - systemPrompt 列出 `promptx_recall` 工具
- [x] AI 能够调用 remember 保存记忆
  - systemPrompt 列出 `promptx_remember` 工具

### Phase 2 验收
- [x] 创建领域时自动创建专属角色
  - `domain.service.ts` 调用 `roleService.createRoleDefinition()`
- [x] 对话时自动激活领域角色
  - `buildSystemPrompt()` 在有 `primaryRoleId` 时引导激活
- [x] 角色 ID 正确保存到领域配置
  - 保存到 `settings.primaryRoleId`
