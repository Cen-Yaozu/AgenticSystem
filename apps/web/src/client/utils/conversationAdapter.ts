/**
 * 数据转换工具
 * 将现有的 Message 模型转换为 @agentxjs/ui 所需的 ConversationData 模型
 */

import type { ChatMessage } from '../types';
import type {
  AssistantConversationData,
  ConversationData,
  TextBlockData,
  UserConversationData,
} from '../types/agentx';

/**
 * 解析消息内容
 * 后端返回的消息内容可能是 JSON 字符串格式，需要解析后提取实际文本
 */
export function parseMessageContent(content: string): string {
  if (!content) return '';

  // 尝试解析 JSON 格式的内容
  try {
    const parsed = JSON.parse(content);
    // 如果是对象且有 text 或 content 字段，提取它
    if (typeof parsed === 'object' && parsed !== null) {
      if (typeof parsed.text === 'string') {
        return parsed.text;
      }
      if (typeof parsed.content === 'string') {
        return parsed.content;
      }
      // 如果是数组，尝试提取第一个文本内容
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            if (item.type === 'text' && typeof item.text === 'string') {
              return item.text;
            }
          }
        }
      }
    }
    // 如果解析后是字符串，直接返回
    if (typeof parsed === 'string') {
      return parsed;
    }
  } catch {
    // 不是 JSON 格式，返回原始内容
  }

  return content;
}

/**
 * 将单条 ChatMessage 转换为 ConversationData
 */
export function messageToConversation(message: ChatMessage): ConversationData {
  const timestamp = message.createdAt
    ? new Date(message.createdAt).getTime()
    : Date.now();

  const parsedContent = parseMessageContent(message.content);

  if (message.role === 'user') {
    const userConversation: UserConversationData = {
      type: 'user',
      id: message.id,
      content: parsedContent,
      timestamp,
      status: 'success',
    };
    return userConversation;
  }

  // assistant 消息
  const textBlock: TextBlockData = {
    type: 'text',
    id: `text_${message.id}`,
    content: parsedContent,
    timestamp,
    status: message.isStreaming ? 'streaming' : 'completed',
  };

  const assistantConversation: AssistantConversationData = {
    type: 'assistant',
    id: message.id,
    messageIds: [message.id],
    timestamp,
    status: message.isStreaming ? 'streaming' : 'completed',
    blocks: [textBlock],
  };

  return assistantConversation;
}

/**
 * 将 ChatMessage 数组转换为 ConversationData 数组
 */
export function messagesToConversations(messages: ChatMessage[]): ConversationData[] {
  return messages.map(messageToConversation);
}

/**
 * 检查是否是用户对话
 */
export function isUserConversation(conv: ConversationData): conv is UserConversationData {
  return conv.type === 'user';
}

/**
 * 检查是否是助手对话
 */
export function isAssistantConversation(conv: ConversationData): conv is AssistantConversationData {
  return conv.type === 'assistant';
}
