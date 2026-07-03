/**
 * Groups management - quick create with auto-naming
 */
import React, { useState, useEffect } from 'react';
import { groupsApi, teamsApi } from '../api';

const GROUP_NAMES = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F'];

export default function AdminGroups({ slug }) {
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState('');
  const [stageType, setStageType] = useState('round_robin');
  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const [g, t] = await Promise.all([
        groupsApi.list(slug),
        teamsApi.list(slug),
      ]);
      setGroups(g);
      setTeams(t);
      // Auto-suggest next group name
      const usedNames = new Set(g.map(gr => gr.name));
      const nextName = GROUP_NAMES.find(n => !usedNames.has(n)) || `Group ${g.length + 1}`;
      if (!name) setName(nextName);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await groupsApi.create(slug, { name: name.trim(), stage_type: stageType, round_number: roundNumber });
      setName('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!selectedGroup || !selectedTeam) return;
    try {
      await groupsApi.addTeam(slug, selectedGroup, parseInt(selectedTeam));
      setSelectedTeam('');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveTeam = async (groupId, teamId) => {
    try {
      await groupsApi.removeTeam(slug, groupId, teamId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Delete this group and all associated matches?')) return;
    try {
      await groupsApi.delete(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Teams not yet assigned to ANY group
  const assignedTeamIds = new Set(groups.flatMap(g => g.teams?.map(t => t.id) || []));
  const unassignedTeams = teams.filter(t => !assignedTeamIds.has(t.id));

  return (
    <div className="space-y-4">
      {/* Create group - auto-named */}
      <form onSubmit={handleCreateGroup} className="card-flat space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Create Group</h3>
          <span className="text-[11px] text-gray-400">{groups.length} created</span>
        </div>
        <div className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="input-field text-sm flex-1" placeholder="Group name" required />
          <select value={stageType} onChange={(e) => setStageType(e.target.value)} className="input-field text-sm w-28">
            <option value="round_robin">Round Robin</option>
            <option value="knockout">Knockout</option>
          </select>
          <button type="submit" disabled={loading} className="btn-primary touch-target text-sm px-4">
            + Add
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      {/* Assign teams - quick tap */}
      <div className="card-flat space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assign Teams</h3>
        <div className="flex gap-2">
          <select value={selectedGroup || ''} onChange={(e) => setSelectedGroup(parseInt(e.target.value))}
            className="input-field text-sm flex-1">
            <option value="">Select group</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.teams?.length || 0} teams)
              </option>
            ))}
          </select>
        </div>

        {selectedGroup && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {unassignedTeams.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTeam(String(t.id)); handleAddTeam(); }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-pickle-50 hover:text-pickle-700 border border-gray-100 touch-target"
                >
                  + {t.name}
                </button>
              ))}
              {unassignedTeams.length === 0 && (
                <p className="text-xs text-gray-400 py-2">All teams assigned</p>
              )}
            </div>

            {/* Teams in this group */}
            {(() => {
              const currentGroup = groups.find(g => g.id === selectedGroup);
              return currentGroup?.teams?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {currentGroup.teams.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 bg-pickle-50 text-pickle-700 text-xs px-2 py-1 rounded-full">
                      {t.name}
                      <button onClick={() => handleRemoveTeam(selectedGroup, t.id)}
                        className="text-pickle-400 hover:text-red-500 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-2 italic">Tap teams above to add them</p>
              );
            })()}
          </>
        )}
      </div>

      {/* Groups list */}
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="card-flat flex items-start justify-between py-3 px-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 text-sm">{g.name}</span>
                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{g.stage_type}</span>
              </div>
              {g.teams?.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {g.teams.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-[11px] px-2 py-0.5 rounded-full">
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1 italic">No teams</p>
              )}
            </div>
            <button onClick={() => handleDeleteGroup(g.id)}
              className="text-red-400 text-xs touch-target px-2 py-1 rounded-lg hover:bg-red-50 flex-shrink-0">Del</button>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">Create your first group above</p>
        )}
      </div>
    </div>
  );
}
