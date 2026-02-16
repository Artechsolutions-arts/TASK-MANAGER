import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksAPI } from '../services/api';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useUserRole } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import TaskStatusControls from '../components/TaskStatusControls';
import TaskReportForm from '../components/TaskReportForm';
import ActivitySection from '../components/ActivitySection';
import TaskDependencies from '../components/TaskDependencies';
import VirtualTaskList from '../components/VirtualTaskList';
import { MessageSquare, Calendar, X } from 'lucide-react';
import { parseISO, startOfDay, format } from 'date-fns';

type TaskSectionKey = 'overdue' | 'today' | 'upcoming';

const SECTIONS: { key: TaskSectionKey; label: string; order: number }[] = [
  { key: 'overdue', label: 'Overdue', order: 0 },
  { key: 'today', label: 'Today', order: 1 },
  { key: 'upcoming', label: 'Upcoming', order: 2 },
];

function getTaskSection(dueDate: string | undefined): TaskSectionKey {
  if (!dueDate) return 'upcoming';
  try {
    const date = startOfDay(parseISO(dueDate));
    if (Number.isNaN(date.getTime())) return 'upcoming';
    const today = startOfDay(new Date());
    const dayOffset = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (dayOffset < 0) return 'overdue';
    if (dayOffset === 0) return 'today';
  } catch {
    // invalid date
  }
  return 'upcoming';
}

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function TasksPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusFilter = searchParams.get('status');
  const searchQueryParam = searchParams.get('search');
  const { isMember } = useUserRole();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // If user landed here with ?search=..., send them to unified search (tasks + projects + people)
  useEffect(() => {
    if (searchQueryParam && searchQueryParam.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQueryParam.trim())}`, { replace: true });
      return;
    }
  }, [searchQueryParam, navigate]);

  const searchQuery = searchQueryParam;

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', statusFilter, searchQuery, isMember],
    queryFn: () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      return tasksAPI.list(params);
    },
  });

  // Normalize tasks to always be an array and filter by search if needed
  const tasksList = useMemo(() => {
    let list = Array.isArray(tasks) ? tasks : [];
    if (searchQuery) {
      list = list.filter((task: any) =>
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  }, [tasks, searchQuery]);

  // Open task modal when URL has ?task=id
  const taskIdFromUrl = searchParams.get('task');
  useEffect(() => {
    if (taskIdFromUrl && Array.isArray(tasks) && tasks.length > 0) {
      const found = tasks.some((t: any) => t.id === taskIdFromUrl);
      if (found) setSelectedTaskId(taskIdFromUrl);
    }
  }, [taskIdFromUrl, tasks]);

  // Group tasks into three sections: Overdue, Today, Upcoming
  const tasksBySection = useMemo(() => {
    const sectionMap = new Map<TaskSectionKey, typeof tasksList>();
    SECTIONS.forEach(({ key }) => sectionMap.set(key, []));
    tasksList.forEach((task) => {
      const section = getTaskSection(task.due_date);
      sectionMap.get(section)!.push(task);
    });
    // Sort: Overdue by most overdue first; Today/Upcoming by priority then due date
    sectionMap.forEach((tasks, section) => {
      tasks.sort((a, b) => {
        const p = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
        if (p !== 0) return p;
        if (section === 'overdue') {
          const da = a.due_date ? parseISO(a.due_date).getTime() : 0;
          const db = b.due_date ? parseISO(b.due_date).getTime() : 0;
          return da - db; // oldest overdue first
        }
        if (section === 'upcoming') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime(); // soonest first
        }
        return (a.title || '').localeCompare(b.title || '');
      });
    });
    return SECTIONS.map(({ key, label, order }) => ({
      key,
      label,
      order,
      tasks: sectionMap.get(key)!,
    }));
  }, [tasksList]);

  if (searchQueryParam && searchQueryParam.trim()) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500 dark:text-gray-400">Taking you to search…</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {isMember 
              ? 'View your assigned tasks'
              : (statusFilter || searchQuery) 
                ? `${statusFilter ? `Showing ${statusFilter} tasks` : ''}${statusFilter && searchQuery ? ' • ' : ''}${searchQuery ? `Search: "${searchQuery}"` : ''}`
                : 'Manage and track your tasks'}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading tasks...</div>
        </div>
      )}

      {error && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12 text-red-600 dark:text-red-400">
            Error loading tasks: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tasksBySection.map(({ key, label, tasks }) => (
            <div key={key} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col min-h-0 max-h-[70vh]">
              {/* Section header */}
              <div className="px-4 py-3 sm:px-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {label}
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <VirtualTaskList
                tasks={tasks}
                onSelectTask={setSelectedTaskId}
                emptyMessage="No tasks in this section"
              />
            </div>
          ))}
        </div>
      )}

      {/* Task details popup modal */}
      {selectedTaskId && (() => {
        const selectedTask = tasksList.find((t: any) => t.id === selectedTaskId);
        if (!selectedTask) return null;
        return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedTaskId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-detail-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 id="task-detail-title" className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                Task details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body - scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Task name */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Task name</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedTask.title}</p>
              </div>

              {/* Due date & Assigned - two columns like SOURCE/TIME */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Due date</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedTask.due_date ? format(parseISO(selectedTask.due_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned time</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedTask.created_at ? format(parseISO(selectedTask.created_at), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned to</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedTask.assignee_id === user?.id ? 'You' : (selectedTask.assignee_id ? 'Team member' : 'Unassigned')}
                </p>
              </div>

              {/* Complete Task & Progress */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status & progress</p>
                <TaskStatusControls task={selectedTask} />
              </div>

              {/* View Details & Activity */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  View details & activity
                </h3>
                <div className="space-y-4 pl-1">
                  <div>
                    <TaskDependencies task={selectedTask} />
                  </div>
                  {isMember && selectedTask.assignee_id === user?.id && (
                    <div>
                      <TaskReportForm task={selectedTask} onClose={() => {}} />
                    </div>
                  )}
                  <div>
                    <ActivitySection entityType="task" entityId={selectedTask.id} />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/projects/${selectedTask.project_id}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Open project →
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
      })()}
    </div>
  );
}
