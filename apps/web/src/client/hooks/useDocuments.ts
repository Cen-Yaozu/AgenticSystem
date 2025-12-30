/**
 * 文档相关 hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Document, DocumentStatus } from '../types';
import { del, downloadFile, get, getPaginated, post, uploadFile } from '../utils/api';

// 文档统计信息类型
interface DocumentStats {
  total: number;
  byStatus: Record<DocumentStatus, number>;
  totalSize: number;
  totalChunks: number;
}

/**
 * 获取领域的文档列表
 */
export function useDocuments(domainId: string, params?: { page?: number; pageSize?: number; status?: DocumentStatus }) {
  return useQuery({
    queryKey: ['documents', domainId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      if (params?.status) searchParams.set('status', params.status);

      const queryString = searchParams.toString();
      const endpoint = `/domains/${domainId}/documents${queryString ? `?${queryString}` : ''}`;

      // 不传递 params 给 getPaginated，因为已经在 endpoint 中添加了查询参数
      const response = await getPaginated<Document>(endpoint);
      return {
        data: response.data,
        meta: response.meta,
      };
    },
    enabled: !!domainId,
  });
}

/**
 * 获取单个文档详情
 */
export function useDocument(domainId: string, documentId: string) {
  return useQuery({
    queryKey: ['document', domainId, documentId],
    queryFn: () => get<Document>(`/domains/${domainId}/documents/${documentId}`),
    enabled: !!domainId && !!documentId,
  });
}

/**
 * 获取文档统计信息
 */
export function useDocumentStats(domainId: string) {
  return useQuery({
    queryKey: ['documentStats', domainId],
    queryFn: () => get<DocumentStats>(`/domains/${domainId}/documents/stats`),
    enabled: !!domainId,
  });
}

/**
 * 上传文档
 */
export function useUploadDocument(domainId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) => {
      return uploadFile<Document>(`/domains/${domainId}/documents`, file, onProgress);
    },
    onSuccess: () => {
      // 刷新文档列表和统计
      queryClient.invalidateQueries({ queryKey: ['documents', domainId] });
      queryClient.invalidateQueries({ queryKey: ['documentStats', domainId] });
    },
  });
}

/**
 * 删除文档
 */
export function useDeleteDocument(domainId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => del<void>(`/domains/${domainId}/documents/${documentId}`),
    onSuccess: () => {
      // 刷新文档列表和统计
      queryClient.invalidateQueries({ queryKey: ['documents', domainId] });
      queryClient.invalidateQueries({ queryKey: ['documentStats', domainId] });
    },
  });
}

/**
 * 重新处理文档
 */
export function useReprocessDocument(domainId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => post<Document>(`/domains/${domainId}/documents/${documentId}/reprocess`),
    onSuccess: (_, documentId) => {
      // 刷新文档详情和列表
      queryClient.invalidateQueries({ queryKey: ['document', domainId, documentId] });
      queryClient.invalidateQueries({ queryKey: ['documents', domainId] });
      queryClient.invalidateQueries({ queryKey: ['documentStats', domainId] });
    },
  });
}

/**
 * 下载文档
 */
export function useDownloadDocument(domainId: string) {
  return useMutation({
    mutationFn: ({ documentId, filename }: { documentId: string; filename: string }) =>
      downloadFile(`/domains/${domainId}/documents/${documentId}/download`, filename),
  });
}
