import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { tasksAPI, projectsAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../utils/permissions';
import type { Task } from '../types';
import { Sparkles, Loader2 } from 'lucide-react';

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canCreateTask, isTeamLead } = useUserRole();
  const projectIdParam = searchParams.get('project');

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (!canCreateTask) {
      navigate('/tasks');
    }
  }, [canCreateTask, navigate]);

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    category: '',
    project_id: '',
    status: 'To Do',
    priority: 'Medium',
    assignee_id: '',
    due_date: '',
    estimated_hours: undefined,
    story_points: undefined,
  });
  const [labelsText, setLabelsText] = useState('');
  const [attachments, setAttachments] = useState<Array<{ file_name: string; file_type: string; file_data: string; file_size: number }>>([]);
  const [error, setError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);

  // Fetch projects - for Team Leads, only show projects assigned to their teams
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list(),
  });

  // Set project_id from URL parameter once projects are loaded
  useEffect(() => {
    if (projectIdParam && projects.length > 0) {
      const projectExists = projects.some((p: any) => p.id === projectIdParam);
      if (projectExists) {
        setFormData((prev) => ({ ...prev, project_id: projectIdParam }));
      }
    }
  }, [projectIdParam, projects]);

  // Fetch team members for selected project
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['project-team-members', formData.project_id],
    queryFn: () => projectsAPI.getTeamMembers(formData.project_id!),
    enabled: !!formData.project_id,
  });

  // Filter projects for Team Leads - only show projects where their teams are assigned
  const availableProjects = isTeamLead
    ? projects.filter((project: any) => {
        // Team Leads can create tasks for projects where their teams are assigned
        // This would need to be checked via ProjectTeam relationship
        // For now, we'll show all projects they can see (backend filters this)
        return true;
      })
    : projects;

  const createMutation = useMutation({
    mutationFn: (data: any) => tasksAPI.create(data),
    onSuccess: (data) => {
      // Invalidate all task queries including project-specific ones
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // If task was created for a specific project, invalidate that project's tasks
      if (data?.project_id) {
        queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
      }
      navigate('/tasks');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create task');
    },
  });

  const aiSuggestionMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; project_id: string }) =>
      aiAPI.suggestTask(data),
    onSuccess: (suggestion) => {
      setAiSuggestion(suggestion);
      setShowAiSuggestion(true);
      // Auto-apply suggestions if confidence is high
      if (suggestion.confidence > 0.7) {
        setFormData((prev) => ({
          ...prev,
          priority: suggestion.suggested_priority,
          story_points: suggestion.suggested_story_points,
        }));
      }
    },
    onError: (err: any) => {
      setError('AI suggestion failed: ' + (err.response?.data?.detail || 'Unknown error'));
    },
  });

  const handleGetAISuggestion = () => {
    if (!formData.title?.trim()) {
      setError('Please enter a task title first');
      return;
    }
    if (!formData.project_id) {
      setError('Please select a project first');
      return;
    }
    aiSuggestionMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      project_id: formData.project_id,
    });
  };

  const handleApplyAISuggestion = () => {
    if (aiSuggestion) {
      setFormData((prev) => ({
        ...prev,
        priority: aiSuggestion.suggested_priority,
        story_points: aiSuggestion.suggested_story_points,
      }));
      setShowAiSuggestion(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title?.trim()) {
      setError('Task title is required');
      return;
    }

    if (!formData.project_id) {
      setError('Please select a project');
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description || undefined,
      category: (formData as any).category || undefined,
      project_id: formData.project_id,
      status: formData.status || 'To Do',
      priority: formData.priority || 'Medium',
      assignee_id: formData.assignee_id || undefined,
      reporter_id: user?.id,
      due_date: formData.due_date || undefined,
      estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : undefined,
      story_points: formData.story_points ? Number(formData.story_points) : undefined,
      sprint_id: formData.sprint_id || undefined,
      labels: labelsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    createMutation.mutate(taskData);
  };

  return (
    <div className="px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/tasks')}
            className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center text-sm"
          >
            ← Back to Tasks
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Task</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTeamLead 
              ? 'Create a task for a project assigned to your team'
              : 'Fill in the details to create a new task'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 bg-white">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                id="project_id"
                value={formData.project_id || ''}
                onChange={(e) => {
                  const selectedProjectId = e.target.value;
                  setFormData({ ...formData, project_id: selectedProjectId, assignee_id: '' });
                  setError(''); // Clear any previous errors
                }}
                required
                className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a project</option>
                {availableProjects.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {isTeamLead && availableProjects.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No projects available. Projects must be assigned to your team.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Project/category
                </label>
                <input
                  type="text"
                  id="category"
                  value={(formData as any).category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value } as any)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Marketing, App Development"
                />
              </div>

              <div>
                <label htmlFor="labels" className="block text-sm font-medium text-gray-700 mb-1">
                  Labels
                </label>
                <input
                  type="text"
                  id="labels"
                  value={labelsText}
                  onChange={(e) => setLabelsText(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., urgent, client"
                />
                <p className="mt-1 text-xs text-gray-500">Comma-separated</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    setAttachments((prev) => [...prev, ...newAttachments]);
                    e.currentTarget.value = '';
                  } catch {
                    setError('Failed to read attachment(s)');
                  }
                }}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700"
              />
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((a, idx) => (
                    <div key={`${a.file_name}-${idx}`} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{a.file_name}</div>
                        <div className="text-xs text-gray-500">{Math.round(a.file_size / 1024)} KB</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Task Title <span className="text-red-500">*</span>
                </label>
                {formData.title?.trim() && formData.project_id && (
                  <button
                    type="button"
                    onClick={handleGetAISuggestion}
                    disabled={aiSuggestionMutation.isPending}
                    className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiSuggestionMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Get AI Suggestions
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter task title"
                required
              />
              {showAiSuggestion && aiSuggestion && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        AI Suggestions
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Priority: <strong>{aiSuggestion.suggested_priority}</strong>
                        {aiSuggestion.suggested_story_points && (
                          <> | Story Points: <strong>{aiSuggestion.suggested_story_points}</strong></>
                        )}
                        {aiSuggestion.confidence && (
                          <> | Confidence: <strong>{(aiSuggestion.confidence * 100).toFixed(0)}%</strong></>
                        )}
                      </p>
                      {aiSuggestion.reasoning && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {aiSuggestion.reasoning}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyAISuggestion}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter task description"
              />
            </div>

            <div>
              <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 mb-1">
                Assign To
              </label>
              <select
                id="assignee_id"
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                disabled={!formData.project_id || teamMembers.length === 0}
                className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a team member</option>
                {teamMembers.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
              {!formData.project_id && (
                <p className="mt-1 text-xs text-gray-500">
                  Please select a project first to see team members
                </p>
              )}
              {formData.project_id && teamMembers.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No team members found for this project
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                  <option value="Backlog">Backlog</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="story_points" className="block text-sm font-medium text-gray-700 mb-1">
                  Story Points
                </label>
                <input
                  type="number"
                  id="story_points"
                  min="0"
                  step="1"
                  value={formData.story_points || ''}
                  onChange={(e) => setFormData({ ...formData, story_points: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  id="due_date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  id="estimated_hours"
                  min="0"
                  step="0.5"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
