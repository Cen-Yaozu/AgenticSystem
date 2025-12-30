# Change: 添加 PromptX 集成

## Why

当前对话系统已完成基础功能（消息发送、流式响应），但缺少专业角色和记忆能力。PromptX 是一个完整的 AI Agent 上下文平台，提供：

- 🎭 **角色系统** - 通过 `action` 激活角色，通过 `nuwa` 创建角色
- 🧠 **记忆系统** - 通过 `recall` 检索记忆，通过 `remember` 保存记忆
- 🔧 **工具系统** - 通过 `toolx` 调用各种工具（PDF、Excel、Word 等）

**核心理念**：我们不需要自己实现角色和记忆系统，PromptX 已经全部提供了。我们只需要通过 MCP 协议调用 PromptX 的工具。

## What Changes

### Phase 1: MCP 配置（MVP）
- 在 AgentX Image 创建时配置 PromptX MCP 服务器
- 增强 systemPrompt，引导 AI 使用认知循环（recall → 回答 → remember）
- AI 自主调用 PromptX 工具

### Phase 2: 角色创建
- 创建领域时通过女娲（nuwa）创建专属角色
- 在领域配置中保存角色 ID
- 对话时自动激活领域角色

### Phase 3: 高级功能（可选）
- 项目绑定（project 工具）
- 自定义工具创建（luban + tool-creator）

## Impact

- **新增 capability**: promptx-integration
- **依赖 capability**: conversation-system, domain-management
- **依赖外部系统**: PromptX MCP Server
- **受影响的代码**:
  - 修改: `apps/web/src/server/services/agentx.service.ts`（添加 MCP 配置）
  - 修改: `apps/web/src/server/services/domain.service.ts`（角色创建）
  - 修改: `packages/shared/src/types/index.ts`（添加角色相关类型）
