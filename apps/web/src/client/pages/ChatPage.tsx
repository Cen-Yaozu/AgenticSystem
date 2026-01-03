import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Loading } from '../components/atoms';
import { AgentXMessageList } from '../components/organisms/AgentXMessageList';
import { MessageInput } from '../components/organisms/MessageInput';
import { useAgentXWebSocket } from '../hooks/useAgentXWebSocket';
import { useConversation, useMessages, useSendMessage } from '../hooks/useConversations';
import { useDomain } from '../hooks/useDomains';
import type { ChatMessage } from '../types';
import type { MessageState } from '../types/agentx';

export default function ChatPage() {
  const { id: domainId, convId } = useParams<{ id: string; convId: string }>();
  const { data: domain } = useDomain(domainId);
  const { data: conversation, isLoading: isConversationLoading } = useConversation(convId);
  const { data: historyMessages, isLoading: isMessagesLoading } = useMessages(convId);
  const sendMessageMutation = useSendMessage();

  // WebSocket 连接
  const {
    messages: wsMessages,
    isConnected,
    status,
    messageState,
    interruptMessage,
  } = useAgentXWebSocket({
    imageId: conversation?.imageId || '',
    autoConnect: !!conversation?.imageId,
  });

  // 合并历史消息和 WebSocket 消息
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (historyMessages) {
      const formattedHistory: ChatMessage[] = historyMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        sources: msg.metadata?.sources,
        createdAt: msg.createdAt,
      }));
      setAllMessages(formattedHistory);
    }
  }, [historyMessages]);

  // 当 WebSocket 收到新消息时更新
  useEffect(() => {
    if (wsMessages.length > 0) {
      // 只添加新的 WebSocket 消息
      const lastWsMessage = wsMessages[wsMessages.length - 1];
      if (!lastWsMessage) return;

      setAllMessages((prev) => {
        const exists = prev.some((m) => m.id === lastWsMessage.id);
        if (exists) {
          // 更新现有消息（流式更新）
          return prev.map((m) => (m.id === lastWsMessage.id ? lastWsMessage : m));
        }
        return [...prev, lastWsMessage];
      });
    }
  }, [wsMessages]);

  const handleSendMessage = async (content: string) => {
    if (!convId) return;

    // 添加用户消息到本地状态
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setAllMessages((prev) => [...prev, userMessage]);

    try {
      // 发送消息到后端
      await sendMessageMutation.mutateAsync({
        conversationId: convId,
        input: { content },
      });

      // WebSocket 会接收 AI 响应
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const isLoading = isConversationLoading || isMessagesLoading;
  const isStreaming = wsMessages.some((m) => m.isStreaming);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading text="加载中..." />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">对话不存在</p>
          <Link to={`/domains/${domainId}/chat`}>
            <Button>返回对话列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              to={`/domains/${domainId}/chat`}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {conversation.title || '新对话'}
              </h1>
              {domain && (
                <p className="text-sm text-gray-500">{domain.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-500">
              {status === 'connected'
                ? '已连接'
                : status === 'connecting'
                  ? '连接中...'
                  : '未连接'}
            </span>
          </div>
        </div>
      </header>

      {/* 聊天区域 */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
        <AgentXMessageList
          messages={allMessages}
          isLoading={isStreaming}
          messageState={messageState as MessageState}
        />

        {/* 输入区域 */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <MessageInput
                onSend={handleSendMessage}
                disabled={!isConnected}
                isLoading={sendMessageMutation.isPending || isStreaming}
                placeholder={isConnected ? '输入消息...' : '等待连接...'}
              />
            </div>
            {isStreaming && (
              <Button
                variant="outline"
                onClick={() => interruptMessage()}
                className="shrink-0"
              >
                停止
              </Button>
            )}
          </div>
          {messageState && messageState !== 'idle' && messageState !== 'completed' && (
            <div className="mt-2 text-sm text-gray-500">
              {messageState === 'thinking' && '思考中...'}
              {messageState === 'streaming' && '生成中...'}
              {messageState === 'error' && '发生错误'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
