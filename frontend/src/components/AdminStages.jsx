/**
 * Stages management - preset configurations for minimal clicks
 */
import React, { useState, useEffect } from 'react';
import { stagesApi, groupsApi } from '../api';

const PRESETS = [
  { label: 'Rally to 15 · Deuce',        scoring_type: 'rally',   points_to_win: 15, deuce_allowed: true,  desc: 'Default rally scoring' },
  { label: 'Rally to 21 · Deuce',        scoring_type: 'rally',   points_to_win: 21, deuce_allowed: true,  desc: 'Standard rally to 21' },
  { label: 'Rally to 11 · Sudden Death',  scoring_type: 'rally',   points_to_win: 11, deuce_allowed: false, desc: 'No deuce, first to 11' },
  { label: 'Side-Out to 11 · Deuce',     scoring_type: 'side_out', points_to_win: 11, deuce_allowed: true,  desc: 'Default side-out scoring' },
  { label: 'Side-Out to 21 · Deuce',     scoring_type: 'side_out', points_to_win: 21, deuce_allowed: true,  desc: 'Traditional side-out' },
  { label: 'Side-Out to 11 · Sudden Death',scoring_type: 'side_out',points_to_win: 11, deuce_allowed: false, desc: 'Quick side-out, no deuce' },
];

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
  const [presetApplied, setPresetApplied] = useState('');

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

  const applyPreset = (preset) => {
    setScoringType(preset.scoring_type);
    setPointsToWin(preset.points_to_win);
    setDeuceAllowed(preset.deuce_allowed);
    setPresetApplied(preset.label);
    // Auto-suggest a name based on preset
    const count = stages.length + 1;
    const stageNames = {
      'rally': 'Round Robin',
      'side_out': 'Round Robin'
    };
    setName(`${stageNames[preset.scoring_type] || 'Stage'} ${count}`);
    setTimeout(() => setPresetApplied(''), 2000);
  };

  const handleCreateStage = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await stagesApi.create(slug, {
        name: name.trim(),
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
      {/* Preset buttons - one-tap setup */}
      <div className="card-flat">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Presets</h3>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition-all touch-target
                ${presetApplied === p.label
                  ? 'bg-pickle-600 text-white shadow-sm'
                  : scoringType === p.scoring_type && pointsToWin === p.points_to_win && deuceAllowed === p.deuce_allowed
                  ? 'bg-pickle-100 text-pickle-700 border border-pickle-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {presetApplied && (
          <p className="text-[10px] text-pickle-600 mt-1.5">✓ {presetApplied} applied</p>
        )}
      </div>

      {/* Create form - auto-filled from preset */}
      <form onSubmit={handleCreateStage} className="card-flat space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Create Stage</h3>
          {!name && (
            <span className="text-[10px] text-gray-300">Tap a preset above to auto-fill</span>
          )}
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          placeholder="Stage name (e.g., Round Robin 1)"
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <select value={scoringType} onChange={(e) => setScoringType(e.target.value)} className="input-field text-sm">
            <option value="rally">Rally Scoring</option>
            <option value="side_out">Side-Out Scoring</option>
          </select>
          <input
            type="number"
            value={pointsToWin}
            onChange={(e) => setPointsToWin(Number(e.target.value))}
            className="input-field text-sm"
            placeholder="Points"
            min={1}
            max={100}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-500">
          <input
            type="checkbox"
            checked={deuceAllowed}
            onChange={(e) => setDeuceAllowed(e.target.checked)}
            className="rounded text-pickle-600 focus:ring-pickle-500"
          />
          Deuce (win by 2)
          {!deuceAllowed && <span className="text-orange-500 text-xs">Sudden Death</span>}
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full touch-target text-sm">
          + Create Stage
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      {/* Assign Groups to Stage */}
      <div className="card-flat space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Link Groups to Stage</h3>
        <div className="flex gap-2">
          <select
            value={selectedStage || ''}
            onChange={(e) => { setSelectedStage(parseInt(e.target.value)); setSelectedGroups([]); }}
            className="input-field text-sm"
          >
            <option value="">Select stage</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {selectedStage && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {groups.map(g => {
              const isAssigned = stages.find(s => s.id === selectedStage)?.groups?.some(sg => sg.id === g.id);
              return (
                <label key={g.id} className="flex items-center gap-2 text-sm py-1.5 px-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id) || isAssigned}
                    disabled={isAssigned}
                    onChange={() => toggleGroupSelection(g.id)}
                    className="rounded text-pickle-600 focus:ring-pickle-500"
                  />
                  <span className="flex-1">{g.name}</span>
                  {isAssigned && <span className="text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">linked</span>}
                </label>
              );
            })}
            {groups.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No groups created yet</p>}
          </div>
        )}

        {selectedStage && selectedGroups.length > 0 && (
          <button onClick={handleAssignGroups} className="btn-primary w-full touch-target text-sm">
            Link {selectedGroups.length} Group{selectedGroups.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Stages list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
          Created Stages ({stages.length})
        </p>
        {stages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">Tap a preset above to get started</p>
        ) : (
          stages.map((s) => (
            <div key={s.id} className="card-flat flex items-center justify-between py-3 px-4">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {s.scoring_type === 'rally' ? 'Rally' : 'Side-Out'} · to {s.points_to_win}
                  {s.deuce_allowed ? ' · deuce' : ' · sudden death'}
                </p>
                {s.groups?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.groups.map(g => (
                      <span key={g.id} className="bg-pickle-50 text-pickle-600 text-[10px] px-1.5 py-0.5 rounded-full">
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => handleDeleteStage(s.id)}
                className="text-red-400 text-xs touch-target px-2 py-1 rounded-lg hover:bg-red-50">
                Del
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
