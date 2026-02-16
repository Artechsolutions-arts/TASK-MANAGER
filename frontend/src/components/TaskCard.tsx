import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import TaskStatusControls from './TaskStatusControls';
import { Bug, FileText, Clock } from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500';
      case 'High':
        return 'bg-orange-500';
      case 'Medium':
        return 'bg-blue-500';
      case 'Low':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getIssueTypeIcon = () => {
    // Determine type based on priority or default to task
    if (task.priority === 'Critical') {
      return <Bug className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
    }
    return <FileText className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />;
  };

  // Generate issue ID (PROJ-123 format)
  const issueId = `PROJ-${task.id.slice(0, 3).toUpperCase()}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-300 dark:border-gray-700 shadow-card dark:shadow-lg cursor-grab active:cursor-grabbing hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-card-hover transition-all ${
        isDragging ? 'rotate-2' : ''
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{issueId}</span>
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
          {getIssueTypeIcon()}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Description (optional) */}
      {task.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Assignee Avatar */}
          <div className="w-5 h-5 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-xs font-semibold border border-gray-200 dark:border-gray-700">
            {task.assignee_id?.[0] || 'U'}
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {task.assignee_id ? 'Assigned' : 'Unassigned'}
          </span>
        </div>
        {task.due_date && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      
      {/* Task Status Controls for Members */}
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <TaskStatusControls task={task} />
      </div>
    </div>
  );
}
