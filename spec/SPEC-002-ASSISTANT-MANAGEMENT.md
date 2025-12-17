# SPEC-002: 助手管理

> 版本: 5.0 | 状态: Draft | 日期: 2024-12-17

## 1. 概述

**目的**：定义助手（Assistant）的完整生命周期管理。

**核心概念**：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     助手管理 = 配置管理                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  创建助手 = 创建工作区目录 + 保存配置到数据库                                 │
│  管理助手 = 管理配置（数据库中的配置）                                        │
│  角色是配置项，不是需要"创建"的实体                                           │
│                                                                             │
│  workspaces/                                                                │
│  └── {assistantId}/                    # 工作区目录                         │
│      ├── .promptx/                     # PromptX 资源目录（可选）            │
│      │   └── resource/                                                      │
│      │       └── role/                 # 角色定义文件（用户可手动添加）       │
│      ├── mcp.json                      # MCP 服务器配置                     │
│      └── documents/                    # 文档存储                           │
│                                                                             │
│  关键点：                                                                   │
│  ✅ 创建助手只是创建目录结构和保存配置                                       │
│  ✅ 角色是配置项（主角色 + 子角色），不需要调用 PromptX 创建                  │
│  ✅ 数据库表存储所有配置，是核心                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**范围**：
- 包含：助手 CRUD 操作、工作区创建、配置管理
- 不包含：文档处理、对话系统（见 SPEC-003、SPEC-004）

**相关文档**：
- [SPEC-001 系统概述](./SPEC-001-SYSTEM-OVERVIEW.md)
- [SPEC-005 PromptX 集成](./SPEC-005-ROLE-MEMORY.md)
- [数据模型设计](./design/DATA-MODEL.md)
- [API 参考](./design/API-REFERENCE.md)

## 2. 用户故事

作为用户，我希望创建和管理专业领域的 AI 助手，以便获得该领域的专业服务。

**核心场景**：
1. 创建新助手（创建工作区目录 + 保存配置）
2. 查看和管理助手列表
3. 修改助手配置和设置
4. 删除不需要的助手（清理工作区和数据）

## 3. 功能需求

### P0 - 必须实现
- FR-001: 创建助手（名称必填，描述/领域/设置可选）
  - 创建工作区目录结构
  - 生成 MCP 配置文件（mcp.json）
  - 保存助手配置到 SQLite
  - 创建 Qdrant collection
- FR-002: 查询助手列表（支持分页、筛选）
- FR-003: 查询助手详情
- FR-004: 更新助手配置
- FR-005: 删除助手（级联删除关联数据）
  - 删除工作区目录
  - 删除向量数据（Qdrant collection）
  - 删除业务数据（SQLite）

### P1 - 重要
- FR-006: 助手状态管理（initializing → ready → processing）
- FR-007: 发现 PromptX 资源（封装 promptx_discover）
  - `GET /api/v1/assistants/:id/resources` - 获取工作区中的 PromptX 资源

## 4. 业务规则

| 规则 | 描述 |
|------|------|
| BR-001 | 助手名称不能为空，长度 1-100 字符 |
| BR-002 | 每个用户最多创建 10 个助手（MVP 限制） |
| BR-003 | 助手名称在同一用户下必须唯一 |
| BR-004 | 删除助手时必须级联删除所有关联数据（工作区目录、向量数据） |
| BR-005 | 助手状态为 processing 时不能删除 |

## 5. 创建助手流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           创建助手流程                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  用户请求创建"法律助手"                                                      │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. 验证请求                                                         │   │
│  │     • 检查名称是否为空                                               │   │
│  │     • 检查名称是否重复                                               │   │
│  │     • 检查数量限制                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. 创建工作区目录结构                                               │   │
│  │     mkdir -p workspaces/{assistantId}/.promptx/resource/role        │   │
│  │     mkdir -p workspaces/{assistantId}/documents                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. 生成 MCP 配置文件                                                │   │
│  │     写入 mcp.json（配置 PromptX MCP 服务器）                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. 保存助手配置到数据库                                             │   │
│  │     • 保存到 SQLite（包含 workspace_path）                           │   │
│  │     • 创建 Qdrant collection: assistant_{assistantId}               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  返回助手信息                                                               │
│                                                                             │
│  注意：不调用 PromptX 创建角色。角色是配置项，用户可以后续通过更新           │
│  助手配置（settings.primaryRoleId 和 settings.subRoleIds）来指定角色。      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6. 数据结构

```typescript
interface Assistant {
  id: string;                    // 格式: asst_xxxxxxxx
  userId: string;
  name: string;                  // 1-100 字符
  description?: string;          // 最多 500 字符
  domain?: string;               // 领域标签
  settings: AssistantSettings;
  status: 'initializing' | 'ready' | 'processing' | 'error';
  documentCount: number;
  conversationCount: number;
  workspacePath?: string;        // 工作区路径
  createdAt: Date;
  updatedAt: Date;
}

interface AssistantSettings {
  // 检索相关
  maxTokens?: number;             // 默认 4000
  temperature?: number;           // 默认 0.7
  retrievalTopK?: number;         // 默认 5
  retrievalThreshold?: number;    // 默认 0.7

  // 角色配置（一对多：主角色 + 子角色）
  primaryRoleId?: string;         // 主角色 ID（助手的核心身份）
  subRoleIds?: string[];          // 子角色 ID 列表（领域细分的专业角色）
}
```

**角色配置说明**：
- **主角色（primaryRoleId）**：助手的核心身份，处理通用问题
- **子角色（subRoleIds）**：领域细分的专业角色，用于提升特定领域的检索精准度
- 示例：法律助手的主角色是"法律顾问"，子角色可以是"合同法专家"、"劳动法专家"等

## 7. 数据库 Schema

```sql
-- 助手表（只需添加 workspace_path 字段）
CREATE TABLE assistants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  settings TEXT DEFAULT '{}',             -- JSON 格式存储 AssistantSettings
  status TEXT DEFAULT 'initializing',
  document_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  workspace_path TEXT,                    -- 工作区路径
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 8. 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| ASSISTANT_NOT_FOUND | 404 | 助手不存在 |
| ASSISTANT_NAME_REQUIRED | 400 | 名称不能为空 |
| ASSISTANT_NAME_TOO_LONG | 400 | 名称超过 100 字符 |
| ASSISTANT_LIMIT_EXCEEDED | 403 | 超过数量限制 |
| ASSISTANT_NAME_DUPLICATE | 409 | 名称重复 |
| ASSISTANT_CANNOT_DELETE | 409 | 正在处理中，无法删除 |

## 9. 验收标准

详见 Gherkin 特性文件：
- [创建助手](./features/assistant/002-create-assistant.feature)
- [查询助手](./features/assistant/002-query-assistant.feature)
- [更新助手](./features/assistant/002-update-assistant.feature)
- [删除助手](./features/assistant/002-delete-assistant.feature)

## 10. 附录

### 默认设置值

| 设置项 | 默认值 |
|--------|--------|
| maxTokens | 4000 |
| temperature | 0.7 |
| retrievalTopK | 5 |
| retrievalThreshold | 0.7 |

### 领域标签参考

| 标签 | 描述 |
|------|------|
| legal | 法律 |
| finance | 财务 |
| tech | 技术 |
| medical | 医疗 |
| education | 教育 |

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2024-12-16 | 初始版本 |
| 2.0 | 2024-12-16 | 精简格式 |
| 3.0 | 2024-12-17 | 添加工作区和 PromptX 角色创建流程 |
| 4.0 | 2024-12-17 | 重构：助手=工作区+资源配置 |
| 5.0 | 2024-12-17 | 简化：助手管理=配置管理，角色是配置项不是创建的实体 |
| 5.1 | 2024-12-17 | 支持主角色+子角色配置（一对多） |
