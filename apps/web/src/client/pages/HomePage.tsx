import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          欢迎使用 AgentX
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          智能助手平台 - 创建专业领域的 AI 助手，让知识触手可及
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            文档学习
          </h3>
          <p className="text-gray-600">
            上传 PDF、Word、文本等文档，助手自动学习并理解内容
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            智能问答
          </h3>
          <p className="text-gray-600">
            基于文档内容进行智能问答，回答有据可查
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl mb-4">🧠</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            持续学习
          </h3>
          <p className="text-gray-600">
            助手会记住你的偏好，提供越来越个性化的服务
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-8">
        <Link
          to="/assistants/new"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          创建你的第一个助手
          <span className="ml-2">→</span>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;