import { nanoid } from 'nanoid';

/**
 * 生成带前缀的唯一 ID
 * @param prefix - ID 前缀，如 'ast', 'doc', 'conv', 'msg'
 * @param length - ID 长度（不含前缀），默认 12
 */
export function generateId(prefix: string, length = 12): string {
  return `${prefix}_${nanoid(length)}`;
}

/**
 * 预定义的 ID 生成器
 */
export const ids = {
  user: () => generateId('usr'),
  assistant: () => generateId('ast'),
  document: () => generateId('doc'),
  conversation: () => generateId('conv'),
  message: () => generateId('msg'),
  role: () => generateId('role'),
  memory: () => generateId('mem'),
  chunk: () => generateId('chk'),
};