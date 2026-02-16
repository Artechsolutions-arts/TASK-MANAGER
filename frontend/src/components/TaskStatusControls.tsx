import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, reportsAPI } from '../services/api';
import type { Task } from '../types';
import { useUserRole } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';

interface TaskStatusControlsProps {
  task: Task;
}

export default function TaskStatusControls({ task }: TaskStatusControlsProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isMember, isTeamLead, isManager, isCEO } = useUserRole();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [progress, setProgress] = useState(0);

  // Only show controls if task is assigned to current user (for Members)
  const isAssignedToMe = task.assignee_id === user?.id;

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksAPI.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] });
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: (data: any) => reportsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setShowReportModal(false);
      setReportContent('');
      setProgress(0);
    },
  });

  const handleStartTask = () => {
    if (window.confirm('Start working on this task?')) {
      updateTaskMutation.mutate({ id: task.id, status: 'In Progress' });
    }
  };

  const handleCompleteTask = () => {
    setShowReportModal(true);
  };

  const handleSubmitReport = () => {
    if (!reportContent.trim()) {
      alert('Please provide a report description');
      return;
    }

    // Determine who to submit to based on role
    let submittedTo = null;
    if (isMember) {
      // Member submits to Team Lead
      // In real app, you'd get the team lead ID from the task/project
    } else if (isTeamLead) {
      // Team Lead submits to Manager
    } else if (isManager) {
      // Manager submits to CEO
    }

    submitReportMutation.mutate({
      task_id: task.id,
      project_id: task.project_id,
      report_type: 'task',
      content: reportContent,
      progress_percentage: progress,
    });

    // Also update task status to Done
    updateTaskMutation.mutate({ id: task.id, status: 'Done' });
  };

  // Only show controls for Members who are assigned to this task
  if (!isMember || !isAssignedToMe) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 mt-3">
        {task.status === 'To Do' || task.status === 'Backlog' ? (
          <button
            onClick={handleStartTask}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Start Task
          </button>
        ) : task.status === 'In Progress' ? (
          <button
            onClick={handleCompleteTask}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            Complete Task
          </button>
        ) : null}

        {task.status === 'In Progress' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Progress:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs text-gray-600">{progress}%</span>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Complete Task & Submit Report
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Description *
                </label>
                <textarea
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Describe what was completed, any issues faced, etc."
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportContent('');
                    setProgress(0);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={submitReportMutation.isPending || !reportContent.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                >
                  {submitReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
