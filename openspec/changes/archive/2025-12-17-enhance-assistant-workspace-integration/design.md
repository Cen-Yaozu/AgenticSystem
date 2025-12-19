# Design: 助手工作区集成

## Context

当前系统的助手管理只有基本的 CRUD 操作，缺少工作区目录管理。

**核心理解**：
- **创建助手 = 创建工作区** - 本质上是创建一个目录结构
- **管理助手 = 管理配置** - 数据库表存储所有配置
- **角色是配置项** - 不是需要"创建"的实体，而是配置到助手上的引用

## Goals / Non-Goals

### Goals
- 设计工作区目录结构
- 添加 `workspace_path` 字段到 `assistants` 表
- 保持简单，不过度设计

### Non-Goals
- 不调用 PromptX 创建角色（角色是配置，不是创建）
- 不修改 PromptX 的内部实现
- 不涉及文档处理和对话系统的修改

## Decisions

### 1. 数据库设计

#### 1.1 修改 `assistants` 表

```sql
-- 添加工作区路径字段
ALTER TABLE assistants ADD COLUMN workspace_path TEXT;
```

**现有表结构**（保持不变，只添加一个字段）：

```sql
CREATE TABLE assistants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  settings TEXT DEFAULT '{}',
  status TEXT DEFAULT 'initializing',
  document_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  workspace_path TEXT,                    -- 新增：工作区路径
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**`settings` 字段**（JSON 格式，存储所有配置）：
```typescript
interface AssistantSettings {
  // 检索相关
  maxTokens?: number;             // 默认 4000
  temperature?: number;           // 默认 0.7
  retrievalTopK?: number;         // 默认 5
  retrievalThreshold?: number;    // 默认 0.7

  // 角色配置（一对多：主角色 + 子角色）
  primaryRoleId?: string;         // 主角色 ID（必选，助手的核心身份）
  subRoleIds?: string[];          // 子角色 ID 列表（可选，领域细分的专业角色）
}
```

**角色配置说明**：
- **主角色（primaryRoleId）**：助手的核心身份，处理通用问题
- **子角色（subRoleIds）**：领域细分的专业角色，用于提升特定领域的检索精准度
- 示例：法律助手的主角色是"法律顾问"，子角色可以是"合同法专家"、"劳动法专家"等

### 2. 工作区目录结构

```
workspaces/
└── {assistantId}/                    # 工作区根目录
    ├── .promptx/                     # PromptX 资源目录（可选）
    │   └── resource/
    │       └── role/                 # 角色定义文件（用户可手动添加）
    ├── mcp.json                      # MCP 服务器配置
    └── documents/                    # 文档存储目录
```

### 3. 创建助手流程（简化版）

```
用户请求创建"法律助手"
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. 验证请求                                                         │
│     • 检查名称是否为空                                               │
│     • 检查名称是否重复                                               │
│     • 检查数量限制                                                   │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. 创建工作区目录结构                                               │
│     mkdir -p workspaces/{assistantId}/.promptx/resource/role        │
│     mkdir -p workspaces/{assistantId}/documents                     │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. 生成 MCP 配置文件                                                │
│     写入 mcp.json（配置 PromptX MCP 服务器）                         │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. 保存助手配置到数据库                                             │
│     • 保存到 SQLite（包含 workspace_path）                           │
│     • 创建 Qdrant collection: assistant_{assistantId}               │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
返回助手信息
```

**注意**：不调用 PromptX 创建角色。角色是配置项，用户可以后续通过更新助手配置来指定使用哪个角色。

### 4. MCP 配置文件格式

```json
{
  "mcpServers": {
    "promptx": {
      "command": "npx",
      "args": ["-y", "promptx-mcp"],
      "env": {
        "WORKSPACE_DIR": "/path/to/workspaces/{assistantId}"
      }
    }
  }
}
```

### 5. TypeScript 接口定义

```typescript
// 助手接口
interface Assistant {
  id: string;                           // asst_xxxxxxxx
  userId: string;
  name: string;
  description?: string;
  domain?: string;
  settings: AssistantSettings;
  status: 'initializing' | 'ready' | 'processing' | 'error';
  documentCount: number;
  conversationCount: number;
  workspacePath?: string;               // 工作区路径
  createdAt: Date;
  updatedAt: Date;
}

interface AssistantSettings {
  // 检索相关
  maxTokens?: number;                   // 默认 4000
  temperature?: number;                 // 默认 0.7
  retrievalTopK?: number;               // 默认 5
  retrievalThreshold?: number;          // 默认 0.7

  // 角色配置（一对多：主角色 + 子角色）
  primaryRoleId?: string;               // 主角色 ID
  subRoleIds?: string[];                // 子角色 ID 列表
}

interface CreateAssistantInput {
  name: string;
  description?: string;
  domain?: string;
  settings?: Partial<AssistantSettings>;
}

interface UpdateAssistantInput {
  name?: string;
  description?: string;
  domain?: string;
  settings?: Partial<AssistantSettings>;
}

// 工作区接口
interface Workspace {
  assistantId: string;
  path: string;
  promptxResourcePath: string;    // .promptx/resource 路径
  mcpConfigPath: string;
  documentsPath: string;
}
```

## Risks / Trade-offs

### Trade-off：角色配置 vs 角色创建
- **选择**：角色是配置项，不是创建的实体
- **原因**：简化架构，避免过度设计
- **代价**：用户需要知道可用的角色 ID

## Migration Plan

### 阶段 1：数据库迁移
1. 添加 `workspace_path` 字段到 `assistants` 表

### 阶段 2：工作区迁移
1. 为现有助手创建工作区目录
2. 生成 MCP 配置文件
3. 更新 `workspace_path` 字段

### 回滚计划
- 保留原有的 `assistants` 表结构
- 如需回滚，可忽略 `workspace_path` 字段

## Open Questions

无。架构已简化，不需要额外决策。
