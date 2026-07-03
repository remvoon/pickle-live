/**
 * Event setup component - create/edit event, upload banner
 */
import React, { useState, useEffect } from 'react';
import { eventsApi } from '../api';

export default function AdminEventSetup({ slug }) {
  const [event, setEvent] = useState(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadEvent();
  }, [slug]);

  const loadEvent = async () => {
    try {
      const data = await eventsApi.get(slug);
      setEvent(data.event);
      setName(data.event.name);
      setDate(data.event.date);
      setDescription(data.event.description || '');
      setBannerPreview(data.event.banner_url || '');
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
        await eventsApi.update(slug, { name, date, description });
        setMessage({ type: 'success', text: 'Event updated!' });
      } else {
        await eventsApi.create({ slug, name, date, description });
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
            placeholder="My Tournament"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Tournament description..."
          />
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
    </div>
  );
}
