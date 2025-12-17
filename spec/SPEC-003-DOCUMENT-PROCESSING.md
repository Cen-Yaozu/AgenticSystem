# SPEC-003: 文档处理

> 版本: 2.0 | 状态: Draft | 日期: 2024-12-16

## 1. 概述

**目的**：定义文档处理系统的完整规格，包括上传、解析、向量化和管理。

**范围**：
- 包含：文档上传、文本提取、智能分块、向量化、索引存储
- 不包含：对话检索逻辑（见 SPEC-004）

**相关文档**：
- [SPEC-002 助手管理](./SPEC-002-ASSISTANT-MANAGEMENT.md)
- [数据模型设计](./design/DATA-MODEL.md)
- [技术架构](./design/TECHNICAL-ARCHITECTURE.md)

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

```
上传 → 验证 → 提取 → 清理 → 分块 → 嵌入 → 索引
  │      │      │      │      │      │      │
  │      │      │      │      │      │      └─ Qdrant 存储
  │      │      │      │      │      └─ OpenAI Embeddings
  │      │      │      │      └─ 语义分块 (1000字符/块)
  │      │      │      └─ 去噪、标准化
  │      │      └─ PDF/Word/文本解析
  │      └─ 格式、大小验证
  └─ 文件接收
```

## 7. 数据结构

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

## 8. 错误码

| 错误码 | HTTP | 描述 |
|--------|------|------|
| DOCUMENT_NOT_FOUND | 404 | 文档不存在 |
| DOCUMENT_TOO_LARGE | 400 | 文档大小超过限制 |
| DOCUMENT_TYPE_NOT_SUPPORTED | 400 | 不支持的文档类型 |
| DOCUMENT_LIMIT_EXCEEDED | 403 | 超过文档数量限制 |
| DOCUMENT_PROCESSING_FAILED | 500 | 文档处理失败 |
| DOCUMENT_ALREADY_PROCESSING | 409 | 文档正在处理中 |

## 9. 验收标准

详见 Gherkin 特性文件：
- [上传文档](./features/document/003-upload-document.feature)
- [处理文档](./features/document/003-process-document.feature)
- [管理文档](./features/document/003-manage-documents.feature)

## 10. 非功能需求

| 需求 | 指标 |
|------|------|
| 处理速度 | < 30s/MB |
| 单文档最大 | 10MB |
| 失败重试 | 最多 3 次 |
| 进度更新延迟 | < 1s |