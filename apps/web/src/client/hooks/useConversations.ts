import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Conversation, CreateConversationInput, Message, SendMessageInput } from '../types';
import { del, get, post } from '../utils/api';

// Query Keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  listByDomain: (domainId: string) => [...conversationKeys.lists(), { domainId }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (id: string) => [...conversationKeys.detail(id), 'messages'] as const,
};

/**
 * 获取领域下的对话列表
 */
export function useConversations(domainId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.listByDomain(domainId!),
    queryFn: () => get<Conversation[]>(`/domains/${domainId}/conversations`),
    enabled: !!domainId,
  });
}

/**
 * 获取单个对话详情
 */
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(id!),
    queryFn: () => get<Conversation>(`/conversations/${id}`),
    enabled: !!id,
  });
}

/**
 * 获取对话消息列表
 */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId!),
    queryFn: () => get<Message[]>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

/**
 * 创建对话
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateConversationInput) =>
      post<Conversation>(`/domains/${input.domainId}/conversations`, {
        title: input.title,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.listByDomain(data.domainId),
      });
    },
  });
}

/**
 * 发送消息
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      input,
    }: {
      conversationId: string;
      input: SendMessageInput;
    }) => post<Message>(`/conversations/${conversationId}/messages`, input),
    onSuccess: (_, variables) => {
      // 消息发送后，通过 WebSocket 接收响应，这里只需要刷新消息列表
      queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(variables.conversationId),
      });
    },
  });
}

/**
 * 删除对话
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, domainId: _domainId }: { id: string; domainId: string }) =>
      del<void>(`/conversations/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.listByDomain(variables.domainId),
      });
      queryClient.removeQueries({
        queryKey: conversationKeys.detail(variables.id),
      });
    },
  });
}
