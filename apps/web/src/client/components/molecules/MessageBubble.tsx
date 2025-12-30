import type { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-[80%] rounded-lg px-4 py-3
          ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }
        `}
      >
        {/* 消息内容 */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>

        {/* 来源引用 */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">参考来源:</p>
            <div className="space-y-2">
              {message.sources.map((source, index) => (
                <div
                  key={index}
                  className="text-xs bg-white bg-opacity-50 rounded p-2"
                >
                  <p className="font-medium text-gray-700">
                    {source.documentName}
                  </p>
                  <p className="text-gray-600 line-clamp-2 mt-1">
                    {source.content}
                  </p>
                  <p className="text-gray-400 mt-1">
                    相关度: {(source.relevanceScore * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 时间戳 */}
        <div
          className={`text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}
        >
          {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
