/**
 * 文档列表页面
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Loading from '../components/atoms/Loading';
import DocumentUpload from '../components/organisms/DocumentUpload';
import { useDeleteDocument, useDocuments, useDocumentStats, useDownloadDocument, useReprocessDocument } from '../hooks/useDocuments';
import { useDomain } from '../hooks/useDomains';
import type { Document, DocumentStatus } from '../types';

// 状态标签颜色映射
const STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string }> = {
  uploading: { bg: 'bg-blue-100', text: 'text-blue-800' },
  queued: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
};

// 状态标签文本映射
const STATUS_TEXT: Record<DocumentStatus, string> = {
  uploading: '上传中',
  queued: '排队中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

// 文件类型图标
const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  xlsx: '📊',
  txt: '📃',
  md: '📋',
};

export default function DocumentsPage() {
  const { id: domainId } = useParams<{ id: string }>();
  const [showUpload, setShowUpload] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: domain, isLoading: domainLoading } = useDomain(domainId || '');
  const { data: documentsData, isLoading: documentsLoading, refetch } = useDocuments(
    domainId || '',
    { page, pageSize, status: statusFilter || undefined }
  );
  const { data: stats } = useDocumentStats(domainId || '');

  const deleteMutation = useDeleteDocument(domainId || '');
  const reprocessMutation = useReprocessDocument(domainId || '');
  const downloadMutation = useDownloadDocument(domainId || '');

  if (!domainId) {
    return <div className="text-center py-8 text-gray-500">无效的领域 ID</div>;
  }

  if (domainLoading) {
    return <Loading text="加载领域信息..." />;
  }

  if (!domain) {
    return <div className="text-center py-8 text-gray-500">领域不存在</div>;
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`确定要删除文档 "${doc.filename}" 吗？此操作不可恢复。`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(doc.id);
    } catch (error) {
      console.error('删除文档失败:', error);
      alert('删除文档失败');
    }
  };

  const handleReprocess = async (doc: Document) => {
    try {
      await reprocessMutation.mutateAsync(doc.id);
    } catch (error) {
      console.error('重新处理文档失败:', error);
      alert('重新处理文档失败');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await downloadMutation.mutateAsync({ documentId: doc.id, filename: doc.filename });
    } catch (error) {
      console.error('下载文档失败:', error);
      alert('下载文档失败');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const documents = documentsData?.data || [];
  const meta = documentsData?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <nav className="text-sm text-gray-500">
        <Link to="/domains" className="hover:text-gray-700">领域</Link>
        <span className="mx-2">/</span>
        <Link to={`/domains/${domainId}`} className="hover:text-gray-700">{domain.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">文档</span>
      </nav>

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">文档管理</h1>
          <p className="text-gray-500 mt-1">管理 {domain.name} 的知识库文档</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? '取消上传' : '上传文档'}
        </Button>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">总文档数</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">已完成</div>
            <div className="text-2xl font-bold text-green-600">{stats.byStatus.completed}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">处理中</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.byStatus.processing + stats.byStatus.queued}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">总分块数</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalChunks}</div>
          </Card>
        </div>
      )}

      {/* 上传区域 */}
      {showUpload && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">上传新文档</h2>
          <DocumentUpload
            domainId={domainId}
            onSuccess={() => {
              setShowUpload(false);
              refetch();
            }}
            onError={(error) => {
              alert(error.message);
            }}
          />
        </Card>
      )}

      {/* 筛选器 */}
      <div className="flex items-center space-x-4">
        <label className="text-sm text-gray-600">状态筛选：</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as DocumentStatus | '');
            setPage(1);
          }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部</option>
          <option value="completed">已完成</option>
          <option value="processing">处理中</option>
          <option value="queued">排队中</option>
          <option value="failed">失败</option>
        </select>
      </div>

      {/* 文档列表 */}
      {documentsLoading ? (
        <Loading text="加载文档列表..." />
      ) : documents.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-400 text-5xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文档</h3>
          <p className="text-gray-500 mb-4">上传文档以构建知识库</p>
          <Button onClick={() => setShowUpload(true)}>上传第一个文档</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* 文件图标 */}
                  <div className="text-3xl">
                    {FILE_TYPE_ICONS[doc.fileType] || '📄'}
                  </div>

                  {/* 文件信息 */}
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{doc.fileType.toUpperCase()}</span>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </div>

                    {/* 状态和进度 */}
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status].bg} ${STATUS_COLORS[doc.status].text}`}>
                        {STATUS_TEXT[doc.status]}
                      </span>

                      {doc.status === 'processing' && (
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full"
                              style={{ width: `${doc.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{doc.progress}%</span>
                        </div>
                      )}

                      {doc.status === 'completed' && doc.chunkCount > 0 && (
                        <span className="text-xs text-gray-500">
                          {doc.chunkCount} 个分块
                        </span>
                      )}

                      {doc.status === 'failed' && doc.errorMessage && (
                        <span className="text-xs text-red-500" title={doc.errorMessage}>
                          {doc.errorMessage.substring(0, 50)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadMutation.isPending}
                  >
                    下载
                  </Button>

                  {(doc.status === 'failed' || doc.status === 'completed') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleReprocess(doc)}
                      disabled={reprocessMutation.isPending}
                    >
                      重新处理
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(doc)}
                    disabled={deleteMutation.isPending}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
