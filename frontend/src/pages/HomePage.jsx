import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { eventsApi } from '../api';
import { useAuth } from '../auth';

function EventCard({ event, isUpcoming, isAdmin, onDelete, onCopy }) {
  const date = new Date(event.date);
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
  const isPast = !isUpcoming;

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${event.name}" and all its data?`)) {
      onDelete?.(event.id);
    }
  };

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Copy button clicked, event.id:', event.id);
    try {
      // Use a simple confirm first to check if the handler fires
      if (!confirm(`Copy event "${event.name}"?`)) return;
      const newSlug = prompt('New URL slug for the copy:', event.id + '-copy');
      if (!newSlug) return;
      const newName = prompt('New event name:', event.name + ' (Copy)');
      if (!newName) return;
      console.log('Calling onCopy with:', newSlug, newName);
      onCopy?.(event, newSlug, newName);
    } catch (err) {
      console.error('Copy handler error:', err);
      alert('Copy error: ' + err.message);
    }
  };

  return (
    <div className="relative group">
      <Link to={`/event/${event.id}`} className="block">
        <div className={`card flex items-center gap-4 group cursor-pointer
          ${isUpcoming ? 'border-l-4 border-l-pickle-500' : 'opacity-70'}`}>
          {/* Date badge */}
          <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center
            ${isUpcoming ? 'bg-pickle-100 text-pickle-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="text-xs font-bold uppercase">{date.toLocaleString('en', { month: 'short' })}</span>
            <span className="text-lg font-black leading-none">{date.getDate()}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${isUpcoming ? 'text-gray-900' : 'text-gray-600'}`}>
              {event.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{formatted}</p>
            {event.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{event.description}</p>
            )}
            {(event.start_time || event.location) && (
              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                {event.start_time && (
                  <span className="inline-flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                  </span>
                )}
                {event.location && (
                  <span className="inline-flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Arrow */}
          <svg className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5
            ${isUpcoming ? 'text-pickle-500' : 'text-gray-300'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
      {/* Delete & Copy buttons (admin only) */}
      {isAdmin && (
        <>
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm z-10
                       border border-red-100 text-red-400
                       hover:bg-red-50 hover:text-red-600 transition-all touch-target
                       flex items-center justify-center shadow-sm"
            title="Delete event"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-12 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm z-10
                       border border-pickle-100 text-pickle-400
                       hover:bg-pickle-50 hover:text-pickle-600 transition-all touch-target
                       flex items-center justify-center shadow-sm"
            title="Copy event"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    slug: '', name: '', date: new Date().toISOString().split('T')[0], description: ''
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [copying, setCopying] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [pin, setPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await eventsApi.listAll();
      setEvents({ upcoming: data.upcoming || [], past: data.past || [] });
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (slug) => {
    try {
      await eventsApi.delete(slug);
      await loadEvents();
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleCopyEvent = async (event, newSlug, newName) => {
    setCopying(true);
    setCopyMessage('');
    try {
      await eventsApi.copy(event.id, { new_slug: newSlug, name: newName, date: event.date });
      await loadEvents();
      setCopyMessage(`Copied to "${newName}"`);
      setTimeout(() => setCopyMessage(''), 3000);
    } catch (err) {
      setCopyMessage(err.message);
    } finally {
      setCopying(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await eventsApi.create(createForm);
      await loadEvents();
      setShowCreate(false);
      setCreateForm({ slug: '', name: '', date: '', description: '' });
      navigate(`/admin/${createForm.slug}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAdminClick = () => {
    if (isAuthenticated) {
      setShowCreate(!showCreate);
    } else {
      setShowPinInput(true);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Hero */}
      <div className="hero-gradient px-6 pt-12 pb-16 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Pickle-Live
            </h1>
            <button
              onClick={handleAdminClick}
              className="text-white/80 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all touch-target flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </button>
          </div>
          <p className="text-white/70 text-sm font-medium">
            Pickleball event management — live scores, brackets, teams
          </p>
        </div>
      </div>

      {/* PIN Pad Modal */}
      {showPinInput && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="card-flat w-full max-w-xs p-6 animate-[fadeSlideUp_0.2s_ease-out]">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Admin PIN</h3>
              <p className="text-xs text-gray-400">Enter your 4-digit PIN</p>
            </div>
            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-150
                  ${pin[i] !== undefined ? 'bg-pickle-600 scale-110' : 'bg-gray-200'}`} />
              ))}
            </div>
            {createError && <p className="text-red-500 text-sm text-center mb-3">{createError}</p>}
            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
              {[1,2,3,4,5,6,7,8,9].map(num => (
                <button key={num} onClick={() => {
                  if (pin.length < 4) {
                    const newPin = pin + num;
                    setPin(newPin);
                    if (newPin.length === 4) {
                      setTimeout(() => login(newPin).then(() => {
                        setShowPinInput(false);
                        setPin('');
                        setShowCreate(true);
                      }).catch(() => {
                        setCreateError('Wrong PIN');
                      }), 100);
                    }
                  }
                }}
                  className="w-full aspect-square rounded-xl bg-gray-50 text-gray-800 text-xl font-bold
                             border border-gray-100 hover:bg-pickle-50 hover:border-pickle-200
                             active:scale-95 transition-all touch-target flex items-center justify-center">
                  {num}
                </button>
              ))}
              <button onClick={() => { setPin(''); setCreateError(''); setShowPinInput(false); }}
                className="w-full aspect-square rounded-xl bg-gray-100 text-gray-500 text-xs font-medium
                           border border-gray-100 hover:bg-gray-200 touch-target flex items-center justify-center">
                Cancel
              </button>
              <button onClick={() => { if (pin.length < 4) { const np = pin + '0'; setPin(np); if (np.length === 4) { setTimeout(() => login(np).then(() => { setShowPinInput(false); setPin(''); setShowCreate(true); }).catch(() => { setCreateError('Wrong PIN'); }), 100); } } }}
                className="w-full aspect-square rounded-xl bg-gray-50 text-gray-800 text-xl font-bold
                           border border-gray-100 hover:bg-pickle-50 hover:border-pickle-200
                           active:scale-95 transition-all touch-target flex items-center justify-center">
                0
              </button>
              <button onClick={() => setPin(pin.slice(0, -1))}
                className="w-full aspect-square rounded-xl bg-gray-100 text-gray-500
                           border border-gray-100 hover:bg-gray-200 touch-target flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Players Registry Link (when authenticated) */}
      {isAuthenticated && (
        <div className="px-4 -mt-3 relative z-20 mb-4">
          <Link to="/players"
            className="card-flat flex items-center gap-3 py-3 px-4 hover:bg-pickle-50/50 transition-colors border-pickle-100"
          >
            <div className="w-9 h-9 rounded-xl bg-pickle-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-pickle-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Player Registry</p>
              <p className="text-[11px] text-gray-400">Manage global player list — reusable across all events</p>
            </div>
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Create Event Form */}
      {showCreate && isAuthenticated && (
        <div className="px-4 -mt-4 relative z-20">
          <div className="card-flat shadow-lg border-pickle-200 animate-[fadeSlideUp_0.2s_ease-out]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">New Event</h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost touch-target text-sm">Cancel</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Event Name</label>
                <input type="text" value={createForm.name} onChange={(e) => {
                  const name = e.target.value;
                  setCreateForm(prev => ({
                    ...prev,
                    name,
                    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                  }));
                }} className="input-field" placeholder="Summer Showdown" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">URL Slug</label>
                <input type="text" value={createForm.slug} onChange={(e) => setCreateForm(p => ({...p, slug: e.target.value}))}
                  className="input-field" placeholder="summer-showdown" required />
                <p className="text-[10px] text-gray-400 mt-1">/{createForm.slug || 'summer-showdown'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
                <input type="date" value={createForm.date} onChange={(e) => setCreateForm(p => ({...p, date: e.target.value}))}
                  className="input-field" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description (optional)</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm(p => ({...p, description: e.target.value}))}
                  className="input-field" rows={2} placeholder="A fun weekend event..." />
              </div>
              {createError && <p className="text-red-500 text-sm">{createError}</p>}
              <button type="submit" disabled={createLoading} className="btn-primary w-full touch-target">
                {createLoading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Copy feedback toast */}
      {copyMessage && (
        <div className={`px-4 mt-4 transition-all duration-200 ${copyMessage.startsWith('Copied') ? '' : ''}`}>
          <div className={`text-sm font-medium px-4 py-2.5 rounded-xl text-center ${
            copyMessage.startsWith('Copied') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {copying && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2 align-middle" />
            )}
            {copyMessage}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="px-4 mt-6 space-y-6">
        {/* Upcoming */}
        {events.upcoming.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-pickle-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Upcoming</h2>
              <span className="text-xs text-gray-400 ml-auto">{events.upcoming.length}</span>
            </div>
            <div className="space-y-2">
              {events.upcoming.map(event => (
                <EventCard key={event.id} event={event} isUpcoming isAdmin={isAuthenticated} onDelete={handleDeleteEvent} onCopy={handleCopyEvent} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && events.upcoming.length === 0 && events.past.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pickle-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-pickle-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No events yet</h3>
            <p className="text-sm text-gray-400 mb-6">Create your first event to get started</p>
            <button onClick={handleAdminClick} className="btn-primary inline-flex items-center gap-2 touch-target">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-pickle-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Past */}
        {events.past.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Past Events</h2>
              <span className="text-xs text-gray-400 ml-auto">{events.past.length}</span>
            </div>
            <div className="space-y-2">
              {events.past.map(event => (
                <EventCard key={event.id} event={event} isUpcoming={false} isAdmin={isAuthenticated} onDelete={handleDeleteEvent} onCopy={handleCopyEvent} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
