import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ClipboardList } from 'lucide-react';
import { tasksAPI } from '../services/api';
import type { Task } from '../types';
import TaskCard from './TaskCard';

const STATUSES = [
  { id: 'Backlog', label: 'Backlog', color: '#9CA3AF' },
  { id: 'Todo', label: 'To Do', color: '#6B7280' },
  { id: 'In Progress', label: 'In Progress', color: '#2563EB' },
  { id: 'Review', label: 'Code Review', color: '#8B5CF6' },
  { id: 'Done', label: 'Done', color: '#10B981' },
];

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
}

export default function KanbanBoard({ tasks, projectId }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status.id] = tasks.filter((task) => task.status === status.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const newStatus = over.id as string;
    if (activeTask.status !== newStatus) {
      updateTaskMutation.mutate({
        id: activeTask.id,
        data: { status: newStatus },
      });
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
        {STATUSES.map((status) => {
          const statusTasks = tasksByStatus[status.id] || [];
          return (
            <div
              key={status.id}
              id={status.id}
              className="flex-shrink-0 w-72 bg-white rounded-lg border border-gray-300 flex flex-col"
            >
              {/* Column Header */}
              <div
                className="px-4 py-3 rounded-t-lg flex items-center justify-between"
                style={{ backgroundColor: '#F7F8F9' }}
              >
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-gray-900">{status.label}</h3>
                  <span className="text-xs text-gray-500">({statusTasks.length})</span>
                </div>
                <button
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  aria-label={`Add issue to ${status.label}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Column Body */}
              <div className="flex-1 p-2 overflow-y-auto min-h-[400px] max-h-[80vh]">
                <SortableContext
                  items={statusTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {statusTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>

                {/* Empty State */}
                {statusTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="w-12 h-12 mb-2 opacity-30 text-gray-400 dark:text-gray-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No issues</p>
                  </div>
                )}
              </div>

              {/* Column Footer - Add Issue Button */}
              <div className="px-2 pb-2">
                <button
                  className="w-full h-10 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                  onClick={() => {
                    // TODO: Open create issue modal
                    console.log(`Create issue in ${status.label}`);
                  }}
                >
                  + Add issue
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
