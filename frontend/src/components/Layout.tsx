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

  // Admin: only /employees allowed; redirect "/" or any other path to /employees
  if (isAdmin && location.pathname !== '/employees') {
    return <Navigate to="/employees" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar onExpandedChange={setIsSidebarExpanded} />
      <div className="transition-all duration-300" style={{ marginLeft: sidebarLeft }}>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
