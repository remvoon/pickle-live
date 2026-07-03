/**
 * Event setup component - create/edit event, upload banner
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, venuesApi } from '../api';

// Time options: every 15 minutes from 06:00 to 22:45
const TIME_OPTIONS = (() => {
  const times = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of ['00', '15', '30', '45']) {
      times.push(`${String(h).padStart(2, '0')}:${m}`);
    }
  }
  return times;
})();

export default function AdminEventSetup({ slug }) {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [location, setLocation] = useState('');
  const [courts, setCourts] = useState([]);
  const [newCourt, setNewCourt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Venue presets
  const [savedVenues, setSavedVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState(''); // '' = enter new, venue id = selected
  const [saveVenueName, setSaveVenueName] = useState('');
  const [showSaveVenue, setShowSaveVenue] = useState(false);

  useEffect(() => {
    loadEvent();
    loadVenues();
  }, [slug]);

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (message.type === 'success' && message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadVenues = async () => {
    try {
      const data = await venuesApi.list();
      setSavedVenues(data);
    } catch { /* ignore */ }
  };

  const loadEvent = async () => {
    try {
      const data = await eventsApi.get(slug);
      setEvent(data.event);
      setName(data.event.name);
      setDate(data.event.date);
      setStartTime(data.event.start_time || '');
      setEndTime(data.event.end_time || '');
      setDescription(data.event.description || '');
      setBannerPreview(data.event.banner_url || '');
      setLocation(data.event.location || '');
      try { setCourts(JSON.parse(data.event.courts || '[]')); } catch { setCourts([]); }
    } catch (err) {
      // Event might not exist yet
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (event) {
        await eventsApi.update(slug, { name, date, start_time: startTime, end_time: endTime, description, location, courts: JSON.stringify(courts) });
        setMessage({ type: 'success', text: 'Event updated!' });
      } else {
        await eventsApi.create({ slug, name, date, start_time: startTime, end_time: endTime, description, location, courts: JSON.stringify(courts) });
        setMessage({ type: 'success', text: 'Event created!' });
      }
      await loadEvent();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await eventsApi.uploadBanner(slug, file);
      setBannerPreview(result.banner_url);
      setMessage({ type: 'success', text: 'Banner uploaded!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const result = await eventsApi.getShareUrl(slug);
      await navigator.clipboard.writeText(result.url);
      setMessage({ type: 'success', text: 'Link copied!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleVenueSelect = (e) => {
    const id = e.target.value;
    setSelectedVenueId(id);
    if (id === '') {
      // "Enter new venue" selected — leave fields as-is
      return;
    }
    const venue = savedVenues.find(v => String(v.id) === id);
    if (venue) {
      setLocation(venue.name);
      try { setCourts(JSON.parse(venue.courts || '[]')); } catch { setCourts([]); }
    }
  };

  const handleSaveVenue = async () => {
    if (!saveVenueName.trim()) return;
    setLoading(true);
    try {
      if (selectedVenueId) {
        // Updating an existing saved venue
        await venuesApi.update(selectedVenueId, { name: saveVenueName.trim(), courts });
        setMessage({ type: 'success', text: `Venue "${saveVenueName.trim()}" updated!` });
      } else {
        // Creating a new saved venue — backend checks for duplicate name
        await venuesApi.create({ name: saveVenueName.trim(), courts });
        setMessage({ type: 'success', text: `Venue "${saveVenueName.trim()}" saved!` });
      }
      setSaveVenueName('');
      setShowSaveVenue(false);
      await loadVenues();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenue = async (id) => {
    if (!confirm('Delete this saved venue?')) return;
    try {
      await venuesApi.delete(id);
      setMessage({ type: 'success', text: 'Venue deleted.' });
      await loadVenues();
      // If the deleted venue was selected, reset
      if (String(selectedVenueId) === String(id)) {
        setSelectedVenueId('');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Event Setup</h2>

      <form onSubmit={handleCreateOrUpdate} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Slug</label>
          <input
            type="text"
            value={slug}
            disabled
            className="input-field bg-gray-100"
          />
          <p className="text-xs text-gray-400 mt-1">URL: /event/{slug}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="My Event"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Start</label>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="input-field text-sm">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">End</label>
              <select value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="input-field text-sm">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Event description..."
          />
        </div>

        {/* Venue & Courts */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-700 mb-3">Venue & Courts</h3>

          {/* Saved venue chips */}
          {savedVenues.length > 0 && (
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1.5 block">Saved Venues</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setSelectedVenueId(''); setLocation(''); setCourts([]); }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedVenueId === ''
                      ? 'bg-pickle-100 border-pickle-300 text-pickle-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  New
                </button>
                {savedVenues.map(v => (
                  <span key={v.id} className={`inline-flex items-center gap-1 text-xs rounded-full border transition-colors overflow-hidden ${
                    String(selectedVenueId) === String(v.id)
                      ? 'bg-pickle-100 border-pickle-300 text-pickle-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                    <button
                      type="button"
                      onClick={() => handleVenueSelect({ target: { value: String(v.id) } })}
                      className="px-2.5 py-1"
                    >
                      {v.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVenue(v.id)}
                      className="pr-1.5 pl-0.5 py-1 text-gray-300 hover:text-red-500 transition-colors"
                      title={`Delete "${v.name}"`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Location / Venue Name</label>
            <input type="text" value={location} onChange={(e) => { setLocation(e.target.value); setSelectedVenueId(''); }}
              className="input-field text-sm" placeholder="e.g. Golden Gardens Sports Complex" />
          </div>

          {/* Courts */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">Courts</label>
              {courts.length > 0 && <span className="text-[10px] text-gray-400">{courts.length} court{courts.length > 1 ? 's' : ''}</span>}
            </div>
            <div className="flex gap-2 mb-2">
              <input type="text" value={newCourt} onChange={(e) => setNewCourt(e.target.value)}
                className="input-field text-sm flex-1" placeholder="Add court (e.g. Court A)" />
              <button type="button" onClick={() => {
                if (newCourt.trim() && !courts.includes(newCourt.trim())) {
                  setCourts([...courts, newCourt.trim()]);
                  setNewCourt('');
                }
              }} disabled={!newCourt.trim()} className="btn-primary text-sm touch-target px-3">Add</button>
            </div>
            {courts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {courts.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {c}
                    <button type="button" onClick={() => setCourts(courts.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save as venue preset */}
          <div className="mt-3 border-t pt-3">
            {!showSaveVenue ? (
              <button type="button" onClick={() => { setSaveVenueName(location); setShowSaveVenue(true); }}
                className="text-xs text-pickle-600 hover:text-pickle-700 font-medium">
                {selectedVenueId ? '✎ Update venue preset' : '+ Save as venue preset'}
              </button>
            ) : (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input type="text" value={saveVenueName} onChange={(e) => setSaveVenueName(e.target.value)}
                    className="input-field text-sm" placeholder="Preset name" />
                </div>
                <button type="button" onClick={handleSaveVenue}
                  disabled={!saveVenueName.trim() || loading}
                  className="btn-primary text-sm touch-target px-3">{selectedVenueId ? 'Update' : 'Save'}</button>
                <button type="button" onClick={() => setShowSaveVenue(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2">Cancel</button>
              </div>
            )}
          </div>
        </div>

        {message.text && (
          <div className={`text-sm p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full touch-target">
          {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </button>
      </form>

      {/* Banner Upload */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-700">Event Banner</h3>
        
        {bannerPreview && (
          <img
            src={bannerPreview}
            alt="Event banner"
            className="w-full h-40 object-cover rounded-lg"
          />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleBannerUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pickle-50 file:text-pickle-700 hover:file:bg-pickle-100"
        />
      </div>

      {/* Share Link */}
      {event && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Share Event Link</h3>
          <button onClick={handleCopyLink} className="btn-secondary w-full touch-target">
            Copy Public Link
          </button>
        </div>
      )}

      {/* Copy Event */}
      {event && (
        <div className="card border-pickle-100">
          <h3 className="font-semibold text-gray-700 mb-2">Copy Event</h3>
          <p className="text-xs text-gray-400 mb-3">Clone this event and all its data (players, teams, groups, stages, matches). Scores will be reset.</p>
          <button
            onClick={async () => {
              const newSlug = prompt('New URL slug for the copy:', slug + '-copy');
              if (!newSlug) return;
              const newName = prompt('New event name:', name + ' (Copy)');
              if (!newName) return;
              setLoading(true);
              setMessage({ type: '', text: '' });
              try {
                await eventsApi.copy(slug, { new_slug: newSlug, name: newName, date });
                setMessage({ type: 'success', text: `Event copied to "${newSlug}"!` });
                navigate(`/admin/${newSlug}`);
              } catch (err) {
                setMessage({ type: 'error', text: err.message });
              } finally {
                setLoading(false);
              }
            }}
            className="btn-secondary w-full touch-target text-sm"
          >
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Event
          </button>
        </div>
      )}

      {/* Delete Event */}
      {event && (
        <div className="card border-red-100 bg-red-50/30">
          <h3 className="font-semibold text-red-700 mb-2">Danger Zone</h3>
          <p className="text-xs text-red-500 mb-3">Permanently delete this event and all its data (players, teams, matches, scores).</p>
          <button
            onClick={async () => {
              if (confirm(`Delete "${event.name}" and everything in it? This cannot be undone.`)) {
                try {
                  await eventsApi.delete(slug);
                  navigate('/');
                } catch (err) {
                  setMessage({ type: 'error', text: err.message });
                }
              }
            }}
            className="btn-danger w-full touch-target text-sm"
          >
            Delete Event
          </button>
        </div>
      )}
    </div>
  );
}
