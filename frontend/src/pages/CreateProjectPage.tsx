import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { projectsAPI, teamsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../utils/permissions';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canCreateProject, isCEO, isManager } = useUserRole();
  const canSeeBudget = isCEO || isManager;

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!canCreateProject) {
      navigate('/projects');
    }
  }, [canCreateProject, navigate]);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    summary: '',
    description: '',
    work_type: '',
    category: '',
    status: 'Planning',
    start_date: '',
    end_date: '',
    team_ids: [] as string[],
    labels_text: '',
    url: '',
    budget: '' as string,
    attachments: [] as Array<{ file_name: string; file_type: string; file_data: string; file_size: number }>,
  });
  const [error, setError] = useState('');

  // Fetch teams for selection
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.create(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${project.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create project');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    const labels = (formData.labels_text || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const projectData = {
      name: formData.name,
      company_name: formData.company_name || undefined,
      summary: formData.summary || undefined,
      description: formData.description,
      work_type: formData.work_type || undefined,
      category: formData.category || undefined,
      status: formData.status,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      manager_id: user?.id,
      reported_by_id: user?.id,
      team_ids: formData.team_ids.length > 0 ? formData.team_ids : undefined,
      progress_percentage: 0,
      labels: labels.length > 0 ? labels : undefined,
      url: formData.url || undefined,
      budget: canSeeBudget && formData.budget !== '' ? Number(formData.budget) : undefined,
      attachments: formData.attachments.length > 0 ? formData.attachments : undefined,
    };

    createMutation.mutate(projectData);
  };

  return (
    <div className="px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center text-sm"
          >
            ← Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the details to create a new project
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 bg-white dark:bg-gray-800">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company name
                </label>
                <input
                  type="text"
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Artech Solutions"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project category/type
                </label>
                <input
                  type="text"
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Marketing, App Development"
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="work_type" className="block text-sm font-medium text-gray-700 mb-1">
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
              <p className="mt-1 text-xs text-gray-500">
                Write the project type (this helps everyone understand the goal quickly).
              </p>
            </div>

            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Summary
              </label>
              <textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Short summary (1–2 lines)"
              />
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
                <p className="text-sm text-gray-500 py-2">No teams available. Create teams first.</p>
              ) : (
                <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                  {teams.map((team) => (
                    <label
                      key={team.id}
                      className="flex items-center py-2 px-2 hover:bg-gray-50 rounded cursor-pointer"
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
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-200">{team.name}</span>
                      {team.description && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">- {team.description}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              {formData.team_ids.length > 0 && (
                <p className="mt-2 text-xs text-gray-600">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="labels_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Labels
                </label>
                <input
                  type="text"
                  id="labels_text"
                  value={formData.labels_text}
                  onChange={(e) => setFormData({ ...formData, labels_text: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., urgent, client, v1"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Comma-separated</p>
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://..."
                />
              </div>
            </div>

            {canSeeBudget && (
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Visible only to CEO and Manager.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attachments
              </label>
              <input
                type="file"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  try {
                    const toBase64 = (file: File) =>
                      new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });

                    const newAttachments = await Promise.all(
                      files.map(async (f) => ({
                        file_name: f.name,
                        file_type: f.type || 'application/octet-stream',
                        file_data: await toBase64(f),
                        file_size: f.size,
                      }))
                    );
                    setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
                    e.currentTarget.value = '';
                  } catch {
                    setError('Failed to read attachment(s)');
                  }
                }}
                className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700"
              />
              {formData.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.attachments.map((a, idx) => (
                    <div key={`${a.file_name}-${idx}`} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{a.file_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{Math.round(a.file_size / 1024)} KB</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
