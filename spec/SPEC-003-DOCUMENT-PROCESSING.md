# SPEC-003: 文档处理

> 版本: 5.0 | 状态: Draft | 日期: 2024-12-17

## 1. 概述

**目的**：定义文档处理系统的完整规格，包括上传、解析、向量化和管理。

**核心技术**：
- 文档读取：复用 `promptx-agenticRag/collector` 的成熟解析器
- 向量化：直接调用 Embedding API（OpenAI text-embedding-3-small）
- 向量存储：Qdrant

**范围**：
- 包含：文档上传、文本提取（复用 collector 解析器）、分块、向量化、索引存储
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

| 格式 | MIME 类型 | 扩展名 | 处理方式 | 复用来源 |
|------|-----------|--------|----------|----------|
| PDF | application/pdf | .pdf | pdf-parse + OCR 回退 | collector/processSingleFile/convert/asPDF/ |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document | .docx | langchain DocxLoader | collector/processSingleFile/convert/asDocx.js |
| 纯文本 | text/plain | .txt | 直接读取 | collector/processSingleFile/convert/asTxt.js |
| Markdown | text/markdown | .md | 直接读取 | collector/processSingleFile/convert/asTxt.js |
| Excel | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | .xlsx | node-xlsx | collector/processSingleFile/convert/asXlsx.js |

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
│    │      │      └─ 复用 collector 解析器（TypeScript 重写）                 │
│    │      └─ 格式、大小验证                                                  │
│    └─ 文件接收                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 复用 collector 解析器

文档提取复用 `promptx-agenticRag/collector` 的成熟实现，重写为 TypeScript：

```typescript
// 解析器接口
interface DocumentParser {
  parse(filePath: string): Promise<ParseResult>;
}

interface ParseResult {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}

// PDF 解析器（复用 collector/processSingleFile/convert/asPDF/）
class PdfParser implements DocumentParser {
  async parse(filePath: string): Promise<ParseResult> {
    // 使用 pdf-parse 提取文本
    // 如果提取失败，回退到 OCR（tesseract.js）
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      content: data.text,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        pageCount: data.numpages
      }
    };
  }
}

// DOCX 解析器（复用 collector/processSingleFile/convert/asDocx.js）
class DocxParser implements DocumentParser {
  async parse(filePath: string): Promise<ParseResult> {
    // 使用 langchain DocxLoader
    const { DocxLoader } = require('@langchain/community/document_loaders/fs/docx');
    const loader = new DocxLoader(filePath);
    const docs = await loader.load();
    return {
      content: docs.map(d => d.pageContent).join('\n'),
      metadata: {}
    };
  }
}

// XLSX 解析器（复用 collector/processSingleFile/convert/asXlsx.js）
class XlsxParser implements DocumentParser {
  async parse(filePath: string): Promise<ParseResult> {
    // 使用 node-xlsx
    const xlsx = require('node-xlsx');
    const workbook = xlsx.parse(filePath);
    const content = workbook
      .map(sheet => sheet.data.map(row => row.join('\t')).join('\n'))
      .join('\n\n');
    return { content, metadata: {} };
  }
}

// TXT/MD 解析器（复用 collector/processSingleFile/convert/asTxt.js）
class TextParser implements DocumentParser {
  async parse(filePath: string): Promise<ParseResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, metadata: {} };
  }
}
```

### 6.3 向量化

直接调用 OpenAI Embedding API：

```typescript
// 调用 OpenAI Embedding API
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: chunkText,
});
const vector = response.data[0].embedding;
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
│  3. 文本提取（复用 collector 解析器）                                       │
│     • 根据文件类型选择解析器                                                │
│       - PDF → PdfParser（pdf-parse + OCR 回退）                            │
│       - DOCX → DocxParser（langchain DocxLoader）                          │
│       - XLSX → XlsxParser（node-xlsx）                                     │
│       - TXT/MD → TextParser（直接读取）                                    │
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

## 12. 依赖库

| 库 | 用途 | 来源 |
|----|------|------|
| pdf-parse | PDF 文本提取 | collector |
| @langchain/community | DOCX 解析（DocxLoader） | collector |
| node-xlsx | Excel 解析 | collector |
| tesseract.js | PDF OCR 回退（可选） | collector |
| @qdrant/js-client-rest | 向量数据库客户端 | 新增 |
| openai | Embedding API | 新增 |

## 13. 实现路线图

### Phase 1: 基础处理（MVP）
- [ ] 文件上传和验证
- [ ] 复用 collector 解析器（TypeScript 重写）
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
| 5.0 | 2024-12-17 | 改为复用 collector 解析器，更简单高效 |
