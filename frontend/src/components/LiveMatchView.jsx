/**
 * Live Match Scoring View - Visual court with scoring controls
 */
import React, { useState, useEffect, useCallback } from 'react';
import { matchesApi } from '../api';

function PlayerBox({ name, isServing, side, isActive, onClick, teamColor }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all touch-target
        ${isActive ? 'ring-2 ring-yellow-400 scale-105' : ''}
        ${teamColor === 1 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}
        ${isServing ? 'shadow-lg' : ''}
      `}
    >
      {isServing && (
        <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          SERVE
        </span>
      )}
      <span className="text-sm font-bold text-gray-800">{name || 'TBD'}</span>
      {side && (
        <span className="text-[10px] text-gray-400 mt-0.5">
          {side === 'left' ? '← Left' : 'Right →'}
        </span>
      )}
    </button>
  );
}

export default function LiveMatchView({ slug, matchId, onExit }) {
  const [match, setMatch] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [lastAction, setLastAction] = useState('');
  const [matchComplete, setMatchComplete] = useState(false);

  // Determine which player is on which service court
  const getServerInfo = useCallback((m) => {
    if (!m) return { team1Server: null, team1Side: '', team2Server: null, team2Side: '' };
    
    let team1Server = m.current_server_team === 1 ? m.current_server_player_id : null;
    let team2Server = m.current_server_team === 2 ? m.current_server_player_id : null;
    let team1Side = m.current_server_team === 1 ? m.current_server_side : '';
    let team2Side = m.current_server_team === 2 ? m.current_server_side : '';
    
    return { team1Server, team1Side, team2Server, team2Side };
  }, []);

  const loadMatch = useCallback(async () => {
    try {
      const matches = await matchesApi.list(slug);
      const m = matches.find(mm => mm.id === matchId);
      if (m) {
        setMatch(m);
        // Auto-select the server for the current serving team
        if (m.current_server_team === 1) {
          setSelectedServerId(m.current_server_player_id);
        } else {
          setSelectedServerId(m.current_server_player_id);
        }
        
        if (m.status === 'completed') {
          setMatchComplete(true);
        }
      }
      
      // Get points
      const liveData = await matchesApi.list(slug);
      const liveMatch = liveData.find(mm => mm.id === matchId);
      if (liveMatch) {
        // Try to load points via undo endpoint's response
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug, matchId]);

  const recordPoint = async (rallyWinnerTeam) => {
    if (!selectedServerId && !matchComplete) {
      setError('Please select the server first');
      return;
    }
    
    setError('');
    setLastAction('');
    
    try {
      const data = {
        rally_winner_team: rallyWinnerTeam,
        server_player_id: selectedServerId,
      };
      
      const result = await matchesApi.recordPoint(slug, matchId, data);
      
      if (result.match) {
        setMatch(result.match);
      }
      if (result.points) {
        setPoints(result.points);
      }
      if (result.side_out) {
        setLastAction('Side Out!');
      }
      if (result.match_completed) {
        setMatchComplete(true);
        setLastAction('Match Complete!');
      }
      
      // Update selected server to new auto-computed server
      if (result.next_server) {
        setSelectedServerId(result.next_server.player_id);
      } else if (result.match) {
        setSelectedServerId(result.match.current_server_player_id);
      }
      
    } catch (err) {
      setError(err.message);
    }
  };

  const undoPoint = async () => {
    setError('');
    try {
      const result = await matchesApi.undo(slug, matchId);
      if (result.match) {
        setMatch(result.match);
        setMatchComplete(false);
        setSelectedServerId(result.match.current_server_player_id);
      }
      if (result.points) {
        setPoints(result.points);
      }
      setLastAction('Undone');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading match...</p></div>;
  }

  if (!match) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Match not found</p>
        <button onClick={onExit} className="btn-secondary">Back</button>
      </div>
    );
  }

  const { team1Server, team1Side, team2Server, team2Side } = getServerInfo(match);
  const isTeam1Serving = match.current_server_team === 1;
  const isTeam2Serving = match.current_server_team === 2;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Live Scoring</h2>
        <div className="flex gap-2">
          <span className="badge-live">LIVE</span>
          <button onClick={onExit} className="text-sm text-gray-500 touch-target px-2">Exit</button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="card bg-gradient-to-r from-blue-50 to-red-50">
        <div className="flex items-center justify-between">
          {/* Team 1 */}
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-blue-700">{match.team1_name || 'Team 1'}</p>
            <p className="text-4xl font-black text-gray-900">{match.team1_score || 0}</p>
            {isTeam1Serving && <span className="text-xs text-yellow-600 font-bold">● Serving</span>}
          </div>
          
          <div className="text-center px-4">
            <p className="text-2xl font-black text-gray-400">vs</p>
            {lastAction && (
              <span className={`
                text-xs font-bold animate-pulse
                ${lastAction === 'Side Out!' ? 'text-orange-500' : ''}
                ${lastAction === 'Match Complete!' ? 'text-green-600' : ''}
                ${lastAction === 'Undone' ? 'text-gray-500' : ''}
              `}>
                {lastAction}
              </span>
            )}
          </div>
          
          {/* Team 2 */}
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-red-700">{match.team2_name || 'Team 2'}</p>
            <p className="text-4xl font-black text-gray-900">{match.team2_score || 0}</p>
            {isTeam2Serving && <span className="text-xs text-yellow-600 font-bold">● Serving</span>}
          </div>
        </div>
      </div>

      {/* Court View */}
      <div className="card">
        <div className="flex gap-3">
          {/* Team 1 Side */}
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold text-blue-600 text-center uppercase">Team 1 Side</p>
            <PlayerBox
              name={match.team1_player1_name}
              isServing={isTeam1Serving}
              side={isTeam1Serving ? match.current_server_side : ''}
              isActive={selectedServerId === parseInt(match.team1_player1_id || 0) && isTeam1Serving}
              onClick={() => {
                if (isTeam1Serving) {
                  setSelectedServerId(parseInt(match.team1_player1_id || 0));
                }
              }}
              teamColor={1}
            />
            <PlayerBox
              name={match.team1_player2_name}
              isServing={false}
              side=""
              isActive={selectedServerId === parseInt(match.team1_player2_id || 0) && isTeam1Serving}
              onClick={() => {
                if (isTeam1Serving) {
                  setSelectedServerId(parseInt(match.team1_player2_id || 0));
                }
              }}
              teamColor={1}
            />
          </div>

          {/* Net */}
          <div className="flex items-center justify-center">
            <div className="w-1 h-full bg-gray-300 rounded-full" />
            <span className="absolute text-xs text-gray-400 bg-white px-1">NET</span>
          </div>

          {/* Team 2 Side */}
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold text-red-600 text-center uppercase">Team 2 Side</p>
            <PlayerBox
              name={match.team2_player1_name}
              isServing={isTeam2Serving}
              side={isTeam2Serving ? match.current_server_side : ''}
              isActive={selectedServerId === parseInt(match.team2_player1_id || 0) && isTeam2Serving}
              onClick={() => {
                if (isTeam2Serving) {
                  setSelectedServerId(parseInt(match.team2_player1_id || 0));
                }
              }}
              teamColor={2}
            />
            <PlayerBox
              name={match.team2_player2_name}
              isServing={false}
              side=""
              isActive={selectedServerId === parseInt(match.team2_player2_id || 0) && isTeam2Serving}
              onClick={() => {
                if (isTeam2Serving) {
                  setSelectedServerId(parseInt(match.team2_player2_id || 0));
                }
              }}
              teamColor={2}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!matchComplete && (
        <div className="flex gap-3">
          <button
            onClick={() => recordPoint(1)}
            disabled={!selectedServerId}
            className="flex-1 bg-blue-500 text-white py-4 rounded-xl font-bold text-lg touch-target
                       hover:bg-blue-600 active:bg-blue-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Team 1 Won
          </button>
          <button
            onClick={() => recordPoint(2)}
            disabled={!selectedServerId}
            className="flex-1 bg-red-500 text-white py-4 rounded-xl font-bold text-lg touch-target
                       hover:bg-red-600 active:bg-red-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Team 2 Won
          </button>
        </div>
      )}

      {matchComplete && (
        <div className="card bg-green-50 border-green-200 text-center">
          <p className="text-lg font-bold text-green-700">Match Complete!</p>
          <p className="text-2xl font-black mt-1">
            {match.team1_score} - {match.team2_score}
          </p>
          <button onClick={onExit} className="btn-primary mt-3">Back to Dashboard</button>
        </div>
      )}

      {/* Undo */}
      <button
        onClick={undoPoint}
        className="btn-secondary w-full touch-target"
        disabled={points.length === 0 && !match.team1_score && !match.team2_score}
      >
        Undo Last Point
      </button>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

      {/* Point Log */}
      {points.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Point Log</h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {points.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-400">#{p.point_number}</span>
                <span className={p.rally_winner_team === 1 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                  {p.rally_winner_team === 1 ? 'Team 1' : 'Team 2'} won
                </span>
                <span className="text-gray-500">
                  {p.team1_score_before}-{p.team2_score_before} → 
                  {p.rally_winner_team === 1 ? p.team1_score_before + 1 : p.team1_score_before}-
                  {p.rally_winner_team === 2 ? p.team2_score_before + 1 : p.team2_score_before}
                </span>
                {p.side_out > 0 && <span className="text-orange-500 text-[10px]">S/O</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instruction */}
      <div className="text-xs text-gray-400 text-center">
        {isTeam1Serving && !matchComplete && (
          <p>Tap a player on <strong>Team 1</strong> to set server, then tap rally winner</p>
        )}
        {isTeam2Serving && !matchComplete && (
          <p>Tap a player on <strong>Team 2</strong> to set server, then tap rally winner</p>
        )}
      </div>
    </div>
  );
}
