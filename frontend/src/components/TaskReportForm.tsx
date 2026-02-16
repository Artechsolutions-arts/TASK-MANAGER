import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI } from '../services/api';
import type { Task } from '../types';

interface TaskReportFormProps {
  task: Task;
  onClose?: () => void;
}

export default function TaskReportForm({ task, onClose }: TaskReportFormProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const submitReportMutation = useMutation({
    mutationFn: (data: any) => reportsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setContent('');
      setProgress(0);
      setError('');
      setShowForm(false);
      if (onClose) onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to submit report');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Report description is required');
      return;
    }

    submitReportMutation.mutate({
      task_id: task.id,
      project_id: task.project_id,
      report_type: 'task',
      content: content,
      progress_percentage: progress || undefined,
    });
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        + Submit Report
      </button>
    );
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-md">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Submit Report for Task</h4>
        <button
          onClick={() => {
            setShowForm(false);
            setContent('');
            setProgress(0);
            setError('');
            if (onClose) onClose();
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Progress (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-gray-600 w-10 text-right">
              {progress}%
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Report Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe your progress, completed work, issues faced, etc."
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setContent('');
              setProgress(0);
              setError('');
              if (onClose) onClose();
            }}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitReportMutation.isPending || !content.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
          >
            {submitReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
