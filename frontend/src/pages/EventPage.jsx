/**
 * Public event page - view schedule, live matches, teams
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventsApi } from '../api';
import { useAuth } from '../auth';
import { getTeamEmoji } from '../utils';
import MatchCard from '../components/MatchCard';
import StandingsTable from '../components/StandingsTable';

function LiveCourtMini({ match }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 via-white to-red-50 rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <p className="text-xs font-semibold text-blue-700 mb-1">{match.team1_name}</p>
          <p className="text-3xl font-black text-gray-900">{match.team1_score}</p>
          {match.current_server_team === 1 && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
              Serving {match.current_server_side}
            </span>
          )}
        </div>
        <div className="px-4 flex flex-col items-center">
          <span className="text-xs text-gray-300 font-medium uppercase tracking-wider">vs</span>
          <span className="w-6 h-px bg-gray-200 mt-1" />
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs font-semibold text-red-700 mb-1">{match.team2_name}</p>
          <p className="text-3xl font-black text-gray-900">{match.team2_score}</p>
          {match.current_server_team === 2 && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
              Serving {match.current_server_side}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-flat overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 touch-target"
      >
        <div className="text-left">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

export default function EventPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [stages, setStages] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamStandings, setTeamStandings] = useState([]);
  const [playerStandings, setPlayerStandings] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const data = await eventsApi.get(slug);
      setEvent(data.event);
      setStages(data.stages || []);
      setAllTeams(data.allTeams || []);
      setAllParticipants(data.allParticipants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadStandings = useCallback(async () => {
    try {
      const data = await eventsApi.getStandings(slug);
      setTeamStandings(data.team_standings || []);
      setPlayerStandings(data.player_standings || []);
    } catch (_) {
      // standings are optional
    }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStandings(); }, [loadStandings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pickle-50/50 via-white to-pickle-50/30">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-pickle-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-pickle-50/50 via-white to-pickle-50/30">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-1">Event not found</p>
          <p className="text-sm text-gray-400 mb-4">This event doesn't exist or was removed</p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2 touch-target">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isRoyalRumble = event?.format_type === 'royal_rumble';

  const tabs = [
    { id: 'details', label: 'Details', icon: '📋' },
    { id: isRoyalRumble ? 'players' : 'teams', label: isRoyalRumble ? 'Players' : 'Teams', icon: isRoyalRumble ? '👤' : '👥' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'standings', label: 'Standings', icon: '🏆' },
  ];

  return (
    <div className="max-w-lg mx-auto pb-28 bg-gradient-to-b from-white to-pickle-50/20 min-h-screen">
      {/* Back nav */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 touch-target">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Events
        </Link>
        <a href={isAuthenticated ? `/admin/${slug}` : `/admin/${slug}/login`}
          className="text-xs text-gray-300 hover:text-gray-500 touch-target px-2">
          Admin
        </a>
      </div>

      {/* Event Header */}
      <div className="px-4 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        <div className="flex items-center gap-2 mt-1.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="text-sm text-gray-500">
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            })}
          </span>
        </div>
        {(event.start_time || event.end_time) && (
          <div className="flex items-center gap-2 mt-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-500">
              {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
            </span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-2 mt-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="text-sm text-gray-500">{event.location}</span>
          </div>
        )}
        {event.courts > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <span className="text-sm text-gray-500">{event.courts} court{event.courts > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-gray-100/80 rounded-xl p-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg touch-target transition-all duration-150 relative
                ${activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="hidden sm:inline">{tab.icon} </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 space-y-3 page-enter">
        {activeTab === 'details' && (
          <div className="space-y-4">
            {event.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About this event</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            {event.banner_url && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Event Image</p>
                <img src={event.banner_url} alt={event.name} className="w-full h-auto object-contain rounded-2xl shadow-sm" />
              </div>
            )}
            {!event.description && !event.banner_url && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">No details yet</p>
                <p className="text-xs text-gray-400 mt-1">The organizer hasn't added event details</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <>
            {stages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">Schedule coming soon</p>
                <p className="text-xs text-gray-400 mt-1">The organizer hasn't posted matches yet</p>
              </div>
            ) : (
              stages.map((stage) => (
                <CollapsibleSection key={stage.id} title={stage.name}
                  subtitle={`${stage.scoring_type} · to ${stage.points_to_win}${stage.deuce_allowed ? ' · deuce' : ''}`}>
                  {stage.groups?.map((group) => (
                    <div key={group.id}>
                      {group.matches?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.name}</p>
                          {group.matches.map((match) => (
                            <MatchCard key={match.id} match={match} slug={slug} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-400">{group.name} — No matches yet</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!stage.groups || stage.groups.length === 0) && (
                    <div className="text-center py-4 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400">No groups in this stage</p>
                    </div>
                  )}
                </CollapsibleSection>
              ))
            )}
            {/* Standings at bottom of schedule */}
            {(teamStandings.length > 0 || playerStandings.length > 0) && (
              <div className="mt-6 space-y-4">
                {teamStandings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">👥</span>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team Standings</h3>
                    </div>
                    <StandingsTable standings={teamStandings} type="teams" participants={allParticipants} />
                  </div>
                )}
                {playerStandings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">👤</span>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Player Standings</h3>
                    </div>
                    <StandingsTable standings={playerStandings} type="players" participants={allParticipants} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-2">
            {allTeams.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{allTeams.length} Team{allTeams.length > 1 ? 's' : ''}</p>
                {allTeams.map((team) => {
                      const p1Gender = team.player1_gender || '';
                      const p2Gender = team.player2_gender || '';
                      // Detect team type
                      let typeBadge = null;
                      if (p1Gender === 'Male' && p2Gender === 'Male') typeBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">MD</span>;
                      else if (p1Gender === 'Female' && p2Gender === 'Female') typeBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">WD</span>;
                      else if (p1Gender && p2Gender) typeBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">XD</span>;
                      return (
                        <div key={team.id} className="card flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                            {team.emoji || getTeamEmoji(team.id)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800 text-sm">{team.name}</p>
                              {typeBadge}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <span className={p1Gender === 'Female' ? 'text-rose-500' : 'text-blue-500'}>{p1Gender === 'Female' ? '♀' : '♂'}</span>
                              {' '}{team.player1_nickname || team.player1_name}
                              <span className="text-gray-300 mx-1.5">&</span>
                              <span className={p2Gender === 'Female' ? 'text-rose-500' : 'text-blue-500'}>{p2Gender === 'Female' ? '♀' : '♂'}</span>
                              {' '}{team.player2_nickname || team.player2_name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">No teams yet</p>
                <p className="text-xs text-gray-400 mt-1">Teams will appear once the organizer sets them up</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-2">
            {allParticipants.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{allParticipants.length} Player{allParticipants.length > 1 ? 's' : ''}</p>
                {allParticipants.map((p) => {
                  const gender = p.gender || '';
                  const genderIcon = gender === 'Female' ? '♀' : gender === 'Male' ? '♂' : '';
                  const genderColorClass = gender === 'Female' ? 'text-rose-500' : gender === 'Male' ? 'text-blue-500' : 'text-gray-400';
                  const avatarGradient = gender === 'Female' ? 'from-rose-400 to-rose-600' : gender === 'Male' ? 'from-blue-500 to-blue-700' : 'from-pickle-400 to-emerald-500';
                  const initial = (p.nickname || p.name || '?')[0].toUpperCase();
                  return (
                    <div key={p.id} className="card flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0`}>
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800 text-sm">{p.nickname || p.name}</p>
                          {genderIcon && <span className={`text-xs font-bold ${genderColorClass}`}>{genderIcon}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.handedness === 'lefty' && <span>⬅ Left-handed</span>}
                          {p.handedness === 'righty' && <span>➡ Right-handed</span>}
                          {p.paddle && <span className="ml-2">{p.paddle}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">No players yet</p>
                <p className="text-xs text-gray-400 mt-1">Players will appear once the organizer adds them</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-4">
            {teamStandings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">👥</span>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team Standings</h3>
                </div>
                <StandingsTable standings={teamStandings} type="teams" participants={allParticipants} />
              </div>
            )}
            {playerStandings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">👤</span>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Player Standings</h3>
                </div>
                <StandingsTable standings={playerStandings} type="players" participants={allParticipants} />
              </div>
            )}
            {teamStandings.length === 0 && playerStandings.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm font-medium text-gray-500">No standings yet</p>
                <p className="text-xs text-gray-400 mt-1">Standings will appear once matches are completed</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
