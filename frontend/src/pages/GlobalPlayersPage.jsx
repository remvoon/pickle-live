/**
 * Global Players management - full-form with toggles, paddle dropdown, avatar
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { playersApi } from '../api';
import { useAuth } from '../auth';
import ToggleGroup from '../components/ToggleGroup';
import AvatarUpload from '../components/AvatarUpload';

export default function GlobalPlayersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('Male');
  const [handedness, setHandedness] = useState('righty');
  const [paddle, setPaddle] = useState('');
  const [paddleCustom, setPaddleCustom] = useState(false);
  const [paddleInput, setPaddleInput] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  // Collect all known paddles from existing players
  const allPaddles = [...new Set(players.map(p => p.paddle).filter(Boolean))].sort();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    loadPlayers();
  }, [isAuthenticated]);

  const loadPlayers = async () => {
    try {
      const data = await playersApi.listGlobal();
      setPlayers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!editingId) setNickname(val);
  };

  const resetForm = () => {
    setName(''); setNickname(''); setGender('Male'); setHandedness('righty');
    setPaddle(''); setPaddleInput(''); setPaddleCustom(false); setEmail(''); setAvatar('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const finalNickname = nickname || name.trim();
      const finalPaddle = paddleCustom ? paddleInput : paddle;
      const data = { name: name.trim(), nickname: finalNickname, gender, handedness, paddle: finalPaddle, email, avatar };
      if (editingId) {
        await playersApi.update(editingId, data);
      } else {
        await playersApi.create(data);
      }
      resetForm();
      await loadPlayers();
      nameRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setName(p.name);
    setNickname(p.nickname || p.name);
    setGender(p.gender || 'Male');
    setHandedness(p.handedness || 'righty');
    setPaddle(p.paddle || '');
    setPaddleInput(p.paddle || '');
    setPaddleCustom(p.paddle && !allPaddles.includes(p.paddle));
    setEmail(p.email || '');
    setAvatar(p.avatar || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this player from the global registry?')) return;
    try {
      await playersApi.delete(id);
      await loadPlayers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 touch-target -ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">Player Registry</h1>
          </div>
          <span className="text-xs text-gray-400">{players.length} players</span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Add/Edit form */}
        <form onSubmit={handleSubmit} className="card-flat space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">
            {editingId ? 'Edit Player' : 'Add Global Player'}
          </h3>

          {/* Name */}
          <input ref={nameRef} type="text" value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="input-field text-sm" placeholder="Full name *" required autoComplete="off" />

          {/* Nickname (auto-populated) */}
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
            className="input-field text-sm" placeholder="Nickname" />

          {/* Gender toggle */}
          <ToggleGroup
            label="Gender"
            options={[
              { value: 'Male', label: '♂ Male' },
              { value: 'Female', label: '♀ Female' },
            ]}
            value={gender}
            onChange={setGender}
          />

          {/* Handedness toggle */}
          <ToggleGroup
            label="Handedness"
            options={[
              { value: 'righty', label: '➡ Righty' },
              { value: 'lefty', label: '⬅ Lefty' },
            ]}
            value={handedness}
            onChange={setHandedness}
          />

          {/* Paddle dropdown + custom */}
          <div>
            <p className="text-[10px] text-gray-400 mb-1 font-medium">Paddle</p>
            {!paddleCustom ? (
              <select value={paddle} onChange={(e) => {
                const val = e.target.value;
                if (val === '__custom__') { setPaddleCustom(true); setPaddle(''); setPaddleInput(''); }
                else setPaddle(val);
              }} className="input-field text-sm">
                <option value="">— Select or type —</option>
                {allPaddles.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="__custom__">✏️ Type new...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={paddleInput} onChange={(e) => { setPaddleInput(e.target.value); setPaddle(e.target.value); }}
                  className="input-field text-sm flex-1" placeholder="Enter paddle brand" autoFocus />
                <button type="button" onClick={() => { setPaddleCustom(false); setPaddle(''); setPaddleInput(''); }}
                  className="text-xs text-gray-400 touch-target px-2">Back</button>
              </div>
            )}
          </div>

          {/* Email */}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="input-field text-sm" placeholder="Email (optional)" />

          {/* Avatar */}
          <AvatarUpload currentAvatar={avatar} onAvatarChange={setAvatar} name={name} />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            {editingId ? (
              <>
                <button type="submit" disabled={loading} className="btn-primary flex-1 touch-target text-sm">Update</button>
                <button type="button" onClick={resetForm} className="btn-secondary touch-target text-sm px-4">Cancel</button>
              </>
            ) : (
              <button type="submit" disabled={loading || !name.trim()} className="btn-primary flex-1 touch-target text-sm">+ Add to Registry</button>
            )}
          </div>
        </form>

        {/* Player list */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            All Players ({players.length})
          </p>

          {players.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">No players in the registry yet</p>
              <p className="text-xs text-gray-300 mt-1">Add players above, then use them across any event</p>
            </div>
          ) : (
            players.map(p => (
              <div key={p.id} className="card-flat flex items-center justify-between py-2.5 px-4">
                <div className="flex items-center gap-3 min-w-0">
                  {p.avatar ? (
                    <img src={p.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-sm border border-gray-100" />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm
                      ${p.gender === 'Male' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 
                        p.gender === 'Female' ? 'bg-gradient-to-br from-rose-400 to-rose-600' : 
                        'bg-gradient-to-br from-pickle-400 to-emerald-500'}`}>
                      {(p.display_nickname || p.name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate flex items-center gap-1.5">
                      {p.gender === 'Male' && <span className="text-blue-500 text-xs">♂</span>}
                      {p.gender === 'Female' && <span className="text-rose-500 text-xs">♀</span>}
                      {p.display_nickname !== p.name ? (
                        <>{p.display_nickname} <span className="text-gray-400 font-normal">({p.name})</span></>
                      ) : p.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {[p.handedness === 'righty' ? 'Righty' : p.handedness === 'lefty' ? 'Lefty' : '',
                        p.paddle].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="text-pickle-600 text-xs touch-target px-2 py-1 rounded-lg hover:bg-pickle-50">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-400 text-xs touch-target px-2 py-1 rounded-lg hover:bg-red-50">Del</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
