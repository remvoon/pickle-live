/**
 * Matches management component
 */
import React, { useState, useEffect } from 'react';
import { matchesApi, stagesApi, groupsApi } from '../api';
import LiveMatchView from './LiveMatchView';

export default function AdminMatches({ slug }) {
  const [matches, setMatches] = useState([]);
  const [stages, setStages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [stageId, setStageId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [court, setCourt] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [autoGenGroupId, setAutoGenGroupId] = useState('');
  const [autoGenStageId, setAutoGenStageId] = useState('');
  const [liveMatchId, setLiveMatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const [m, s, g] = await Promise.all([
        matchesApi.list(slug),
        stagesApi.list(slug),
        groupsApi.list(slug),
      ]);
      setMatches(m);
      setStages(s);
      setGroups(g);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setTeam1Id(''); setTeam2Id(''); setStageId('');
    setGroupId(''); setScheduledTime(''); setCourt('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = {
        team1_id: parseInt(team1Id),
        team2_id: parseInt(team2Id),
        stage_id: parseInt(stageId),
        group_id: parseInt(groupId),
        scheduled_time: scheduledTime,
        court,
      };
      if (editingId) {
        await matchesApi.update(slug, editingId, data);
      } else {
        await matchesApi.create(slug, data);
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (m) => {
    setEditingId(m.id);
    setTeam1Id(String(m.team1_id));
    setTeam2Id(String(m.team2_id));
    setStageId(String(m.stage_id));
    setGroupId(String(m.group_id));
    setScheduledTime(m.scheduled_time || '');
    setCourt(m.court || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this match?')) return;
    try {
      await matchesApi.delete(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAutoGenerate = async () => {
    if (!autoGenGroupId || !autoGenStageId) return;
    setLoading(true);
    setError('');
    try {
      await matchesApi.autoGenerate(slug, {
        group_id: parseInt(autoGenGroupId),
        stage_id: parseInt(autoGenStageId),
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await matchesApi.start(slug, id);
      setLiveMatchId(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWalkover = async (id) => {
    const winner = prompt('Enter winner team ID:');
    if (!winner) return;
    try {
      await matchesApi.walkover(slug, id, parseInt(winner));
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async (id, team1Id, team2Id) => {
    const winner = prompt('Enter winner team ID:');
    if (!winner) return;
    try {
      await matchesApi.complete(slug, id, { winner_team_id: parseInt(winner) });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdvance = async () => {
    const targetStageId = prompt('Target stage ID:');
    const targetGroupId = prompt('Target group ID:');
    if (!targetStageId || !targetGroupId) return;
    
    const pairingsStr = prompt('Enter pairings as JSON array: [{team1_id,team2_id}]');
    if (!pairingsStr) return;
    
    try {
      const pairings = JSON.parse(pairingsStr);
      await matchesApi.advance(slug, {
        target_stage_id: parseInt(targetStageId),
        target_group_id: parseInt(targetGroupId),
        pairings,
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (liveMatchId) {
    return <LiveMatchView slug={slug} matchId={liveMatchId} onExit={() => { setLiveMatchId(null); loadData(); }} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Matches</h2>

      {/* Auto-generate */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700">Auto-Generate Round Robin</h3>
        <div className="flex gap-2">
          <select value={autoGenGroupId} onChange={(e) => setAutoGenGroupId(e.target.value)} className="input-field flex-1">
            <option value="">Select group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={autoGenStageId} onChange={(e) => setAutoGenStageId(e.target.value)} className="input-field flex-1">
            <option value="">Select stage</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={handleAutoGenerate} disabled={loading} className="btn-primary touch-target">
            Generate
          </button>
        </div>
      </div>

      {/* Advance teams */}
      <div className="card">
        <button onClick={handleAdvance} className="btn-secondary w-full touch-target">
          Advance Teams to Next Stage
        </button>
      </div>

      {/* Create/Edit form */}
      <form onSubmit={handleSubmit} className="card space-y-3">
        <h3 className="font-semibold text-gray-700">{editingId ? 'Edit Match' : 'Create Match'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={team1Id}
            onChange={(e) => setTeam1Id(e.target.value)}
            className="input-field"
            placeholder="Team 1 ID"
            required
          />
          <input
            type="number"
            value={team2Id}
            onChange={(e) => setTeam2Id(e.target.value)}
            className="input-field"
            placeholder="Team 2 ID"
            required
          />
          <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="input-field" required>
            <option value="">Select stage</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field" required>
            <option value="">Select group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            className="input-field"
            placeholder="Court (e.g., Court 1)"
          />
        </div>

        {editingId ? (
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 touch-target">Update</button>
            <button type="button" onClick={resetForm} className="btn-secondary touch-target">Cancel</button>
          </div>
        ) : (
          <button type="submit" disabled={loading} className="btn-primary w-full touch-target">Create Match</button>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>

      {/* Matches list */}
      <div className="space-y-2">
        {matches.map((m) => (
          <div key={m.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {m.team1_name} vs {m.team2_name}
                  </span>
                  {m.status === 'live' && <span className="badge-live">LIVE</span>}
                  {m.status === 'completed' && <span className="badge-completed">Final</span>}
                  {m.status === 'scheduled' && <span className="badge-scheduled">Scheduled</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {m.stage_name} · {m.group_name}
                  {m.court && ` · ${m.court}`}
                  {m.scheduled_time && ` · ${new Date(m.scheduled_time).toLocaleString()}`}
                </p>
                {(m.status === 'live' || m.status === 'completed') && (
                  <p className="text-lg font-bold mt-1">
                    {m.team1_score} - {m.team2_score}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {m.status === 'scheduled' && (
                  <button onClick={() => handleStart(m.id)} className="btn-primary text-xs py-1 px-2 touch-target">
                    Start
                  </button>
                )}
                {m.status === 'scheduled' && (
                  <>
                    <button onClick={() => handleEdit(m)} className="text-pickle-600 text-xs touch-target px-2">Edit</button>
                    <button onClick={() => handleDelete(m.id)} className="text-red-500 text-xs touch-target px-2">Del</button>
                    <button onClick={() => handleWalkover(m.id)} className="text-orange-500 text-xs touch-target px-2">WO</button>
                  </>
                )}
                {m.status === 'live' && (
                  <button onClick={() => setLiveMatchId(m.id)} className="btn-primary text-xs py-1 px-2 touch-target">
                    Score
                  </button>
                )}
                {m.status === 'live' && (
                  <button onClick={() => handleComplete(m.id)} className="text-orange-500 text-xs touch-target px-2">
                    End
                  </button>
                )}
                {m.walkover > 0 && <span className="text-xs text-orange-500">Walkover</span>}
              </div>
            </div>
          </div>
        ))}
        {matches.length === 0 && <p className="text-gray-400 text-center py-4">No matches yet</p>}
      </div>
    </div>
  );
}
