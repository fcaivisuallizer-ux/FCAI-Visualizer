import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="app-main">
        <Header
          onToggleSidebar={toggleSidebar}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
