import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tasksAPI, projectsAPI, usersAPI } from '../services/api';
import { Search, CheckSquare, FolderKanban, User } from 'lucide-react';
import { format } from 'date-fns';
import { parseISO } from 'date-fns';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || searchParams.get('search') || '').trim().toLowerCase();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'search'],
    queryFn: () => tasksAPI.list({}),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', 'search'],
    queryFn: () => projectsAPI.list({}),
  });

  const { data: usersList = [] } = useQuery({
    queryKey: ['users', 'search'],
    queryFn: () => usersAPI.list(),
  });

  const matchingTasks = q
    ? (Array.isArray(tasks) ? tasks : []).filter(
        (t: any) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
    : [];
  const matchingProjects = q
    ? (Array.isArray(projects) ? projects : []).filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    : [];
  const matchingPeople = q
    ? (Array.isArray(usersList) ? usersList : []).filter(
        (u: any) =>
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      )
    : [];

  const hasResults = matchingTasks.length > 0 || matchingProjects.length > 0 || matchingPeople.length > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Search</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {q ? `Results for "${searchParams.get('q') || searchParams.get('search')}"` : 'Enter a query to search tasks, projects, and people'}
        </p>
      </div>

      {!q && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Use the search bar above to find tasks, projects, or people.</p>
        </div>
      )}

      {q && !hasResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No results found for "{searchParams.get('q') || searchParams.get('search')}"</p>
        </div>
      )}

      {q && hasResults && (
        <div className="space-y-6">
          {matchingProjects.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Projects</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">({matchingProjects.length})</span>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {matchingProjects.map((project: any) => (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{project.description}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {matchingTasks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tasks</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">({matchingTasks.length})</span>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {matchingTasks.map((task: any) => (
                  <li key={task.id}>
                    <Link
                      to={`/tasks?task=${task.id}`}
                      className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                      {task.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {matchingPeople.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">People</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">({matchingPeople.length})</span>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {matchingPeople.map((u: any) => (
                  <li key={u.id}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                        {u.first_name?.[0] || u.email?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
