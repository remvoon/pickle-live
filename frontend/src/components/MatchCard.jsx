/**
 * Match card component for displaying match info
 */
import React from 'react';

export default function MatchCard({ match, compact = false }) {
  const getStatusBadge = () => {
    switch (match.status) {
      case 'live':
        return <span className="badge-live">LIVE</span>;
      case 'completed':
        return <span className="badge-completed">Final</span>;
      default:
        return <span className="badge-scheduled">Scheduled</span>;
    }
  };

  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'live';
  const scoreColor = isCompleted ? 'text-green-600' : isLive ? 'text-gray-900' : 'text-gray-400';

  if (compact) {
    return (
      <div className={`card flex items-center justify-between py-2 ${isLive ? 'border-l-4 border-l-red-500' : ''}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{match.team1_name}</span>
            <span className="text-xs text-gray-400">vs</span>
            <span className="text-sm font-medium text-gray-800">{match.team2_name}</span>
            {getStatusBadge()}
          </div>
          {match.court && <p className="text-xs text-gray-400 mt-0.5">{match.court}</p>}
        </div>
        {(isLive || isCompleted) && (
          <div className={`text-lg font-bold ${scoreColor}`}>
            {match.team1_score}-{match.team2_score}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`card ${isLive ? 'border-l-4 border-l-red-500 animate-pulse' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge()}
            {match.court && <span className="text-xs text-gray-400">{match.court}</span>}
            {match.scheduled_time && (
              <span className="text-xs text-gray-400">
                {new Date(match.scheduled_time).toLocaleString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{match.team1_name}</p>
              <p className="text-xs text-gray-500">
                {match.team1_player1_name} & {match.team1_player2_name}
              </p>
            </div>
            
            {(isLive || isCompleted) && (
              <div className={`text-2xl font-black mx-4 ${scoreColor}`}>
                {match.team1_score}
              </div>
            )}
            
            <div className="text-gray-400 font-bold">VS</div>
            
            {(isLive || isCompleted) && (
              <div className={`text-2xl font-black mx-4 ${scoreColor}`}>
                {match.team2_score}
              </div>
            )}
            
            <div className="flex-1 text-right">
              <p className="font-semibold text-gray-800">{match.team2_name}</p>
              <p className="text-xs text-gray-500">
                {match.team2_player1_name} & {match.team2_player2_name}
              </p>
            </div>
          </div>

          {match.walkover > 0 && (
            <p className="text-xs text-orange-500 mt-1">Walkover</p>
          )}
        </div>
      </div>
    </div>
  );
}
