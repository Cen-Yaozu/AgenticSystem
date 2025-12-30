import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDomainInput, Domain, UpdateDomainInput } from '../types';
import { del, get, patch, post } from '../utils/api';

// Query Keys
export const domainKeys = {
  all: ['domains'] as const,
  lists: () => [...domainKeys.all, 'list'] as const,
  list: (filters: string) => [...domainKeys.lists(), { filters }] as const,
  details: () => [...domainKeys.all, 'detail'] as const,
  detail: (id: string) => [...domainKeys.details(), id] as const,
};

/**
 * 获取领域列表
 */
export function useDomains() {
  return useQuery({
    queryKey: domainKeys.lists(),
    queryFn: () => get<Domain[]>('/domains'),
  });
}

/**
 * 获取单个领域详情
 */
export function useDomain(id: string | undefined) {
  return useQuery({
    queryKey: domainKeys.detail(id!),
    queryFn: () => get<Domain>(`/domains/${id}`),
    enabled: !!id,
  });
}

/**
 * 创建领域
 */
export function useCreateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDomainInput) => post<Domain>('/domains', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
    },
  });
}

/**
 * 更新领域
 */
export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDomainInput }) =>
      patch<Domain>(`/domains/${id}`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
      queryClient.setQueryData(domainKeys.detail(data.id), data);
    },
  });
}

/**
 * 删除领域
 */
export function useDeleteDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del<void>(`/domains/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
      queryClient.removeQueries({ queryKey: domainKeys.detail(id) });
    },
  });
}
