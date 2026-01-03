/**
 * AgentX 消息列表组件
 * 使用 @agentxjs/ui 的 MarkdownText 组件渲染消息
 */

import { MarkdownText } from '@agentxjs/ui';
import { useEffect, useMemo, useRef } from 'react';
import type { ChatMessage } from '../../types';
import type { MessageState } from '../../types/agentx';
import { isAssistantConversation, isUserConversation, messagesToConversations } from '../../utils/conversationAdapter';

interface AgentXMessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  messageState?: MessageState;
}

/**
 * 用户消息组件
 */
function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

/**
 * 助手消息组件
 */
function AssistantMessage({
  content,
  isStreaming
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="prose prose-sm max-w-none">
          <MarkdownText>{content}</MarkdownText>
        </div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}

/**
 * 思考中指示器
 */
function ThinkingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm">思考中...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * AgentX 消息列表组件
 */
export function AgentXMessageList({
  messages,
  isLoading = false,
  messageState = 'idle',
}: AgentXMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 转换消息为 ConversationData 格式
  const conversations = useMemo(() => {
    return messagesToConversations(messages);
  }, [messages]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isLoading]);

  // 显示思考中状态
  const showThinking = isLoading && messageState === 'thinking';

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {conversations.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>开始对话吧！</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            if (isUserConversation(conv)) {
              return (
                <UserMessage
                  key={conv.id}
                  content={conv.content}
                />
              );
            }

            if (isAssistantConversation(conv)) {
              // 获取第一个文本块的内容
              const textBlock = conv.blocks.find(b => b.type === 'text');
              const content = textBlock?.content || '';
              const isStreaming = conv.status === 'streaming';

              // 跳过空内容的非流式消息（已完成但没有内容的消息）
              // 对于流式消息，即使内容为空也显示（显示光标）
              if (!content && !isStreaming) {
                return null;
              }

              return (
                <AssistantMessage
                  key={conv.id}
                  content={content}
                  isStreaming={isStreaming}
                />
              );
            }

            return null;
          })}

          {showThinking && <ThinkingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

export default AgentXMessageList;
