import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, WebSocketStatus } from '../types';
import type { MessageState } from '../types/agentx';

interface AgentXEvent {
  type: string;
  imageId?: string;
  data?: unknown;
  context?: {
    imageId?: string;
    agentId?: string;
    containerId?: string;
    sessionId?: string;
  };
}

interface UseAgentXWebSocketOptions {
  /** AgentX Image ID (img_xxx) - 用于过滤事件 */
  imageId: string;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

interface UseAgentXWebSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  status: WebSocketStatus;
  messageState: MessageState;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  interruptMessage: () => void;
}

// 自动发现 WebSocket URL：
// - 开发环境：通过 Vite 代理 (ws://localhost:5173/ws -> ws://localhost:3000/ws)
// - 生产环境：直接连接到同一服务器 (ws://host:port/ws)
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second

export function useAgentXWebSocket({
  imageId,
  onMessage,
  onError,
  autoConnect = true,
}: UseAgentXWebSocketOptions): UseAgentXWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [messageState, setMessageState] = useState<MessageState>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;

        // 订阅 image 事件
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            imageId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data: AgentXEvent = JSON.parse(event.data);

          // 只处理当前 image 的事件（通过 context.imageId 过滤）
          const eventImageId = data.context?.imageId || data.imageId;
          if (eventImageId && eventImageId !== imageId) {
            return;
          }

          switch (data.type) {
            // 兼容原有事件格式
            case 'message_start':
            // 兼容 AgentX 事件格式
            case 'conversation_start': {
              // 如果已经有一个正在流式传输的消息，忽略这个事件
              if (currentMessageRef.current && currentMessageRef.current.isStreaming) {
                break;
              }
              // 开始新消息
              setMessageState('streaming');
              const newMessage: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: '',
                isStreaming: true,
                createdAt: new Date().toISOString(),
              };
              currentMessageRef.current = newMessage;
              setMessages((prev) => [...prev, newMessage]);
              break;
            }

            // 思考中状态
            case 'thinking_start': {
              setMessageState('thinking');
              break;
            }

            // 兼容原有事件格式
            case 'content_delta':
            // 兼容 AgentX 事件格式
            case 'text_delta': {
              // 追加内容
              const eventData = data.data as { delta?: string; text?: string };
              const delta = eventData?.delta || eventData?.text || '';
              if (currentMessageRef.current) {
                currentMessageRef.current.content += delta;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageRef.current?.id
                      ? { ...msg, content: currentMessageRef.current.content }
                      : msg
                  )
                );
              }
              break;
            }

            case 'source_reference': {
              // 添加来源引用
              const sources = (data.data as { sources?: ChatMessage['sources'] })?.sources;
              if (currentMessageRef.current && sources) {
                currentMessageRef.current.sources = sources;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageRef.current?.id
                      ? { ...msg, sources }
                      : msg
                  )
                );
              }
              break;
            }

            // 兼容原有事件格式
            case 'message_complete':
            // 兼容 AgentX 事件格式
            case 'conversation_end':
            case 'message_stop': {
              // 消息完成
              setMessageState('completed');
              if (currentMessageRef.current) {
                const completedMessage = {
                  ...currentMessageRef.current,
                  isStreaming: false,
                };
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageRef.current?.id ? completedMessage : msg
                  )
                );
                onMessage?.(completedMessage);
                currentMessageRef.current = null;
              }
              // 重置状态
              setTimeout(() => setMessageState('idle'), 100);
              break;
            }

            // 消息中断
            case 'message_interrupted': {
              setMessageState('completed');
              if (currentMessageRef.current) {
                const interruptedMessage = {
                  ...currentMessageRef.current,
                  isStreaming: false,
                };
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageRef.current?.id ? interruptedMessage : msg
                  )
                );
                currentMessageRef.current = null;
              }
              setTimeout(() => setMessageState('idle'), 100);
              break;
            }

            case 'error': {
              setMessageState('error');
              const errorData = data.data as { message?: string };
              const error = new Error(errorData?.message || 'Unknown error');
              onError?.(error);
              setTimeout(() => setMessageState('idle'), 3000);
              break;
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        onError?.(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;

        // 尝试重连
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay =
            RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (e) {
      setStatus('error');
      onError?.(e as Error);
    }
  }, [imageId, onMessage, onError]);

  const sendMessage = useCallback((content: string) => {
    // 添加用户消息到列表
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 通过 WebSocket 发送（如果需要）
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          imageId,
          content,
        })
      );
    }
  }, [imageId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    currentMessageRef.current = null;
    setMessageState('idle');
  }, []);

  const interruptMessage = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'interrupt',
          imageId,
        })
      );
    }
  }, [imageId]);

  // 自动连接
  useEffect(() => {
    if (autoConnect && imageId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, imageId, connect, disconnect]);

  return {
    messages,
    isConnected: status === 'connected',
    status,
    messageState,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    interruptMessage,
  };
}

export default useAgentXWebSocket;
