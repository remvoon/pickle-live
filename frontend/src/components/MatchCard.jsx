/**
 * Match card component for displaying match info with clickable score log
 */
import React, { useState } from 'react';

const API_BASE = '/api';

export default function MatchCard({ match, slug }) {
  const [expanded, setExpanded] = useState(false);
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(false);

  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'live';
  const isScheduled = match.status === 'scheduled';
  const hasScore = isLive || isCompleted;

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!hasScore) return;
    setExpanded(true);
    if (!points) {
      setLoading(true);
      try {
        // Fetch points via public endpoint
        const res = await fetch(`${API_BASE}/events/${slug}/matches/${match.id}/points`);
        if (res.ok) {
          const data = await res.json();
          setPoints(data.points || []);
        }
      } catch (e) {
        console.error('Failed to load points', e);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <div
        onClick={toggleExpand}
        className={`
          card-flat overflow-hidden transition-all duration-200 cursor-pointer
          ${isLive ? 'ring-2 ring-red-400/30 shadow-md' : ''}
          ${isCompleted ? 'opacity-80' : ''}
          ${hasScore ? 'hover:shadow-md active:scale-[0.98]' : ''}
        `}
      >
        {/* Status bar */}
        <div className="flex items-center gap-2 mb-3">
          {isLive && <span className="badge-live">LIVE</span>}
          {isCompleted && <span className="badge-completed">Final</span>}
          {isScheduled && <span className="badge-scheduled">Scheduled</span>}
          {match.walkover > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-medium rounded-full border border-orange-200">
              Walkover
            </span>
          )}
          <div className="flex-1" />
          {match.court && (
            <span className="text-[10px] text-gray-400">{match.court}</span>
          )}
          {match.scheduled_time && (
            <span className="text-[10px] text-gray-400">
              {new Date(match.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Teams vs Scores */}
        <div className="flex items-center gap-3">
          {/* Team 1 */}
          <div className="flex-1 min-w-0">
            <p className={`font-semibold truncate flex items-center gap-1 ${isCompleted && match.team1_score > match.team2_score ? 'text-pickle-700' : 'text-gray-800'}`}>
              {match.team1_name}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              <span className={match.team1_player1_gender === 'Female' ? 'text-rose-400' : 'text-blue-400'}>
                {match.team1_player1_gender === 'Female' ? '♀' : '♂'}
              </span>
              {' '}{match.team1_player1_nickname || match.team1_player1_name}
              <span className="text-gray-300 mx-1">&</span>
              <span className={match.team1_player2_gender === 'Female' ? 'text-rose-400' : 'text-blue-400'}>
                {match.team1_player2_gender === 'Female' ? '♀' : '♂'}
              </span>
              {' '}{match.team1_player2_nickname || match.team1_player2_name}
            </p>
          </div>

          {/* Score or VS */}
          {hasScore ? (
            <div className="flex items-center gap-3">
              <span className={`text-xl font-black tabular-nums ${isCompleted && match.team1_score > match.team2_score ? 'text-pickle-600' : isLive ? 'text-gray-900' : 'text-gray-500'}`}>
                {match.team1_score}
              </span>
              <span className="text-[10px] font-bold text-gray-300 uppercase">-</span>
              <span className={`text-xl font-black tabular-nums ${isCompleted && match.team2_score > match.team1_score ? 'text-pickle-600' : isLive ? 'text-gray-900' : 'text-gray-500'}`}>
                {match.team2_score}
              </span>
            </div>
          ) : (
            <div className="flex-shrink-0">
              <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-full">
                VS
              </span>
            </div>
          )}

          {/* Team 2 */}
          <div className="flex-1 min-w-0 text-right">
            <p className={`font-semibold truncate flex items-center gap-1 justify-end ${isCompleted && match.team2_score > match.team1_score ? 'text-pickle-700' : 'text-gray-800'}`}>
              {match.team2_name}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              <span className={match.team2_player1_gender === 'Female' ? 'text-rose-400' : 'text-blue-400'}>
                {match.team2_player1_gender === 'Female' ? '♀' : '♂'}
              </span>
              {' '}{match.team2_player1_nickname || match.team2_player1_name}
              <span className="text-gray-300 mx-1">&</span>
              <span className={match.team2_player2_gender === 'Female' ? 'text-rose-400' : 'text-blue-400'}>
                {match.team2_player2_gender === 'Female' ? '♀' : '♂'}
              </span>
              {' '}{match.team2_player2_nickname || match.team2_player2_name}
            </p>
          </div>
        </div>
      </div>

      {/* Score Log (expandable) */}
      {expanded && (
        <div className="mt-1 mx-2 mb-2 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden animate-fadeSlideUp">
          <div className="px-3 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-semibold text-gray-600">Score Log</span>
            <span className="text-[10px] text-gray-400">({loading ? '...' : (points ? points.length : 0)} rallies)</span>
          </div>
          {loading ? (
            <div className="px-3 py-4 text-center">
              <div className="inline-block w-4 h-4 border-2 border-pickle-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : points && points.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {[...points].reverse().map((p, i) => {
                const t1Before = p.team1_score_before;
                const t2Before = p.team2_score_before;
                const t1After = p.rally_winner_team === 1 ? t1Before + 1 : t1Before;
                const t2After = p.rally_winner_team === 2 ? t2Before + 1 : t2Before;
                const t1Won = p.rally_winner_team === 1;
                return (
                  <div key={p.id || i} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                    <span className="text-[10px] text-gray-400 w-5 text-right tabular-nums">#{p.point_number}</span>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className={`font-semibold tabular-nums ${t1Won ? 'text-pickle-700' : 'text-gray-500'}`}>
                        {t1Before}–{t1After}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className={`font-semibold tabular-nums ${!t1Won ? 'text-pickle-700' : 'text-gray-500'}`}>
                        {t2Before}–{t2After}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium ${p.side_out ? 'text-orange-500' : t1Won ? 'text-pickle-600' : 'text-pickle-600'}`}>
                      {p.side_out ? 'Side-out' : `Pt. ${p.rally_winner_team}`}
                    </span>
                    {(p.scoring_type_at_time === 'side_out' || p.scoring_type_at_time === 'sideout') && !p.side_out && (
                      <span className="text-[9px] text-gray-400">hold</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-[11px] text-gray-400">
              No rallies recorded yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
