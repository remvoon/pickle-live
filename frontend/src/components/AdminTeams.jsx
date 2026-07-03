/**
 * Teams management - quick pairing with autofill
 */
import React, { useState, useEffect } from 'react';
import { teamsApi, participantsApi } from '../api';
import { getTeamEmoji, getNextEmoji } from '../utils';

const displayName = (p) => {
  const nick = p.nickname || p.name;
  return nick !== p.name ? `${nick} (${p.name})` : nick;
};

export default function AdminTeams({ slug }) {
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [name, setName] = useState('');
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [quickP1, setQuickP1] = useState('');
  const [quickP2, setQuickP2] = useState('');
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
    setQuickP1(''); setQuickP2('');
    setEditingId(null);
  };

  // Auto-create team from two taps: pick player 1 then player 2
  const handleQuickSelect = (playerId) => {
    if (!player1Id) {
      setPlayer1Id(String(playerId));
      setQuickP1(participants.find(p => p.id === playerId)?.name || '');
    } else if (!player2Id && String(playerId) !== player1Id) {
      setPlayer2Id(String(playerId));
      setQuickP2(participants.find(p => p.id === playerId)?.name || '');
      // Auto-submit
      setTimeout(() => {
        document.getElementById('team-submit')?.click();
      }, 100);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!player1Id || !player2Id) {
      setError('Select two different players');
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
        await teamsApi.update(slug, editingId, {
          name: name || undefined,
          player1_id: parseInt(player1Id),
          player2_id: parseInt(player2Id),
        });
      } else {
        await teamsApi.create(slug, {
          name: name || undefined,
          player1_id: parseInt(player1Id),
          player2_id: parseInt(player2Id),
        });
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
    try {
      await teamsApi.delete(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnpairAll = async () => {
    if (!confirm('Delete ALL teams? This cannot be undone.')) return;
    setLoading(true);
    setError('');
    try {
      await teamsApi.unpairAll(slug);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomPair = async () => {
    if (unpaired.length < 2) {
      setError('Need at least 2 unpaired players to pair');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await teamsApi.randomPair(slug);
      await loadData();
      if (result.remaining) {
        setError('One player left unpaired (odd number)');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiCycle = async (team) => {
    const current = team.emoji || getTeamEmoji(team.id);
    const next = getNextEmoji(current);
    try {
      await teamsApi.update(slug, team.id, { emoji: next });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getParticipantName = (id) => {
    const p = participants.find(pp => pp.id === id);
    return p ? displayName(p) : 'Unknown';
  };

  const getParticipant = (id) => participants.find(pp => pp.id === id);

  // Detect team type based on player genders
  const getTeamType = (p1Id, p2Id) => {
    const p1 = getParticipant(p1Id);
    const p2 = getParticipant(p2Id);
    if (!p1 || !p2) return null;
    if (p1.gender === 'Male' && p2.gender === 'Male') return { label: 'MD', text: "Men's Doubles", color: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (p1.gender === 'Female' && p2.gender === 'Female') return { label: 'WD', text: "Women's Doubles", color: 'bg-rose-100 text-rose-700 border-rose-200' };
    return { label: 'XD', text: 'Mixed Doubles', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  };

  const genderIcon = (p) => {
    if (!p) return null;
    if (p.gender === 'Male') return <span className="text-blue-500 text-xs">♂</span>;
    if (p.gender === 'Female') return <span className="text-rose-500 text-xs">♀</span>;
    return null;
  };

  const genderColor = (p) => {
    if (!p?.gender) return 'from-pickle-400 to-emerald-500';
    return p.gender === 'Male' ? 'from-blue-500 to-blue-700' : 'from-rose-400 to-rose-600';
  };

  // Unpaired players (not on any team)
  const pairedIds = new Set(teams.flatMap(t => [t.player1_id, t.player2_id]));
  const unpaired = participants.filter(p => !pairedIds.has(p.id));

  return (
    <div className="space-y-4">
      {/* Quick pair - tap two players to create a team */}
      {!editingId && (
        <div className="card-flat">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tap to Pair</h3>
            <span className="text-[11px] text-gray-400">{unpaired.length} unpaired</span>
          </div>

          {player1Id && !player2Id && (
            <div className="bg-pickle-50 text-pickle-700 text-xs font-medium px-3 py-2 rounded-lg mb-2 flex items-center gap-2">
              <span>Selected:</span>
              <span className="font-bold">{quickP1}</span>
              <span className="text-pickle-400">— now tap their partner</span>
              <button onClick={() => { setPlayer1Id(''); setQuickP1(''); }} className="ml-auto text-pickle-400 touch-target px-1">✕</button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {unpaired.map(p => (
              <button
                key={p.id}
                onClick={() => handleQuickSelect(p.id)}
                className={`
                  text-sm px-3 py-2 rounded-xl font-medium transition-all touch-target flex items-center gap-1.5
                  ${player1Id === String(p.id) || player2Id === String(p.id)
                    ? 'bg-pickle-600 text-white shadow-sm scale-105'
                    : player1Id ? 'bg-pickle-50 text-pickle-700 hover:bg-pickle-100'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
                  }
                  ${player2Id === String(p.id) ? 'ring-2 ring-pickle-300' : ''}
                `}
              >
                {genderIcon(p)} {displayName(p)}
              </button>
            ))}
            {unpaired.length === 0 && (
              <p className="text-sm text-gray-400 py-3">All players are paired</p>
            )}
          </div>

          {player1Id && player2Id && (
            <div className="mt-3 space-y-2">
              {(() => {
                const t = getTeamType(parseInt(player1Id), parseInt(player2Id));
                return t && (
                  <div className="text-center">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${t.color}`}>
                      {t.label} — {t.text}
                    </span>
                  </div>
                );
              })()}
              <button id="team-submit" onClick={handleSubmit} disabled={loading} className="btn-primary w-full touch-target text-sm">
                Create {quickP1} & {quickP2}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      )}

      {/* Edit form (shown only when editing) */}
      {editingId && (
        <form onSubmit={handleSubmit} className="card-flat space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Edit Team</h3>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="input-field text-sm" placeholder="Team name" />
          <div className="grid grid-cols-2 gap-2">
            <select value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)} className="input-field text-sm" required>
              <option value="">Player 1</option>
              {participants.map(p => <option key={p.id} value={p.id}>{displayName(p)}</option>)}
            </select>
            <select value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)} className="input-field text-sm" required>
              <option value="">Player 2</option>
              {participants.filter(p => String(p.id) !== player1Id).map(p => (
                <option key={p.id} value={p.id}>{displayName(p)}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 touch-target text-sm">Update</button>
            <button type="button" onClick={resetForm} className="btn-secondary touch-target text-sm px-4">Cancel</button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}

      {/* Teams list */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Teams ({teams.length})
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={handleRandomPair}
              disabled={loading || unpaired.length < 2}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-pickle-50 text-pickle-700 hover:bg-pickle-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Randomly pair all unpaired players"
            >
              🎲 Pair All
            </button>
            {teams.length > 0 && (
              <button
                onClick={handleUnpairAll}
                disabled={loading}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Delete all teams"
              >
                Unpair All
              </button>
            )}
          </div>
        </div>
        {teams.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-gray-400">Tap two players above to create a team</p>
          </div>
        ) : (
          teams.map((t) => {
            const p1 = getParticipant(t.player1_id);
            const p2 = getParticipant(t.player2_id);
            const type = getTeamType(t.player1_id, t.player2_id);
            return (
              <div key={t.id} className="card-flat flex items-center justify-between py-2.5 px-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleEmojiCycle(t)}
                    title="Click to change animal"
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-lg flex-shrink-0 shadow-sm hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  >
                    {t.emoji || getTeamEmoji(t.id)}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm truncate">{t.name}</p>
                      {type && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${type.color}`}>{type.label}</span>}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {genderIcon(p1)} {getParticipantName(t.player1_id)}
                      <span className="text-gray-300">&</span>
                      {genderIcon(p2)} {getParticipantName(t.player2_id)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(t)} className="text-pickle-600 text-xs touch-target px-2 py-1 rounded-lg hover:bg-pickle-50">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-400 text-xs touch-target px-2 py-1 rounded-lg hover:bg-red-50">Del</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
