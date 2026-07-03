/**
 * Teams management component
 */
import React, { useState, useEffect } from 'react';
import { teamsApi, participantsApi } from '../api';

export default function AdminTeams({ slug }) {
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [name, setName] = useState('');
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const [t, p] = await Promise.all([
        teamsApi.list(slug),
        participantsApi.list(slug),
      ]);
      setTeams(t);
      setParticipants(p);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setName(''); setPlayer1Id(''); setPlayer2Id('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!player1Id || !player2Id) {
      setError('Select two players');
      return;
    }
    if (player1Id === player2Id) {
      setError('Must pick two different players');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editingId) {
        await teamsApi.update(slug, editingId, { name, player1_id: parseInt(player1Id), player2_id: parseInt(player2Id) });
      } else {
        await teamsApi.create(slug, { name, player1_id: parseInt(player1Id), player2_id: parseInt(player2Id) });
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setName(t.name);
    setPlayer1Id(String(t.player1_id));
    setPlayer2Id(String(t.player2_id));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this team?')) return;
    try {
      await teamsApi.delete(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getParticipantName = (id) => {
    const p = participants.find(pp => pp.id === id);
    return p ? p.name : 'Unknown';
  };

  const availableParticipants = (excludeId) => {
    return participants.filter(p => p.id !== parseInt(excludeId));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Teams</h2>

      <form onSubmit={handleSubmit} className="card space-y-3">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Team name (auto-generated if blank)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Player 1</label>
            <select value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)} className="input-field" required>
              <option value="">Select player 1</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Player 2</label>
            <select value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)} className="input-field" required>
              <option value="">Select player 2</option>
              {availableParticipants(player1Id).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {editingId && (
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 touch-target">
              Update
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary touch-target">
              Cancel
            </button>
          </div>
        )}
        {!editingId && (
          <button type="submit" disabled={loading} className="btn-primary w-full touch-target">
            Create Team
          </button>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>

      <div className="space-y-2">
        {teams.map((t) => (
          <div key={t.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{t.name}</p>
              <p className="text-sm text-gray-500">
                {getParticipantName(t.player1_id)} & {getParticipantName(t.player2_id)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(t)} className="text-pickle-600 text-sm touch-target px-2">
                Edit
              </button>
              <button onClick={() => handleDelete(t.id)} className="text-red-500 text-sm touch-target px-2">
                Del
              </button>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <p className="text-gray-400 text-center py-4">No teams yet</p>
        )}
      </div>
    </div>
  );
}
