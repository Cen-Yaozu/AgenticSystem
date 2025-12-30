import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, WebSocketStatus } from '../types';

interface AgentXEvent {
  type: string;
  sessionId?: string;
  data?: unknown;
}

interface UseAgentXWebSocketOptions {
  sessionId: string;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  autoConnect?: boolean;
}

interface UseAgentXWebSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  status: WebSocketStatus;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
}

const WS_URL = `ws://${window.location.hostname}:3001/ws`;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second

export function useAgentXWebSocket({
  sessionId,
  onMessage,
  onError,
  autoConnect = true,
}: UseAgentXWebSocketOptions): UseAgentXWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
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
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;

        // 订阅 session 事件
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            sessionId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data: AgentXEvent = JSON.parse(event.data);

          // 只处理当前 session 的事件
          if (data.sessionId && data.sessionId !== sessionId) {
            return;
          }

          switch (data.type) {
            case 'message_start': {
              // 开始新消息
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

            case 'content_delta': {
              // 追加内容
              const delta = (data.data as { delta?: string })?.delta || '';
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

            case 'message_complete': {
              // 消息完成
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
              break;
            }

            case 'error': {
              const errorData = data.data as { message?: string };
              const error = new Error(errorData?.message || 'Unknown error');
              onError?.(error);
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
  }, [sessionId, onMessage, onError]);

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
          sessionId,
          content,
        })
      );
    }
  }, [sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    currentMessageRef.current = null;
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, sessionId, connect, disconnect]);

  return {
    messages,
    isConnected: status === 'connected',
    status,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
  };
}

export default useAgentXWebSocket;
