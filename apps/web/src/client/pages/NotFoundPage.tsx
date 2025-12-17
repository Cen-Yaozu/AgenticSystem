import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        页面未找到
      </h1>
      <p className="text-gray-600 mb-8">
        抱歉，您访问的页面不存在
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}

export default NotFoundPage;