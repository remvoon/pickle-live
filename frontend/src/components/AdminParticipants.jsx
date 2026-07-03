/**
 * Participants management - collapsible registry + quick-add with toggles
 */
import React, { useState, useEffect, useRef } from 'react';
import { participantsApi, playersApi } from '../api';
import ToggleGroup from './ToggleGroup';

function CollapsibleSection({ icon, title, subtitle, defaultOpen, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-flat overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 touch-target"
      >
        <div className="flex items-center gap-3">
          {icon && <div className="w-8 h-8 rounded-lg bg-pickle-100 flex items-center justify-center flex-shrink-0">{icon}</div>}
          <div className="text-left">
            <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  );
}

export default function AdminParticipants({ slug }) {
  const [participants, setParticipants] = useState([]);
  const [globalPlayers, setGlobalPlayers] = useState([]);
  const [globalPool, setGlobalPool] = useState([]);
  const [selectedGlobals, setSelectedGlobals] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('Male');
  const [paddle, setPaddle] = useState('');
  const [paddleCustom, setPaddleCustom] = useState(false);
  const [paddleInput, setPaddleInput] = useState('');
  const [handedness, setHandedness] = useState('righty');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => { loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const [p, gp, globalPoolData] = await Promise.all([
        participantsApi.list(slug),
        playersApi.listAll(),
        playersApi.listGlobal(),
      ]);
      setParticipants(p);
      setGlobalPlayers(gp);
      setGlobalPool(globalPoolData);
      setSelectedGlobals([]);
    } catch (err) {
      setError(err.message);
    }
  };

  // Collect unique paddles from all known players
  const allPaddles = [...new Set([
    ...globalPool.map(p => p.paddle),
    ...globalPlayers.map(p => p.paddle),
    ...participants.map(p => p.paddle),
  ].filter(Boolean))].sort();

  const eventPlayerNames = new Set(participants.map(p => p.name));
  const availableGlobals = globalPool.filter(gp => !eventPlayerNames.has(gp.name));

  const toggleGlobal = (id) => {
    setSelectedGlobals(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchAdd = async () => {
    if (selectedGlobals.length === 0) return;
    setBatchLoading(true);
    setError('');
    try {
      await playersApi.batchAddToEvent(slug, selectedGlobals);
      setSelectedGlobals([]);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const selectAllGlobals = () => {
    if (selectedGlobals.length === availableGlobals.length) {
      setSelectedGlobals([]);
    } else {
      setSelectedGlobals(availableGlobals.map(gp => gp.id));
    }
  };

  // Auto-populate nickname from name
  const handleNameChange = (val) => {
    setName(val);
    if (!editingId) {
      setNickname(val);
    }
  };

  const resetForm = () => {
    setName(''); setNickname(''); setGender('');
    setPaddle(''); setPaddleInput(''); setPaddleCustom(false);
    setHandedness(''); setEmail('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const finalNickname = editingId ? nickname : (nickname || name);
      const finalPaddle = paddleCustom ? paddleInput : paddle;
      if (editingId) {
        await participantsApi.update(slug, editingId, { name, nickname: finalNickname, gender, paddle: finalPaddle, handedness, email });
      } else {
        await participantsApi.create(slug, { name, nickname: finalNickname, gender, paddle: finalPaddle, handedness, email });
      }
      resetForm();
      await loadData();
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
    setNickname(p.nickname || '');
    setGender(p.gender || '');
    setPaddle(p.paddle || '');
    setPaddleInput(p.paddle || '');
    setPaddleCustom(p.paddle && !allPaddles.includes(p.paddle));
    setHandedness(p.handedness || '');
    setEmail(p.email || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this player?')) return;
    try {
      await participantsApi.delete(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-3">
      {/* ===== SECTION: From Player Registry ===== */}
      <CollapsibleSection
        icon={
          <svg className="w-4 h-4 text-pickle-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        }
        title="From Player Registry"
        subtitle={`${availableGlobals.length} available · ${globalPool.length} total in registry`}
        defaultOpen={false}
      >
        {availableGlobals.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">All global players are already in this event</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                {selectedGlobals.length > 0 ? `${selectedGlobals.length} selected` : 'Select players to add'}
              </span>
              <button type="button" onClick={selectAllGlobals}
                className="text-[11px] text-pickle-600 font-medium hover:text-pickle-800 touch-target px-2 py-1">
                {selectedGlobals.length === availableGlobals.length ? `Deselect All` : `Select All (${availableGlobals.length})`}
              </button>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {availableGlobals.map(gp => (
                <label key={gp.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-pickle-50 cursor-pointer touch-target">
                  <input type="checkbox" checked={selectedGlobals.includes(gp.id)}
                    onChange={() => toggleGlobal(gp.id)}
                    className="rounded text-pickle-600 focus:ring-pickle-500 w-5 h-5" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                    ${gp.gender === 'Male' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 
                      gp.gender === 'Female' ? 'bg-gradient-to-br from-rose-400 to-rose-600' : 
                      'bg-gradient-to-br from-pickle-400 to-emerald-500'}`}>
                    {gp.display_nickname?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-1">
                      {gp.gender === 'Male' && <span className="text-blue-500">♂</span>}
                      {gp.gender === 'Female' && <span className="text-rose-500">♀</span>}
                      {gp.display_nickname}
                    </p>
                    {gp.display_nickname !== gp.name && <p className="text-[11px] text-gray-400">{gp.name}</p>}
                  </div>
                </label>
              ))}
            </div>
            <button onClick={handleBatchAdd} disabled={selectedGlobals.length === 0 || batchLoading}
              className="btn-primary w-full touch-target text-sm">
              {batchLoading ? 'Adding...' : `Add ${selectedGlobals.length} Player${selectedGlobals.length !== 1 ? 's' : ''} to Event`}
            </button>
          </>
        )}
      </CollapsibleSection>

      {/* ===== SECTION: Quick Add New Player ===== */}
      <CollapsibleSection
        icon={
          <svg className="w-4 h-4 text-pickle-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }
        title={editingId ? 'Edit Player' : 'Quick Add New Player'}
        subtitle={editingId ? 'Editing existing player' : `${participants.length} in event`}
        defaultOpen={false}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <input ref={nameRef} type="text" value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="input-field" placeholder="Player name *" required autoComplete="off" />

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
              <div className="flex gap-2">
                <select value={paddle} onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__custom__') { setPaddleCustom(true); setPaddle(''); setPaddleInput(''); }
                  else setPaddle(val);
                }} className="input-field text-sm flex-1">
                  <option value="">— Select or type —</option>
                  {allPaddles.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__custom__">✏️ Type new...</option>
                </select>
              </div>
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            {editingId ? (
              <>
                <button type="submit" disabled={loading} className="btn-primary flex-1 touch-target text-sm">Update</button>
                <button type="button" onClick={resetForm} className="btn-secondary touch-target text-sm px-4">Cancel</button>
              </>
            ) : (
              <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full touch-target text-sm">
                + Add Player
              </button>
            )}
          </div>
        </form>
      </CollapsibleSection>

      {/* ===== EVENT PLAYERS LIST ===== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event Players ({participants.length})</span>
        </div>

        {participants.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-1">No players in this event yet</p>
          </div>
        ) : (
          participants.map((p) => (
            <div key={p.id} className="card-flat flex items-center justify-between py-2.5 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm
                  ${p.gender === 'Male' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 
                    p.gender === 'Female' ? 'bg-gradient-to-br from-rose-400 to-rose-600' : 
                    'bg-gradient-to-br from-pickle-400 to-emerald-500'}`}>
                  {(p.nickname || p.name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate flex items-center gap-1.5">
                    {p.gender === 'Male' && <span className="text-blue-500 text-xs">♂</span>}
                    {p.gender === 'Female' && <span className="text-rose-500 text-xs">♀</span>}
                    {p.nickname && p.nickname !== p.name
                      ? <>{p.nickname} <span className="text-gray-400 font-normal">({p.name})</span></>
                      : p.name}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {[p.gender === 'Male' ? 'Male' : p.gender === 'Female' ? 'Female' : '',
                      p.handedness === 'righty' ? 'Righty' : p.handedness === 'lefty' ? 'Lefty' : '',
                      p.paddle].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(p)} className="text-pickle-600 text-xs touch-target px-2 py-1 rounded-lg hover:bg-pickle-50">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 text-xs touch-target px-2 py-1 rounded-lg hover:bg-red-50">Del</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
