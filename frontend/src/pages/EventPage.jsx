/**
 * Public event page - view schedule, live matches, teams
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../api';
import MatchCard from '../components/MatchCard';

function LiveCourtMini({ match }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 via-white to-red-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-blue-700">{match.team1_name}</p>
          <p className="text-2xl font-black">{match.team1_score}</p>
          {match.current_server_team === 1 && (
            <p className="text-[10px] text-yellow-600">● Serving ({match.current_server_side})</p>
          )}
        </div>
        <div className="px-3 text-gray-400 text-lg font-bold">vs</div>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-red-700">{match.team2_name}</p>
          <p className="text-2xl font-black">{match.team2_score}</p>
          {match.current_server_team === 2 && (
            <p className="text-[10px] text-yellow-600">● Serving ({match.current_server_side})</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 touch-target"
      >
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <span className="text-gray-400 text-lg">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

export default function EventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [stages, setStages] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await eventsApi.get(slug);
      setEvent(data.event);
      setStages(data.stages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadLive = useCallback(async () => {
    try {
      const data = await eventsApi.getLive(slug);
      setLiveMatches(data.matches || []);
    } catch (err) {
      // silently fail polling
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll live matches every 5 seconds
  useEffect(() => {
    loadLive();
    const interval = setInterval(loadLive, 5000);
    return () => clearInterval(interval);
  }, [loadLive]);

  // Check live matches from stage data too
  const allLiveMatches = [];
  for (const stage of stages) {
    for (const group of stage.groups || []) {
      for (const match of group.matches || []) {
        if (match.status === 'live') {
          allLiveMatches.push({ ...match, stage_name: stage.name, group_name: group.name });
        }
      }
    }
  }

  const hasLive = allLiveMatches.length > 0 || liveMatches.length > 0;
  const displayLive = liveMatches.length > 0 ? liveMatches : allLiveMatches;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-pickle-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error || 'Event not found'}</p>
          <a href="/" className="text-pickle-600 underline">Go home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Banner */}
      {event.banner_url && (
        <img
          src={event.banner_url}
          alt={event.name}
          className="w-full h-48 object-cover"
        />
      )}

      {/* Header */}
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
        {event.description && (
          <p className="text-gray-600 mt-2 text-sm">{event.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-3 text-sm font-medium text-center touch-target border-b-2 transition-colors
            ${activeTab === 'schedule' ? 'border-pickle-600 text-pickle-600' : 'border-transparent text-gray-500'}`}
        >
          Schedule
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-3 text-sm font-medium text-center touch-target border-b-2 transition-colors relative
            ${activeTab === 'live' ? 'border-pickle-600 text-pickle-600' : 'border-transparent text-gray-500'}`}
        >
          Live
          {hasLive && <span className="badge-live ml-1">!</span>}
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-3 text-sm font-medium text-center touch-target border-b-2 transition-colors
            ${activeTab === 'teams' ? 'border-pickle-600 text-pickle-600' : 'border-transparent text-gray-500'}`}
        >
          Teams
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'live' && (
          <>
            {displayLive.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Live Matches
                </h2>
                {displayLive.map((m) => (
                  <LiveCourtMini key={m.id} match={m} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No live matches right now</p>
            )}
          </>
        )}

        {activeTab === 'schedule' && (
          <>
            {stages.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Schedule coming soon</p>
            ) : (
              stages.map((stage) => (
                <CollapsibleSection key={stage.id} title={stage.name} defaultOpen>
                  {stage.groups?.map((group) => (
                    <div key={group.id}>
                      {group.matches?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400 font-medium uppercase">{group.name}</p>
                          {group.matches.map((match) => (
                            <MatchCard key={match.id} match={match} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">{group.name} - No matches yet</p>
                      )}
                    </div>
                  ))}
                  {(!stage.groups || stage.groups.length === 0) && (
                    <p className="text-xs text-gray-400 italic">No groups in this stage</p>
                  )}
                </CollapsibleSection>
              ))
            )}
          </>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-2">
            {stages.flatMap(stage => stage.groups || []).flatMap(group => group.teams || []).length > 0 ? (
              (() => {
                const allTeams = stages.flatMap(stage => stage.groups || []).flatMap(group => group.teams || []);
                const uniqueTeams = allTeams.filter((t, idx, self) => self.findIndex(t2 => t2.id === t.id) === idx);
                return uniqueTeams.map((team) => (
                  <div key={team.id} className="card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pickle-100 flex items-center justify-center text-pickle-700 font-bold text-sm">
                      {team.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{team.name}</p>
                      <p className="text-sm text-gray-500">
                        {team.player1_name} & {team.player2_name}
                      </p>
                    </div>
                  </div>
                ));
              })()
            ) : (
              <p className="text-gray-400 text-center py-8">No teams yet</p>
            )}
          </div>
        )}
      </div>

      {/* Admin link */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 text-center">
        <a
          href={`/admin/${slug}/login`}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Admin
        </a>
      </div>
    </div>
  );
}
