import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';

export default function ReportsList() {
  const { user } = useAuth();
  const { isCEO, isManager, isTeamLead, isMember } = useUserRole();

  // Determine report type based on role
  const reportType = isCEO 
    ? 'manager' // CEO views reports from managers
    : isManager 
      ? 'teamlead' // Manager views reports from team leads
      : isTeamLead 
        ? 'member' // Team Lead views reports from members
        : null; // Members don't view reports

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', reportType],
    queryFn: () => {
      if (!reportType) return Promise.resolve([]);
      return reportsAPI.list({ report_type: reportType, status: 'submitted' });
    },
    enabled: !!reportType,
  });

  if (!reportType) {
    return null; // Members don't view reports
  }

  if (isLoading) {
    return (
      <div className="card p-6 bg-white">
        <p className="text-gray-500">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="card bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {isCEO && 'Manager Reports'}
          {isManager && 'Team Lead Reports'}
          {isTeamLead && 'Member Reports'}
        </h2>
      </div>
      <div className="divide-y divide-gray-200">
        {reports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No reports submitted yet
          </div>
        ) : (
          reports.map((report: any) => (
            <div key={report.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {report.user_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {report.submitted_at 
                        ? new Date(report.submitted_at).toLocaleDateString()
                        : new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {report.project_name && (
                    <p className="text-xs text-gray-500 mb-1">
                      Project: {report.project_name}
                    </p>
                  )}
                  {report.task_title && (
                    <p className="text-xs text-gray-500 mb-2">
                      Task: {report.task_title}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 mb-2">{report.content}</p>
                  {report.progress_percentage !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Progress:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${report.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {report.progress_percentage}%
                      </span>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  report.status === 'submitted' 
                    ? 'bg-blue-100 text-blue-800'
                    : report.status === 'reviewed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {report.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
