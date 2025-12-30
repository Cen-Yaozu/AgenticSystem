import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import ConversationsPage from './pages/ConversationsPage';
import DocumentsPage from './pages/DocumentsPage';
import DomainCreatePage from './pages/DomainCreatePage';
import DomainDetailPage from './pages/DomainDetailPage';
import DomainsPage from './pages/DomainsPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        {/* 领域管理路由 */}
        <Route path="domains" element={<DomainsPage />} />
        <Route path="domains/new" element={<DomainCreatePage />} />
        <Route path="domains/:id" element={<DomainDetailPage />} />
        {/* 对话聊天路由 */}
        <Route path="domains/:id/chat" element={<ConversationsPage />} />
        <Route path="domains/:id/chat/:convId" element={<ChatPage />} />
        {/* 文档管理路由 */}
        <Route path="domains/:id/documents" element={<DocumentsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
