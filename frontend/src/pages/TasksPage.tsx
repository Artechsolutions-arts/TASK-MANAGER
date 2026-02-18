import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, subtasksAPI } from '../services/api';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useUserRole } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import TaskStatusControls from '../components/TaskStatusControls';
import TaskReportForm from '../components/TaskReportForm';
import ActivitySection from '../components/ActivitySection';
import TaskDependencies from '../components/TaskDependencies';
import VirtualTaskList from '../components/VirtualTaskList';
import { MessageSquare, Calendar, X, Paperclip, ListChecks, Flag, Tag, Star } from 'lucide-react';
import { parseISO, startOfDay, format } from 'date-fns';
import { getRecent, isStarred, pushRecent, toggleStarred } from '../utils/prefs';

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
  const queryClient = useQueryClient();
  const statusFilter = searchParams.get('status');
  const filterParam = searchParams.get('filter');
  const searchQueryParam = searchParams.get('search');
  const { isMember } = useUserRole();
  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [starTick, setStarTick] = useState(0);

  // If user landed here with ?search=..., send them to unified search (tasks + projects + people)
  useEffect(() => {
    if (searchQueryParam && searchQueryParam.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQueryParam.trim())}`, { replace: true });
      return;
    }
  }, [searchQueryParam, navigate]);

  const searchQuery = searchQueryParam;

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', statusFilter, filterParam, searchQuery, isMember, user?.id],
    queryFn: () => {
      const params: any = {};
      if (filterParam === 'my_open') {
        params.assignee_id = user?.id;
        params.open_only = true;
      } else if (filterParam === 'reported_by_me') {
        params.reporter_id = user?.id;
      } else if (filterParam === 'done') {
        params.status = 'Done';
      } else if (filterParam === 'open') {
        params.open_only = true;
      } else if (filterParam === 'created_recently') {
        params.sort = 'created_desc';
      } else if (filterParam === 'resolved_recently') {
        params.status = 'Done';
        params.sort = 'updated_desc';
      } else if (filterParam === 'all' || filterParam === 'viewed_recently') {
        // no server-side filter
      }

      if (statusFilter) params.status = statusFilter;
      return tasksAPI.list(params);
    },
  });

  // Normalize tasks to always be an array and filter by search if needed
  const tasksList = useMemo(() => {
    let list = Array.isArray(tasks) ? tasks : [];
    if (filterParam === 'viewed_recently') {
      const recent = getRecent('task', user?.id);
      const order = new Map(recent.map((r, idx) => [r.id, idx]));
      list = list
        .filter((t: any) => order.has(t.id))
        .sort((a: any, b: any) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
    }
    if (searchQuery) {
      list = list.filter((task: any) =>
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  }, [tasks, searchQuery, filterParam, user?.id]);

  const { data: selectedTaskDetails } = useQuery({
    queryKey: ['task', selectedTaskId],
    queryFn: () => tasksAPI.get(selectedTaskId!),
    enabled: !!selectedTaskId,
  });

  useEffect(() => {
    if (selectedTaskDetails?.id) {
      pushRecent('task', user?.id, { id: selectedTaskDetails.id, label: selectedTaskDetails.title, path: `/tasks?task=${selectedTaskDetails.id}` });
    }
  }, [selectedTaskDetails?.id, selectedTaskDetails?.title, user?.id]);

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', selectedTaskId],
    queryFn: () => subtasksAPI.list(selectedTaskId!),
    enabled: !!selectedTaskId,
  });

  const addAttachmentMutation = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const toBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      return tasksAPI.addAttachment(taskId, {
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_data: await toBase64(file),
        file_size: file.size,
      });
    },
    onSuccess: (_task, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });

  const removeAttachmentMutation = useMutation({
    mutationFn: async ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      tasksAPI.removeAttachment(taskId, attachmentId),
    onSuccess: (_task, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task', vars.taskId] });
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      return subtasksAPI.create(taskId, {
        task_id: taskId,
        title,
        status: 'To Do',
        priority: 'Medium',
        reporter_id: user?.id,
      } as any);
    },
    onSuccess: (_subtask, vars) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', vars.taskId] });
    },
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, is_completed }: { subtaskId: string; is_completed: boolean }) => {
      return subtasksAPI.update(subtaskId, { is_completed, status: is_completed ? 'Done' : 'To Do' } as any);
    },
    onSuccess: () => {
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ['subtasks', selectedTaskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
  });

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
        const selectedTask = selectedTaskDetails || tasksList.find((t: any) => t.id === selectedTaskId);
        if (!selectedTask) return null;
        const taskStarred = isStarred('task', user?.id, selectedTask.id);
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toggleStarred('task', user?.id, { id: selectedTask.id, label: selectedTask.title, path: `/tasks?task=${selectedTask.id}` });
                    setStarTick((x) => x + 1);
                  }}
                  className={`p-2 rounded-full border transition-colors ${
                    taskStarred
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label={taskStarred ? 'Unstar task' : 'Star task'}
                  title={taskStarred ? 'Starred' : 'Star'}
                >
                  <Star className={`w-5 h-5 ${taskStarred ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(null)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal body - scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Task name */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Task name</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedTask.title}</p>
              </div>

              {/* Priority / Category / Estimate */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5" /> Priority
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedTask.priority || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Category
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">{(selectedTask as any).category || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Estimated effort</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(selectedTask as any).estimated_hours != null ? `${(selectedTask as any).estimated_hours}h` : '—'}
                  </p>
                </div>
              </div>

              {/* Labels */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Labels</p>
                {Array.isArray((selectedTask as any).labels) && (selectedTask as any).labels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(selectedTask as any).labels.map((l: string) => (
                      <span key={l} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {l}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No labels</p>
                )}
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

              {/* Attachments */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" />
                  Attachments
                </h3>
                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      for (const file of files) {
                        addAttachmentMutation.mutate({ taskId: selectedTask.id, file });
                      }
                      e.currentTarget.value = '';
                    }}
                    className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700"
                  />

                  {Array.isArray((selectedTask as any).attachments) && (selectedTask as any).attachments.length > 0 ? (
                    <div className="space-y-2">
                      {(selectedTask as any).attachments.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{a.file_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{Math.round((a.file_size || 0) / 1024)} KB</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const byteString = atob(a.file_data || '');
                                  const ab = new ArrayBuffer(byteString.length);
                                  const ia = new Uint8Array(ab);
                                  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                                  const blob = new Blob([ab], { type: a.file_type || 'application/octet-stream' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = a.file_name || 'attachment';
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                  URL.revokeObjectURL(url);
                                } catch {
                                  // ignore
                                }
                              }}
                              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAttachmentMutation.mutate({ taskId: selectedTask.id, attachmentId: a.id })}
                              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No attachments</p>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4" />
                  Subtasks
                </h3>
                <div className="space-y-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem('subtaskTitle') as HTMLInputElement | null;
                      const title = input?.value?.trim() || '';
                      if (!title) return;
                      createSubtaskMutation.mutate({ taskId: selectedTask.id, title });
                      if (input) input.value = '';
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="subtaskTitle"
                      className="flex-1 h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Add a subtask…"
                    />
                    <button
                      type="submit"
                      className="btn-primary h-10 px-4 text-sm"
                      disabled={createSubtaskMutation.isPending}
                    >
                      Add
                    </button>
                  </form>

                  {subtasks.length > 0 ? (
                    <div className="space-y-2">
                      {subtasks.map((s: any) => (
                        <label key={s.id} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={!!s.is_completed || s.status === 'Done'}
                              onChange={(e) => toggleSubtaskMutation.mutate({ subtaskId: s.id, is_completed: e.target.checked })}
                            />
                            <span className={`text-sm truncate ${s.is_completed || s.status === 'Done' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                              {s.title}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{s.status}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No subtasks</p>
                  )}
                </div>
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
