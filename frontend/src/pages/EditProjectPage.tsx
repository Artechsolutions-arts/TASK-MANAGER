import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { projectsAPI, teamsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../utils/permissions';

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canCreateProject } = useUserRole();

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!canCreateProject) {
      navigate(`/projects/${id}`);
    }
  }, [canCreateProject, navigate, id]);

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.get(id!),
    enabled: !!id,
  });

  // Fetch teams for selection
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list(),
  });

  // Fetch current project teams
  const { data: currentTeamIds = [] } = useQuery({
    queryKey: ['project-teams', id],
    queryFn: () => projectsAPI.getTeams(id!),
    enabled: !!id,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    work_type: '',
    status: 'Planning',
    start_date: '',
    end_date: '',
    team_ids: [] as string[],
  });
  const [error, setError] = useState('');

  // Populate form when project data loads
  useEffect(() => {
    if (project) {
      // Format dates for input fields (YYYY-MM-DD)
      const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        name: project.name || '',
        description: project.description || '',
        work_type: project.work_type || '',
        status: project.status || 'Planning',
        start_date: formatDateForInput(project.start_date),
        end_date: formatDateForInput(project.end_date),
        team_ids: currentTeamIds.length > 0 ? currentTeamIds : [],
      });
    }
  }, [project, currentTeamIds]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      navigate(`/projects/${id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to update project');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    const projectData = {
      name: formData.name,
      description: formData.description,
      work_type: formData.work_type || undefined,
      status: formData.status,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      team_ids: formData.team_ids.length > 0 ? formData.team_ids : undefined,
    };

    updateMutation.mutate(projectData);
  };

  if (projectLoading) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <button
            onClick={() => navigate('/projects')}
            className="text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center text-sm"
          >
            ← Back to Project
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Project</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update the project details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 bg-white dark:bg-gray-800">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter project name"
                required
              />
            </div>

            <div>
              <label htmlFor="work_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                What are we building? <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="work_type"
                value={formData.work_type}
                onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., App Development, Website, Marketing, Internal Tool"
                required
                list="work-type-suggestions"
              />
              <datalist id="work-type-suggestions">
                <option value="App Development" />
                <option value="Website Development" />
                <option value="UI/UX Design" />
                <option value="API / Backend" />
                <option value="Mobile App" />
                <option value="Testing / QA" />
                <option value="DevOps / Deployment" />
                <option value="Marketing Campaign" />
              </datalist>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Write the project type (this helps everyone understand the goal quickly).
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter project description"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign Teams
              </label>
              {teams.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No teams available. Create teams first.</p>
              ) : (
                <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                  {teams.map((team) => (
                    <label
                      key={team.id}
                      className="flex items-center py-2 px-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.team_ids.includes(team.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              team_ids: [...formData.team_ids, team.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              team_ids: formData.team_ids.filter((id) => id !== team.id),
                            });
                          }
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{team.name}</span>
                      {team.description && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">- {team.description}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              {formData.team_ids.length > 0 && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {formData.team_ids.length} team{formData.team_ids.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="end_date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/projects/${id}`)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
