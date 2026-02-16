import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/Layout/AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { ContentList } from './pages/ContentList';
import { ContentEditor } from './pages/ContentEditor';
import { MediaLibrary } from './pages/MediaLibrary';
import { Settings } from './pages/Settings';
import { Plugins } from './pages/Plugins';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/content" element={<ContentList />} />
              <Route path="/content/new" element={<ContentEditor />} />
              <Route path="/content/edit/:id" element={<ContentEditor />} />
              <Route path="/media" element={<MediaLibrary />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
