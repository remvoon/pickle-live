/**
 * Live Match Scoring View - assign quadrants, tap to score, undo
 */
import React, { useState, useEffect, useCallback } from 'react';
import { matchesApi } from '../api';

function Quadrant({ playerName, playerGender, isServing, side, highlight, onTap, label, serverNumber, scoringType }) {
  const isHighlighted = highlight || isServing;
  const colors = playerGender === 'Female'
    ? { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', serve: 'bg-gradient-to-br from-rose-500 to-rose-700 text-white' }
    : { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', serve: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white' };

  return (
    <button onClick={onTap}
      className={`rounded-xl border-2 p-2 flex flex-col items-center justify-center min-h-[68px] w-full touch-target transition-all duration-150
        ${isServing ? `${colors.serve} shadow-lg scale-[1.03] border-transparent` : colors.bg}
        ${highlight && !isServing ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
      {playerName ? (
        <>
          <span className={`text-xs font-bold leading-tight text-center ${isServing ? 'text-white' : colors.text}`}>
            {playerName}
          </span>
          {isServing && (
            <span className="text-[7px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-full bg-white/25 text-white/90">
              {(scoringType === 'side_out' || scoringType === 'sideout') ? `(Server ${serverNumber || 1})` : '(serving)'}
            </span>
          )}
          {label && <span className="text-[8px] text-gray-400 mt-0.5">{label}</span>}
        </>
      ) : (
        <span className="text-[10px] text-gray-300">— Empty —</span>
      )}
    </button>
  );
}

export default function LiveMatchView({ slug, matchId, onExit }) {
  const [matchInfo, setMatchInfo] = useState(null); // immutable, holds names
  const [match, setMatch] = useState(null); // mutable, holds scores/server
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState('');
  const [matchComplete, setMatchComplete] = useState(false);
  // Quadrant assignment: which team is near (1 or 2) and which player goes left/right
  const [nearTeam, setNearTeam] = useState(1);
  const [farTeam, setFarTeam] = useState(2);
  const [t1LeftPlayer, setT1LeftPlayer] = useState(null); // 'p1' or 'p2'
  const [t2LeftPlayer, setT2LeftPlayer] = useState(null);
  const [lastSwapTeam, setLastSwapTeam] = useState(null); // track which team swapped for undo
  const [layoutOrient, setLayoutOrient] = useState('vertical'); // 'vertical' or 'horizontal'
  // Player swap between teams: { fromTeam, fromSlot, toTeam, toSlot }
  const [playerSwap, setPlayerSwap] = useState(null);

  // Clear swap when match changes
  useEffect(() => { setPlayerSwap(null); }, [matchId]);

  const loadMatch = useCallback(async () => {
    try {
      const matches = await matchesApi.list(slug);
      const m = matches.find(mm => mm.id === matchId);
      if (m) {
        setMatchInfo(m);
        setMatch(m);
        if (m.status === 'completed') setMatchComplete(true);
        // Starting positions: player1 on right (serves right on even 0-0), player2 on left
        setT1LeftPlayer('p2');
        setT2LeftPlayer('p2');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug, matchId]);

  // After recording a point, re-fetch to get full names back (does NOT change positions)
  const refreshMatch = useCallback(async () => {
    try {
      const matches = await matchesApi.list(slug);
      const m = matches.find(mm => mm.id === matchId);
      if (m) {
        // Preserve the info (names) from the original, update scores from fresh data
        setMatch(prev => ({ ...prev, ...m }));
        if (m.status === 'completed') setMatchComplete(true);
        // NOTE: positions are NOT recomputed from score parity!
        // Players only swap when the SERVING team wins a rally (handled in recordPoint)
      }
    } catch (err) {
      setError(err.message);
    }
  }, [slug, matchId]);

  const recordPoint = async (rallyWinnerTeam) => {
    setError('');
    setLastAction('');
    // Capture who was serving BEFORE this rally
    const wasServingTeam = match.current_server_team;
    try {
      const result = await matchesApi.recordPoint(slug, matchId, {
        rally_winner_team: rallyWinnerTeam,
      });
      if (result.points) setPoints(result.points);
      if (result.side_out) setLastAction('Side Out!');
      if (result.match_completed) { setLastAction('Match Complete!'); }
      
      // Auto-swap: players swap sides ONLY when the serving team wins the rally
      // (If receiving team wins, they just get the serve — no position change)
      if (rallyWinnerTeam === wasServingTeam) {
        // t1LeftPlayer controls the NEAR team, t2LeftPlayer controls the FAR team.
        // Flip the controller that matches the scoring team's current position.
        if (rallyWinnerTeam === nearTeam) {
          setT1LeftPlayer(prev => { const next = prev === 'p1' ? 'p2' : 'p1'; return next; });
        } else {
          setT2LeftPlayer(prev => { const next = prev === 'p1' ? 'p2' : 'p1'; return next; });
        }
        setLastSwapTeam(rallyWinnerTeam);
      } else {
        setLastSwapTeam(null); // receiving team won — no swap to undo
      }
      
      // Re-fetch to get full match data with names
      await refreshMatch();
    } catch (err) {
      setError(err.message);
    }
  };

  const undoPoint = async () => {
    setError('');
    try {
      const result = await matchesApi.undo(slug, matchId);
      if (result.points) setPoints(result.points);
      setMatchComplete(false);
      setLastAction('Undone');
      // Reverse the swap: flip the controller for the team that won their serve
      if (lastSwapTeam === nearTeam) {
        setT1LeftPlayer(prev => prev === 'p1' ? 'p2' : 'p1');
      } else if (lastSwapTeam === farTeam) {
        setT2LeftPlayer(prev => prev === 'p1' ? 'p2' : 'p1');
      }
      setLastSwapTeam(null);
      await refreshMatch();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleNearTeam = () => {
    setNearTeam(nearTeam === 1 ? 2 : 1);
    setFarTeam(farTeam === 1 ? 2 : 1);
    // Only flip positions when both teams have same parity.
    // When t1==t2, perspective flip produces diagonal swap.
    // When t1!=t2 (scoring happened), the scoring flip already provides the needed
    // position change; flipping again would double-reverse.
    if (t1LeftPlayer === t2LeftPlayer) {
      setT1LeftPlayer(prev => prev === 'p1' ? 'p2' : 'p1');
      setT2LeftPlayer(prev => prev === 'p1' ? 'p2' : 'p1');
    }
  };

  useEffect(() => { loadMatch(); }, [loadMatch]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading match...</p></div>;
  if (!match || !matchInfo) return <div className="text-center py-8"><p className="text-red-500 mb-4">Match not found</p><button onClick={onExit} className="btn-secondary">Back</button></div>;

  // Use matchInfo for names (immutable), match for scores (updated live)
  // Prefer nickname, fall back to full name
  const team1 = {
    name: matchInfo.team1_name || 'Team 1',
    p1: matchInfo.team1_player1_nickname || matchInfo.team1_player1_name || '?',
    p2: matchInfo.team1_player2_nickname || matchInfo.team1_player2_name || '?',
    g1: matchInfo.team1_player1_gender || '',
    g2: matchInfo.team1_player2_gender || ''
  };
  const team2 = {
    name: matchInfo.team2_name || 'Team 2',
    p1: matchInfo.team2_player1_nickname || matchInfo.team2_player1_name || '?',
    p2: matchInfo.team2_player2_nickname || matchInfo.team2_player2_name || '?',
    g1: matchInfo.team2_player1_gender || '',
    g2: matchInfo.team2_player2_gender || ''
  };

  const near = nearTeam === 1 ? team1 : team2;
  const far = farTeam === 1 ? team1 : team2;
  const nearScore = nearTeam === 1 ? (match.team1_score || 0) : (match.team2_score || 0);
  const farScore = farTeam === 1 ? (match.team1_score || 0) : (match.team2_score || 0);
  const nearName = nearTeam === 1 ? team1.name : team2.name;
  const farName = farTeam === 1 ? team1.name : team2.name;

  // Resolve player name/gender for a quadrant, accounting for cross-team swaps
  const resolveQuadrant = (teamNum, slot) => {
    // slot: 'p1' or 'p2'; teamNum: 1 or 2
    const tObj = teamNum === 1 ? team1 : team2;
    const otherObj = teamNum === 1 ? team2 : team1;
    const otherNum = teamNum === 1 ? 2 : 1;

    if (playerSwap && playerSwap.fromTeam === teamNum && playerSwap.fromSlot === slot) {
      // This quadrant's original player was swapped OUT — show the incoming player
      const incoming = playerSwap.toTeam === 1 ? team1 : team2;
      const incomingSlot = playerSwap.toSlot;
      return { name: incoming[incomingSlot], gender: incoming['g' + incomingSlot.slice(1)], swapped: true };
    }
    if (playerSwap && playerSwap.toTeam === teamNum && playerSwap.toSlot === slot) {
      // This quadrant received the swapped-in player
      const incoming = playerSwap.fromTeam === 1 ? team1 : team2;
      const incomingSlot = playerSwap.fromSlot;
      return { name: incoming[incomingSlot], gender: incoming['g' + incomingSlot.slice(1)], swapped: true };
    }
    return { name: tObj[slot], gender: tObj['g' + slot.slice(1)], swapped: false };
  };

  // Build quadrant data using resolver
  const nearLeft = resolveQuadrant(nearTeam, t1LeftPlayer === 'p1' ? 'p1' : 'p2');
  const nearRight = resolveQuadrant(nearTeam, t1LeftPlayer === 'p1' ? 'p2' : 'p1');
  const farLeft = resolveQuadrant(farTeam, t2LeftPlayer === 'p1' ? 'p1' : 'p2');
  const farRight = resolveQuadrant(farTeam, t2LeftPlayer === 'p1' ? 'p2' : 'p1');

  const nearLeftP = nearLeft.name; const nearLeftG = nearLeft.gender;
  const nearRightP = nearRight.name; const nearRightG = nearRight.gender;
  const farLeftP = farLeft.name; const farLeftG = farLeft.gender;
  const farRightP = farRight.name; const farRightG = farRight.gender;

  // Opponent names for swap dropdowns (exclude self and partner)
  const getSwapOptions = (teamNum, slot) => {
    const otherNum = teamNum === 1 ? 2 : 1;
    const otherObj = otherNum === 1 ? team1 : team2;
    return [
      { label: `↔ Swap with ${otherObj.p1}`, team: otherNum, slot: 'p1' },
      { label: `↔ Swap with ${otherObj.p2}`, team: otherNum, slot: 'p2' },
    ];
  };

  // Determine server
  const isNearServing = (nearTeam === 1 && match.current_server_team === 1) || (nearTeam === 2 && match.current_server_team === 2);
  const isFarServing = (farTeam === 1 && match.current_server_team === 1) || (farTeam === 2 && match.current_server_team === 2);
  const serveSide = match.current_server_side || 'right';
  const nearServerIsLeft = isNearServing && serveSide === 'left';
  const nearServerIsRight = isNearServing && serveSide === 'right';
  // Far team faces opposite direction: their right = viewer's far-left, their left = viewer's far-right
  const farServerIsLeft = isFarServing && serveSide === 'right';
  const farServerIsRight = isFarServing && serveSide === 'left';

  // Sort points descending (newest first)
  const sortedPoints = [...points].sort((a, b) => b.point_number - a.point_number);

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge-live">LIVE</span>
          <span className="text-sm font-semibold text-gray-700">{matchInfo.stage_name || 'Match'}</span>
          <button onClick={() => setLayoutOrient(layoutOrient === 'vertical' ? 'horizontal' : 'vertical')}
            className="text-[9px] text-gray-300 hover:text-gray-500 touch-target px-1 py-0.5 rounded transition-all" title="Toggle layout">
            {layoutOrient === 'vertical' ? '⊞' : '⊟'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExit} className="text-xs text-gray-400 hover:text-gray-600 touch-target px-2 py-1">✕</button>
        </div>
      </div>

      {/* Scoreboard — aligns with court orientation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          {/* Left side: far team in vertical mode (top), near team in horizontal (left side) */}
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{layoutOrient === 'vertical' ? farName : nearName}</p>
            <p className="text-4xl font-black text-gray-900 tabular-nums mt-1">{layoutOrient === 'vertical' ? farScore : nearScore}</p>
            {(layoutOrient === 'vertical' ? isFarServing : isNearServing) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full mt-1">
                ● {matchInfo.scoring_type === 'rally' ? 'Serving' : `Server ${match.current_server_number || 1}`}
              </span>
            )}
          </div>
          <div className="px-3 flex flex-col items-center">
            <span className="text-[10px] text-gray-300 font-bold uppercase">vs</span>
            <span className="text-[8px] text-gray-400 font-medium mt-0.5">
              {matchInfo.scoring_type === 'rally' ? 'Rally' : 'Side-Out'}
            </span>
            {lastAction && (
              <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full animate-pulse
                ${lastAction === 'Side Out!' ? 'bg-orange-100 text-orange-700' : ''}
                ${lastAction === 'Match Complete!' ? 'bg-green-100 text-green-700' : ''}
                ${lastAction === 'Undone' ? 'bg-gray-100 text-gray-500' : ''}`}>
                {lastAction}
              </span>
            )}
          </div>
          {/* Right side: near team in vertical mode (bottom), far team in horizontal (right side) */}
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{layoutOrient === 'vertical' ? nearName : farName}</p>
            <p className="text-4xl font-black text-gray-900 tabular-nums mt-1">{layoutOrient === 'vertical' ? nearScore : farScore}</p>
            {(layoutOrient === 'vertical' ? isNearServing : isFarServing) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full mt-1">
                ● {matchInfo.scoring_type === 'rally' ? 'Serving' : `Server ${match.current_server_number || 1}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Court — vertical: court + rally column side by side */}
      {layoutOrient === 'vertical' ? (
        <div className="flex gap-2">
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">{farName}</span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const [t, s] = e.target.value.split(':');
                    setPlayerSwap({ fromTeam: farTeam, fromSlot: 'p1', toTeam: parseInt(t), toSlot: s });
                  }
                }}
                className="text-[8px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-1 py-0.5 flex-shrink-0 cursor-pointer max-w-[100px]"
              >
                <option value="">↔ swap</option>
                {getSwapOptions(farTeam, 'p1').map(opt => (
                  <option key={opt.slot} value={`${opt.team}:${opt.slot}`}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1 mb-1">
              <Quadrant playerName={farLeftP} playerGender={farLeftG} isServing={farServerIsLeft} side="left" serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
              <Quadrant playerName={farRightP} playerGender={farRightG} isServing={farServerIsRight} side="right" serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
            </div>
            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <button onClick={toggleNearTeam} className="text-[8px] text-gray-300 hover:text-gray-500 font-medium uppercase tracking-widest touch-target px-1">NET</button>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="flex gap-1 mt-1">
              <Quadrant playerName={nearLeftP} playerGender={nearLeftG} isServing={nearServerIsLeft} side="left" serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
              <Quadrant playerName={nearRightP} playerGender={nearRightG} isServing={nearServerIsRight} side="right" serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const [t, s] = e.target.value.split(':');
                    setPlayerSwap({ fromTeam: nearTeam, fromSlot: 'p1', toTeam: parseInt(t), toSlot: s });
                  }
                }}
                className="text-[8px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-1 py-0.5 flex-shrink-0 cursor-pointer max-w-[100px]"
              >
                <option value="">↔ swap</option>
                {getSwapOptions(nearTeam, 'p1').map(opt => (
                  <option key={opt.slot} value={`${opt.team}:${opt.slot}`}>{opt.label}</option>
                ))}
              </select>
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">{nearName}</span>
            </div>
          </div>
          {!matchComplete && (
            <div className="flex flex-col gap-1.5 w-[64px] flex-shrink-0">
              <button onClick={() => recordPoint(farTeam)}
                className="flex-1 rounded-lg text-[8px] font-bold touch-target transition-all active:scale-[0.97]
                           bg-gradient-to-br from-gray-500 to-gray-700 text-white shadow-sm leading-tight">
                Rally<span className="block text-[6px] opacity-70 font-normal">{farName}</span>
              </button>
              <button onClick={() => recordPoint(nearTeam)}
                className="flex-1 rounded-lg text-[8px] font-bold touch-target transition-all active:scale-[0.97]
                           bg-gradient-to-br from-pickle-500 to-emerald-600 text-white shadow-sm leading-tight">
                Rally<span className="block text-[6px] opacity-70 font-normal">{nearName}</span>
              </button>
              <button onClick={undoPoint} disabled={points.length === 0}
                className="py-1.5 rounded-lg text-[8px] font-semibold touch-target transition-all
                           bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50
                           active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center">
                ↩ Undo
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Horizontal (respects near/far swap) ── */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
              <div>
                <div className="flex gap-1">
                  {/* Left side = near team */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">{nearName}</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const [t, s] = e.target.value.split(':');
                            setPlayerSwap({ fromTeam: nearTeam, fromSlot: 'p1', toTeam: parseInt(t), toSlot: s });
                          }
                        }}
                        className="text-[8px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-1 py-0.5 flex-shrink-0 cursor-pointer max-w-[100px]"
                      >
                        <option value="">↔ swap</option>
                        {getSwapOptions(nearTeam, 'p1').map(opt => (
                          <option key={opt.slot} value={`${opt.team}:${opt.slot}`}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Quadrant playerName={nearLeftP} playerGender={nearLeftG}
                        isServing={nearServerIsLeft}
                        side={nearTeam === 1 ? 'left' : 'right'} serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
                      <Quadrant playerName={nearRightP} playerGender={nearRightG}
                        isServing={nearServerIsRight}
                        side={nearTeam === 1 ? 'right' : 'left'} serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
                    </div>
                    {!matchComplete && (
                      <button onClick={() => recordPoint(nearTeam)}
                        className="w-full mt-1.5 py-1.5 rounded-lg text-[8px] font-bold touch-target transition-all active:scale-[0.97]
                                   bg-gradient-to-br from-gray-500 to-gray-700 text-white shadow-sm leading-tight">
                        Rally<span className="block text-[6px] opacity-70 font-normal">{nearName}</span>
                      </button>
                    )}
                  </div>
                  {/* Vertical NET (click to swap) */}
                  <div className="flex flex-col items-center justify-center px-1">
                    <div className="w-px flex-1 bg-gray-200" />
                    <button onClick={toggleNearTeam} className="text-[8px] text-gray-300 hover:text-gray-500 font-medium uppercase tracking-widest touch-target px-1">NET</button>
                    <div className="w-px flex-1 bg-gray-200" />
                  </div>
                  {/* Right side = far team */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider truncate">{farName}</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const [t, s] = e.target.value.split(':');
                            setPlayerSwap({ fromTeam: farTeam, fromSlot: 'p1', toTeam: parseInt(t), toSlot: s });
                          }
                        }}
                        className="text-[8px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-1 py-0.5 flex-shrink-0 cursor-pointer max-w-[100px]"
                      >
                        <option value="">↔ swap</option>
                        {getSwapOptions(farTeam, 'p1').map(opt => (
                          <option key={opt.slot} value={`${opt.team}:${opt.slot}`}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      {/* Far team: their right = our top, their left = our bottom */}
                      <Quadrant playerName={farLeftP} playerGender={farLeftG}
                        isServing={farServerIsLeft}
                        side={farTeam === 1 ? 'left' : 'right'} serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
                      <Quadrant playerName={farRightP} playerGender={farRightG}
                        isServing={farServerIsRight}
                        side={farTeam === 1 ? 'right' : 'left'} serverNumber={match.current_server_number} scoringType={matchInfo.scoring_type} />
                    </div>
                    {!matchComplete && (
                      <button onClick={() => recordPoint(farTeam)}
                        className="w-full mt-1.5 py-1.5 rounded-lg text-[8px] font-bold touch-target transition-all active:scale-[0.97]
                                   bg-gradient-to-br from-pickle-500 to-emerald-600 text-white shadow-sm leading-tight">
                        Rally<span className="block text-[6px] opacity-70 font-normal">{farName}</span>
                      </button>
                    )}
                  </div>
                </div>
                {!matchComplete && (
                  <div className="flex justify-center mt-2">
                    <button onClick={undoPoint} disabled={points.length === 0}
                      className="py-1.5 px-6 rounded-lg text-[10px] font-semibold touch-target transition-all
                                 bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50
                                 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                      ↩ Undo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

      {matchComplete && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
          <p className="text-lg font-bold text-green-700">Match Complete!</p>
          <p className="text-3xl font-black text-green-900 tabular-nums">{match.team1_score} – {match.team2_score}</p>
          <p className="text-xs text-green-600">{match.team1_score > match.team2_score ? team1.name : team2.name} wins</p>
          <button onClick={onExit} className="btn-primary mt-2">Back to Dashboard</button>
        </div>
      )}

      {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">{error}</div>}

      {/* Point Log - newest first */}
      {sortedPoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Points</h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {sortedPoints.map(p => {
              const winner = p.rally_winner_team === 1 ? team1.name : team2.name;
              const after1 = p.rally_winner_team === 1 ? p.team1_score_before + 1 : p.team1_score_before;
              const after2 = p.rally_winner_team === 2 ? p.team2_score_before + 1 : p.team2_score_before;
              return (
                <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 w-5">#{p.point_number}</span>
                  <span className="font-medium text-gray-700">{winner}</span>
                  <span className="font-mono tabular-nums text-gray-600">
                    {after1}–{after2}
                  </span>
                  <span className="text-gray-300 text-[10px]">
                    ({p.team1_score_before}–{p.team2_score_before})
                  </span>
                  {p.side_out > 0 && <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">S/O</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
