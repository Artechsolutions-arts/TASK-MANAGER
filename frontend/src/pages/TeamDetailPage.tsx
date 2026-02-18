import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsAPI, usersAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
import { Users, User, Edit, Save, XCircle, Shield, Settings, Star } from 'lucide-react';
import type { TeamMember } from '../types';
import { useAuth } from '../context/AuthContext';
import { isStarred, pushRecent, toggleStarred } from '../utils/prefs';

interface TeamWithMembers {
  id: string;
  name: string;
  description?: string;
  team_lead_id: string;
  member_count?: number;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isCEO, isManager } = useUserRole();
  const canEdit = isCEO || isManager;
  const { user } = useAuth();
  const [starTick, setStarTick] = useState(0);

  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_lead_id: '',
    privacy: 'private' as 'private' | 'public',
    tags_text: '',
    default_task_status: 'To Do',
    default_task_priority: 'Medium',
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamsAPI.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (team?.id) {
      pushRecent('team', user?.id, { id: team.id, label: team.name, path: `/teams/${team.id}` });
    }
  }, [team?.id, team?.name, user?.id]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list(),
    enabled: canEdit,
  });

  // Populate form when team data loads
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || '',
        team_lead_id: team.team_lead_id,
        privacy: (team as any).privacy || 'private',
        tags_text: Array.isArray((team as any).tags) ? (team as any).tags.join(', ') : '',
        default_task_status: (team as any).default_task_status || 'To Do',
        default_task_priority: (team as any).default_task_priority || 'Medium',
      });
      // Get current member IDs
      const currentMemberIds = (team as unknown as TeamWithMembers).members?.map((m: TeamMember) => m.user_id) || [];
      setSelectedMemberIds(currentMemberIds);

      const roles: Record<string, string> = {};
      ((team as unknown as TeamWithMembers).members || []).forEach((m: any) => {
        roles[m.user_id] = m.role || (m.user_id === team.team_lead_id ? 'Owner' : 'Member');
      });
      roles[team.team_lead_id] = 'Owner';
      setMemberRoles(roles);
    }
  }, [team]);

  const updateTeamMutation = useMutation({
    mutationFn: async (data: {
      name?: string;
      description?: string;
      team_lead_id?: string;
      privacy?: 'private' | 'public';
      tags?: string[];
      default_task_status?: string;
      default_task_priority?: string;
    }) => {
      return teamsAPI.update(id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsEditMode(false);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to update team');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return teamsAPI.addMember(id!, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return teamsAPI.removeMember(id!, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to remove member');
    },
  });

  const handleSave = async () => {
    setError('');
    
    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    if (!formData.team_lead_id) {
      setError('Team lead is required');
      return;
    }

    // Update team info
    await updateTeamMutation.mutateAsync({
      name: formData.name,
      description: formData.description || undefined,
      team_lead_id: formData.team_lead_id,
      privacy: formData.privacy,
      tags: (formData.tags_text || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      default_task_status: formData.default_task_status,
      default_task_priority: formData.default_task_priority,
    });

    // Get current member IDs from team
    const currentMemberIds = (team as unknown as TeamWithMembers).members?.map((m: TeamMember) => m.user_id) || [];
    
    // Add new members
    const membersToAdd = selectedMemberIds.filter(id => !currentMemberIds.includes(id));
    for (const userId of membersToAdd) {
      await addMemberMutation.mutateAsync(userId);
    }

    // Remove members that were deselected
    const membersToRemove = currentMemberIds.filter(id => !selectedMemberIds.includes(id));
    for (const userId of membersToRemove) {
      await removeMemberMutation.mutateAsync(userId);
    }

    // Update member roles (best effort)
    for (const userId of selectedMemberIds) {
      if (userId === formData.team_lead_id) continue;
      const role = memberRoles[userId] || 'Member';
      try {
        await teamsAPI.updateMemberRole(id!, userId, role);
      } catch {
        // ignore role update failures
      }
    }
  };

  const handleCancel = () => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || '',
        team_lead_id: team.team_lead_id,
        privacy: (team as any).privacy || 'private',
        tags_text: Array.isArray((team as any).tags) ? (team as any).tags.join(', ') : '',
        default_task_status: (team as any).default_task_status || 'To Do',
        default_task_priority: (team as any).default_task_priority || 'Medium',
      });
      const currentMemberIds = (team as unknown as TeamWithMembers).members?.map((m: TeamMember) => m.user_id) || [];
      setSelectedMemberIds(currentMemberIds);
    }
    setIsEditMode(false);
    setError('');
  };

  // Get user details for members
  const getMemberUser = (userId: string) => {
    return allUsers.find(u => u.id === userId);
  };

  // Get team lead user
  const teamLeadUser = team ? allUsers.find(u => u.id === team.team_lead_id) : null;

  if (teamLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">Loading team...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Team not found</h2>
          <Link to="/teams" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
            ← Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  const teamWithMembers = team as unknown as TeamWithMembers;
  const members = teamWithMembers.members || [];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link to="/teams" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 mb-4 inline-block">
          ← Back to Teams
        </Link>
        <div className="flex items-center justify-between">
          {isEditMode ? (
            <div className="flex-1">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-primary-500 focus:outline-none"
                placeholder="Team name"
              />
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
          )}
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toggleStarred('team', user?.id, { id: team.id, label: team.name, path: `/teams/${team.id}` });
                  setStarTick((x) => x + 1);
                }}
                className={`btn-secondary text-sm flex items-center gap-1.5 ${
                  isStarred('team', user?.id, team.id) ? 'text-yellow-600 dark:text-yellow-400' : ''
                }`}
                title={isStarred('team', user?.id, team.id) ? 'Starred' : 'Star'}
              >
                <Star className={`w-4 h-4 ${isStarred('team', user?.id, team.id) ? 'fill-current' : ''}`} />
              </button>
              {isEditMode ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                    disabled={updateTeamMutation.isPending || addMemberMutation.isPending || removeMemberMutation.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary text-sm flex items-center gap-1.5"
                    disabled={updateTeamMutation.isPending || addMemberMutation.isPending || removeMemberMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                    {updateTeamMutation.isPending || addMemberMutation.isPending || removeMemberMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <Edit className="w-4 h-4" />
                  Edit Team
                </button>
              )}
            </div>
          )}
        </div>
        {team.description && (
          <div className="mt-2">
            {isEditMode ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Team description"
                rows={2}
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{team.description}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Team Lead Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Team Lead
          </h2>
        </div>
        {isEditMode ? (
          <select
            value={formData.team_lead_id}
            onChange={(e) => setFormData({ ...formData, team_lead_id: e.target.value })}
            className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select team lead</option>
            {allUsers.map((u) => {
              const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
              return (
                <option key={u.id} value={u.id}>
                  {fullName ? `${fullName} (${u.email})` : u.email}
                </option>
              );
            })}
          </select>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {teamLeadUser ? (teamLeadUser.first_name?.[0] || teamLeadUser.email?.[0] || 'U') : 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {teamLeadUser
                  ? `${teamLeadUser.first_name || ''} ${teamLeadUser.last_name || ''}`.trim() || teamLeadUser.email
                  : 'Loading...'}
              </p>
              {teamLeadUser && (teamLeadUser.first_name || teamLeadUser.last_name) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{teamLeadUser.email}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Team Settings */}
      <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" />
          Team Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Privacy</label>
            {isEditMode ? (
              <select
                value={formData.privacy}
                onChange={(e) => setFormData({ ...formData, privacy: e.target.value as any })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            ) : (
              <p className="text-sm text-gray-900 dark:text-white mt-2">{(team as any).privacy || 'private'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags/Categories</label>
            {isEditMode ? (
              <input
                value={formData.tags_text}
                onChange={(e) => setFormData({ ...formData, tags_text: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., frontend, marketing"
              />
            ) : (
              <p className="text-sm text-gray-900 dark:text-white mt-2">
                {Array.isArray((team as any).tags) && (team as any).tags.length > 0 ? (team as any).tags.join(', ') : '—'}
              </p>
            )}
            {isEditMode && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Comma-separated</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default task status</label>
            {isEditMode ? (
              <select
                value={formData.default_task_status}
                onChange={(e) => setFormData({ ...formData, default_task_status: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="Backlog">Backlog</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
              </select>
            ) : (
              <p className="text-sm text-gray-900 dark:text-white mt-2">{(team as any).default_task_status || 'To Do'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default task priority</label>
            {isEditMode ? (
              <select
                value={formData.default_task_priority}
                onChange={(e) => setFormData({ ...formData, default_task_priority: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            ) : (
              <p className="text-sm text-gray-900 dark:text-white mt-2">{(team as any).default_task_priority || 'Medium'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members ({members.length})
          </h2>
        </div>

        {isEditMode ? (
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              {allUsers.map((u) => {
                const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                const checked = selectedMemberIds.includes(u.id);
                const isTeamLead = u.id === formData.team_lead_id;
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-900 last:border-b-0 cursor-pointer ${
                      isTeamLead ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedMemberIds((prev) =>
                          e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                        );
                      }}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {fullName || u.email}
                        {isTeamLead && (
                          <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">(Team Lead)</span>
                        )}
                      </div>
                      {fullName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} selected
            </p>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" />
                Roles & permissions
              </h3>
              <div className="space-y-2">
                {selectedMemberIds.map((uid) => {
                  const u = getMemberUser(uid);
                  if (!u) return null;
                  const isLead = uid === formData.team_lead_id;
                  const role = isLead ? 'Owner' : (memberRoles[uid] || 'Member');
                  return (
                    <div key={uid} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                      </div>
                      <select
                        value={role}
                        disabled={isLead}
                        onChange={(e) => setMemberRoles((prev) => ({ ...prev, [uid]: e.target.value }))}
                        className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="Owner">Owner</option>
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                      </select>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Team Lead is always Owner. Others can be Admin or Member.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {members.length > 0 ? (
              members.map((member) => {
                const memberUser = getMemberUser(member.user_id);
                if (!memberUser) return null;
                const fullName = `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim();
                const isTeamLead = member.user_id === team.team_lead_id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                        {memberUser.first_name?.[0] || memberUser.email?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {fullName || memberUser.email}
                          {isTeamLead && (
                            <span className="ml-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
                              (Team Lead)
                            </span>
                          )}
                        </p>
                        {fullName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{memberUser.email}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      {isTeamLead ? 'Owner' : (member as any).role || 'Member'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No members in this team yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
