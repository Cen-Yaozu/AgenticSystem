# assistant-management Specification

## Purpose

定义助手（Assistant）的完整生命周期管理，包括创建、查询、更新、删除操作。

## ADDED Requirements

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
