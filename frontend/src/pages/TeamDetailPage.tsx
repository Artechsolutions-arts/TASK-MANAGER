import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsAPI, usersAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
import { Users, User, Edit, X, Plus, Save, XCircle } from 'lucide-react';
import type { TeamMember } from '../types';

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

  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_lead_id: '',
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamsAPI.get(id!),
    enabled: !!id,
  });

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
      });
      // Get current member IDs
      const currentMemberIds = (team as unknown as TeamWithMembers).members?.map((m: TeamMember) => m.user_id) || [];
      setSelectedMemberIds(currentMemberIds);
    }
  }, [team]);

  const updateTeamMutation = useMutation({
    mutationFn: async (data: { name?: string; description?: string; team_lead_id?: string }) => {
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
  };

  const handleCancel = () => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || '',
        team_lead_id: team.team_lead_id,
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
