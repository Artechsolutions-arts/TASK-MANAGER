import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, projectsAPI, sprintsAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
import type { Task, Project } from '../types';
import { FolderKanban, Rocket } from 'lucide-react';

export default function BacklogPage() {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { isManager, isCEO } = useUserRole();
  const canManageSprints = isManager || isCEO;
  const queryClient = useQueryClient();

  // Fetch all tasks (backlog items are typically tasks not in active sprint)
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['backlog-tasks', selectedProject, statusFilter, priorityFilter],
    queryFn: async () => {
      const params: any = {};
      if (selectedProject !== 'all') {
        params.project_id = selectedProject;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      return tasksAPI.list(params);
    },
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list(),
  });

  // Fetch active sprints for the selected project
  const { data: activeSprints = [] } = useQuery({
    queryKey: ['active-sprints', selectedProject],
    queryFn: () => sprintsAPI.list({ 
      project_id: selectedProject !== 'all' ? selectedProject : undefined,
      status: 'Active'
    }),
    enabled: canManageSprints && selectedProject !== 'all',
  });

  // Mutation to assign task to sprint
  const assignToSprintMutation = useMutation({
    mutationFn: ({ taskId, sprintId }: { taskId: string; sprintId: string | null }) =>
      tasksAPI.update(taskId, { sprint_id: sprintId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Filter tasks by priority and search
  const filteredTasks = tasks.filter((task: Task) => {
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group tasks by status
  const tasksByStatus = {
    'To Do': filteredTasks.filter((t: Task) => t.status === 'To Do'),
    'In Progress': filteredTasks.filter((t: Task) => t.status === 'In Progress'),
    'Done': filteredTasks.filter((t: Task) => t.status === 'Done'),
    'Backlog': filteredTasks.filter((t: Task) => t.status === 'Backlog' || !t.status),
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'To Do':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Backlog</h1>
        <p className="text-gray-500">View and manage your backlog items</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Projects</option>
              {projects.map((project: Project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="Backlog">Backlog</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {tasksLoading ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Loading backlog items...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No backlog items found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(tasksByStatus).map(([status, statusTasks]: [string, any]) => {
            if (statusTasks.length === 0) return null;
            return (
              <div key={status} className="card">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {status} ({statusTasks.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {statusTasks.map((task: Task) => {
                    const project = projects.find((p: Project) => p.id === task.project_id);
                    return (
                      <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {task.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                                  task.status
                                )}`}
                              >
                                {task.status}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {project && (
                                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                  <FolderKanban className="w-3.5 h-3.5" />
                                  {project.name}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <span>📅</span>
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span className="flex items-center gap-1">
                                  <span>⏱️</span>
                                  {task.estimated_hours}h
                                </span>
                              )}
                            </div>
                          </div>
                          {canManageSprints && task.project_id === selectedProject && (
                            <div className="ml-4">
                              <select
                                value={task.sprint_id || ''}
                                onChange={(e) => {
                                  assignToSprintMutation.mutate({
                                    taskId: task.id,
                                    sprintId: e.target.value || null,
                                  });
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">No Sprint</option>
                                {activeSprints
                                  .filter((s: any) => s.project_id === task.project_id)
                                  .map((sprint: any) => (
                                    <option key={sprint.id} value={sprint.id}>
                                      {sprint.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
