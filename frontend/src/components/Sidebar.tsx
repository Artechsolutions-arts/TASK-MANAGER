import { Link, useLocation } from 'react-router-dom';
import { useUserRole } from '../utils/permissions';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  ClipboardList, 
  Package, 
  BarChart3, 
  Users,
  Settings,
  Calendar,
  Rocket,
  FileText,
  UserPlus
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import AppotimeLogo from './AppotimeLogo';

interface NavItem {
  icon: ReactNode;
  label: string;
  path: string;
}

const getNavItems = (opts: { isMember: boolean; canSeeTeams: boolean; isCEO: boolean; isAdmin: boolean }): NavItem[] => {
  // Admin sees only: Create Employee (Sign up), Password Reset, Delete Employee — one page
  if (opts.isAdmin) {
    return [
      { icon: <UserPlus className="w-5 h-5" />, label: 'Employees', path: '/employees' },
    ];
  }

  const baseItems: NavItem[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/' },
    { icon: <FolderKanban className="w-5 h-5" />, label: 'Projects', path: '/projects' },
  ];
  
  // For Members, show "Tasks" instead of "Board"
  if (opts.isMember) {
    baseItems.push({ icon: <CheckSquare className="w-5 h-5" />, label: 'Tasks', path: '/tasks' });
  } else {
    baseItems.push({ icon: <ClipboardList className="w-5 h-5" />, label: 'Board', path: '/board' });
  }

  if (opts.canSeeTeams) {
    baseItems.push({ icon: <Users className="w-5 h-5" />, label: 'Teams', path: '/teams' });
  }
  
  baseItems.push(
    { icon: <Calendar className="w-5 h-5" />, label: 'Calendar', path: '/calendar' },
    { icon: <FileText className="w-5 h-5" />, label: 'Work Sheet', path: '/work-sheet' },
    { icon: <Rocket className="w-5 h-5" />, label: 'Sprints', path: '/sprints' },
    { icon: <Package className="w-5 h-5" />, label: 'Backlog', path: '/backlog' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Reports', path: '/reports' }
  );
  
  // Add Sign Up link for CEO only (Admin uses /employees)
  if (opts.isCEO) {
    baseItems.push({ icon: <UserPlus className="w-5 h-5" />, label: 'Create User', path: '/signup' });
  }
  
  baseItems.push(
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' }
  );
  
  return baseItems;
};

export default function Sidebar({ onExpandedChange }: { onExpandedChange?: (expanded: boolean) => void }) {
  const location = useLocation();
  const { isMember, isCEO, isManager, isAdmin } = useUserRole();
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = getNavItems({ isMember, canSeeTeams: isCEO || isManager, isCEO, isAdmin });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    // For Members, also highlight "Tasks" when on /tasks
    if (isMember && path === '/tasks') {
      return location.pathname === '/tasks' || location.pathname.startsWith('/tasks');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={() => {
        setIsExpanded(true);
        onExpandedChange?.(true);
      }}
      onMouseLeave={() => {
        setIsExpanded(false);
        onExpandedChange?.(false);
      }}
    >
      {/* Logo/Brand */}
      <div className={`h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <AppotimeLogo size="md" showText={isExpanded} />
      </div>

      {/* Navigation Items - consistent alignment for all tabs */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden scrollbar-modern">
        <ul className="flex flex-col gap-1 list-none p-0 m-0" role="list">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path} className="flex items-stretch">
                <Link
                  to={item.path}
                  className={`group relative flex items-center w-full min-h-[2.75rem] ${isExpanded ? 'px-3' : 'px-0 justify-center'} rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`flex items-center justify-center flex-shrink-0 w-5 h-5 ${isExpanded ? 'mr-3' : 'mr-0'}`}>{item.icon}</span>
                  {isExpanded && (
                    <span className="text-sm font-medium whitespace-nowrap align-middle">
                      {item.label}
                    </span>
                  )}
                  {!isExpanded && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200 shadow-lg">
                      {item.label}
                      <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2">
                        <div className="border-4 border-transparent border-r-gray-900 dark:border-r-gray-800"></div>
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
