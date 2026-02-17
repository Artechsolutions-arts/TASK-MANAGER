import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useState } from 'react';
import { useUserRole } from '../utils/permissions';

export default function Layout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const sidebarLeft = isSidebarExpanded ? '16rem' : '5rem'; // w-64 vs w-20
  const location = useLocation();
  const { isAdmin } = useUserRole();

  // Admin: allow /employees and /settings (profile); redirect other paths to /employees
  const adminAllowedPaths = ['/employees', '/settings'];
  const isAllowedForAdmin = adminAllowedPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
  if (isAdmin && !isAllowedForAdmin) {
    return <Navigate to="/employees" replace />;
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
      <Sidebar onExpandedChange={setIsSidebarExpanded} />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300 overflow-hidden" style={{ marginLeft: sidebarLeft }}>
        <Header />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
