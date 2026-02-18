import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, tasksAPI, usersAPI } from '../services/api';
import { Calendar, Users, User, Briefcase, Edit, Clock, CheckCircle2, PlayCircle, ListTodo, Workflow, Link2, Paperclip, Star } from 'lucide-react';
import { useUserRole } from '../utils/permissions';
import { useMemo, useEffect, useState } from 'react';
import type { Task } from '../types';
import TeamDiscussionSection from '../components/TeamDiscussionSection';
import { useAuth } from '../context/AuthContext';
import { pushRecent, isStarred, toggleStarred } from '../utils/prefs';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canCreateProject, isCEO, isManager } = useUserRole(); // Same permission as create for edit
  const canSeeBudget = isCEO || isManager;
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { user } = useAuth();
  const [starTick, setStarTick] = useState(0);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsAPI.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (project?.id) {
      pushRecent('project', user?.id, { id: project.id, label: project.name, path: `/projects/${project.id}` });
    }
  }, [project?.id, project?.name, user?.id]);

  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const result = await tasksAPI.list({ project_id: id });
      console.log('ProjectDetailPage: Tasks fetched from API', result?.length, 'tasks', result);
      return result;
    },
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Refetch tasks when component mounts or when navigating to this page
  useEffect(() => {
    if (id) {
      // Force refetch tasks to ensure we have the latest data
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['tasks', id] });
        refetchTasks();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [id, queryClient, refetchTasks]);

  // Fetch all users for assignee lookup
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => usersAPI.list(),
  });

  // Filter tasks created by team lead and group by assignee
  const tasksByAssignee = useMemo(() => {
    console.log('ProjectDetailPage: Computing tasksByAssignee', { 
      tasksLength: tasks?.length, 
      isArray: Array.isArray(tasks),
      teamLeadId: project?.team_lead_id,
      projectLoaded: !!project
    });
    
    // Wait for both tasks and project to be loaded
    if (!tasks || !Array.isArray(tasks) || !project) {
      console.log('ProjectDetailPage: Waiting for data', { hasTasks: !!tasks, hasProject: !!project });
      return {};
    }
    
    // If project has a team lead, filter tasks created by team lead
    // Otherwise, show all tasks for the project
    let teamLeadTasks: Task[];
    if (project.team_lead_id) {
      teamLeadTasks = tasks.filter((task: Task) => task.reporter_id === project.team_lead_id);
      console.log('ProjectDetailPage: Filtered by team lead', teamLeadTasks.length, 'tasks');
    } else {
      // If no team lead is set, show all tasks (for projects without team lead assigned)
      teamLeadTasks = tasks;
      console.log('ProjectDetailPage: Showing all tasks (no team lead)', teamLeadTasks.length, 'tasks');
    }
    
    // Group by assignee_id
    const grouped: Record<string, Task[]> = {};
    teamLeadTasks.forEach((task: Task) => {
      const assigneeId = task.assignee_id || 'unassigned';
      if (!grouped[assigneeId]) {
        grouped[assigneeId] = [];
      }
      grouped[assigneeId].push(task);
    });
    
    console.log('ProjectDetailPage: Grouped into', Object.keys(grouped).length, 'groups:', Object.keys(grouped));
    console.log('ProjectDetailPage: Grouped tasks detail:', grouped);
    return grouped;
  }, [tasks, project]);

  // Get assignee user details
  const getAssigneeUser = (assigneeId: string) => {
    if (assigneeId === 'unassigned') return null;
    return allUsers.find((u: any) => u.id === assigneeId) || null;
  };

  const getUserDisplayName = (userId?: string) => {
    if (!userId) return null;
    const u = allUsers.find((x: any) => x.id === userId);
    if (!u) return null;
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return fullName || u.email;
  };

  // Format date for display
  const formatDateShort = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['project-team-members', id],
    queryFn: () => projectsAPI.getTeamMembers(id!),
    enabled: !!id,
  });

  // Calculate task statistics for each team member
  const memberTaskStats = useMemo(() => {
    if (!tasks || !Array.isArray(tasks) || !teamMembers || teamMembers.length === 0) {
      return {};
    }

    const stats: Record<string, { assigned: number; inProgress: number; completed: number; tasks: Task[] }> = {};
    
    // Initialize stats for all team members
    teamMembers.forEach((member: any) => {
      stats[member.id] = {
        assigned: 0,
        inProgress: 0,
        completed: 0,
        tasks: []
      };
    });
    
    // Add unassigned stats
    stats['unassigned'] = {
      assigned: 0,
      inProgress: 0,
      completed: 0,
      tasks: []
    };

    // Filter tasks created by team lead (if team lead exists)
    let relevantTasks = tasks;
    if (project?.team_lead_id) {
      relevantTasks = tasks.filter((task: Task) => task.reporter_id === project.team_lead_id);
    }

    // Calculate stats for each task
    relevantTasks.forEach((task: Task) => {
      const assigneeId = task.assignee_id || 'unassigned';
      if (!stats[assigneeId]) {
        stats[assigneeId] = {
          assigned: 0,
          inProgress: 0,
          completed: 0,
          tasks: []
        };
      }
      
      stats[assigneeId].assigned++;
      stats[assigneeId].tasks.push(task);
      
      if (task.status === 'In Progress') {
        stats[assigneeId].inProgress++;
      } else if (task.status === 'Done') {
        stats[assigneeId].completed++;
      }
    });

    return stats;
  }, [tasks, teamMembers, project?.team_lead_id]);

  // Get all task IDs for team discussion
  const allTaskIds = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    let relevantTasks = tasks;
    if (project?.team_lead_id) {
      relevantTasks = tasks.filter((task: Task) => task.reporter_id === project.team_lead_id);
    }
    return relevantTasks.map((t: Task) => t.id);
  }, [tasks, project?.team_lead_id]);

  // Fetch team lead details
  const { data: teamLead } = useQuery({
    queryKey: ['user', project?.team_lead_id],
    queryFn: async () => {
      if (!project?.team_lead_id) return null;
      const users = await usersAPI.list();
      return users.find(u => u.id === project.team_lead_id) || null;
    },
    enabled: !!project?.team_lead_id,
  });

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  };

  if (projectLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <Link to="/projects" className="text-indigo-600 hover:text-indigo-800">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const projectStarred = project?.id ? isStarred('project', user?.id, project.id) : false;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link to="/projects" className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
          ← Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toggleStarred('project', user?.id, { id: project.id, label: project.name, path: `/projects/${project.id}` });
                setStarTick((x) => x + 1);
              }}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                projectStarred
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={projectStarred ? 'Starred' : 'Star'}
            >
              <Star className={`w-4 h-4 ${projectStarred ? 'fill-current' : ''}`} />
            </button>

            {canCreateProject && (
              <button
                onClick={() => navigate(`/projects/${id}/edit`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </button>
            )}
            {canCreateProject && (
              <button
                onClick={() => navigate(`/projects/${id}/workflow`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Workflow className="w-4 h-4 mr-2" />
                Workflow Settings
              </button>
            )}
          </div>
        </div>
        {((project as any).summary || '').trim() && (
          <p className="mt-2 text-gray-700 dark:text-gray-300 font-medium">
            {(project as any).summary}
          </p>
        )}
        <p className="mt-2 text-gray-600 dark:text-gray-400">{project.description || 'No description provided'}</p>
        <div className="mt-4 flex items-center space-x-4 flex-wrap gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            project.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            project.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
            project.status === 'Blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {project.status}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Progress: {typeof project.progress_percentage === 'number' 
              ? project.progress_percentage.toFixed(0) 
              : Number(project.progress_percentage || 0).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Project Details Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company */}
            <div className="flex items-start space-x-3">
              <Briefcase className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Company name</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {(project as any).company_name ? (project as any).company_name : <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            {/* Owner */}
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Owner</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {getUserDisplayName(project.manager_id) || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            {/* What we are building */}
            <div className="flex items-start space-x-3">
              <Briefcase className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">What we are building</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {project.work_type ? project.work_type : <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            {/* Project category/type */}
            <div className="flex items-start space-x-3">
              <ListTodo className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Project category/type</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {(project as any).category ? (project as any).category : <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            {/* Team Lead */}
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Team Lead</p>
                {project.team_lead_id ? (
                  teamLead ? (
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {teamLead.first_name} {teamLead.last_name}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading...</p>
                  )
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">Not assigned</p>
                )}
              </div>
            </div>

            {/* Reported by */}
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reported by</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {getUserDisplayName((project as any).reported_by_id) || <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            {/* Start Date */}
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {project.start_date ? formatDate(project.start_date) : <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {project.end_date ? formatDate(project.end_date) : <span className="text-gray-400 italic">Not set</span>}
                </p>
              </div>
            </div>

            {/* Original estimate */}
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Original estimated (days)</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {(project as any).original_estimated_days != null ? (project as any).original_estimated_days : <span className="text-gray-400 italic">Calculated from start/end</span>}
                </p>
              </div>
            </div>

            {/* Budget (CEO/Manager only) */}
            {canSeeBudget && (
              <div className="flex items-start space-x-3">
                <Briefcase className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {(project as any).budget != null ? (project as any).budget : <span className="text-gray-400 italic">Not set</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Labels + URL + Attachments */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <ListTodo className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Labels</p>
                  {Array.isArray((project as any).labels) && (project as any).labels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(project as any).labels.map((l: string) => (
                        <span key={l} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                          {l}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No labels</p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Link2 className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">URL</p>
                  {(project as any).url ? (
                    <a
                      href={(project as any).url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all"
                    >
                      {(project as any).url}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-1">Not set</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Paperclip className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Attachments</p>
                  {canCreateProject && (
                    <input
                      type="file"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        const toBase64 = (file: File) =>
                          new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                        try {
                          for (const f of files) {
                            await projectsAPI.addAttachment(id!, {
                              file_name: f.name,
                              file_type: f.type || 'application/octet-stream',
                              file_data: await toBase64(f),
                              file_size: f.size,
                            });
                          }
                          queryClient.invalidateQueries({ queryKey: ['project', id] });
                          e.currentTarget.value = '';
                        } catch {
                          // ignore
                        }
                      }}
                      className="text-xs text-gray-700 dark:text-gray-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700"
                    />
                  )}
                </div>

                {Array.isArray((project as any).attachments) && (project as any).attachments.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {(project as any).attachments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{a.file_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{Math.round((a.file_size || 0) / 1024)} KB</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const byteString = atob(a.file_data || '');
                                const ab = new ArrayBuffer(byteString.length);
                                const ia = new Uint8Array(ab);
                                for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                                const blob = new Blob([ab], { type: a.file_type || 'application/octet-stream' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = a.file_name || 'attachment';
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                URL.revokeObjectURL(url);
                              } catch {
                                // ignore
                              }
                            }}
                            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          >
                            Download
                          </button>
                          {canCreateProject && (
                            <button
                              type="button"
                              onClick={async () => {
                                await projectsAPI.removeAttachment(id!, a.id);
                                queryClient.invalidateQueries({ queryKey: ['project', id] });
                              }}
                              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 italic">No attachments</p>
                )}
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Team Members ({teamMembers.length})
                </p>
                {teamMembers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-xs font-semibold mr-2">
                          {member.first_name?.[0] || member.email?.[0] || 'U'}
                        </span>
                        {member.full_name || `${member.first_name} ${member.last_name}`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No team members assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Tasks Section - Split into Two Parts */}
      {tasksLoading ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading tasks...</div>
        </div>
      ) : (tasks && Array.isArray(tasks) && tasks.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Part: Team Members with Task Statistics */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click on a member to see their tasks</p>
            </div>
            <div className="p-4 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-modern">
              {teamMembers.length > 0 ? (
                teamMembers.map((member: any) => {
                  const stats = memberTaskStats[member.id] || { assigned: 0, inProgress: 0, completed: 0, tasks: [] };
                  const isSelected = selectedMemberId === member.id;
                  const memberInitial = member.first_name?.[0] || member.email?.[0] || 'U';
                  const memberName = member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email;

                  return (
                    <div key={member.id}>
                      <button
                        onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                        className={`w-full p-4 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {memberInitial}
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{memberName}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 text-sm flex-shrink-0">
                            <div className="text-center min-w-[50px]">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.assigned}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Assigned</div>
                            </div>
                            <div className="text-center min-w-[50px]">
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">In Progress</div>
                            </div>
                            <div className="text-center min-w-[50px]">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
                            </div>
                          </div>
                        </div>
                      </button>
                      
                      {/* Expanded Task Details */}
                      {isSelected && stats.tasks.length > 0 && (
                        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Task Details</h4>
                          <div className="space-y-3">
                            {stats.tasks.map((task: Task) => (
                              <div
                                key={task.id}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h5>
                                    {task.description && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                                    )}
                                  </div>
                                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span className={`px-2 py-0.5 rounded ${
                                    task.status === 'Done' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  }`}>
                                    {task.status}
                                  </span>
                                  {task.due_date && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDateShort(task.due_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  No team members assigned to this project
                </div>
              )}
              
              {/* Unassigned Tasks */}
              {(() => {
                const unassignedStats = memberTaskStats['unassigned'] || { assigned: 0, inProgress: 0, completed: 0, tasks: [] };
                if (unassignedStats.assigned === 0) return null;
                
                const isSelected = selectedMemberId === 'unassigned';
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setSelectedMemberId(selectedMemberId === 'unassigned' ? null : 'unassigned')}
                      className={`w-full p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            U
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">Unassigned</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Tasks not assigned to anyone</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 text-sm flex-shrink-0">
                          <div className="text-center min-w-[50px]">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{unassignedStats.assigned}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Assigned</div>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{unassignedStats.inProgress}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">In Progress</div>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">{unassignedStats.completed}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Expanded Unassigned Task Details */}
                    {isSelected && unassignedStats.tasks.length > 0 && (
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Task Details</h4>
                        <div className="space-y-3">
                          {unassignedStats.tasks.map((task: Task) => (
                            <div
                              key={task.id}
                              className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h5>
                                  {task.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                                  )}
                                </div>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className={`px-2 py-0.5 rounded ${
                                  task.status === 'Done' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {task.status}
                                </span>
                                {task.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDateShort(task.due_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Part: Complete Team Discussion */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Discussion</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All discussions for project tasks</p>
            </div>
            <div className="p-6">
              <TeamDiscussionSection taskIds={allTaskIds} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Tasks Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {project?.team_lead_id 
                ? 'The team lead hasn\'t created any tasks for this project yet.'
                : 'This project doesn\'t have any tasks yet. Create your first task to get started!'}
            </p>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['tasks', id] });
                refetchTasks();
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Refresh Tasks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
