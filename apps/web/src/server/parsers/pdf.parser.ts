/**
 * PDF Parser - 基于 pdf-parse 库
 * 复用自 promptx-agenticRag/collector 的解析逻辑
 */

import type { ParseResult } from '@agentic-rag/shared';
import fs from 'fs/promises';
import { createRequire } from 'module';
import { logger } from '../utils/logger';

// pdf-parse 没有默认导出，使用 createRequire 在 ESM 中加载 CommonJS 模块
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

interface PdfParseResult {
  numpages: number;
  text: string;
  info?: {
    Author?: string;
    Title?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
  };
}

export interface PdfParseOptions {
  /** 最大页数限制 */
  maxPages?: number;
}

/**
 * 解析 PDF 文件，提取文本内容
 * @param filePath PDF 文件路径
 * @param options 解析选项
 * @returns 解析结果
 */
export async function parsePdf(
  filePath: string,
  options: PdfParseOptions = {}
): Promise<ParseResult> {
  const { maxPages } = options;

  try {
    logger.info(`[PDF Parser] 开始解析: ${filePath}`);

    // 读取文件
    const buffer = await fs.readFile(filePath);

    // 配置 pdf-parse 选项
    const pdfOptions: { max?: number } = {};
    if (maxPages) {
      pdfOptions.max = maxPages;
    }

    // 解析 PDF
    const data: PdfParseResult = await pdfParse(buffer, pdfOptions);

    // 检查是否有内容
    if (!data.text || data.text.trim().length === 0) {
      logger.warn(`[PDF Parser] 文件无文本内容: ${filePath}`);
      return {
        success: false,
        content: '',
        metadata: {
          pageCount: data.numpages,
          wordCount: 0,
        },
        error: '文件无文本内容，可能是扫描版 PDF',
      };
    }

    // 清理文本：移除多余空白
    const cleanedText = cleanPdfText(data.text);
    const wordCount = countWords(cleanedText);

    logger.info(
      `[PDF Parser] 解析成功: ${filePath}, 页数: ${data.numpages}, 字数: ${wordCount}`
    );

    return {
      success: true,
      content: cleanedText,
      metadata: {
        pageCount: data.numpages,
        wordCount,
        author: data.info?.Author || undefined,
        title: data.info?.Title || undefined,
        creator: data.info?.Creator || undefined,
        producer: data.info?.Producer || undefined,
        creationDate: data.info?.CreationDate || undefined,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[PDF Parser] 解析失败: ${filePath}, 错误: ${errorMessage}`);

    return {
      success: false,
      content: '',
      metadata: {},
      error: `PDF 解析失败: ${errorMessage}`,
    };
  }
}

/**
 * 清理 PDF 提取的文本
 * - 移除多余空白行
 * - 规范化空格
 * - 移除特殊控制字符
 */
function cleanPdfText(text: string): string {
  return (
    text
      // 移除控制字符（保留换行和制表符）
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 规范化空格（多个空格变一个）
      .replace(/[ \t]+/g, ' ')
      // 规范化换行（多个换行变两个）
      .replace(/\n{3,}/g, '\n\n')
      // 移除行首尾空格
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      // 最终 trim
      .trim()
  );
}

/**
 * 统计字数（支持中英文混合）
 */
function countWords(text: string): number {
  // 中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词数
  const englishWords = (
    text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z]+/g) || []
  ).length;
  return chineseChars + englishWords;
}
