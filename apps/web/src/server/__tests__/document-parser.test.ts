/**
 * 文档解析器单元测试
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseDocument } from '../parsers';
import { parseTxt } from '../parsers/txt.parser';

// 测试文件目录
const TEST_FILES_DIR = path.join(process.cwd(), 'src/server/__tests__/fixtures');

describe('Document Parsers', () => {
  // 在测试前创建测试文件目录和文件
  beforeAll(async () => {
    await fs.mkdir(TEST_FILES_DIR, { recursive: true });

    // 创建测试 TXT 文件
    await fs.writeFile(
      path.join(TEST_FILES_DIR, 'test.txt'),
      'Hello, World!\nThis is a test document.\nIt has multiple lines.'
    );

    // 创建测试 MD 文件
    await fs.writeFile(
      path.join(TEST_FILES_DIR, 'test.md'),
      '# Test Document\n\nThis is a **markdown** document.\n\n- Item 1\n- Item 2'
    );
  });

  // 测试后清理
  afterAll(async () => {
    try {
      await fs.rm(TEST_FILES_DIR, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });

  describe('TXT Parser', () => {
    it('should parse TXT file successfully', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'test.txt');
      const result = await parseTxt(filePath);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Hello, World!');
      expect(result.content).toContain('This is a test document.');
      expect(result.content).toContain('It has multiple lines.');
      expect(result.metadata).toBeDefined();
    });

    it('should parse MD file successfully', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'test.md');
      const result = await parseTxt(filePath);

      expect(result.success).toBe(true);
      expect(result.content).toContain('# Test Document');
      expect(result.content).toContain('**markdown**');
      expect(result.metadata).toBeDefined();
    });

    it('should return error for non-existent file', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'non-existent.txt');
      const result = await parseTxt(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.content).toBe('');
    });

    it('should handle empty file', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'empty.txt');
      await fs.writeFile(filePath, '');

      const result = await parseTxt(filePath);

      expect(result.success).toBe(true);
      expect(result.content).toBe('');
    });

    it('should handle file with special characters', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'special.txt');
      const content = '特殊字符测试：中文、日本語、한국어\n🎉 Emoji support!';
      await fs.writeFile(filePath, content);

      const result = await parseTxt(filePath);

      expect(result.success).toBe(true);
      expect(result.content).toContain('中文');
      expect(result.content).toContain('🎉');
    });
  });

  describe('parseDocument (unified entry)', () => {
    it('should route TXT files to TXT parser', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'test.txt');
      const result = await parseDocument(filePath, 'txt');

      expect(result.success).toBe(true);
      expect(result.content).toContain('Hello, World!');
    });

    it('should route MD files to TXT parser', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'test.md');
      const result = await parseDocument(filePath, 'md');

      expect(result.success).toBe(true);
      expect(result.content).toContain('# Test Document');
    });

    it('should return error for unsupported file type', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'test.txt');
      // @ts-expect-error - 测试不支持的文件类型
      const result = await parseDocument(filePath, 'unsupported');

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的文件类型');
    });
  });

  describe('Text Processing', () => {
    it('should preserve line breaks', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'multiline.txt');
      await fs.writeFile(filePath, 'Line 1\nLine 2\nLine 3');

      const result = await parseTxt(filePath);

      expect(result.success).toBe(true);
      expect(result.content.split('\n').length).toBe(3);
    });

    it('should handle large files', async () => {
      const filePath = path.join(TEST_FILES_DIR, 'large.txt');
      const largeContent = 'A'.repeat(100000); // 100KB of text
      await fs.writeFile(filePath, largeContent);

      const result = await parseTxt(filePath);

      expect(result.success).toBe(true);
      expect(result.content.length).toBe(100000);
    });
  });
});

describe('Document Parser Edge Cases', () => {
  const EDGE_CASES_DIR = path.join(TEST_FILES_DIR, 'edge-cases');

  beforeAll(async () => {
    await fs.mkdir(EDGE_CASES_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(EDGE_CASES_DIR, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });

  it('should handle file with only whitespace', async () => {
    const filePath = path.join(EDGE_CASES_DIR, 'whitespace.txt');
    await fs.writeFile(filePath, '   \n\t\n   ');

    const result = await parseTxt(filePath);

    expect(result.success).toBe(true);
    // 内容应该是空白字符
    expect(result.content.trim()).toBe('');
  });

  it('should handle file with very long lines', async () => {
    const filePath = path.join(EDGE_CASES_DIR, 'longline.txt');
    const longLine = 'X'.repeat(10000);
    await fs.writeFile(filePath, longLine);

    const result = await parseTxt(filePath);

    expect(result.success).toBe(true);
    expect(result.content.length).toBe(10000);
  });

  it('should handle file with mixed line endings', async () => {
    const filePath = path.join(EDGE_CASES_DIR, 'mixed-endings.txt');
    await fs.writeFile(filePath, 'Line1\r\nLine2\nLine3\rLine4');

    const result = await parseTxt(filePath);

    expect(result.success).toBe(true);
    expect(result.content).toContain('Line1');
    expect(result.content).toContain('Line4');
  });
});
