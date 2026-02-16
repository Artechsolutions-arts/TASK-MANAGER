import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workSheetsAPI, usersAPI, teamsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUserRole } from '../utils/permissions';
import { hasRole } from '../utils/permissions';
import type { WorkSheet, WorkSheetCreate, WorkSheetUpdate } from '../types';
import { Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, parse, isValid } from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function WorkSheetPage() {
  const { user } = useAuth();
  const { isCEO, isManager, isTeamLead } = useUserRole();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null); // For CEO/Manager/TeamLead
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [showNewSheetModal, setShowNewSheetModal] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [formData, setFormData] = useState<WorkSheetCreate>({
    sheet_name: '',
    task_id: '',
    task_name: '',
    start_date: '',
    due_date: '',
    status: 'IN-PROGRESS',
    completion_percentage: undefined,
    notes: '',
  });

  // Check if user can view other users' sheets
  const canViewOthers = isCEO || isManager || isTeamLead;
  
  // For CEO/Manager/TeamLead: use selectedMemberId, otherwise use selectedUserId or current user
  const effectiveUserId = canViewOthers 
    ? (selectedMemberId || selectedUserId || user?.id || null)
    : (selectedUserId || user?.id || null);

  // Fetch users for filter (if user has permission)
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list(),
    enabled: canViewOthers,
  });

  // Fetch teams (for grouping members)
  const { data: teamsList = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list(),
    enabled: canViewOthers,
  });

  // Fetch each team's members (teams with members)
  const teamIds = useMemo(() => teamsList.map((t: any) => t.id), [teamsList]);
  const teamsWithMembersQueries = useQuery({
    queryKey: ['teams', 'with-members', teamIds],
    queryFn: async () => {
      const results = await Promise.all(
        teamIds.map((id: string) => teamsAPI.get(id))
      );
      return results;
    },
    enabled: canViewOthers && teamIds.length > 0,
  });
  const teamsWithMembers = teamsWithMembersQueries.data || [];
  const usersById = useMemo(() => {
    const map: Record<string, any> = {};
    (users as any[]).forEach((u: any) => { map[u.id] = u; });
    return map;
  }, [users]);

  // Group users for display: Leadership (CEO/Manager), then per Team (e.g. AI/ML, Developer Team), then Other
  const memberSections = useMemo(() => {
    if (!canViewOthers || !Array.isArray(users) || users.length === 0) return [];
    const userList = users as any[];
    const sections: { title: string; users: any[] }[] = [];
    const alreadyShown = new Set<string>();

    // Leadership: CEO & Managers
    const leadership = userList.filter(
      (u: any) => hasRole(u, 'CEO') || hasRole(u, 'Manager')
    );
    if (leadership.length > 0) {
      sections.push({ title: 'Leadership', users: leadership });
      leadership.forEach((u: any) => alreadyShown.add(u.id));
    }

    // Per-team: AI/ML, Developer Team, etc. (team leads appear under their team)
    (teamsWithMembers as any[]).forEach((team: any) => {
      const memberUserIds = (team.members || [])
        .filter((m: any) => m.left_at == null)
        .map((m: any) => (typeof m.user_id === 'string' ? m.user_id : (m.user_id as any)?.toString?.() ?? m.user_id));
      const teamUsers = memberUserIds
        .map((id: string) => usersById[id])
        .filter(Boolean);
      teamUsers.forEach((u: any) => alreadyShown.add(u.id));
      if (teamUsers.length > 0) {
        sections.push({ title: team.name || 'Team', users: teamUsers });
      }
    });

    // Other: users not in Leadership and not in any team
    const other = userList.filter((u: any) => !alreadyShown.has(u.id));
    if (other.length > 0) {
      sections.push({ title: 'Other', users: other });
    }

    return sections;
  }, [canViewOthers, users, teamsWithMembers, usersById]);

  // Fetch available sheets for the effective user
  const { data: availableSheets = [], refetch: refetchSheets } = useQuery({
    queryKey: ['work-sheets', 'available-sheets', effectiveUserId],
    queryFn: () => workSheetsAPI.getAvailableSheets({ 
      assigned_to: effectiveUserId || undefined 
    }),
    enabled: !!effectiveUserId,
  });

  // Set default sheet when sheets are loaded
  useEffect(() => {
    if (availableSheets.length > 0 && !selectedSheet) {
      setSelectedSheet(availableSheets[0]);
    } else if (availableSheets.length === 0 && !selectedSheet) {
      // Don't clear selectedSheet if user manually created one
      // Only clear if there are no sheets and no manual selection
    }
  }, [availableSheets]);

  // Reset sheet when member changes
  useEffect(() => {
    if (selectedMemberId) {
      setSelectedSheet('');
    }
  }, [selectedMemberId]);

  // Fetch work sheets for selected sheet and user
  const { data: workSheetsRaw = [], isLoading } = useQuery({
    queryKey: ['work-sheets', effectiveUserId, selectedSheet],
    queryFn: () => workSheetsAPI.list({ 
      assigned_to: effectiveUserId || undefined,
      sheet_name: selectedSheet || undefined,
      limit: 500 
    }),
    enabled: !!selectedSheet && !!effectiveUserId,
  });

  // Sort work sheets by task_id (TSK01, TSK02, etc.) so TSK01 appears first
  const workSheets = [...workSheetsRaw].sort((a, b) => {
    // Extract numeric part from task_id (e.g., "TSK01" -> 1, "TSK22" -> 22)
    const getTaskNumber = (taskId: string): number => {
      const match = taskId.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };
    return getTaskNumber(a.task_id) - getTaskNumber(b.task_id);
  });

  const createMutation = useMutation({
    mutationFn: (data: WorkSheetCreate) => workSheetsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['work-sheets', 'available-sheets'] });
      setShowCreateForm(false);
      resetForm();
      // Refetch sheets after a short delay to ensure the new sheet appears
      setTimeout(() => {
        refetchSheets();
      }, 300);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkSheetUpdate }) => 
      workSheetsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-sheets'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workSheetsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-sheets'] });
    },
  });

  const resetForm = () => {
    setFormData({
      sheet_name: selectedSheet || '',
      task_id: '',
      task_name: '',
      start_date: '',
      due_date: '',
      status: 'IN-PROGRESS',
      completion_percentage: undefined,
      notes: '',
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task_id || !formData.task_name || !formData.sheet_name) {
      alert('Sheet Name, Task ID and Task Name are required');
      return;
    }
    // Backend will set assigned_to automatically based on current user
    createMutation.mutate(formData);
  };

  const handleCreateNewSheet = () => {
    if (!newSheetName.trim()) {
      alert('Please enter a sheet name');
      return;
    }
    if (!effectiveUserId) {
      alert('Please select a user first');
      return;
    }
    // Set the new sheet as selected - it will be created when first entry is added
    setSelectedSheet(newSheetName.trim());
    setShowNewSheetModal(false);
    setNewSheetName('');
    resetForm();
    // Update form with new sheet name
    setFormData(prev => ({ ...prev, sheet_name: newSheetName.trim() }));
  };

  const handleEdit = (workSheet: WorkSheet) => {
    if (workSheet.assigned_to !== user?.id) {
      alert('You can only edit your own work sheet entries');
      return;
    }
    setEditingId(workSheet.id);
    setFormData({
      sheet_name: workSheet.sheet_name,
      task_id: workSheet.task_id,
      task_name: workSheet.task_name,
      start_date: workSheet.start_date || '',
      due_date: workSheet.due_date || '',
      status: workSheet.status,
      completion_percentage: workSheet.completion_percentage,
      notes: workSheet.notes || '',
    });
  };

  const handleUpdate = (id: string) => {
    const updateData: WorkSheetUpdate = {
      task_name: formData.task_name,
      start_date: formData.start_date || undefined,
      due_date: formData.due_date || undefined,
      status: formData.status,
      completion_percentage: formData.completion_percentage,
      notes: formData.notes || undefined,
    };
    updateMutation.mutate({ id, data: updateData });
  };

  const handleDelete = (id: string, assignedTo: string) => {
    if (assignedTo !== user?.id) {
      alert('You can only delete your own work sheet entries');
      return;
    }
    if (confirm('Are you sure you want to delete this entry?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'IN-PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LEAVE':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HOLIDAY':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get row background color based on status
  const getRowBackgroundColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'LEAVE':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'HOLIDAY':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return '';
    }
  };

  const getAssignedUserName = (assignedTo: string) => {
    const assignedUser = users.find((u: any) => u.id === assignedTo);
    return assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : 'Unknown';
  };

  // Update form sheet_name when selectedSheet changes
  useEffect(() => {
    if (selectedSheet) {
      setFormData(prev => ({ ...prev, sheet_name: selectedSheet }));
    }
  }, [selectedSheet]);

  // When a new entry is created, refresh the sheets list
  useEffect(() => {
    if (createMutation.isSuccess) {
      // The mutation's onSuccess already handles this, but we can also listen here
      refetchSheets();
    }
  }, [createMutation.isSuccess, refetchSheets]);

  // Get current member name for display
  const getCurrentMemberName = () => {
    if (!effectiveUserId) return '';
    const member = users.find((u: any) => u.id === effectiveUserId);
    if (member) return `${member.first_name} ${member.last_name}`;
    if (effectiveUserId === user?.id) return `${user.first_name} ${user.last_name}`;
    return 'Selected Member';
  };

  // Calculate working days (Monday-Friday) for a given month
  const getWorkingDaysForMonth = (monthName: string): Date[] => {
    try {
      // Parse month name to get year and month
      const currentYear = new Date().getFullYear();
      const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
      
      if (monthIndex === -1) {
        // Try to parse as date string
        const parsed = parse(monthName, 'MMMM yyyy', new Date());
        if (isNaN(parsed.getTime())) {
          return [];
        }
        const monthStart = startOfMonth(parsed);
        const monthEnd = endOfMonth(parsed);
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        return allDays.filter(day => !isWeekend(day)); // Monday-Friday only
      }
      
      const monthDate = new Date(currentYear, monthIndex, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      return allDays.filter(day => !isWeekend(day)); // Monday-Friday only
    } catch (error) {
      console.error('Error calculating working days:', error);
      return [];
    }
  };

  // Auto-generate tasks for all working days in the selected month
  const handleGenerateMonthlyTasks = async () => {
    if (!selectedSheet || !effectiveUserId) {
      alert('Please select a sheet and ensure a user is selected');
      return;
    }

    const workingDays = getWorkingDaysForMonth(selectedSheet);
    if (workingDays.length === 0) {
      alert('Could not calculate working days for this month. Please ensure the sheet name is a valid month name.');
      return;
    }

    // Check if tasks already exist for this sheet
    const existingTasks = workSheets.filter((ws: WorkSheet) => ws.sheet_name === selectedSheet);
    const existingDates = new Set(existingTasks.map((ws: WorkSheet) => ws.start_date));

    setIsGeneratingTasks(true);
    try {
      const tasksToCreate: WorkSheetCreate[] = workingDays.map((day, index) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        // Generate sequential Task ID: TSK01, TSK02, TSK03, etc.
        const taskNumber = (index + 1).toString().padStart(2, '0');
        const taskId = `TSK${taskNumber}`;
        
        // Skip if task already exists for this date
        if (existingDates.has(dateStr)) {
          return null;
        }

        return {
          sheet_name: selectedSheet,
          task_id: taskId,
          task_name: `Daily Work - ${format(day, 'EEEE, dd MMM yyyy')}`, // e.g., "Monday, 01 Jan 2024"
          start_date: dateStr,
          due_date: dateStr,
          status: 'IN-PROGRESS',
          completion_percentage: 0,
          notes: '',
        };
      }).filter((task): task is WorkSheetCreate => task !== null);

      // Create all tasks
      for (const task of tasksToCreate) {
        await workSheetsAPI.create(task);
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['work-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['work-sheets', 'available-sheets'] });
      
      alert(`Successfully generated ${tasksToCreate.length} task entries (TSK01-TSK${tasksToCreate.length.toString().padStart(2, '0')}) for ${selectedSheet}`);
    } catch (error) {
      console.error('Error generating tasks:', error);
      alert('Error generating tasks. Please try again.');
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 h-full flex flex-col">
      <div className="max-w-full mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              Work Sheet
              {canViewOthers && effectiveUserId && (
                <span className="text-lg font-medium text-gray-600 dark:text-gray-400 ml-2 align-baseline">
                  – {getCurrentMemberName()}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Daily work logging and task tracking
            </p>
          </div>
          {!isCEO && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
              className="btn-primary flex items-center justify-center gap-2 h-10 px-4 flex-shrink-0"
              disabled={!selectedSheet || !effectiveUserId}
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          )}
        </div>

        {/* Member Selection (for CEO/Manager/TeamLead) - Grouped by team / role */}
        {canViewOthers && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Team Member:
            </label>
            {memberSections.length === 0 ? (
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
                {(users as any[]).map((u: any) => {
                  const isSelected = selectedMemberId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(u.id);
                        setSelectedUserId(u.id);
                        setSelectedSheet('');
                      }}
                      className={`inline-flex items-center gap-2 min-h-[2.5rem] px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-white' : 'bg-blue-500'}`} aria-hidden />
                      <span className="font-medium text-left">{u.first_name} {u.last_name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {memberSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {section.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {section.users.map((u: any) => {
                        const isSelected = selectedMemberId === u.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedMemberId(u.id);
                              setSelectedUserId(u.id);
                              setSelectedSheet('');
                            }}
                            className={`inline-flex items-center gap-2 min-h-[2.5rem] px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                              isSelected
                                ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-white' : 'bg-blue-500'}`} aria-hidden />
                            <span className="font-medium text-left">{u.first_name} {u.last_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Form - Hidden for CEO */}
        {showCreateForm && !isCEO && (
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Entry
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sheet Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sheet_name || selectedSheet}
                    onChange={(e) => {
                      const newSheet = e.target.value;
                      setFormData({ ...formData, sheet_name: newSheet });
                      setSelectedSheet(newSheet);
                    }}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Sheet</option>
                    {availableSheets.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                    {/* Show manually created sheet if it's not in availableSheets yet */}
                    {selectedSheet && !availableSheets.includes(selectedSheet) && (
                      <option value={selectedSheet}>{selectedSheet} (New)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.task_id}
                    onChange={(e) => {
                      const taskId = e.target.value;
                      // Try to parse Task ID as date and auto-fill start_date
                      try {
                        // Check if it's in dd-MMM-yyyy format
                        const parsedDate = parse(taskId, 'dd-MMM-yyyy', new Date());
                        if (isValid(parsedDate)) {
                          const dateStr = format(parsedDate, 'yyyy-MM-dd');
                          setFormData(prev => ({ 
                            ...prev, 
                            task_id: taskId, 
                            start_date: dateStr,
                            due_date: prev.due_date || dateStr // Auto-fill due_date if empty
                          }));
                        } else {
                          setFormData({ ...formData, task_id: taskId });
                        }
                      } catch (error) {
                        // If parsing fails, just update task_id
                        setFormData({ ...formData, task_id: taskId });
                      }
                    }}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 01-Jan-2024 (auto-filled from date)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23374151%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right pr-10 hover:border-gray-400 dark:hover:border-gray-500"
                    style={{ backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25em 1.25em' }}
                  >
                    <option value="IN-PROGRESS">IN-PROGRESS</option>
                    <option value="PENDING">PENDING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="LEAVE">LEAVE</option>
                    <option value="HOLIDAY">HOLIDAY</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Enter task description..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      const dateValue = e.target.value;
                      if (dateValue) {
                        const date = new Date(dateValue);
                        const taskId = format(date, 'dd-MMM-yyyy'); // Auto-generate Task ID
                        setFormData({ 
                          ...formData, 
                          start_date: dateValue,
                          task_id: taskId,
                          due_date: formData.due_date || dateValue // Auto-fill due_date if empty
                        });
                      } else {
                        setFormData({ ...formData, start_date: dateValue });
                      }
                    }}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    % Complete
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.completion_percentage || ''}
                    onChange={(e) => setFormData({ ...formData, completion_percentage: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
              {selectedSheet && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Auto-generate tasks for all working days (Monday-Friday) in <strong>{selectedSheet}</strong>?
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateMonthlyTasks}
                    disabled={!selectedSheet || !effectiveUserId || isGeneratingTasks}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    {isGeneratingTasks ? 'Generating...' : 'Generate Monthly Tasks'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Excel-like Table */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          {!effectiveUserId ? (
            <div className="flex-1 flex items-start px-6 py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {canViewOthers ? 'Select a team member to view their work sheets' : 'Please select a user'}
              </p>
            </div>
          ) : !selectedSheet ? (
            <div className="flex-1 flex flex-col items-start px-6 py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {canViewOthers 
                  ? `No sheets available for ${users.find((u: any) => u.id === effectiveUserId)?.first_name || 'this member'}. Create a new sheet to get started.`
                  : 'No sheet selected. Create a new sheet to get started.'}
              </p>
              {!isCEO && (
                <button
                  onClick={() => setShowNewSheetModal(true)}
                  className="btn-primary flex items-center justify-center gap-2 h-10 px-4"
                >
                  Create New Sheet
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center px-6 py-8 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <>
              {/* Table Header - Excel-like */}
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-yellow-50 dark:bg-yellow-900/20 border-b-2 border-yellow-300 dark:border-yellow-700">
                      <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-r border-yellow-300 dark:border-yellow-700">
                        Task ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-r border-yellow-300 dark:border-yellow-700">
                        Task Name
                      </th>
                      {canViewOthers && (
                        <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-r border-yellow-300 dark:border-yellow-700">
                          Assigned To
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-r border-yellow-300 dark:border-yellow-700">
                        Start Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-r border-yellow-300 dark:border-yellow-700">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-r border-yellow-300 dark:border-yellow-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-r border-yellow-300 dark:border-yellow-700">
                        % Complete
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {workSheets.length === 0 ? (
                      <tr>
                        <td colSpan={canViewOthers ? 8 : 7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          {isCEO 
                            ? 'No entries in this sheet.'
                            : 'No entries in this sheet. Click "Add Entry" to create one.'}
                        </td>
                      </tr>
                    ) : (
                      workSheets.map((ws: WorkSheet) => {
                        const rowBgColor = getRowBackgroundColor(ws.status);
                        return (
                        <tr key={ws.id} className={`${rowBgColor} hover:opacity-80 border-b border-gray-200 dark:border-gray-700`}>
                          {editingId === ws.id ? (
                            <>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                {ws.task_id}
                              </td>
                              <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700">
                                <textarea
                                  value={formData.task_name}
                                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                                  className="w-full px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                  rows={2}
                                />
                              </td>
                              {canViewOthers && (
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                  {getAssignedUserName(ws.assigned_to)}
                                </td>
                              )}
                              <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700">
                                <input
                                  type="date"
                                  value={formData.start_date}
                                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                  className="w-full px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                  disabled
                                  title="Start date cannot be changed"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700">
                                <input
                                  type="date"
                                  value={formData.due_date}
                                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                  className="w-full px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700">
                                <select
                                  value={formData.status}
                                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                  className="w-full px-2 py-1 border border-blue-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right pr-8"
                                  style={{ backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
                                >
                                  <option value="IN-PROGRESS">IN-PROGRESS</option>
                                  <option value="PENDING">PENDING</option>
                                  <option value="COMPLETED">COMPLETED</option>
                                  <option value="LEAVE">LEAVE</option>
                                  <option value="HOLIDAY">HOLIDAY</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={formData.completion_percentage || ''}
                                  onChange={(e) => setFormData({ ...formData, completion_percentage: e.target.value ? parseInt(e.target.value) : undefined })}
                                  className="w-full px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdate(ws.id)}
                                    className="text-green-600 hover:text-green-700"
                                    disabled={updateMutation.isPending}
                                    title="Save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingId(null);
                                      resetForm();
                                    }}
                                    className="text-gray-600 hover:text-gray-700"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                {ws.task_id}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                <div className="max-w-md">
                                  <p className="whitespace-pre-wrap">{ws.task_name}</p>
                                  {ws.notes && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {ws.notes}
                                    </p>
                                  )}
                                </div>
                              </td>
                              {canViewOthers && (
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                  {getAssignedUserName(ws.assigned_to)}
                                </td>
                              )}
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                {ws.start_date ? format(new Date(ws.start_date), 'dd-MMM-yyyy') : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                {ws.due_date ? format(new Date(ws.due_date), 'dd-MMM-yyyy') : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700">
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(ws.status)}`}>
                                  {ws.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                                {ws.completion_percentage !== null && ws.completion_percentage !== undefined
                                  ? `${ws.completion_percentage}%`
                                  : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {ws.assigned_to === user?.id && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEdit(ws)}
                                      className="text-blue-600 hover:text-blue-700"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(ws.id, ws.assigned_to)}
                                      className="text-red-600 hover:text-red-700"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Excel-like Sheet Tabs */}
              <div className="border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 px-2 py-1 flex items-center gap-1 overflow-x-auto">
                {!effectiveUserId ? (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {canViewOthers ? 'Select a team member to view their sheets' : 'No user selected'}
                  </div>
                ) : availableSheets.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No sheets available. Create a new sheet to get started.
                  </div>
                ) : (
                  <>
                    {availableSheets.map((sheet) => (
                      <button
                        key={sheet}
                        onClick={() => setSelectedSheet(sheet)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                          selectedSheet === sheet
                            ? 'bg-white dark:bg-gray-800 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-200 dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                    {!isCEO && (
                      <button
                        onClick={() => setShowNewSheetModal(true)}
                        className="px-3 py-2 text-lg font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Add New Sheet"
                      >
                        +
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* New Sheet Modal */}
        {showNewSheetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Create New Sheet
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sheet Name (e.g., Month name)
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., January, February, March..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Quick select: {MONTHS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => setNewSheetName(m)}
                      className="mr-2 text-blue-600 hover:text-blue-700 underline"
                    >
                      {m}
                    </button>
                  ))}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateNewSheet}
                  className="btn-primary flex-1"
                >
                  Create Sheet
                </button>
                <button
                  onClick={() => {
                    setShowNewSheetModal(false);
                    setNewSheetName('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
