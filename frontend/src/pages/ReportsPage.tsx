import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, projectsAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
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
    <div className="px-6 py-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-500">Analytics and reporting dashboard</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
          {canViewReports && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Submitted Reports
            </button>
          )}
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'submit'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
      <div className="card p-4 mb-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {dashboardLoading ? (
        <div className="card p-12 text-center bg-white">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 bg-white">
              <div className="text-sm text-gray-600 mb-1">Total Projects</div>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData?.total_projects || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {dashboardData?.active_projects || 0} active
              </div>
            </div>
            <div className="card p-4 bg-white">
              <div className="text-sm text-gray-600 mb-1">Total Tasks</div>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData?.total_tasks || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {dashboardData?.completed_tasks || 0} completed
              </div>
            </div>
            <div className="card p-4 bg-white">
              <div className="text-sm text-gray-600 mb-1">Team Members</div>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData?.team_members || 0}
              </div>
            </div>
            <div className="card p-4 bg-white">
              <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
              <div className="text-2xl font-bold text-gray-900">
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
            <div className="card p-6 bg-white">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Workload</h2>
              {(workloadError as any)?.response?.status === 403 ? (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  You don't have permission to view workload data
                </div>
              ) : workloadChartData.length > 0 ? (
                <div style={{ width: '100%', height: '300px', backgroundColor: '#fff' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                      />
                      <Legend />
                      <Bar dataKey="tasks" fill="#3b82f6" name="Total Tasks" />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" />
                      <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white">
                  No workload data available
                </div>
              )}
            </div>

            {/* Burndown Chart */}
            {burndownData.length > 0 ? (
              <div className="card p-6 bg-white">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Burndown Chart</h2>
                <div style={{ width: '100%', height: '300px', backgroundColor: '#fff' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={burndownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Legend />
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
              <div className="card p-6 bg-white">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Burndown Chart</h2>
                <div className="h-[300px] flex items-center justify-center text-gray-500 bg-white">
                  Select a project to view burndown chart
                </div>
              </div>
            )}
          </div>

          {/* Workload Table */}
          <div className="card bg-white">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Team Workload Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Team Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Tasks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Overdue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workloadList.length > 0 ? (
                    workloadList.map((item: any) => {
                      const totalHours = typeof item.total_hours === 'number' 
                        ? item.total_hours 
                        : Number(item.total_hours || 0);
                      return (
                        <tr key={item.user_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.user_name || 'Unknown'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.task_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-green-600">
                            {item.completed_task_count || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600">
                            {item.overdue_task_count || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {totalHours.toFixed(1)}h
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
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
