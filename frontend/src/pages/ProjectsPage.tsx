import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import { useUserRole } from '../utils/permissions';
import { FolderKanban, Plus } from 'lucide-react';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const { isMember, isTeamLead, canCreateProject, canDeleteProject } = useUserRole();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => projectsAPI.list(statusFilter ? { status: statusFilter } : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        <div className="card p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Projects error:', error);
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        <div className="card p-12 text-center">
          <p className="text-red-600 dark:text-red-400">
            Error loading projects: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {isMember 
              ? 'View your assigned projects'
              : isTeamLead
                ? 'View projects assigned to your team'
                : statusFilter 
                  ? `Showing ${statusFilter} projects`
                  : 'Manage and organize your projects'}
          </p>
        </div>
        {canCreateProject && (
          <Link
            to="/projects/new"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </Link>
        )}
      </div>

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={canDeleteProject ? handleDelete : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="max-w-md mx-auto">
            <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {isMember ? 'No assigned projects' : 'No projects yet'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isMember 
                ? 'You don\'t have any assigned projects at the moment.'
                : 'Get started by creating your first project to organize your work.'}
            </p>
            {canCreateProject && (
              <Link to="/projects/new" className="btn-primary inline-flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
