import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Content } from '../types';
import { useAuth } from '../hooks/useAuthContext';

export function Dashboard() {
  const { isAuthenticated } = useAuth();

  // Fetch statistics - only when authenticated
  const { data: contentList } = useQuery({
    queryKey: ['content', 'all'],
    queryFn: () => api.listContent({ limit: 100 }),
    enabled: isAuthenticated,
  });

  const { data: mediaList } = useQuery({
    queryKey: ['media', 'all'],
    queryFn: () => api.listMedia({ limit: 100 }),
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.listUsers(),
    enabled: isAuthenticated,
  });

  // Fetch recent content
  const { data: recentContent } = useQuery({
    queryKey: ['content', 'recent'],
    queryFn: () => api.listContent({ limit: 5 }),
    enabled: isAuthenticated,
  });

  const stats = [
    {
      label: 'Total Content',
      value: contentList?.items.length || 0,
      icon: '📝',
      color: 'bg-blue-500',
    },
    {
      label: 'Media Files',
      value: mediaList?.items.length || 0,
      icon: '🖼️',
      color: 'bg-green-500',
    },
    {
      label: 'Users',
      value: users?.length || 0,
      icon: '👥',
      color: 'bg-purple-500',
    },
    {
      label: 'Published',
      value: contentList?.items.filter((c: Content) => c.status === 'published').length || 0,
      icon: '✅',
      color: 'bg-yellow-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-3">
          <Link to="/content/new" className="btn-primary">
            New Content
          </Link>
          <Link to="/media" className="btn-secondary">
            Upload Media
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Content</h2>
        {recentContent?.items.length ? (
          <div className="space-y-3">
            {recentContent.items.map((content: Content) => (
              <div
                key={content.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex-1">
                  <Link
                    to={`/content/${content.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {content.title}
                  </Link>
                  <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                    <span className="capitalize">{content.type}</span>
                    <span>•</span>
                    <span className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${content.status === 'published' ? 'bg-green-100 text-green-800' : ''}
                      ${content.status === 'draft' ? 'bg-gray-100 text-gray-800' : ''}
                      ${content.status === 'archived' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {content.status}
                    </span>
                    <span>•</span>
                    <span>{new Date(content.updated_at * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <Link
                  to={`/content/edit/${content.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No content yet. Create your first post!</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/content/new" className="card hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-semibold text-gray-900 mb-1">Create Content</h3>
            <p className="text-sm text-gray-600">Write a new post or page</p>
          </div>
        </Link>

        <Link to="/media" className="card hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="text-4xl mb-3">🖼️</div>
            <h3 className="font-semibold text-gray-900 mb-1">Upload Media</h3>
            <p className="text-sm text-gray-600">Add images and files</p>
          </div>
        </Link>

        <Link to="/settings" className="card hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
            <p className="text-sm text-gray-600">Configure your site</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
