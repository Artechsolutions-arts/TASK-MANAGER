import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { 
  FolderKanban, 
  CheckCircle2, 
  Rocket, 
  Ban, 
  Trash2,
  Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isStarred, toggleStarred } from '../utils/prefs';
import { useMemo, useState } from 'react';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { user } = useAuth();
  const [starTick, setStarTick] = useState(0);
  const starred = useMemo(() => isStarred('project', user?.id, project.id), [user?.id, project.id, starTick]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'In Progress':
        return 'badge-info';
      case 'Blocked':
        return 'badge-error';
      case 'On Hold':
        return 'badge-warning';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectIcon = (status: string) => {
    const iconClass = "w-6 h-6";
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className={`${iconClass} text-green-600 dark:text-green-400`} />;
      case 'In Progress':
        return <Rocket className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
      case 'Blocked':
        return <Ban className={`${iconClass} text-red-600 dark:text-red-400`} />;
      default:
        return <FolderKanban className={`${iconClass} text-gray-600 dark:text-gray-400`} />;
    }
  };

  const progress = typeof project.progress_percentage === 'number' 
    ? project.progress_percentage 
    : Number(project.progress_percentage || 0);

  return (
    <Link
      to={`/projects/${project.id}`}
      className="card card-hover p-5 group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center flex-1 min-w-0">
          <div className="mr-3 flex-shrink-0">
            {getProjectIcon(project.status)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mt-1">
              {project.status || 'Project'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleStarred('project', user?.id, {
                id: project.id,
                label: project.name,
                path: `/projects/${project.id}`,
              });
              setStarTick((x) => x + 1);
            }}
            className={`transition-colors p-1 z-10 ${
              starred
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'
            }`}
            aria-label={starred ? 'Unstar project' : 'Star project'}
            title={starred ? 'Starred' : 'Star'}
          >
            <Star className={`w-5 h-5 ${starred ? 'fill-current' : ''}`} />
          </button>

          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(project.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 z-10"
              aria-label="Delete project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-4 line-clamp-3">
          {project.description}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`badge ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {progress.toFixed(0)}% complete
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-500 dark:bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {/* Placeholder for issue count - would need to fetch from API */}
          <span>0 issues • 0 active</span>
        </div>
      </div>
    </Link>
  );
}
