import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskDependenciesAPI, tasksAPI } from '../services/api';
import { Link2, X, AlertTriangle } from 'lucide-react';
import type { Task, TaskDependencyWithDetails } from '../types';

interface TaskDependenciesProps {
  task: Task;
}

export default function TaskDependencies({ task }: TaskDependenciesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const queryClient = useQueryClient();

  const { data: dependencies = [], isLoading } = useQuery({
    queryKey: ['task-dependencies', task.id],
    queryFn: () => taskDependenciesAPI.list(task.id),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', task.project_id],
    queryFn: () => tasksAPI.list({ project_id: task.project_id }),
  });

  const createDependencyMutation = useMutation({
    mutationFn: (dependsOnTaskId: string) =>
      taskDependenciesAPI.create(task.id, {
        depends_on_task_id: dependsOnTaskId,
        type: 'blocks',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', task.id] });
      setShowAddForm(false);
      setSelectedTaskId('');
    },
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: (dependencyId: string) => taskDependenciesAPI.delete(dependencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', task.id] });
    },
  });

  // Filter out current task and already dependent tasks
  const availableTasks = allTasks.filter(
    (t: Task) => t.id !== task.id && !dependencies.some((d: TaskDependencyWithDetails) => d.depends_on_task_id === t.id)
  );

  const blockingTasks = dependencies.filter((d: TaskDependencyWithDetails) => d.is_blocked);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Dependencies</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {showAddForm ? 'Cancel' : '+ Add Dependency'}
        </button>
      </div>

      {/* Blocking Warning */}
      {blockingTasks.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                This task is blocked by {blockingTasks.length} task(s)
              </p>
              <ul className="mt-1 text-xs text-yellow-700 dark:text-yellow-400 list-disc list-inside">
                {blockingTasks.map((dep: TaskDependencyWithDetails) => (
                  <li key={dep.id}>{dep.depends_on_task_title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Add Dependency Form */}
      {showAddForm && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Depends on:
          </label>
          <div className="flex gap-2">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="flex-1 h-8 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Select a task</option>
              {availableTasks.map((t: Task) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedTaskId) {
                  createDependencyMutation.mutate(selectedTaskId);
                }
              }}
              disabled={!selectedTaskId || createDependencyMutation.isPending}
              className="btn-primary text-xs px-3 h-8 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Dependencies List */}
      {isLoading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading dependencies...</p>
      ) : dependencies.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No dependencies</p>
      ) : (
        <div className="space-y-2">
          {dependencies.map((dep: TaskDependencyWithDetails) => (
            <div
              key={dep.id}
              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Link2 className={`w-3 h-3 flex-shrink-0 ${
                  dep.is_blocked ? 'text-red-500' : 'text-gray-400'
                }`} />
                <span className="text-xs text-gray-900 dark:text-white truncate">
                  {dep.depends_on_task_title}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  dep.depends_on_task_status === 'Done'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {dep.depends_on_task_status}
                </span>
                {dep.is_blocked && (
                  <span className="text-xs text-red-600 dark:text-red-400">(Blocking)</span>
                )}
              </div>
              <button
                onClick={() => deleteDependencyMutation.mutate(dep.id)}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
