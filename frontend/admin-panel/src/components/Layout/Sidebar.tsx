import { NavLink } from 'react-router-dom';

export function Sidebar() {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/content', label: 'Content', icon: '📝' },
    { to: '/media', label: 'Media', icon: '🖼️' },
    { to: '/users', label: 'Users', icon: '👥' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
    { to: '/plugins', label: 'Plugins', icon: '🔌' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold">CMS Admin</h1>
      </div>
      
      <nav className="mt-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
                isActive ? 'bg-gray-800 text-white border-l-4 border-blue-500' : ''
              }`
            }
          >
            <span className="mr-3 text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
