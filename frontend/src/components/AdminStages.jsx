/**
 * Stages management component
 */
import React, { useState, useEffect } from 'react';
import { stagesApi, groupsApi } from '../api';

export default function AdminStages({ slug }) {
  const [stages, setStages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [scoringType, setScoringType] = useState('rally');
  const [pointsToWin, setPointsToWin] = useState(21);
  const [deuceAllowed, setDeuceAllowed] = useState(true);
  const [selectedStage, setSelectedStage] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const [s, g] = await Promise.all([
        stagesApi.list(slug),
        groupsApi.list(slug),
      ]);
      setStages(s);
      setGroups(g);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateStage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await stagesApi.create(slug, {
        name,
        scoring_type: scoringType,
        points_to_win: parseInt(pointsToWin),
        deuce_allowed: deuceAllowed,
      });
      setName('');
      setScoringType('rally');
      setPointsToWin(21);
      setDeuceAllowed(true);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignGroups = async () => {
    if (!selectedStage || selectedGroups.length === 0) return;
    try {
      await stagesApi.assignGroups(slug, selectedStage, selectedGroups);
      setSelectedGroups([]);
      setSelectedStage(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStage = async (id) => {
    if (!confirm('Delete this stage and all associated matches?')) return;
    try {
      await stagesApi.delete(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Stages</h2>

      <form onSubmit={handleCreateStage} className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Stage name (e.g., Round Robin 1)"
              required
            />
          </div>
          <select value={scoringType} onChange={(e) => setScoringType(e.target.value)} className="input-field">
            <option value="rally">Rally Scoring</option>
            <option value="sideout">Side-Out Scoring</option>
          </select>
          <input
            type="number"
            value={pointsToWin}
            onChange={(e) => setPointsToWin(e.target.value)}
            className="input-field"
            placeholder="Points to win"
            min={1}
            max={100}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={deuceAllowed}
            onChange={(e) => setDeuceAllowed(e.target.checked)}
            className="rounded"
          />
          Deuce (win by 2)
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full touch-target">
          Create Stage
        </button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>

      {/* Assign Groups to Stage */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700">Assign Groups to Stage</h3>
        <select
          value={selectedStage || ''}
          onChange={(e) => { setSelectedStage(parseInt(e.target.value)); setSelectedGroups([]); }}
          className="input-field"
        >
          <option value="">Select stage</option>
          {stages.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {selectedStage && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Select groups to assign:</p>
            {groups.map(g => {
              const isAssigned = stages.find(s => s.id === selectedStage)?.groups?.some(sg => sg.id === g.id);
              return (
                <label key={g.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id) || isAssigned}
                    disabled={isAssigned}
                    onChange={() => toggleGroupSelection(g.id)}
                    className="rounded"
                  />
                  {g.name}
                  {isAssigned && <span className="text-xs text-green-500">(assigned)</span>}
                </label>
              );
            })}
          </div>
        )}

        {selectedStage && selectedGroups.length > 0 && (
          <button onClick={handleAssignGroups} className="btn-primary w-full touch-target">
            Assign Groups
          </button>
        )}
      </div>

      {/* Stages list */}
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-800">{s.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {s.scoring_type} · to {s.points_to_win} {s.deuce_allowed ? '(deuce)' : '(no deuce)'}
                </span>
              </div>
              <button onClick={() => handleDeleteStage(s.id)} className="text-red-500 text-sm touch-target px-2">
                Delete
              </button>
            </div>
            {s.groups?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {s.groups.map(g => (
                  <span key={g.id} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {stages.length === 0 && <p className="text-gray-400 text-center py-4">No stages yet</p>}
      </div>
    </div>
  );
}
