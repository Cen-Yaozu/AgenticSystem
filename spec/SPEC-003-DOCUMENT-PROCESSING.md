# SPEC-003: 文档处理

> 版本: 4.0 | 状态: Draft | 日期: 2024-12-17

## 1. 概述

**目的**：定义文档处理系统的完整规格，包括上传、解析、向量化和管理。

**核心技术**：
- 文档读取：PromptX 工具（pdf-reader, word-tool, excel-tool）
- 向量化：自定义 PromptX 工具或直接调用 Embedding API
- 向量存储：Qdrant

**范围**：
- 包含：文档上传、文本提取（PromptX 工具）、分块、向量化、索引存储
- 不包含：对话检索逻辑（见 SPEC-004）

**相关文档**：
- [SPEC-001 系统概述](./SPEC-001-SYSTEM-OVERVIEW.md)
- [SPEC-002 助手管理](./SPEC-002-ASSISTANT-MANAGEMENT.md)
- [数据模型设计](./design/DATA-MODEL.md)

## 2. 用户故事

作为用户，我希望上传专业文档给助手学习，以便助手能够基于这些文档提供专业回答。

**核心场景**：
1. 上传 PDF/Word/TXT 等格式文档
2. 查看文档处理进度
3. 管理已上传的文档
4. 删除过时的文档

## 3. 功能需求

### P0 - 必须实现
- FR-001: 文档上传（支持 PDF、DOCX、TXT、MD、XLSX）
- FR-002: 文档处理流水线（验证→提取→清理→分块→嵌入→索引）
- FR-003: 处理状态实时更新
- FR-004: 文档列表查询
- FR-005: 文档删除（含向量数据清理）

### P1 - 重要
- FR-006: 批量上传
- FR-007: 处理失败重试
- FR-008: 文档元数据提取

## 4. 业务规则

| 规则 | 描述 |
|------|------|
| BR-001 | 单个文档大小不能超过 10MB |
| BR-002 | 只支持指定的文档格式 |
| BR-003 | 每个助手最多存储 100 个文档（MVP 限制） |
| BR-004 | 处理失败的文档可以重试，最多 3 次 |
| BR-005 | 删除文档时必须同时删除向量数据 |
| BR-006 | 文档处理是异步的，不阻塞用户操作 |

## 5. 支持的文档格式

| 格式 | MIME 类型 | 扩展名 | 处理方式 |
|------|-----------|--------|----------|
| PDF | application/pdf | .pdf | pdf-parse |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | .docx | mammoth |
| 纯文本 | text/plain | .txt | 直接读取 |
| Markdown | text/markdown | .md | 直接读取 |
| Excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | .xlsx | xlsx |

## 6. 处理流水线

### 6.1 基础流水线（MVP）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           文档处理流水线                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  上传 → 验证 → 提取 → 清理 → 分块 → 嵌入 → 索引                              │
│    │      │      │      │      │      │      │                              │
│    │      │      │      │      │      │      └─ Qdrant 存储                 │
│    │      │      │      │      │      └─ Embedding API                      │
│    │      │      │      │      └─ 固定字符分块 (1000字符/块)                 │
│    │      │      │      └─ 去噪、标准化                                      │
│    │      │      └─ PromptX 工具（pdf-reader/word-tool/excel-tool）         │
│    │      └─ 格式、大小验证                                                  │
│    └─ 文件接收                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 PromptX 工具调用

文档提取使用 PromptX 的工具系统：

```typescript
// 使用 PromptX toolx 调用 pdf-reader
await mcpClient.call('toolx', {
  yaml: `tool: tool://pdf-reader
mode: execute
parameters:
  path: /path/to/document.pdf
  action: extract`
});

// 使用 word-tool 读取 Word 文档
await mcpClient.call('toolx', {
  yaml: `tool: tool://word-tool
mode: execute
parameters:
  path: /path/to/document.docx
  action: read`
});

// 使用 excel-tool 读取 Excel 文件
await mcpClient.call('toolx', {
  yaml: `tool: tool://excel-tool
mode: execute
parameters:
  path: /path/to/document.xlsx
  action: read`
});
```

### 6.3 向量化

向量化可以通过以下方式实现：

**方式一：直接调用 Embedding API**
```typescript
// 调用 OpenAI Embedding API
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: chunkText,
});
const vector = response.data[0].embedding;
```

**方式二：自定义 PromptX 工具（可选）**
```typescript
// 创建自定义向量化工具
await mcpClient.call('toolx', {
  yaml: `tool: tool://vectorizer
mode: execute
parameters:
  text: "${chunkText}"
  model: "text-embedding-3-small"`
});
```

### 6.4 处理流程详解

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           详细处理流程                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 文件上传                                                                │
│     • 接收文件                                                              │
│     • 保存到临时目录                                                        │
│     • 创建文档记录（status: uploading）                                     │
│                                                                             │
│  2. 文件验证                                                                │
│     • 检查文件大小（< 10MB）                                                │
│     • 检查文件类型（PDF/DOCX/TXT/MD/XLSX）                                  │
│     • 更新状态（status: queued）                                            │
│                                                                             │
│  3. 文本提取（PromptX 工具）                                                │
│     • 根据文件类型选择工具                                                  │
│       - PDF → pdf-reader                                                   │
│       - DOCX → word-tool                                                   │
│       - XLSX → excel-tool                                                  │
│       - TXT/MD → 直接读取                                                  │
│     • 更新状态（status: processing）                                        │
│                                                                             │
│  4. 文本清理                                                                │
│     • 去除多余空白                                                          │
│     • 标准化换行符                                                          │
│     • 去除特殊字符                                                          │
│                                                                             │
│  5. 文本分块                                                                │
│     • 按固定字符数分块（1000 字符）                                         │
│     • 保留重叠（100 字符）                                                  │
│     • 记录块位置信息                                                        │
│                                                                             │
│  6. 向量化                                                                  │
│     • 调用 Embedding API                                                   │
│     • 生成向量表示                                                          │
│                                                                             │
│  7. 索引存储                                                                │
│     • 存储到 Qdrant                                                        │
│     • 使用助手 ID 作为 collection 名称                                      │
│     • 更新状态（status: completed）                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 7. 向量存储策略

### 7.1 Qdrant Collection 设计

每个助手对应一个 Qdrant collection：

```typescript
// Collection 命名：assistant_{assistantId}
const collectionName = `assistant_${assistantId}`;

// 向量配置
const vectorConfig = {
  size: 1536,  // text-embedding-3-small 维度
  distance: "Cosine"
};

// Point 结构
interface QdrantPoint {
  id: string;           // chunk_xxxxxxxx
  vector: number[];     // 1536 维向量
  payload: {
    documentId: string;
    documentName: string;
    content: string;    // 原始文本
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
  };
}
```

### 7.2 删除策略

删除文档时，同时删除对应的向量：

```typescript
// 按 documentId 过滤删除
await qdrantClient.delete(collectionName, {
  filter: {
    must: [
      { key: "documentId", match: { value: documentId } }
    ]
  }
});
```

---

## 8. 数据结构

```typescript
interface Document {
  id: string;                    // 格式: doc_xxxxxxxx
  assistantId: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md' | 'xlsx';
  fileSize: number;              // 字节
  status: 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;              // 0-100
  errorMessage?: string;
  chunkCount: number;
  uploadedAt: Date;
  processedAt?: Date;
}
```

## 9. 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| DOCUMENT_NOT_FOUND | 404 | 文档不存在 |
| DOCUMENT_TOO_LARGE | 400 | 文档大小超过限制 |
| DOCUMENT_TYPE_NOT_SUPPORTED | 400 | 不支持的文档类型 |
| DOCUMENT_LIMIT_EXCEEDED | 403 | 超过文档数量限制 |
| DOCUMENT_PROCESSING_FAILED | 500 | 文档处理失败 |
| DOCUMENT_ALREADY_PROCESSING | 409 | 文档正在处理中 |

## 10. 验收标准

详见 Gherkin 特性文件：
- [上传文档](./features/document/003-upload-document.feature)
- [处理文档](./features/document/003-process-document.feature)
- [管理文档](./features/document/003-manage-documents.feature)

## 11. 非功能需求

| 需求 | 指标 |
|------|------|
| 处理速度 | < 30s/MB |
| 单文档最大 | 10MB |
| 失败重试 | 最多 3 次 |
| 进度更新延迟 | < 1s |

## 12. 实现路线图

### Phase 1: 基础处理（MVP）
- [ ] 文件上传和验证
- [ ] PromptX 工具集成（pdf-reader, word-tool, excel-tool）
- [ ] 固定字符分块
- [ ] Embedding API 向量化
- [ ] Qdrant 存储

### Phase 2: 增强功能
- [ ] 智能语义分块
- [ ] 元数据提取
- [ ] 处理进度实时更新
- [ ] 批量上传

### Phase 3: 高级功能
- [ ] 表格数据提取
- [ ] 图片 OCR
- [ ] 多语言支持
- [ ] 增量更新

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2024-12-16 | 初始版本 |
| 2.0 | 2024-12-16 | 精简格式 |
| 3.0 | 2024-12-17 | 添加 Agentic 处理流程 |
| 3.1 | 2024-12-17 | 更新术语：子角色→子代理，添加多实例架构说明 |
| 4.0 | 2024-12-17 | 简化为 PromptX 工具集成，移除复杂的子代理架构 |
