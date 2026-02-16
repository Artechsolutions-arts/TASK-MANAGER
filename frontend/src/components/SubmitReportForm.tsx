import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI, projectsAPI, tasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../utils/permissions';
import { useQuery } from '@tanstack/react-query';

export default function SubmitReportForm() {
  const { user } = useAuth();
  const { isMember, isTeamLead, isManager } = useUserRole();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    task_id: '',
    report_type: 'task',
    content: '',
    progress_percentage: 0,
  });
  const [attachments, setAttachments] = useState<{ file: File }[]>([]);
  const [error, setError] = useState('');

  // Fetch projects and tasks based on role
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', formData.project_id],
    queryFn: () => tasksAPI.list(formData.project_id ? { project_id: formData.project_id } : undefined),
    enabled: !!formData.project_id && formData.report_type === 'task',
  });

  const submitReportMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert files to base64
      const attachmentPromises = attachments.map(async (att: { file: File }) => {
        return new Promise<{ file_name: string; file_type: string; file_data: string; file_size: number }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1]; // Remove data:type;base64, prefix
            resolve({
              file_name: att.file.name,
              file_type: att.file.type,
              file_data: base64String,
              file_size: att.file.size,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(att.file);
        });
      });
      
      const processedAttachments = await Promise.all(attachmentPromises);
      
      return reportsAPI.create({
        ...data,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setFormData({
        project_id: '',
        task_id: '',
        report_type: 'task',
        content: '',
        progress_percentage: 0,
      });
      setAttachments([]);
      setShowForm(false);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to submit report');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.content.trim()) {
      setError('Report description is required');
      return;
    }

    if (formData.report_type === 'task' && !formData.task_id) {
      setError('Please select a task');
      return;
    }

    if (formData.report_type === 'project' && !formData.project_id) {
      setError('Please select a project');
      return;
    }

    const reportData = {
      project_id: formData.project_id || undefined,
      task_id: formData.report_type === 'task' ? formData.task_id : undefined,
      report_type: formData.report_type,
      content: formData.content,
      progress_percentage: formData.progress_percentage || undefined,
    };

    submitReportMutation.mutate(reportData);
  };

  if (!isMember && !isTeamLead && !isManager) {
    return null; // Only Members, Team Leads, and Managers can submit reports
  }

  return (
    <div className="card bg-white mb-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isMember && 'Submit Report to Team Lead'}
            {isTeamLead && 'Submit Report to Manager'}
            {isManager && 'Submit Report to CEO'}
          </h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-sm"
            >
              + New Report
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={formData.report_type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    report_type: e.target.value,
                    task_id: '',
                  });
                }}
                className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="task">Task Report</option>
                <option value="project">Project Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
              </select>
            </div>

            {(formData.report_type === 'task' || formData.report_type === 'project') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project {formData.report_type === 'project' && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      project_id: e.target.value,
                      task_id: '',
                    });
                  }}
                  required={formData.report_type === 'project'}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a project</option>
                  {projects.map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.report_type === 'task' && formData.project_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.task_id}
                  onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
                  required
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a task</option>
                  {tasks.map((task: any) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(formData.report_type === 'task' || formData.report_type === 'project') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, progress_percentage: Number(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {formData.progress_percentage}%
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe your progress, completed work, issues faced, next steps, etc."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                  setFormData({
                    project_id: '',
                    task_id: '',
                    report_type: 'task',
                    content: '',
                    progress_percentage: 0,
                  });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitReportMutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {submitReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
