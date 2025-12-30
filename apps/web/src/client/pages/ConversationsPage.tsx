import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, Loading } from '../components/atoms';
import { useConversations, useCreateConversation, useDeleteConversation } from '../hooks/useConversations';
import { useDomain } from '../hooks/useDomains';
import type { Conversation } from '../types';

function ConversationCard({
  conversation,
  domainId,
  onDelete,
}: {
  conversation: Conversation;
  domainId: string;
  onDelete: (id: string) => void;
}) {
  return (
    <Card hover className="h-full">
      <Link to={`/domains/${domainId}/chat/${conversation.id}`} className="block">
        <CardContent>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {conversation.title || '新对话'}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                conversation.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {conversation.status === 'active' ? '进行中' : '已归档'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            <p>
              创建于{' '}
              {new Date(conversation.createdAt).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </CardContent>
      </Link>
      <div className="px-4 pb-4 flex justify-end">
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            if (confirm('确定要删除这个对话吗？')) {
              onDelete(conversation.id);
            }
          }}
        >
          删除
        </Button>
      </div>
    </Card>
  );
}

export default function ConversationsPage() {
  const { id: domainId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: domain, isLoading: isDomainLoading } = useDomain(domainId);
  const { data: conversations, isLoading: isConversationsLoading } = useConversations(domainId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  const isLoading = isDomainLoading || isConversationsLoading;

  const handleCreateConversation = async () => {
    if (!domainId) return;

    try {
      const conversation = await createConversation.mutateAsync({
        domainId,
        title: '新对话',
      });
      navigate(`/domains/${domainId}/chat/${conversation.id}`);
    } catch (error) {
      console.error('创建对话失败:', error);
    }
  };

  const handleDeleteConversation = (id: string) => {
    if (!domainId) return;
    deleteConversation.mutate({ id, domainId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading text="加载中..." />
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">领域不存在</p>
          <Link to="/domains">
            <Button>返回列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/domains/${domainId}`}
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
          返回 {domain.name}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">对话列表</h1>
          <p className="text-gray-600 mt-1">{domain.name} 的所有对话</p>
        </div>
        <Button onClick={handleCreateConversation} isLoading={createConversation.isPending}>
          新建对话
        </Button>
      </div>

      {!conversations || conversations.length === 0 ? (
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有对话</h3>
          <p className="text-gray-600 mb-4">开始一个新对话与 AI 助手交流</p>
          <Button onClick={handleCreateConversation} isLoading={createConversation.isPending}>
            新建对话
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              domainId={domainId!}
              onDelete={handleDeleteConversation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
