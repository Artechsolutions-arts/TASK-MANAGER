import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, projectsAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
import { useTheme } from '../context/ThemeContext';
import ReportsList from '../components/ReportsList';
import SubmitReportForm from '../components/SubmitReportForm';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ReportsPage() {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('30');
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'submit'>('analytics');
  const { canViewReports } = useUserRole();
  const { resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === 'dark';
  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
    border: `1px solid ${isDark ? 'rgb(55, 65, 81)' : '#e5e7eb'}`,
    borderRadius: '6px',
    color: isDark ? 'rgb(243, 244, 246)' : '#111827',
  }), [isDark]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => analyticsAPI.getDashboard(),
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list(),
  });

  // Fetch workload data
  const { data: workloadData, error: workloadError } = useQuery({
    queryKey: ['workload'],
    queryFn: () => analyticsAPI.getWorkload(),
  });
  const workloadList = Array.isArray(workloadData) ? workloadData : [];

  // Fetch burndown data if project is selected
  const { data: burndownData = [] } = useQuery({
    queryKey: ['burndown', selectedProject],
    queryFn: () => {
      if (selectedProject === 'all' || !selectedProject) return Promise.resolve([]);
      return analyticsAPI.getBurndown(selectedProject);
    },
    enabled: selectedProject !== 'all' && !!selectedProject,
  });

  // Prepare workload chart data
  const workloadChartData = workloadList.map((item: any) => ({
    name: item.user_name?.split(' ')[0] || 'User', // First name only
    tasks: Number(item.task_count || 0),
    completed: Number(item.completed_task_count || 0),
    overdue: Number(item.overdue_task_count || 0),
  }));

  return (
    <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reports</h1>
        <p className="text-gray-500 dark:text-gray-400">Analytics and reporting dashboard</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Analytics
          </button>
          {canViewReports && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Submitted Reports
            </button>
          )}
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'submit'
                ? 'border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Submit Report
          </button>
        </nav>
      </div>

      {activeTab === 'submit' ? (
        <SubmitReportForm />
      ) : activeTab === 'reports' && canViewReports ? (
        <ReportsList />
      ) : (
        <>
      {/* Filters */}
      <div className="card p-4 mb-6 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            >
              <option value="all">All Projects</option>
              {projects.map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {dashboardLoading ? (
        <div className="card p-12 text-center bg-white dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 bg-white dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Projects</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardData?.total_projects || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {dashboardData?.active_projects || 0} active
              </div>
            </div>
            <div className="card p-4 bg-white dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tasks</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardData?.total_tasks || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {dashboardData?.completed_tasks || 0} completed
              </div>
            </div>
            <div className="card p-4 bg-white dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Team Members</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardData?.team_members || 0}
              </div>
            </div>
            <div className="card p-4 bg-white dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completion Rate</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardData?.total_tasks
                  ? Math.round(
                      ((dashboardData.completed_tasks || 0) / dashboardData.total_tasks) * 100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Chart */}
            <div className="card p-6 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Workload</h2>
              {(workloadError as any)?.response?.status === 403 ? (
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  You don't have permission to view workload data
                </div>
              ) : workloadChartData.length > 0 ? (
                <div style={{ width: '100%', height: '300px' }} className="dark:bg-gray-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        className="dark:stroke-gray-400"
                        tick={{ fill: '#6b7280' }}
                        className="dark:[&_text]:fill-gray-400"
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        className="dark:stroke-gray-400"
                        tick={{ fill: '#6b7280' }}
                        className="dark:[&_text]:fill-gray-400"
                      />
                      <Tooltip 
                        contentStyle={tooltipStyle}
                      />
                      <Legend 
                        wrapperStyle={{ color: isDark ? 'rgb(243, 244, 246)' : '#111827' }}
                      />
                      <Bar dataKey="tasks" fill="#3b82f6" name="Total Tasks" />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" />
                      <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
                  No workload data available
                </div>
              )}
            </div>

            {/* Burndown Chart */}
            {burndownData.length > 0 ? (
              <div className="card p-6 bg-white dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Burndown Chart</h2>
                <div style={{ width: '100%', height: '300px' }} className="dark:bg-gray-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={burndownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        className="dark:stroke-gray-400"
                        tick={{ fill: '#6b7280' }}
                        className="dark:[&_text]:fill-gray-400"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        className="dark:stroke-gray-400"
                        tick={{ fill: '#6b7280' }}
                        className="dark:[&_text]:fill-gray-400"
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Legend 
                        wrapperStyle={{ color: isDark ? 'rgb(243, 244, 246)' : '#111827' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="planned_hours"
                        stroke="#3b82f6"
                        name="Planned Hours"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual_hours"
                        stroke="#10b981"
                        name="Actual Hours"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="remaining_hours"
                        stroke="#ef4444"
                        name="Remaining Hours"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="card p-6 bg-white dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Burndown Chart</h2>
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
                  Select a project to view burndown chart
                </div>
              </div>
            )}
          </div>

          {/* Workload Table */}
          <div className="card bg-white dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Workload Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Team Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Total Tasks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Overdue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Total Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {workloadList.length > 0 ? (
                    workloadList.map((item: any) => {
                      const totalHours = typeof item.total_hours === 'number' 
                        ? item.total_hours 
                        : Number(item.total_hours || 0);
                      return (
                        <tr key={item.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.user_name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.task_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                            {item.completed_task_count || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                            {item.overdue_task_count || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {totalHours.toFixed(1)}h
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        {(workloadError as any)?.response?.status === 403 
                          ? 'You don\'t have permission to view workload data'
                          : 'No workload data available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
