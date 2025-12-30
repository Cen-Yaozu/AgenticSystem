import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Loading } from '../components/atoms';
import { useDeleteDomain, useDomains } from '../hooks/useDomains';
import type { Domain } from '../types';

function DomainCard({ domain, onDelete }: { domain: Domain; onDelete: (id: string) => void }) {
  const statusColors: Record<string, string> = {
    ready: 'bg-green-100 text-green-800',
    initializing: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <Card hover className="h-full">
      <Link to={`/domains/${domain.id}`} className="block">
        <CardContent>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {domain.name}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[domain.status] || 'bg-gray-100 text-gray-800'}`}
            >
              {domain.status}
            </span>
          </div>
          {domain.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {domain.description}
            </p>
          )}
          {domain.expertise && (
            <p className="text-xs text-gray-500 mb-3">
              专业领域: {domain.expertise}
            </p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{domain.documentCount} 文档</span>
            <span>{domain.conversationCount} 对话</span>
          </div>
        </CardContent>
      </Link>
      <div className="px-4 pb-4 flex justify-end gap-2">
        <Link to={`/domains/${domain.id}/chat`}>
          <Button variant="secondary" size="sm">
            对话
          </Button>
        </Link>
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            if (confirm('确定要删除这个领域吗？')) {
              onDelete(domain.id);
            }
          }}
        >
          删除
        </Button>
      </div>
    </Card>
  );
}

export default function DomainsPage() {
  const { data: domains, isLoading, error } = useDomains();
  const deleteDomain = useDeleteDomain();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading text="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">加载失败: {(error as Error).message}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的领域</h1>
          <p className="text-gray-600 mt-1">管理你的知识领域和 AI 助手</p>
        </div>
        <Link to="/domains/new">
          <Button>创建领域</Button>
        </Link>
      </div>

      {!domains || domains.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有领域</h3>
          <p className="text-gray-600 mb-4">创建你的第一个知识领域开始使用</p>
          <Link to="/domains/new">
            <Button>创建领域</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              onDelete={(id) => deleteDomain.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
