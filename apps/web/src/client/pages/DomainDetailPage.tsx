import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Loading } from '../components/atoms';
import { useDeleteDomain, useDomain, useUpdateDomain } from '../hooks/useDomains';
import type { UpdateDomainInput } from '../types';

export default function DomainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: domain, isLoading, error } = useDomain(id);
  const updateDomain = useUpdateDomain();
  const deleteDomain = useDeleteDomain();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateDomainInput>({});

  const handleEdit = () => {
    if (domain) {
      setFormData({
        name: domain.name,
        description: domain.description || '',
        expertise: domain.expertise || '',
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      await updateDomain.mutateAsync({ id, input: formData });
      setIsEditing(false);
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    if (confirm('确定要删除这个领域吗？此操作不可撤销。')) {
      try {
        await deleteDomain.mutateAsync(id);
        navigate('/domains');
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  const handleChange = (field: keyof UpdateDomainInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading text="加载中..." />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error ? `加载失败: ${(error as Error).message}` : '领域不存在'}
          </p>
          <Link to="/domains">
            <Button>返回列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    ready: 'bg-green-100 text-green-800',
    initializing: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          to="/domains"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
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
          返回列表
        </Link>
      </div>

      <div className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>基本信息</CardTitle>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[domain.status] || 'bg-gray-100 text-gray-800'}`}
              >
                {domain.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label="领域名称"
                  value={formData.name || ''}
                  onChange={handleChange('name')}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.description || ''}
                    onChange={handleChange('description')}
                  />
                </div>
                <Input
                  label="专业领域"
                  value={formData.expertise || ''}
                  onChange={handleChange('expertise')}
                />
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={handleCancel}>
                    取消
                  </Button>
                  <Button onClick={handleSave} isLoading={updateDomain.isPending}>
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{domain.name}</h2>
                  {domain.description && (
                    <p className="text-gray-600 mt-2">{domain.description}</p>
                  )}
                </div>
                {domain.expertise && (
                  <div>
                    <span className="text-sm text-gray-500">专业领域:</span>
                    <span className="ml-2 text-gray-900">{domain.expertise}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleEdit}>
                    编辑
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    isLoading={deleteDomain.isPending}
                  >
                    删除
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {domain.documentCount}
                </p>
                <p className="text-sm text-gray-600 mt-1">文档数量</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {domain.conversationCount}
                </p>
                <p className="text-sm text-gray-600 mt-1">对话数量</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-gray-900">
                  {new Date(domain.createdAt).toLocaleDateString('zh-CN')}
                </p>
                <p className="text-sm text-gray-600 mt-1">创建时间</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link to={`/domains/${domain.id}/chat`}>
                <Button>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  开始对话
                </Button>
              </Link>
              <Link to={`/domains/${domain.id}/documents`}>
                <Button variant="secondary">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  管理文档
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
