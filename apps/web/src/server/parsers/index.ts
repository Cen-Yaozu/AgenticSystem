/**
 * 文档解析器统一入口
 * 根据文件类型自动选择合适的解析器
 */

import type { FileType, ParseResult } from '@agentic-rag/shared';
import { logger } from '../utils/logger';
import { parseDocx, type DocxParseOptions } from './docx.parser';
import { parsePdf, type PdfParseOptions } from './pdf.parser';
import { parseTxt, type TxtParseOptions } from './txt.parser';
import { parseXlsx, type XlsxParseOptions } from './xlsx.parser';

// 导出所有解析器
export { parseDocx, parsePdf, parseTxt, parseXlsx };
export type { DocxParseOptions, PdfParseOptions, TxtParseOptions, XlsxParseOptions };

/**
 * 解析选项联合类型
 */
export type ParseOptions = PdfParseOptions | DocxParseOptions | XlsxParseOptions | TxtParseOptions;

/**
 * 根据文件类型解析文档
 * @param filePath 文件路径
 * @param fileType 文件类型
 * @param options 解析选项（可选）
 * @returns 解析结果
 */
export async function parseDocument(
  filePath: string,
  fileType: FileType,
  options?: ParseOptions
): Promise<ParseResult> {
  logger.info(`[Document Parser] 开始解析文档: ${filePath}, 类型: ${fileType}`);

  switch (fileType) {
    case 'pdf':
      return parsePdf(filePath, options as PdfParseOptions);

    case 'docx':
      return parseDocx(filePath, options as DocxParseOptions);

    case 'xlsx':
      return parseXlsx(filePath, options as XlsxParseOptions);

    case 'txt':
    case 'md':
      return parseTxt(filePath, options as TxtParseOptions);

    default:
      logger.error(`[Document Parser] 不支持的文件类型: ${fileType}`);
      return {
        success: false,
        content: '',
        metadata: {},
        error: `不支持的文件类型: ${fileType}`,
      };
  }
}

/**
 * 根据文件扩展名获取文件类型
 * @param filename 文件名
 * @returns 文件类型或 null
 */
export function getFileTypeFromExtension(filename: string): FileType | null {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'xlsx':
    case 'xls':
      return 'xlsx';
    case 'txt':
      return 'txt';
    case 'md':
    case 'markdown':
      return 'md';
    default:
      return null;
  }
}

/**
 * 检查文件类型是否支持
 * @param fileType 文件类型
 * @returns 是否支持
 */
export function isSupportedFileType(fileType: string): fileType is FileType {
  return ['pdf', 'docx', 'xlsx', 'txt', 'md'].includes(fileType);
}
