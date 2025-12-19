# Proposal: rename-assistant-to-domain

## Summary

将"助手"（Assistant）重命名为"领域"（Domain），更准确地反映业务含义。

## Why

当前使用"助手"（Assistant）这个名称存在以下问题：

1. **语义混淆**：容易让人误解为是在创建一个 AI 助手实体，而实际上它代表的是一个知识领域
2. **业务不匹配**：用户创建的是"法律领域"、"医疗领域"等知识域，而不是"法律助手"、"医疗助手"
3. **与 AI 术语冲突**：在 AI 领域，"Assistant" 通常指 AI 助手本身，而我们的系统中 AI 助手是通过 PromptX 角色系统提供的

使用"领域"（Domain）更准确地表达：
- 这是一个知识领域的容器
- 包含该领域的文档、角色、记忆
- 用户可以创建多个领域，每个领域有独立的知识库

## What Changes

### 数据库变更
- 表名：`assistants` → `domains`
- 字段：`assistant_id` → `domain_id`（在关联表中）
- 字段：`domain` → `expertise`（专业领域标签）

### API 变更
- 路径：`/api/v1/assistants` → `/api/v1/domains`
- 请求/响应字段名更新

### 代码变更
- 文件名：`assistant.*.ts` → `domain.*.ts`
- 类型名：`Assistant*` → `Domain*`
- 变量名：`assistant*` → `domain*`
- ID 前缀：`ast_` → `dom_`
- 错误码：`ASSISTANT_*` → `DOMAIN_*`

### 文档变更
- OpenSpec specs 更新
- 设计文档更新
- 注释更新

## Motivation

当前使用"助手"（Assistant）这个名称存在以下问题：

1. **语义混淆**：容易让人误解为是在创建一个 AI 助手实体，而实际上它代表的是一个知识领域
2. **业务不匹配**：用户创建的是"法律领域"、"医疗领域"等知识域，而不是"法律助手"、"医疗助手"
3. **与 AI 术语冲突**：在 AI 领域，"Assistant" 通常指 AI 助手本身，而我们的系统中 AI 助手是通过 PromptX 角色系统提供的

使用"领域"（Domain）更准确地表达：
- 这是一个知识领域的容器
- 包含该领域的文档、角色、记忆
- 用户可以创建多个领域，每个领域有独立的知识库

## Scope

### 影响范围

1. **数据库**
   - 表名：`assistants` → `domains`
   - 字段：`assistant_id` → `domain_id`（在关联表中）

2. **API**
   - 路径：`/api/assistants` → `/api/domains`
   - 请求/响应字段名

3. **代码**
   - 文件名：`assistant.*.ts` → `domain.*.ts`
   - 类型名：`Assistant*` → `Domain*`
   - 变量名：`assistant*` → `domain*`

4. **文档**
   - OpenSpec specs
   - 设计文档
   - 注释

### 不影响范围

- 工作区目录结构（保持 `workspaces/{domainId}/`）
- PromptX 角色系统
- AgentX 集成
- 文档处理逻辑

## Breaking Changes

- API 路径变更：`/api/assistants/*` → `/api/domains/*`
- 数据库表名变更：需要数据迁移
- 前端需要更新 API 调用

## Dependencies

- 无外部依赖
- 需要在对话系统实现之前完成

## Risks

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据迁移失败 | 高 | 备份数据库，提供回滚脚本 |
| 遗漏重命名 | 中 | 使用全局搜索确保完整性 |
| 前端不兼容 | 中 | 同步更新前端代码 |

## Alternatives Considered

1. **Workspace（工作区）**：已被用于文件系统目录，可能混淆
2. **KnowledgeBase（知识库）**：名称过长，不够简洁
3. **Realm（领域）**：不如 Domain 常用

## Decision

采用 "Domain"（领域）作为新名称，因为：
- 简洁明了
- 业务含义准确
- 在软件领域是常用术语（如 DDD 中的 Domain）
