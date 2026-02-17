import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, notificationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../utils/permissions';
import { formatDistanceToNow } from 'date-fns';
import { 
  Search, 
  Plus, 
  Bell, 
  FolderPlus, 
  CheckSquare, 
  Users, 
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { canCreateProject, canCreateTask, isTeamLead } = useUserRole();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const createMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Sync search input with URL when on search page
  useEffect(() => {
    if (location.pathname === '/search') {
      const q = searchParams.get('q') || searchParams.get('search') || '';
      setSearchQuery(q);
    }
  }, [location.pathname, searchParams]);

  // Close dropdowns when clicking outside (use 'click' so menu item clicks fire before close)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setShowCreateMenu(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Helper to check if a string is a UUID
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = (): { label: string; path: string; isProjectId?: boolean }[] => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; path: string; isProjectId?: boolean }[] = [{ label: 'Home', path: '/' }];

    if (paths.length === 0) return breadcrumbs;

    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // Check if this is a UUID and the previous path segment indicates what it is
      if (isUUID(path) && index > 0) {
        const parentPath = paths[index - 1];
        if (parentPath === 'projects') {
          // This is a project ID - we'll fetch the name below
          breadcrumbs.push({ label: path, path: currentPath, isProjectId: true });
        } else {
          // For other UUIDs, just show a truncated version
          breadcrumbs.push({ label: path.substring(0, 8) + '...', path: currentPath });
        }
      } else {
        const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
        breadcrumbs.push({ label, path: currentPath });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  
  // Find the project ID in breadcrumbs if it exists
  const projectBreadcrumb = breadcrumbs.find((crumb: any) => crumb.isProjectId);
  const projectId = projectBreadcrumb ? projectBreadcrumb.path.split('/').pop() : null;
  
  // Fetch project name if we're on a project detail page
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsAPI.get(projectId!),
    enabled: !!projectId,
  });
  
  // Update breadcrumb label with project name if available
  const breadcrumbsWithNames = breadcrumbs.map((crumb: any) => {
    if (crumb.isProjectId && project) {
      return { ...crumb, label: project.name };
    }
    return crumb;
  });

  const handleCreate = (type: string) => {
    setShowCreateMenu(false);
    switch (type) {
      case 'project':
        navigate('/projects/new');
        break;
      case 'task':
        navigate('/tasks/new');
        break;
      case 'team':
        navigate('/teams?create=true');
        break;
      default:
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Fetch real notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list({ limit: 20 }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsAPI.getUnreadCount(),
    refetchInterval: 30000,
  });

  const unreadCount = unreadCountData?.count || 0;

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Navigate to reference if available
    if (notification.reference_id && notification.reference_type) {
      if (notification.reference_type === 'task') {
        navigate(`/tasks?task=${notification.reference_id}`);
      } else if (notification.reference_type === 'project') {
        navigate(`/projects/${notification.reference_id}`);
      }
      setShowNotifications(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
      <div className="h-16 flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 w-full min-w-0 overflow-hidden">
        {/* Breadcrumbs - left aligned */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
          {breadcrumbsWithNames.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center min-w-0">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-1 flex-shrink-0" aria-hidden />}
              <Link
                to={crumb.path}
                title={crumb.label}
                className={`text-sm transition-colors inline-flex items-center ${
                  index === breadcrumbsWithNames.length - 1
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                } ${
                  index === breadcrumbsWithNames.length - 1
                    ? 'break-all'
                    : 'truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px]'
                }`}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Search Bar - centered when space allows */}
        <div className="hidden lg:block flex-shrink-0 w-full max-w-md mx-2">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search issues, projects, or people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 px-4 pl-10 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </form>
        </div>

        {/* Actions - right aligned, vertically centered */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 flex-shrink-0">
        {/* Create Button - Only show if user has permissions */}
        {(canCreateProject || canCreateTask) && (
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="btn-primary h-9 px-4 text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                {canCreateProject && (
                  <button
                    onClick={() => handleCreate('project')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>New Project</span>
                  </button>
                )}
                {canCreateTask && (
                  <button
                    onClick={() => handleCreate('task')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>New Task</span>
                  </button>
                )}
                {canCreateProject && !isTeamLead && (
                  <button
                    onClick={() => handleCreate('team')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>New Team</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
            {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                        {unreadCount} new
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsReadMutation.mutate()}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto scrollbar-modern">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-primary-500 dark:bg-primary-400 rounded-full mt-1 flex-shrink-0"></span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-400 overflow-hidden transition-all"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={`${user.first_name} ${user.last_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{user?.first_name?.[0] || user?.email?.[0] || 'U'}</span>
            )}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <SettingsIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                Settings
              </Link>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                Profile
              </Link>
              <div className="border-t border-gray-200 dark:border-gray-700 mt-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
