/**
 * XLSX Parser - 基于 node-xlsx 库
 * 复用自 promptx-agenticRag/collector 的解析逻辑
 */

import type { ParseResult } from '@agentic-rag/shared';
import fs from 'fs/promises';
import xlsx from 'node-xlsx';
import { logger } from '../utils/logger';

export interface XlsxParseOptions {
  /** 是否合并所有工作表 */
  mergeSheets?: boolean;
  /** 工作表分隔符 */
  sheetSeparator?: string;
}

interface WorkSheet {
  name: string;
  data: (string | number | boolean | null | undefined)[][];
}

/**
 * 解析 XLSX 文件，提取文本内容
 * @param filePath XLSX 文件路径
 * @param options 解析选项
 * @returns 解析结果
 */
export async function parseXlsx(
  filePath: string,
  options: XlsxParseOptions = {}
): Promise<ParseResult> {
  const { mergeSheets = true, sheetSeparator = '\n\n---\n\n' } = options;

  try {
    logger.info(`[XLSX Parser] 开始解析: ${filePath}`);

    // 读取文件
    const buffer = await fs.readFile(filePath);

    // 解析 Excel
    const workSheets: WorkSheet[] = xlsx.parse(buffer);

    if (!workSheets || workSheets.length === 0) {
      logger.warn(`[XLSX Parser] 文件无工作表: ${filePath}`);
      return {
        success: false,
        content: '',
        metadata: {
          sheetCount: 0,
          wordCount: 0,
        },
        error: '文件无工作表',
      };
    }

    // 处理每个工作表
    const sheetContents: string[] = [];
    let totalWordCount = 0;

    for (const sheet of workSheets) {
      const { name, data } = sheet;

      if (!data || data.length === 0) {
        logger.warn(`[XLSX Parser] 工作表 "${name}" 为空，跳过`);
        continue;
      }

      // 转换为 CSV 格式
      const csvContent = convertToCSV(data);
      if (csvContent.trim().length === 0) {
        continue;
      }

      const sheetWordCount = countWords(csvContent);
      totalWordCount += sheetWordCount;

      if (mergeSheets) {
        sheetContents.push(`[工作表: ${name}]\n${csvContent}`);
      } else {
        sheetContents.push(csvContent);
      }

      logger.info(
        `[XLSX Parser] 处理工作表 "${name}", 行数: ${data.length}, 字数: ${sheetWordCount}`
      );
    }

    if (sheetContents.length === 0) {
      logger.warn(`[XLSX Parser] 所有工作表都为空: ${filePath}`);
      return {
        success: false,
        content: '',
        metadata: {
          sheetCount: workSheets.length,
          wordCount: 0,
        },
        error: '所有工作表都为空',
      };
    }

    const content = sheetContents.join(sheetSeparator);

    logger.info(
      `[XLSX Parser] 解析成功: ${filePath}, 工作表数: ${workSheets.length}, 总字数: ${totalWordCount}`
    );

    return {
      success: true,
      content,
      metadata: {
        sheetCount: workSheets.length,
        wordCount: totalWordCount,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[XLSX Parser] 解析失败: ${filePath}, 错误: ${errorMessage}`);

    return {
      success: false,
      content: '',
      metadata: {},
      error: `XLSX 解析失败: ${errorMessage}`,
    };
  }
}

/**
 * 将二维数组转换为 CSV 格式字符串
 */
function convertToCSV(
  data: (string | number | boolean | null | undefined)[][]
): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '';
          const cellStr = String(cell);
          // 如果包含逗号、引号或换行，需要用引号包裹
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');
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
