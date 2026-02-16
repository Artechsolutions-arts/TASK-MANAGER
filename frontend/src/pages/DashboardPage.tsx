import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsAPI, aiAPI, tasksAPI, projectsAPI, usersAPI, timeAPI, teamsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../utils/permissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  CheckSquare, 
  CheckCircle2, 
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  User,
  Plus,
  ChevronDown,
  TrendingUp,
  X,
  MessageSquare
} from 'lucide-react';
import TaskStatusControls from '../components/TaskStatusControls';
import TaskReportForm from '../components/TaskReportForm';
import ActivitySection from '../components/ActivitySection';
import TaskDependencies from '../components/TaskDependencies';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, parseISO, startOfDay } from 'date-fns';
import todayTaskImage from '../assets/today task.png';

const WEEKDAY_LABELS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isCEO, isManager, isMember, isTeamLead, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const canViewAISummary = isCEO || isManager;
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => startOfDay(new Date()));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      navigate('/employees', { replace: true });
    }
  }, [isAdmin, navigate]);
  
  // Get user roles to determine dashboard type
  const userRole = user?.roles?.[0]?.name || 'Member';
  
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', userRole],
    queryFn: () => analyticsAPI.getDashboard(userRole),
  });

  // Fetch all tasks for the user
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', 'all', user?.id],
    queryFn: () => tasksAPI.list({ assignee_id: user?.id }),
    enabled: !!user?.id,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list(),
  });

  // Fetch all users (for CEO/Manager/Team Lead - to resolve names for team members)
  const { data: allUsersList = [] } = useQuery({
    queryKey: ['team-members', 'users'],
    queryFn: () => usersAPI.list(),
    enabled: isCEO || isManager || isTeamLead,
  });

  // Fetch teams list (for Team Lead - to find team they lead)
  const { data: teamsList = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list(),
    enabled: isTeamLead,
  });
  const myTeamId = useMemo(
    () => teamsList.find((t: any) => t.team_lead_id === user?.id)?.id,
    [teamsList, user?.id]
  );
  const { data: myTeam = null } = useQuery({
    queryKey: ['team', myTeamId],
    queryFn: () => teamsAPI.get(myTeamId!),
    enabled: isTeamLead && !!myTeamId,
  });

  // Project IDs the current user is in (from their tasks) - for Member to see project team mates
  const myProjectIds = useMemo(
    () => [...new Set((allTasks || []).map((t: any) => t.project_id).filter(Boolean))] as string[],
    [allTasks]
  );
  const { data: projectTeamMembersArrays = [] } = useQuery({
    queryKey: ['project-team-members', myProjectIds.join(',')],
    queryFn: () =>
      Promise.all(myProjectIds.map((id: string) => projectsAPI.getTeamMembers(id))),
    enabled: isMember && myProjectIds.length > 0,
  });

  // Resolved team members list: CEO/Manager = all users (excl. self); Team Lead = my team members; Member = project team mates
  const teamMembers = useMemo(() => {
    if (isCEO || isManager) {
      return (allUsersList || []).filter((m: any) => m.id !== user?.id);
    }
    if (isTeamLead && myTeam?.members && allUsersList?.length) {
      const memberIds = new Set((myTeam.members as any[]).map((m: any) => m.user_id));
      return allUsersList
        .filter((u: any) => memberIds.has(u.id) && u.id !== user?.id)
        .map((u: any) => ({ ...u, roleLabel: u.roles?.[0]?.name || 'Team member' }));
    }
    if (isMember && projectTeamMembersArrays?.length) {
      const flat = projectTeamMembersArrays.flat();
      const byId = new Map<string, any>();
      flat.forEach((m: any) => byId.set(m.id, m));
      return [...byId.values()].filter((m: any) => m.id !== user?.id);
    }
    return [];
  }, [
    isCEO,
    isManager,
    isMember,
    isTeamLead,
    allUsersList,
    user?.id,
    myTeam?.members,
    projectTeamMembersArrays,
  ]);

  // Fetch time entries for weekly metrics
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', user?.id],
    queryFn: () => timeAPI.list({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // Calculate task progress based on status
  const getTaskProgress = (task: any) => {
    switch (task.status) {
      case 'Done':
      case 'Completed':
        return 100;
      case 'In Progress':
        return 50;
      case 'Review':
        return 75;
      case 'To Do':
        return 0;
      default:
        return 0;
    }
  };

  // Calculate days left until due date
  const getDaysLeft = (dueDate: string | undefined) => {
    if (!dueDate) return null;
    const due = parseISO(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get tasks for today
  const todayTasks = useMemo(() => {
    const today = new Date();
    return allTasks.filter((task: any) => {
      if (!task.due_date) return false;
      const due = parseISO(task.due_date);
      return isSameDay(due, today);
    }).slice(0, 3);
  }, [allTasks]);

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = useMemo(() => {
    return allTasks
      .filter((task: any) => {
        if (!task.due_date) return false;
        const due = parseISO(task.due_date);
        const today = new Date();
        const nextWeek = addDays(today, 7);
        return due >= today && due <= nextWeek;
      })
      .sort((a: any, b: any) => {
        const dateA = parseISO(a.due_date);
        const dateB = parseISO(b.due_date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3);
  }, [allTasks]);

  // Weekly task data for chart
  const weeklyTaskData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return weekDays.map((day) => {
      const dayTasks = allTasks.filter((task: any) => {
        if (!task.due_date) return false;
        return isSameDay(parseISO(task.due_date), day);
      });
      return {
        day: format(day, 'EEE'),
        date: format(day, 'd'),
        tasks: dayTasks.length,
      };
    });
  }, [allTasks]);

  // Calculate weekly metrics
  const weeklyMetrics = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekTimeEntries = timeEntries.filter((entry: any) => {
      const entryDate = parseISO(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
    
    const totalHours = weekTimeEntries.reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0);
    const completedTasks = allTasks.filter((t: any) => t.status === 'Done' || t.status === 'Completed').length;
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      timeSpent: totalHours,
      timeSpentPercent: 120, // Mock percentage
      tasksCompleted: completedTasks,
      tasksCompletedPercent: completionRate,
      projectsActive: projects.filter((p: any) => p.status === 'In Progress').length,
      projectsActivePercent: 100, // Mock percentage
    };
  }, [timeEntries, allTasks, projects]);

  // Get user's role name for display
  const userRoleName = useMemo(() => {
    if (user?.roles && user.roles.length > 0) {
      const role = user.roles[0].name;
      if (role === 'Member') return 'Employee';
      return role;
    }
    return 'Employee';
  }, [user]);

  // Get scheduled tasks for the selected calendar day
  const scheduledTasksForSelectedDay = useMemo(() => {
    return allTasks
      .filter((task: any) => {
        if (!task.due_date) return false;
        return isSameDay(parseISO(task.due_date), selectedCalendarDate);
      })
      .map((task: any) => ({
        ...task,
        time: format(parseISO(task.due_date), 'HH:mm'),
      }))
      .sort((a: any, b: any) => a.time.localeCompare(b.time));
  }, [allTasks, selectedCalendarDate]);

  // Get current week days for calendar (Mon–Sun)
  const calendarDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12 text-red-600">Error loading dashboard</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">No data available</div>
      </div>
    );
  }

  const displayTasks = upcomingTasks.length > 0 ? upcomingTasks : allTasks.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex gap-6 p-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Hi, {user?.first_name || user?.email || 'User'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Let's finish your task today!</p>
          </div>

          {/* Today Task Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Today Task</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Check your daily tasks and schedules
                </p>
                <Link
                  to="/tasks"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                  Today's schedule
                </Link>
              </div>
              <div className="hidden md:block w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30">
                <img src={todayTaskImage} alt="Today Task" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          {/* Task Progress Cards - click opens task details popup, no project page */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayTasks.map((task: any) => {
              const progress = getTaskProgress(task);
              const daysLeft = getDaysLeft(task.due_date);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className="w-full text-left block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      {task.title}
                    </span>
                  </div>
                  {task.due_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {format(parseISO(task.due_date), 'MMM d, yyyy')}
                    </p>
                  )}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
                      {daysLeft !== null && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)} days overdue`}
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {task.assignee_id && (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                        </div>
                      )}
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tasks Progress Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tasks Progress</h2>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Weekly</span>
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTaskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6B7280"
                    className="dark:stroke-gray-400"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    className="dark:stroke-gray-400"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    domain={[0, 'dataMax + 2']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="tasks" 
                    fill="#9333EA" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Weekly</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Time spent</span>
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded">
                    {weeklyMetrics.timeSpentPercent}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{weeklyMetrics.timeSpent}h</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</span>
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded">
                    {weeklyMetrics.tasksCompletedPercent}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{weeklyMetrics.tasksCompleted}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Projects</span>
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded">
                    {weeklyMetrics.projectsActivePercent}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{weeklyMetrics.projectsActive}</p>
              </div>
            </div>
          </div>

          {/* Assignments Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Assignments ({allTasks.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {allTasks.filter((t: any) => t.status === 'Done' || t.status === 'Completed').length}/{allTasks.length} completed
                </p>
              </div>
              <Link
                to="/tasks"
                className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {allTasks.slice(0, 4).map((task: any) => {
                const isCompleted = task.status === 'Done' || task.status === 'Completed';
                const project = projects.find((p: any) => p.id === task.project_id);
                
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      readOnly
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <Link
                        to={`/projects/${task.project_id}`}
                        className={`text-sm font-medium ${
                          isCompleted
                            ? 'text-gray-500 dark:text-gray-400 line-through'
                            : 'text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400'
                        }`}
                      >
                        {task.title}
                      </Link>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {format(parseISO(task.due_date), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {isCompleted ? (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {Math.round(getTaskProgress(task))}/100 Completed
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {Math.round(getTaskProgress(task))}/100 To Do
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-80 space-y-6">
          {/* User Profile Card - links to Settings */}
          <Link
            to="/settings"
            className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
                {user?.first_name?.[0] || user?.email?.[0] || 'U'}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {user?.first_name} {user?.last_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{userRoleName}</p>
            </div>
          </Link>

          {/* Calendar and Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {format(new Date(), 'MMMM')}
              </h3>
              <Link
                to="/tasks/new"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                + Add Task
              </Link>
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {WEEKDAY_LABELS.map((day, idx) => {
                const dayDate = calendarDays[idx];
                if (!dayDate) return null;
                const dayStart = startOfDay(dayDate);
                const todayStart = startOfDay(new Date());
                const selectedStart = startOfDay(selectedCalendarDate);
                const isToday = isSameDay(dayStart, todayStart);
                const isSelected = isSameDay(dayStart, selectedStart);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedCalendarDate(dayStart)}
                    className="text-center cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{day}</p>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mx-auto ${
                        isToday
                          ? 'bg-purple-600 text-white'
                          : isSelected
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                            : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {format(dayDate, 'd')}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
                {['09:00', '10:00', '11:00', '12:00', '01:00'].map((time) => (
                  <div key={time} className="flex items-center gap-2">
                    <span className="w-12">{time}</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
              
              {/* Scheduled Tasks for selected day */}
              <div className="space-y-2 mt-4">
                {scheduledTasksForSelectedDay.map((task: any) => (
                  <Link
                    key={task.id}
                    to={task.project_id ? `/projects/${task.project_id}` : '/tasks'}
                    className="block p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <p className="text-xs font-medium text-purple-900 dark:text-purple-300">
                      {task.time} - {task.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Team Members - always visible below calendar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Team Members</h3>
            {teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.slice(0, 5).map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {member.first_name?.[0] || member.email?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {member.roles?.[0]?.name || member.roleLabel || 'Team mate'}
                      </p>
                    </div>
                  </div>
                ))}
                {teamMembers.length > 5 && (
                  <Link
                    to="/teams"
                    className="block text-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium pt-2"
                  >
                    See all
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                {isCEO || isManager
                  ? 'No team members yet.'
                  : isTeamLead
                    ? 'No team members in your team yet.'
                    : isMember
                      ? 'No project team mates yet. Join a project to see team members here.'
                      : 'No team members to display.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Task details popup - same as Tasks page */}
      {selectedTaskId && (() => {
        const selectedTask = allTasks.find((t: any) => t.id === selectedTaskId);
        if (!selectedTask) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedTaskId(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-task-detail-title"
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 id="dashboard-task-detail-title" className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                  Task details
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(null)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Task name</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedTask.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Due date</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedTask.due_date ? format(parseISO(selectedTask.due_date), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned time</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedTask.created_at ? format(parseISO(selectedTask.created_at), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Assigned to</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedTask.assignee_id === user?.id ? 'You' : (selectedTask.assignee_id ? 'Team member' : 'Unassigned')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status & progress</p>
                  <TaskStatusControls task={selectedTask} />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    View details & activity
                  </h3>
                  <div className="space-y-4 pl-1">
                    <div>
                      <TaskDependencies task={selectedTask} />
                    </div>
                    {isMember && selectedTask.assignee_id === user?.id && (
                      <div>
                        <TaskReportForm task={selectedTask} onClose={() => {}} />
                      </div>
                    )}
                    <div>
                      <ActivitySection entityType="task" entityId={selectedTask.id} />
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    to={`/projects/${selectedTask.project_id}`}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Open project →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
