import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI, tasksAPI, sprintsAPI } from '../services/api';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import KanbanBoard from '../components/KanbanBoard';
import { useUserRole } from '../utils/permissions';
import { Rocket } from 'lucide-react';

export default function BoardPage() {
  const navigate = useNavigate();
  const { isMember } = useUserRole();
  const { projectId } = useParams<{ projectId?: string }>();
  const [searchParams] = useSearchParams();

  // Redirect Members to Tasks page
  useEffect(() => {
    if (isMember) {
      navigate('/tasks');
    }
  }, [isMember, navigate]);
  
  // Get project ID from URL params or search params
  const activeProjectId = projectId || searchParams.get('project');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list(),
  });

  const { data: selectedProject } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => projectsAPI.get(activeProjectId!),
    enabled: !!activeProjectId,
  });

  // Fetch sprints for the selected project
  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', activeProjectId],
    queryFn: () => sprintsAPI.list({ project_id: activeProjectId || undefined }),
    enabled: !!activeProjectId,
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', activeProjectId, selectedSprintId],
    queryFn: () => {
      const params: any = {};
      if (activeProjectId) params.project_id = activeProjectId;
      return tasksAPI.list(params);
    },
    enabled: !!activeProjectId,
  });

  // Filter tasks by sprint if selected
  const filteredTasks = selectedSprintId
    ? tasks?.filter((task: any) => task.sprint_id === selectedSprintId) || []
    : tasks || [];

  // If no project selected, show project selector
  if (!activeProjectId && projects && projects.length > 0) {
    return (
      <div className="px-6 py-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Select a Project</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/board?project=${project.id}`}
              className="card card-hover p-6 block"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{project.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{project.description || 'No description'}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedProject ? selectedProject.name : 'Board'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {selectedProject ? 'Kanban board view for project tasks' : 'Select a project to view board'}
            </p>
          </div>
          {activeProjectId && (
            <button
              onClick={() => navigate('/board')}
              className="btn-secondary"
            >
              Change Project
            </button>
          )}
        </div>

        {/* Sprint Selector */}
        {activeProjectId && sprints.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sprint:
            </label>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Tasks</option>
              {sprints.map((sprint: any) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} ({sprint.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center bg-white dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">Loading board...</p>
        </div>
      ) : filteredTasks && filteredTasks.length > 0 ? (
        <KanbanBoard tasks={filteredTasks} projectId={activeProjectId || ''} />
      ) : activeProjectId ? (
        <div className="card p-12 text-center bg-white dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No tasks found for this project. Create tasks to get started.</p>
        </div>
      ) : (
        <div className="card p-12 text-center bg-white dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">Please select a project to view the board.</p>
        </div>
      )}
    </div>
  );
}
