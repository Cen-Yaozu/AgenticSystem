/**
 * DOCX Parser - 基于 mammoth 库
 * 复用自 promptx-agenticRag/collector 的解析逻辑
 */

import type { ParseResult } from '@agentic-rag/shared';
import fs from 'fs/promises';
import mammoth from 'mammoth';
import { logger } from '../utils/logger';

export interface DocxParseOptions {
  /** 是否保留样式信息 */
  preserveStyles?: boolean;
}

/**
 * 解析 DOCX 文件，提取文本内容
 * @param filePath DOCX 文件路径
 * @param options 解析选项
 * @returns 解析结果
 */
export async function parseDocx(
  filePath: string,
  _options: DocxParseOptions = {}
): Promise<ParseResult> {
  try {
    logger.info(`[DOCX Parser] 开始解析: ${filePath}`);

    // 读取文件
    const buffer = await fs.readFile(filePath);

    // 使用 mammoth 提取文本
    const result = await mammoth.extractRawText({ buffer });

    // 检查是否有内容
    if (!result.value || result.value.trim().length === 0) {
      logger.warn(`[DOCX Parser] 文件无文本内容: ${filePath}`);
      return {
        success: false,
        content: '',
        metadata: {
          wordCount: 0,
        },
        error: '文件无文本内容',
      };
    }

    // 记录警告信息
    if (result.messages && result.messages.length > 0) {
      result.messages.forEach((msg) => {
        logger.warn(`[DOCX Parser] 警告: ${msg.message}`);
      });
    }

    // 清理文本
    const cleanedText = cleanDocxText(result.value);
    const wordCount = countWords(cleanedText);

    logger.info(
      `[DOCX Parser] 解析成功: ${filePath}, 字数: ${wordCount}`
    );

    return {
      success: true,
      content: cleanedText,
      metadata: {
        wordCount,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[DOCX Parser] 解析失败: ${filePath}, 错误: ${errorMessage}`);

    return {
      success: false,
      content: '',
      metadata: {},
      error: `DOCX 解析失败: ${errorMessage}`,
    };
  }
}

/**
 * 清理 DOCX 提取的文本
 */
function cleanDocxText(text: string): string {
  return (
    text
      // 移除控制字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 规范化空格
      .replace(/[ \t]+/g, ' ')
      // 规范化换行
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
