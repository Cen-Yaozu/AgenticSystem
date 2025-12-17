# SPEC-002: 助手管理

> 版本: 2.0 | 状态: Draft | 日期: 2024-12-16

## 1. 概述

**目的**：定义助手（Assistant）的完整生命周期管理。

**范围**：
- 包含：助手 CRUD 操作、配置管理、状态管理
- 不包含：文档处理、对话系统（见 SPEC-003、SPEC-004）

**相关文档**：
- [SPEC-001 系统概述](./SPEC-001-SYSTEM-OVERVIEW.md)
- [数据模型设计](./design/DATA-MODEL.md)
- [API 参考](./design/API-REFERENCE.md)

## 2. 用户故事

作为用户，我希望创建和管理专业领域的 AI 助手，以便获得该领域的专业服务。

**核心场景**：
1. 创建新助手并配置基本信息
2. 查看和管理助手列表
3. 修改助手配置和设置
4. 删除不需要的助手

## 3. 功能需求

### P0 - 必须实现
- FR-001: 创建助手（名称必填，描述/领域/设置可选）
- FR-002: 查询助手列表（支持分页、筛选）
- FR-003: 查询助手详情
- FR-004: 更新助手信息
- FR-005: 删除助手（级联删除关联数据）

### P1 - 重要
- FR-006: 助手状态管理（initializing → ready → processing）
- FR-007: 助手设置配置（回答风格、语气、语言等）

## 4. 业务规则

| 规则 | 描述 |
|------|------|
| BR-001 | 助手名称不能为空，长度 1-100 字符 |
| BR-002 | 每个用户最多创建 10 个助手（MVP 限制） |
| BR-003 | 助手名称在同一用户下必须唯一 |
| BR-004 | 删除助手时必须级联删除所有关联数据 |
| BR-005 | 助手状态为 processing 时不能删除 |

## 5. 数据结构

```typescript
interface Assistant {
  id: string;                    // 格式: ast_xxxxxxxx
  userId: string;
  name: string;                  // 1-100 字符
  description?: string;          // 最多 500 字符
  domain?: string;               // 领域标签
  settings: AssistantSettings;
  status: 'initializing' | 'ready' | 'processing' | 'error';
  documentCount: number;
  conversationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AssistantSettings {
  responseStyle: 'detailed' | 'concise';
  tone: 'formal' | 'friendly';
  language: string;              // 默认 "zh-CN"
  maxTokens: number;             // 默认 4000
  temperature: number;           // 默认 0.7
  retrievalTopK: number;         // 默认 5
  retrievalThreshold: number;    // 默认 0.7
}
```

## 6. 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| ASSISTANT_NOT_FOUND | 404 | 助手不存在 |
| ASSISTANT_NAME_REQUIRED | 400 | 名称不能为空 |
| ASSISTANT_NAME_TOO_LONG | 400 | 名称超过 100 字符 |
| ASSISTANT_LIMIT_EXCEEDED | 403 | 超过数量限制 |
| ASSISTANT_NAME_DUPLICATE | 409 | 名称重复 |
| ASSISTANT_CANNOT_DELETE | 409 | 正在处理中，无法删除 |

## 7. 验收标准

详见 Gherkin 特性文件：
- [创建助手](./features/assistant/002-create-assistant.feature)
- [查询助手](./features/assistant/002-query-assistant.feature)
- [更新助手](./features/assistant/002-update-assistant.feature)
- [删除助手](./features/assistant/002-delete-assistant.feature)

## 8. 附录

### 默认设置值

| 设置项 | 默认值 |
|--------|--------|
| responseStyle | detailed |
| tone | formal |
| language | zh-CN |
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