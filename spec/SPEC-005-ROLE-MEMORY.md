# SPEC-005: 角色与记忆系统

> 版本: 2.0 | 状态: Draft | 日期: 2024-12-16

## 1. 概述

**目的**：定义角色系统和记忆系统的完整规格。

**范围**：
- 包含：角色定义、动态切换、记忆管理、持续学习
- 不包含：对话流程（见 SPEC-004）

**相关文档**：
- [SPEC-004 对话系统](./SPEC-004-CONVERSATION-SYSTEM.md)
- [技术架构](./design/TECHNICAL-ARCHITECTURE.md)

## 2. 用户故事

作为用户，我希望助手能够以不同专业角色提供服务，并记住我的偏好，以便获得越来越个性化的体验。

**核心场景**：
1. 系统自动选择最匹配的角色回答问题
2. 助手记住用户偏好并调整回答风格
3. 从对话中学习用户关注点

## 3. 功能需求

### P0 - 必须实现
- FR-001: 默认角色（主协调者）
- FR-002: 角色自动选择
- FR-003: 记忆保存（remember）
- FR-004: 记忆检索（recall）

### P1 - 重要
- FR-005: 创建自定义角色
- FR-006: 手动切换角色
- FR-007: 记忆强度衰减
- FR-008: 用户偏好学习

## 4. 业务规则

| 规则 | 描述 |
|------|------|
| BR-001 | 每个助手必须有一个默认角色（主协调者） |
| BR-002 | 每个助手最多创建 10 个角色 |
| BR-003 | 默认角色不能被删除或停用 |
| BR-004 | 记忆强度范围为 0-1 |
| BR-005 | 记忆强度低于 0.1 时自动清理 |
| BR-006 | 角色切换时保持对话上下文 |

## 5. 角色数据结构

```typescript
interface Role {
  id: string;                    // 格式: role_xxxxxxxx
  assistantId: string;
  name: string;
  description: string;
  promptTemplate: string;
  capabilities: string[];        // 能力标签
  personality: {
    tone: 'formal' | 'friendly' | 'professional';
    verbosity: 'concise' | 'detailed' | 'balanced';
    expertise: string[];
  };
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
}
```

## 6. 记忆数据结构

```typescript
interface Memory {
  id: string;                    // 格式: mem_xxxxxxxx
  roleId: string;
  type: 'preference' | 'habit' | 'insight' | 'fact';
  content: string;
  schema: string;                // 关键词序列
  strength: number;              // 0-1
  accessCount: number;
  createdAt: Date;
  lastAccessedAt?: Date;
}
```

## 7. 角色选择机制

```
用户消息 → 意图分析 → 能力匹配 → 记忆查询 → 综合评分 → 选择最优
                         │           │           │
                         │           │           └─ 加权平均
                         │           └─ 相关记忆强度
                         └─ 关键词与能力标签重叠度
```

**评分权重**：
- 能力匹配分：50%
- 记忆相关分：30%
- 使用频率分：20%

## 8. 记忆操作

### Remember（保存）
- 验证输入 → 提取关键词 → 检查重复 → 创建/增强记忆 → 更新网络

### Recall（检索）
- DMN 模式（query=null）：返回核心枢纽节点
- 关键词模式：从指定节点开始扩散
- 检索模式：focused / balanced / creative

## 9. 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| ROLE_NOT_FOUND | 404 | 角色不存在 |
| ROLE_NAME_DUPLICATE | 409 | 角色名称重复 |
| ROLE_LIMIT_EXCEEDED | 403 | 超过角色数量限制 |
| CANNOT_DELETE_DEFAULT_ROLE | 403 | 无法删除默认角色 |
| MEMORY_NOT_FOUND | 404 | 记忆不存在 |

## 10. 验收标准

详见 Gherkin 特性文件：
- [角色管理](./features/role-memory/005-role-management.feature)
- [角色切换](./features/role-memory/005-role-switching.feature)
- [记忆管理](./features/role-memory/005-memory-management.feature)
- [持续学习](./features/role-memory/005-learning.feature)

## 11. PromptX MCP 集成

通过 MCP 协议调用 PromptX 服务：
- `promptx_action`: 激活角色
- `promptx_remember`: 保存记忆
- `promptx_recall`: 检索记忆

## 12. 非功能需求

| 需求 | 指标 |
|------|------|
| 角色切换时间 | < 500ms |
| 记忆检索时间 | < 1s |
| 角色选择准确率 | > 90% |