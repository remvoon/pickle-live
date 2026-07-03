/**
 * Groups management component
 */
import React, { useState, useEffect } from 'react';
import { groupsApi, teamsApi } from '../api';

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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await groupsApi.create(slug, { name, stage_type: stageType, round_number: roundNumber });
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Groups</h2>

      <form onSubmit={handleCreateGroup} className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Group name (e.g., Group A)"
            required
          />
          <select value={stageType} onChange={(e) => setStageType(e.target.value)} className="input-field">
            <option value="round_robin">Round Robin</option>
            <option value="knockout">Knockout</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full touch-target">
          Create Group
        </button>
      </form>

      {/* Assign teams */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700">Assign Teams to Group</h3>
        <div className="flex gap-2">
          <select
            value={selectedGroup || ''}
            onChange={(e) => setSelectedGroup(parseInt(e.target.value))}
            className="input-field flex-1"
          >
            <option value="">Select group</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="input-field flex-1"
            disabled={!selectedGroup}
          >
            <option value="">Select team</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={handleAddTeam} disabled={!selectedGroup || !selectedTeam} className="btn-primary touch-target">
            Add
          </button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {/* Groups list */}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-gray-800">{g.name}</span>
                <span className="ml-2 text-xs text-gray-400">{g.stage_type}</span>
              </div>
              <button onClick={() => handleDeleteGroup(g.id)} className="text-red-500 text-sm touch-target px-2">
                Delete
              </button>
            </div>
            {g.teams?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {g.teams.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {t.name}
                    <button onClick={() => handleRemoveTeam(g.id, t.id)} className="text-red-400 hover:text-red-600 ml-1">×</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No teams assigned</p>
            )}
          </div>
        ))}
        {groups.length === 0 && <p className="text-gray-400 text-center py-4">No groups yet</p>}
      </div>
    </div>
  );
}
