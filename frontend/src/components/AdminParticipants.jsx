/**
 * Participants management component
 */
import React, { useState, useEffect } from 'react';
import { participantsApi } from '../api';

export default function AdminParticipants({ slug }) {
  const [participants, setParticipants] = useState([]);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [paddle, setPaddle] = useState('');
  const [handedness, setHandedness] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadParticipants(); }, [slug]);

  const loadParticipants = async () => {
    try {
      const data = await participantsApi.list(slug);
      setParticipants(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setName(''); setGender(''); setPaddle(''); setHandedness(''); setEmail('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editingId) {
        await participantsApi.update(slug, editingId, { name, gender, paddle, handedness, email });
      } else {
        await participantsApi.create(slug, { name, gender, paddle, handedness, email });
      }
      resetForm();
      await loadParticipants();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setName(p.name); setGender(p.gender || '');
    setPaddle(p.paddle || ''); setHandedness(p.handedness || '');
    setEmail(p.email || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this participant?')) return;
    try {
      await participantsApi.delete(slug, id);
      await loadParticipants();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Participants</h2>

      <form onSubmit={handleSubmit} className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Full name *"
              required
            />
          </div>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-field">
            <option value="">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select value={handedness} onChange={(e) => setHandedness(e.target.value)} className="input-field">
            <option value="">Handedness</option>
            <option value="righty">Righty</option>
            <option value="lefty">Lefty</option>
          </select>
          <input
            type="text"
            value={paddle}
            onChange={(e) => setPaddle(e.target.value)}
            className="input-field"
            placeholder="Paddle brand"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="Email (optional)"
          />
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
            Add Participant
          </button>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>

      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{p.name}</p>
              <p className="text-xs text-gray-400">
                {[p.gender, p.handedness, p.paddle].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(p)} className="text-pickle-600 text-sm touch-target px-2">
                Edit
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-red-500 text-sm touch-target px-2">
                Del
              </button>
            </div>
          </div>
        ))}
        {participants.length === 0 && (
          <p className="text-gray-400 text-center py-4">No participants yet</p>
        )}
      </div>
    </div>
  );
}
