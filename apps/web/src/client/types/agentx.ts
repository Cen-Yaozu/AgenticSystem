/**
 * AgentX UI 类型定义
 * 用于与 @agentxjs/ui 组件库集成
 */

// 消息状态类型
export type MessageState =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'interrupted';

// Block 状态类型
export type BlockStatus =
  | 'queued'
  | 'processing'
  | 'thinking'
  | 'streaming'
  | 'completed'
  | 'error';

// 文本块数据
export interface TextBlockData {
  type: 'text';
  id: string;
  content: string;
  timestamp: number;
  status: BlockStatus;
}

// 工具块数据
export interface ToolBlockData {
  type: 'tool';
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: string;
  timestamp: number;
  status: BlockStatus;
}

// 块数据联合类型
export type BlockData = TextBlockData | ToolBlockData;

// 用户对话数据
export interface UserConversationData {
  type: 'user';
  id: string;
  content: string;
  timestamp: number;
  status: 'success' | 'error';
}

// 助手对话数据
export interface AssistantConversationData {
  type: 'assistant';
  id: string;
  messageIds: string[];
  timestamp: number;
  status: BlockStatus;
  blocks: BlockData[];
}

// 对话数据联合类型
export type ConversationData = UserConversationData | AssistantConversationData;

// 来源引用
export interface SourceReference {
  id: string;
  title: string;
  content?: string;
  url?: string;
  score?: number;
}
