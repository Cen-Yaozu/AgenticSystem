# Spec Delta: 助手工作区集成

## ADDED Requirements

### Requirement: 创建助手时创建工作区

创建助手时，系统 SHALL 自动创建工作区目录结构。

#### Scenario: 成功创建助手和工作区

```gherkin
Given 用户已登录
When 用户创建助手 "法律助手"
Then 系统创建工作区目录 "workspaces/{assistantId}/"
And 工作区包含 ".promptx/resource/role/" 目录
And 工作区包含 "documents/" 目录
And 工作区包含 "mcp.json" 配置文件
And 助手记录包含 workspace_path 字段
And 返回助手信息
```

#### Scenario: 工作区目录创建失败

```gherkin
Given 用户已登录
And 文件系统权限不足
When 用户创建助手 "法律助手"
Then 返回错误 "WORKSPACE_CREATE_FAILED"
And 不创建助手记录
```

### Requirement: 删除助手时删除工作区

删除助手时，系统 SHALL 自动删除工作区目录。

#### Scenario: 成功删除助手和工作区

```gherkin
Given 用户已登录
And 存在助手 "法律助手" 及其工作区
When 用户删除助手 "法律助手"
Then 删除工作区目录
And 删除助手记录
And 删除 Qdrant collection
```

### Requirement: 工作区目录结构

工作区 MUST 包含以下目录结构：

```
workspaces/{assistantId}/
├── .promptx/
│   └── resource/
│       └── role/           # 角色定义文件（用户可手动添加）
├── mcp.json                # MCP 服务器配置
└── documents/              # 文档存储
```

#### Scenario: 验证工作区结构

```gherkin
Given 用户已登录
When 用户创建助手 "法律助手"
Then 工作区目录结构符合规范
And mcp.json 包含 PromptX MCP 服务器配置
```

### Requirement: 助手配置管理

助手的所有配置 SHALL 存储在数据库 `settings` 字段中（JSON 格式）。

#### Scenario: 配置主角色

```gherkin
Given 用户已登录
And 存在助手 "法律助手"
When 用户更新助手配置 settings.primaryRoleId = "legal-consultant"
Then 助手配置更新成功
And 后续对话使用指定的主角色
```

#### Scenario: 配置子角色（一对多）

```gherkin
Given 用户已登录
And 存在助手 "法律助手"
And 助手已配置主角色 "legal-consultant"
When 用户更新助手配置 settings.subRoleIds = ["contract-law-expert", "labor-law-expert"]
Then 助手配置更新成功
And 助手拥有 1 个主角色和 2 个子角色
And 后续对话可以根据问题类型使用不同的子角色
```

#### Scenario: 配置检索参数

```gherkin
Given 用户已登录
And 存在助手 "法律助手"
When 用户更新助手配置:
  | 字段 | 值 |
  | settings.retrievalTopK | 10 |
  | settings.retrievalThreshold | 0.8 |
Then 助手配置更新成功
And 后续检索使用新的参数
