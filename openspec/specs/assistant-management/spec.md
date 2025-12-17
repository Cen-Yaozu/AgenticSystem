# assistant-management Specification

## Purpose
TBD - created by archiving change add-assistant-management. Update Purpose after archive.
## Requirements
### Requirement: 创建助手

系统 SHALL 允许用户创建专业领域的 AI 助手，名称为必填项，其他信息可选。

#### Scenario: 成功创建助手（最小信息）
- **GIVEN** 用户已认证
- **AND** 用户当前助手数量未达上限
- **WHEN** 用户发送创建请求，仅提供名称
- **THEN** 系统应返回 HTTP 201
- **AND** 响应应包含助手 ID（格式：ast_xxxxxxxx）
- **AND** 助手状态应为 "initializing"
- **AND** 助手应使用默认设置

#### Scenario: 成功创建助手（完整信息）
- **GIVEN** 用户已认证
- **WHEN** 用户发送创建请求，包含名称、描述、领域、设置
- **THEN** 系统应返回 HTTP 201
- **AND** 助手信息应与请求一致

#### Scenario: 创建失败 - 名称为空
- **GIVEN** 用户已认证
- **WHEN** 用户发送创建请求，名称为空
- **THEN** 系统应返回 HTTP 400
- **AND** 错误码应为 "ASSISTANT_NAME_REQUIRED"

#### Scenario: 创建失败 - 名称过长
- **GIVEN** 用户已认证
- **WHEN** 用户发送创建请求，名称超过 100 字符
- **THEN** 系统应返回 HTTP 400
- **AND** 错误码应为 "ASSISTANT_NAME_TOO_LONG"

#### Scenario: 创建失败 - 名称重复
- **GIVEN** 用户已认证
- **AND** 用户已有名为 "法律助手" 的助手
- **WHEN** 用户发送创建请求，名称为 "法律助手"
- **THEN** 系统应返回 HTTP 409
- **AND** 错误码应为 "ASSISTANT_NAME_DUPLICATE"

#### Scenario: 创建失败 - 超过数量限制
- **GIVEN** 用户已认证
- **AND** 用户已有 10 个助手
- **WHEN** 用户发送创建请求
- **THEN** 系统应返回 HTTP 403
- **AND** 错误码应为 "ASSISTANT_LIMIT_EXCEEDED"

---

### Requirement: 查询助手列表

系统 SHALL 允许用户查询自己的助手列表，支持分页和筛选。

#### Scenario: 获取助手列表
- **GIVEN** 用户已认证
- **AND** 用户有多个助手
- **WHEN** 用户请求助手列表
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应包含助手数组
- **AND** 列表应按创建时间倒序排列

#### Scenario: 分页获取助手列表
- **GIVEN** 用户已认证
- **AND** 用户有 15 个助手
- **WHEN** 用户请求第 2 页，每页 10 条
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应包含 5 个助手
- **AND** 分页信息应正确

#### Scenario: 按领域筛选助手
- **GIVEN** 用户已认证
- **AND** 用户有不同领域的助手
- **WHEN** 用户请求列表，筛选 domain = "legal"
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应只包含 legal 领域的助手

---

### Requirement: 查询助手详情

系统 SHALL 允许用户查询单个助手的详细信息。

#### Scenario: 获取助手详情
- **GIVEN** 用户已认证
- **AND** 用户拥有指定助手
- **WHEN** 用户请求助手详情
- **THEN** 系统应返回 HTTP 200
- **AND** 响应应包含完整的助手信息

#### Scenario: 获取不存在的助手
- **GIVEN** 用户已认证
- **WHEN** 用户请求不存在的助手详情
- **THEN** 系统应返回 HTTP 404
- **AND** 错误码应为 "ASSISTANT_NOT_FOUND"

#### Scenario: 无法访问其他用户的助手
- **GIVEN** 用户 A 已认证
- **AND** 助手属于用户 B
- **WHEN** 用户 A 请求该助手详情
- **THEN** 系统应返回 HTTP 404

---

### Requirement: 更新助手

系统 SHALL 允许用户更新自己助手的信息和设置。

#### Scenario: 更新助手名称
- **GIVEN** 用户已认证
- **AND** 用户拥有指定助手
- **WHEN** 用户更新助手名称
- **THEN** 系统应返回 HTTP 200
- **AND** 助手名称应更新
- **AND** updatedAt 应更新

#### Scenario: 更新助手设置
- **GIVEN** 用户已认证
- **AND** 用户拥有指定助手
- **WHEN** 用户更新助手设置
- **THEN** 系统应返回 HTTP 200
- **AND** 助手设置应更新

#### Scenario: 部分更新助手
- **GIVEN** 用户已认证
- **AND** 用户拥有指定助手
- **WHEN** 用户只更新部分字段
- **THEN** 系统应返回 HTTP 200
- **AND** 未更新的字段应保持不变

#### Scenario: 更新失败 - 名称重复
- **GIVEN** 用户已认证
- **AND** 用户有两个助手 A 和 B
- **WHEN** 用户将助手 A 的名称改为助手 B 的名称
- **THEN** 系统应返回 HTTP 409
- **AND** 错误码应为 "ASSISTANT_NAME_DUPLICATE"

---

### Requirement: 删除助手

系统 SHALL 允许用户删除自己的助手，并级联删除所有关联数据。

#### Scenario: 成功删除助手
- **GIVEN** 用户已认证
- **AND** 用户拥有指定助手
- **AND** 助手状态不是 "processing"
- **WHEN** 用户删除助手
- **THEN** 系统应返回 HTTP 204
- **AND** 助手应不再存在

#### Scenario: 删除时级联删除关联数据
- **GIVEN** 用户已认证
- **AND** 助手有关联的文档、对话、角色、记忆
- **WHEN** 用户删除助手
- **THEN** 系统应返回 HTTP 204
- **AND** 所有关联的文档应被删除
- **AND** 所有关联的对话应被删除
- **AND** 所有关联的角色应被删除
- **AND** 所有关联的记忆应被删除

#### Scenario: 无法删除正在处理的助手
- **GIVEN** 用户已认证
- **AND** 助手状态为 "processing"
- **WHEN** 用户尝试删除助手
- **THEN** 系统应返回 HTTP 409
- **AND** 错误码应为 "ASSISTANT_CANNOT_DELETE"

#### Scenario: 删除不存在的助手
- **GIVEN** 用户已认证
- **WHEN** 用户删除不存在的助手
- **THEN** 系统应返回 HTTP 404
- **AND** 错误码应为 "ASSISTANT_NOT_FOUND"

---

### Requirement: 助手默认设置

系统 SHALL 为新创建的助手提供合理的默认设置。

#### Scenario: 默认设置值
- **GIVEN** 用户创建助手时未指定设置
- **WHEN** 助手创建成功
- **THEN** responseStyle 应为 "detailed"
- **AND** tone 应为 "formal"
- **AND** language 应为 "zh-CN"
- **AND** maxTokens 应为 4000
- **AND** temperature 应为 0.7
- **AND** retrievalTopK 应为 5
- **AND** retrievalThreshold 应为 0.7

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

