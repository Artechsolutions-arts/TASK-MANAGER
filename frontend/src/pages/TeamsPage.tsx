import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { teamsAPI, usersAPI } from '../services/api';
import { useUserRole } from '../utils/permissions';
import type { User } from '../types';

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCEO, isManager } = useUserRole();
  const canManageTeams = isCEO || isManager;

  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('create') === 'true');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.list(),
    enabled: canManageTeams,
  });

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email;
      const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.email;
      return aName.localeCompare(bName);
    });
  }, [users]);

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Team name is required');
      if (!teamLeadId) throw new Error('Team lead is required');

      const team = await teamsAPI.create({
        name: name.trim(),
        description: description.trim() || undefined,
        team_lead_id: teamLeadId,
      } as any);

      // Add members (optional)
      for (const userId of selectedMemberIds) {
        await teamsAPI.addMember(team.id, userId);
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsCreateOpen(false);
      setSearchParams({});
      setName('');
      setDescription('');
      setTeamLeadId('');
      setSelectedMemberIds([]);
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to create team');
    },
  });

  const openCreate = () => {
    if (!canManageTeams) return;
    setIsCreateOpen(true);
    setSearchParams({ create: 'true' });
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setSearchParams({});
    setFormError('');
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">Loading teams...</div>
      </div>
    );
  }

  if (error) {
    console.error('Teams error:', error);
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12 text-red-600">
          Error loading teams: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
        {canManageTeams && (
          <button onClick={openCreate} className="btn-primary h-10 px-4 text-sm">
            + Create Team
          </button>
        )}
      </div>

      {isCreateOpen && canManageTeams && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Team</h2>
              <button onClick={closeCreate} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Development Team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team lead</label>
                  <select
                    value={teamLeadId}
                    onChange={(e) => setTeamLeadId(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select a team lead</option>
                    {sortedUsers.map((u: User) => {
                      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                      return (
                        <option key={u.id} value={u.id}>
                          {fullName ? `${fullName} (${u.email})` : u.email}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Main development team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Members</label>
                <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                  {sortedUsers.map((u: User) => {
                    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                    const checked = selectedMemberIds.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-900 last:border-b-0 cursor-pointer">
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
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {fullName || u.email}
                          </div>
                          {fullName && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Select members to add to this team after creation.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button onClick={closeCreate} className="btn-secondary h-10 px-4 text-sm">
                Cancel
              </button>
              <button
                onClick={() => {
                  setFormError('');
                  createTeamMutation.mutate();
                }}
                disabled={createTeamMutation.isPending}
                className="btn-primary h-10 px-4 text-sm disabled:opacity-60"
              >
                {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {teams && teams.length > 0 ? (
          teams.map((team) => (
            <div
              key={team.id}
              onClick={() => navigate(`/teams/${team.id}`)}
              className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{team.name}</h3>
              {team.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
              )}
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                Team members
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No teams found.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
