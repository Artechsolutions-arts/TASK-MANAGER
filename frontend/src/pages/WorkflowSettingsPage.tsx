import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsAPI, projectsAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
import { ArrowLeft, Plus, X, Save, Trash2 } from 'lucide-react';
import type { Workflow, WorkflowTransition } from '../types';

export default function WorkflowSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isManager, isCEO } = useUserRole();
  const canManage = isManager || isCEO;

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsAPI.get(projectId!),
    enabled: !!projectId,
  });

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', projectId],
    queryFn: () => workflowsAPI.get(projectId!),
    enabled: !!projectId,
  });

  const [localWorkflow, setLocalWorkflow] = useState<Workflow | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize local workflow when data loads
  useEffect(() => {
    if (workflow) {
      setLocalWorkflow(workflow);
      setIsEditing(true);
    } else if (projectId) {
      // Create default workflow structure
      setLocalWorkflow({
        id: '',
        project_id: projectId,
        name: 'Default Workflow',
        description: '',
        statuses: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
        transitions: [],
        is_default: true,
        created_by: '',
        created_at: '',
        updated_at: '',
      });
      setIsEditing(true);
    }
  }, [workflow, projectId]);

  const createMutation = useMutation({
    mutationFn: (data: any) => workflowsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', projectId] });
      setIsEditing(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => workflowsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', projectId] });
      setIsEditing(false);
    },
  });

  const addStatus = () => {
    if (!localWorkflow) return;
    const newStatus = prompt('Enter new status name:');
    if (newStatus && !localWorkflow.statuses.includes(newStatus)) {
      setLocalWorkflow({
        ...localWorkflow,
        statuses: [...localWorkflow.statuses, newStatus],
      });
    }
  };

  const removeStatus = (status: string) => {
    if (!localWorkflow) return;
    if (localWorkflow.statuses.length <= 1) {
      alert('Workflow must have at least one status');
      return;
    }
    setLocalWorkflow({
      ...localWorkflow,
      statuses: localWorkflow.statuses.filter((s) => s !== status),
      transitions: localWorkflow.transitions.filter(
        (t) => t.from_status !== status && t.to_status !== status
      ),
    });
  };

  const addTransition = () => {
    if (!localWorkflow) return;
    const fromStatus = prompt('From status:');
    const toStatus = prompt('To status:');
    if (fromStatus && toStatus && localWorkflow.statuses.includes(fromStatus) && localWorkflow.statuses.includes(toStatus)) {
      setLocalWorkflow({
        ...localWorkflow,
        transitions: [
          ...localWorkflow.transitions,
          { from_status: fromStatus, to_status: toStatus, allowed_roles: [] },
        ],
      });
    }
  };

  const removeTransition = (index: number) => {
    if (!localWorkflow) return;
    setLocalWorkflow({
      ...localWorkflow,
      transitions: localWorkflow.transitions.filter((_, i) => i !== index),
    });
  };

  const updateTransitionRoles = (index: number, roles: string[]) => {
    if (!localWorkflow) return;
    const newTransitions = [...localWorkflow.transitions];
    newTransitions[index].allowed_roles = roles;
    setLocalWorkflow({
      ...localWorkflow,
      transitions: newTransitions,
    });
  };

  const handleSave = () => {
    if (!localWorkflow) return;

    const workflowData = {
      project_id: localWorkflow.project_id,
      name: localWorkflow.name,
      description: localWorkflow.description || undefined,
      statuses: localWorkflow.statuses,
      transitions: localWorkflow.transitions,
      is_default: localWorkflow.is_default,
    };

    if (workflow) {
      updateMutation.mutate({ id: workflow.id, data: workflowData });
    } else {
      createMutation.mutate(workflowData);
    }
  };

  if (!canManage) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">You don't have permission to manage workflows</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12">Loading workflow settings...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Project
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workflow Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {project?.name} - Customize task workflow and transitions
        </p>
      </div>

      {localWorkflow && (
        <div className="space-y-6">
          {/* Workflow Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workflow Name
              </label>
              <input
                type="text"
                value={localWorkflow.name}
                onChange={(e) => setLocalWorkflow({ ...localWorkflow, name: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={localWorkflow.description || ''}
                onChange={(e) => setLocalWorkflow({ ...localWorkflow, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Statuses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Statuses</h2>
              <button
                onClick={addStatus}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Status
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {localWorkflow.statuses.map((status) => (
                <div
                  key={status}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md"
                >
                  <span className="text-sm text-gray-900 dark:text-white">{status}</span>
                  <button
                    onClick={() => removeStatus(status)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Transitions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transitions</h2>
              <button
                onClick={addTransition}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Transition
              </button>
            </div>
            <div className="space-y-3">
              {localWorkflow.transitions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No transitions defined</p>
              ) : (
                localWorkflow.transitions.map((transition, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md"
                  >
                    <span className="text-sm text-gray-900 dark:text-white">
                      {transition.from_status} → {transition.to_status}
                    </span>
                    <select
                      multiple
                      value={transition.allowed_roles}
                      onChange={(e) => {
                        const roles = Array.from(e.target.selectedOptions, (option) => option.value);
                        updateTransitionRoles(index, roles);
                      }}
                      className="flex-1 h-20 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="CEO">CEO</option>
                      <option value="Manager">Manager</option>
                      <option value="Team Lead">Team Lead</option>
                      <option value="Member">Member</option>
                    </select>
                    <button
                      onClick={() => removeTransition(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate(`/projects/${projectId}`)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
