import { useRef, useEffect, useState } from 'react';
import { FixedSizeList } from 'react-window';
import { parseISO, format } from 'date-fns';

const ROW_HEIGHT = 92;

interface VirtualTaskListProps {
  tasks: any[];
  onSelectTask: (taskId: string) => void;
  emptyMessage?: string;
}

type RowProps = { tasks: any[]; onSelectTask: (id: string) => void };

function TaskRow({
  index,
  style,
  ariaAttributes,
  tasks,
  onSelectTask,
}: {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: { role: 'listitem'; 'aria-posinset': number; 'aria-setsize': number };
} & RowProps) {
  const task = tasks[index];
  if (!task) return null;
  return (
    <div style={style} className="px-4 py-2" {...ariaAttributes}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectTask(task.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTask(task.id);
          }
        }}
        className="px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-l-transparent cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                task.status === 'Done'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : task.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : task.status === 'Review'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {task.status}
            </span>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate mt-1">
              {task.title}
            </div>
            {task.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {task.description}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                task.priority === 'Critical'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : task.priority === 'High'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    : task.priority === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {task.priority}
            </span>
            {task.due_date && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(parseISO(task.due_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VirtualTaskList({
  tasks,
  onSelectTask,
  emptyMessage = 'No tasks in this section',
}: VirtualTaskListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ height: 500, width: 800 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ height: el.clientHeight || 500, width: el.clientWidth || 800 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (tasks.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 min-h-0" style={{ minHeight: 200 }}>
      <FixedSizeList
        height={size.height}
        width={size.width}
        itemCount={tasks.length}
        itemSize={ROW_HEIGHT}
        overscanCount={4}
      >
        {({ index, style }) => (
          <TaskRow
            index={index}
            style={style}
            ariaAttributes={{ role: 'listitem', 'aria-posinset': index + 1, 'aria-setsize': tasks.length }}
            tasks={tasks}
            onSelectTask={onSelectTask}
          />
        )}
      </FixedSizeList>
    </div>
  );
}
