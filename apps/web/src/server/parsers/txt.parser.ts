/**
 * TXT/MD Parser - 纯文本文件解析器
 * 复用自 promptx-agenticRag/collector 的解析逻辑
 */

import type { ParseResult } from '@agentic-rag/shared';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

export interface TxtParseOptions {
  /** 文件编码，默认 utf-8 */
  encoding?: BufferEncoding;
}

/**
 * 解析纯文本文件（TXT、MD 等）
 * @param filePath 文件路径
 * @param options 解析选项
 * @returns 解析结果
 */
export async function parseTxt(
  filePath: string,
  options: TxtParseOptions = {}
): Promise<ParseResult> {
  const { encoding = 'utf-8' } = options;

  try {
    logger.info(`[TXT Parser] 开始解析: ${filePath}`);

    // 读取文件
    const content = await fs.readFile(filePath, encoding);

    // 空文件也是合法的，返回成功
    if (!content || content.trim().length === 0) {
      logger.info(`[TXT Parser] 文件为空或只有空白: ${filePath}`);
      return {
        success: true,
        content: '',
        metadata: {
          wordCount: 0,
          lineCount: 0,
        },
      };
    }

    // 清理文本
    const cleanedText = cleanTxtText(content);
    const wordCount = countWords(cleanedText);
    const lineCount = cleanedText.split('\n').length;

    logger.info(
      `[TXT Parser] 解析成功: ${filePath}, 行数: ${lineCount}, 字数: ${wordCount}`
    );

    return {
      success: true,
      content: cleanedText,
      metadata: {
        wordCount,
        lineCount,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[TXT Parser] 解析失败: ${filePath}, 错误: ${errorMessage}`);

    return {
      success: false,
      content: '',
      metadata: {},
      error: `文本文件解析失败: ${errorMessage}`,
    };
  }
}

/**
 * 清理文本内容
 */
function cleanTxtText(text: string): string {
  return (
    text
      // 移除 BOM
      .replace(/^\uFEFF/, '')
      // 移除控制字符（保留换行和制表符）
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 统一换行符为 \n
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 规范化空格
      .replace(/[ \t]+/g, ' ')
      // 规范化换行（多个换行变两个）
      .replace(/\n{3,}/g, '\n\n')
      // 移除行首尾空格
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim()
  );
}

/**
 * 统计字数（支持中英文混合）
 */
function countWords(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (
    text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z]+/g) || []
  ).length;
  return chineseChars + englishWords;
}
