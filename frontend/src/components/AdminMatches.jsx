/**
 * Matches management component
 */
import React, { useState, useEffect } from 'react';
import { matchesApi, stagesApi, groupsApi, teamsApi, participantsApi, eventsApi } from '../api';
import LiveMatchView from './LiveMatchView';
import StandingsTable from './StandingsTable';

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

/** Clickable player name chip — opens swap modal on click */
function SwapPlayerName({ gender, name, handedness, onClick }) {
  const isFemale = gender === 'Female';
  return (
    <button onClick={onClick} title="Tap to swap player"
      className="inline-flex items-center gap-0.5 hover:underline hover:text-pickle-600 transition-colors cursor-pointer">
      <span className={isFemale ? 'text-rose-500' : 'text-blue-500'}>{isFemale ? '♀' : '♂'}</span>
      <span>{name}</span>
      {handedness === 'lefty' ? ' ⬅' : handedness === 'righty' ? ' ➡' : ''}
    </button>
  );
}

export default function AdminMatches({ slug }) {
  const [matches, setMatches] = useState([]);
  const [stages, setStages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [eventCourts, setEventCourts] = useState([]);
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [stageId, setStageId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTimeOfDay, setScheduledTimeOfDay] = useState('');
  const [court, setCourt] = useState('');
  const [autoGenGroupId, setAutoGenGroupId] = useState('');
  const [autoGenStageId, setAutoGenStageId] = useState('');
  const [liveMatchId, setLiveMatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Swap player modal
  const [swapModal, setSwapModal] = useState(null); // { teamId, playerSlot, currentName, currentId, teamName }
  // Walkover & Final score modals
  const [woMatch, setWoMatch] = useState(null); // { id, t1Id, t1Name, t2Id, t2Name }
  const [finalMatch, setFinalMatch] = useState(null); // { id, t1Id, t1Name, t2Id, t2Name }
  const [editComplete, setEditComplete] = useState(null); // { id, team1_score, team2_score, team1_name, team2_name, team1_id, team2_id }
  const [formatType, setFormatType] = useState('');
  const [editModal, setEditModal] = useState(null); // match being edited in popup
  const [advanceModal, setAdvanceModal] = useState(false);
  const [advanceResult, setAdvanceResult] = useState(null); // { standings, pairings }
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState({});
  const [teamStandings, setTeamStandings] = useState([]);
  const [playerStandings, setPlayerStandings] = useState([]);

  useEffect(() => { loadData(); }, [slug]);

  useEffect(() => {
    eventsApi.getStandings(slug).then(data => {
      setTeamStandings(data.team_standings || []);
      setPlayerStandings(data.player_standings || []);
    }).catch(() => {});
  }, [slug]);

  const loadData = async () => {
    try {
      const [m, s, g, t] = await Promise.all([
        matchesApi.list(slug),
        stagesApi.list(slug),
        groupsApi.list(slug),
        teamsApi.list(slug),
      ]);
      setMatches(m);
      setStages(s);
      setGroups(g);
      setAllTeams(t);
      // Load event data for courts and default date
      const eventData = await fetch(`/api/events/${slug}`).then(r => r.json());
      if (eventData?.event) {
        const ed = eventData.event.date || '';
        setEventDate(ed);
        if (ed && !scheduledDate) {
          setScheduledDate(ed);
        }
        setEventStartTime(eventData.event.start_time || '09:00');
        setFormatType(eventData.event.format_type || '');
        try { setEventCourts(JSON.parse(eventData.event.courts || '[]')); } catch {}
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setTeam1Id(''); setTeam2Id('');
    setScheduledDate(''); setScheduledTimeOfDay(''); setCourt('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Auto-assign first stage and group from format
      const autoStageId = stageId || stages[0]?.id || '';
      const autoGroupId = groupId || groups[0]?.id || '';
      if (!autoStageId || !autoGroupId) {
        throw new Error('No stage or group found. Set up tournament format first.');
      }
      const combinedTime = scheduledDate && scheduledTimeOfDay
        ? `${scheduledDate}T${scheduledTimeOfDay}:00`
        : scheduledDate || null;
      const data = {
        team1_id: parseInt(team1Id),
        team2_id: parseInt(team2Id),
        stage_id: parseInt(autoStageId),
        group_id: parseInt(autoGroupId),
        scheduled_time: combinedTime,
        court,
      };
      await matchesApi.create(slug, data);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Calculate suggested time for a match based on its position on a court */
  const getSuggestedTime = (matchId, courtName) => {
    if (!eventStartTime) return '';
    const courtMatches = matches
      .filter(x => x.court === courtName)
      .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || '') || a.id - b.id);
    const idx = courtMatches.findIndex(x => x.id === matchId);
    const pos = idx >= 0 ? idx : courtMatches.length;
    const [hh, mm] = eventStartTime.split(':').map(Number);
    const totalMin = hh * 60 + mm + pos * 15;
    const sh = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const sm = String(totalMin % 60).padStart(2, '0');
    return `${sh}:${sm}`;
  };

  const handleEdit = (m) => {
    const st = m.scheduled_time || '';
    const existingDate = st.includes('T') ? st.split('T')[0] : (st || eventDate || '');
    const existingTime = st.includes('T') ? st.split('T')[1].substring(0, 5) : '';
    const suggestedTime = existingTime || getSuggestedTime(m.id, m.court || '');

    setEditModal({
      id: m.id,
      team1_id: String(m.team1_id),
      team2_id: String(m.team2_id),
      stage_id: String(m.stage_id),
      group_id: String(m.group_id),
      scheduledDate: existingDate || eventDate || '',
      scheduledTimeOfDay: suggestedTime,
      court: m.court || '',
    });
  };

  const handleEditModalSave = async (data) => {
    setLoading(true);
    setError('');
    try {
      const autoStageId = data.stage_id || stages[0]?.id || '';
      const autoGroupId = data.group_id || groups[0]?.id || '';
      const combinedTime = data.scheduledDate && data.scheduledTimeOfDay
        ? `${data.scheduledDate}T${data.scheduledTimeOfDay}:00`
        : data.scheduledDate || null;
      await matchesApi.update(slug, data.id, {
        team1_id: parseInt(data.team1_id),
        team2_id: parseInt(data.team2_id),
        stage_id: parseInt(autoStageId),
        group_id: parseInt(autoGroupId),
        scheduled_time: combinedTime,
        court: data.court,
      });
      setEditModal(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this match?')) return;
    try {
      await matchesApi.delete(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAutoGenerate = async () => {
    if (!autoGenGroupId || !autoGenStageId) return;
    setLoading(true);
    setError('');
    try {
      await matchesApi.autoGenerate(slug, {
        group_id: parseInt(autoGenGroupId),
        stage_id: parseInt(autoGenStageId),
        scheduled_time: eventDate || new Date().toISOString().split('T')[0],
        start_time: eventStartTime || '09:00',
        courts: eventCourts.length > 0 ? eventCourts : null,
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await matchesApi.start(slug, id);
      setLiveMatchId(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWalkoverConfirm = async (winnerId) => {
    if (!woMatch) return;
    setLoading(true);
    try {
      await matchesApi.walkover(slug, woMatch.id, winnerId);
      await loadData();
      setWoMatch(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalConfirm = async (t1Score, t2Score) => {
    if (!finalMatch) return;
    setLoading(true);
    try {
      const sc1 = parseInt(t1Score) || 0, sc2 = parseInt(t2Score) || 0;
      const winner = sc1 > sc2 ? finalMatch.t1Id : (sc2 > sc1 ? finalMatch.t2Id : null);
      await matchesApi.update(slug, finalMatch.id, { team1_score: sc1, team2_score: sc2, winner_team_id: winner, status: 'completed' });
      await loadData();
      setFinalMatch(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async (id) => {
    if (!confirm('End this match and reset it back to Scheduled? All points will be cleared.')) return;
    setLoading(true);
    setError('');
    try {
      await matchesApi.reset(slug, id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSwap = (teamId, playerSlot, currentName, currentId, teamName) => {
    setSwapModal({ teamId, playerSlot, currentName, currentId, teamName });
  };

  const handleSwapConfirm = async (newPlayerId) => {
    if (!swapModal) return;
    const pId = parseInt(newPlayerId);
    setLoading(true);
    setError('');
    try {
      await teamsApi.update(slug, swapModal.teamId, { [swapModal.playerSlot]: pId });
      await loadData();
      setSwapModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async () => {
    setAdvanceLoading(true);
    setError('');
    try {
      const result = await matchesApi.autoAdvance(slug);
      setAdvanceResult(result);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdvanceLoading(false);
    }
  };

  const toggleStage = (stageName) => {
    setCollapsedStages(prev => ({ ...prev, [stageName]: !prev[stageName] }));
  };

  const expandAll = () => setCollapsedStages({});
  const collapseAll = () => {
    const all = {};
    stages.forEach(s => { all[s.name] = true; });
    setCollapsedStages(all);
  };

  // Group matches by stage
  const matchesByStage = {};
  matches.forEach(m => {
    const key = m.stage_name || 'Unknown';
    if (!matchesByStage[key]) matchesByStage[key] = [];
    matchesByStage[key].push(m);
  });

  if (liveMatchId) {
    return <LiveMatchView slug={slug} matchId={liveMatchId} onExit={() => { setLiveMatchId(null); loadData(); }} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Matches</h2>

      {/* Auto-generate */}
      {matches.length === 0 && (
        <div className="card-flat border-pickle-200 bg-pickle-50/30 text-center py-6 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-pickle-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-pickle-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No matches yet</p>
          <div className="flex gap-2 justify-center">
            <select value={autoGenGroupId} onChange={(e) => setAutoGenGroupId(e.target.value)}
              className="input-field text-sm w-36">
              <option value="">Group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={autoGenStageId} onChange={(e) => setAutoGenStageId(e.target.value)}
              className="input-field text-sm w-36">
              <option value="">Stage</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={handleAutoGenerate} disabled={loading} className="btn-primary text-sm touch-target px-4">
              Auto-Generate
            </button>
          </div>
        </div>
      )}

      {/* Advance teams */}
      <div className="card-flat">
        <button onClick={() => setAdvanceModal(true)} className="btn-secondary w-full touch-target text-sm">
          Advance Teams to Next Stage
        </button>
      </div>

      {/* Manual Create form - collapsible */}
      <details className="card-flat group">
        <summary className="text-sm font-semibold text-gray-700 cursor-pointer touch-target -m-4 p-4 [&::-webkit-details-marker]:hidden
          flex items-center justify-between">
          <span>Manual Match Setup</span>
          <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select value={team1Id} onChange={(e) => setTeam1Id(e.target.value)} className="input-field text-sm" required>
            <option value="">Select Team 1</option>
            {allTeams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.player1_gender === 'Female' ? '♀' : '♂'}{t.player1_nickname || t.player1_name || '?'} & {t.player2_gender === 'Female' ? '♀' : '♂'}{t.player2_nickname || t.player2_name || '?'}){t.player1_gender === 'Female' && t.player2_gender === 'Female' ? ' WD' : t.player1_gender === 'Male' && t.player2_gender === 'Male' ? ' MD' : t.player1_gender && t.player2_gender ? ' XD' : ''}
              </option>
            ))}
          </select>
          <select value={team2Id} onChange={(e) => setTeam2Id(e.target.value)} className="input-field text-sm" required>
            <option value="">Select Team 2</option>
            {allTeams.filter(t => String(t.id) !== team1Id).map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.player1_gender === 'Female' ? '♀' : '♂'}{t.player1_nickname || t.player1_name || '?'} & {t.player2_gender === 'Female' ? '♀' : '♂'}{t.player2_nickname || t.player2_name || '?'}){t.player1_gender === 'Female' && t.player2_gender === 'Female' ? ' WD' : t.player1_gender === 'Male' && t.player2_gender === 'Male' ? ' MD' : t.player1_gender && t.player2_gender ? ' XD' : ''}
              </option>
            ))}
          </select>
          <input type="date" value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="input-field text-sm" />
          <select value={scheduledTimeOfDay} onChange={(e) => setScheduledTimeOfDay(e.target.value)} className="input-field text-sm">
            <option value="">Time</option>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={court} onChange={(e) => setCourt(e.target.value)} className="input-field text-sm">
            <option value="">No court</option>
            {(eventCourts.length > 0 ? eventCourts : ['Court 1','Court 2','Court 3','Court 4','Court 5','Court 6']).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full touch-target">Create Match</button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form></details>

      {/* Matches list — grouped by stage */}
      <div className="space-y-2">
        {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mb-2">{error}</div>}
        {matches.length > 0 && (
          <div className="flex gap-2 mb-2">
            <button onClick={expandAll} className="text-[10px] font-medium text-pickle-600 bg-pickle-50 px-2 py-1 rounded-lg touch-target">Expand All</button>
            <button onClick={collapseAll} className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg touch-target">Collapse All</button>
          </div>
        )}
        {Object.keys(matchesByStage).length === 0 && <p className="text-gray-400 text-center py-4">No matches yet</p>}
        {Object.entries(matchesByStage).map(([stageName, stageMatches]) => {
          const isCollapsed = collapsedStages[stageName];
          return (
            <div key={stageName} className="card-flat overflow-hidden">
              <button
                onClick={() => toggleStage(stageName)}
                className="w-full flex items-center justify-between py-2 px-1 touch-target text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{stageName}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{stageMatches.length}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="space-y-2 mt-1 pb-1">
                  {stageMatches.map((m) => (
                    <MatchRow key={m.id} m={m} formatType={formatType}
                      onStart={handleStart} onEdit={handleEdit} onDelete={handleDelete}
                      setWoMatch={setWoMatch} setFinalMatch={setFinalMatch}
                      setLiveMatchId={setLiveMatchId} onEnd={handleEnd}
                      setEditComplete={setEditComplete}
                      handleOpenSwap={handleOpenSwap}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Match Modal */}
      {editModal && (
        <EditMatchModal
          match={editModal}
          slug={slug}
          allTeams={allTeams}
          eventCourts={eventCourts}
          eventDate={eventDate}
          onSave={handleEditModalSave}
          onClose={() => setEditModal(null)}
          loading={loading}
        />
      )}

      {/* Advance Teams Modal — auto-computed standings + bracket fill */}
      {advanceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setAdvanceModal(false); setAdvanceResult(null); setError(''); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Auto-Fill Knockout Bracket</h3>
            <p className="text-xs text-gray-500 mb-4">
              Computes standings from completed round-robin matches and seeds teams into the knockout bracket using standard cross-group pairings.
            </p>

            {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mb-3">{error}</div>}

            {advanceResult ? (
              <div className="space-y-4">
                {/* Standings */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Group Standings</h4>
                  {advanceResult.standings.map((gs, gi) => (
                    <div key={gi} className="mb-3">
                      <p className="text-xs font-bold text-gray-600 mb-1">{gs.group_name}</p>
                      <div className="space-y-1">
                        {gs.teams.map((t, ti) => (
                          <div key={t.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${t.advancing ? 'bg-pickle-50 text-pickle-800 font-semibold' : 'text-gray-400'}`}>
                            <span className="w-5 text-center font-bold">{t.rank}.</span>
                            <span className="flex-1">{t.p1_nickname} & {t.p2_nickname}</span>
                            <span className="text-gray-400">{t.wins}W</span>
                            {t.advancing && <span className="text-[9px] bg-pickle-100 text-pickle-700 px-1.5 py-0.5 rounded-full font-bold">↑</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pairings */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bracket Pairings</h4>
                  <div className="space-y-1.5">
                    {advanceResult.pairings.map((p, pi) => (
                      <div key={pi} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg p-2">
                        <span className="text-gray-300 font-bold w-4 text-center">{pi + 1}</span>
                        <span className="flex-1 text-right font-medium">
                          <span className="text-[9px] text-gray-400">{p.team1.group}{p.team1.rank}</span> {p.team1.name}
                        </span>
                        <span className="text-gray-300 font-bold">vs</span>
                        <span className="flex-1 font-medium">
                          {p.team2.name} <span className="text-[9px] text-gray-400">{p.team2.group}{p.team2.rank}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-green-600 bg-green-50 p-2 rounded-lg text-center font-medium">
                  ✓ Bracket has been auto-filled! {advanceResult.updated_matches?.length || 0} matches created.
                </p>
                <button onClick={() => { setAdvanceModal(false); setAdvanceResult(null); setError(''); }}
                  className="btn-primary w-full touch-target py-2.5 text-sm">Done</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-xs">
                  This will compute group standings from completed matches and automatically seed teams into the knockout bracket. Make sure all round-robin matches are finished first.
                </div>
                <button onClick={handleAdvance} disabled={advanceLoading}
                  className="btn-primary w-full touch-target py-3 text-sm font-semibold">
                  {advanceLoading ? 'Computing standings...' : 'Auto-Fill Bracket'}
                </button>
                <button onClick={() => { setAdvanceModal(false); setError(''); }}
                  className="btn-secondary w-full touch-target py-2.5 text-sm">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Swap Player Modal */}
      {swapModal && (
        <SwapPlayerModal
          swap={swapModal}
          slug={slug}
          onConfirm={handleSwapConfirm}
          onClose={() => setSwapModal(null)}
          loading={loading}
          participantsApi={participantsApi}
        />
      )}

      {/* Walkover Modal */}
      {woMatch && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setWoMatch(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Walkover</h3>
            <p className="text-sm text-gray-500 mb-4">Select the winning team:</p>
            <div className="space-y-2">
              <button onClick={() => handleWalkoverConfirm(woMatch.t1Id)} disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-pickle-50 text-pickle-700 hover:bg-pickle-100 touch-target transition-all">
                {woMatch.t1Name || 'Team 1'}
              </button>
              <button onClick={() => handleWalkoverConfirm(woMatch.t2Id)} disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 touch-target transition-all">
                {woMatch.t2Name || 'Team 2'}
              </button>
            </div>
            <button onClick={() => setWoMatch(null)} className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-600 touch-target">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Final Score Modal */}
      {finalMatch && (
        <FinalScoreModal match={finalMatch} onConfirm={handleFinalConfirm} onCancel={() => setFinalMatch(null)} loading={loading} />
      )}

      {/* Edit Completed Score Modal */}
      {editComplete && (
        <EditCompleteModal match={editComplete} slug={slug} onClose={() => setEditComplete(null)} onReload={loadData} setLoading={setLoading} setError={setError} />
      )}

      {/* Standings at bottom */}
      {(teamStandings.length > 0 || playerStandings.length > 0) && (
        <div className="mt-8 space-y-4">
          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-1">
              🏆 Standings
            </h2>
            <p className="text-xs text-gray-400 mb-4">Updated automatically from completed matches</p>
          </div>
          {teamStandings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">👥</span>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team Standings</h3>
              </div>
              <StandingsTable standings={teamStandings} type="teams" />
            </div>
          )}
          {playerStandings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">👤</span>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Player Standings</h3>
              </div>
              <StandingsTable standings={playerStandings} type="players" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}



/** Single match row — extracted for reuse in collapsible stages */
function MatchRow({ m, formatType, onStart, onEdit, onDelete, setWoMatch, setFinalMatch, setLiveMatchId, onEnd, setEditComplete, handleOpenSwap }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm leading-tight">
              {formatType === 'royal_rumble'
                ? <div className="space-y-0.5">
                    <div>
                      {(m.team1_player1_gender === 'Male' && m.team1_player2_gender === 'Male') && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded-full font-bold mr-1">MD</span>}
                      {(m.team1_player1_gender === 'Female' && m.team1_player2_gender === 'Female') && <span className="text-[9px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded-full font-bold mr-1">WD</span>}
                      {(m.team1_player1_gender && m.team1_player2_gender && m.team1_player1_gender !== m.team1_player2_gender) && <span className="text-[9px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded-full font-bold mr-1">XD</span>}
                      {m.team1_player1_gender === 'Female' ? '♀' : '♂'}{m.team1_player1_nickname || m.team1_player1_name} & {m.team1_player2_gender === 'Female' ? '♀' : '♂'}{m.team1_player2_nickname || m.team1_player2_name}
                    </div>
                    <div>
                      {(m.team2_player1_gender === 'Male' && m.team2_player2_gender === 'Male') && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded-full font-bold mr-1">MD</span>}
                      {(m.team2_player1_gender === 'Female' && m.team2_player2_gender === 'Female') && <span className="text-[9px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded-full font-bold mr-1">WD</span>}
                      {(m.team2_player1_gender && m.team2_player2_gender && m.team2_player1_gender !== m.team2_player2_gender) && <span className="text-[9px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded-full font-bold mr-1">XD</span>}
                      {m.team2_player1_gender === 'Female' ? '♀' : '♂'}{m.team2_player1_nickname || m.team2_player1_name} & {m.team2_player2_gender === 'Female' ? '♀' : '♂'}{m.team2_player2_nickname || m.team2_player2_name}
                    </div>
                  </div>
                : <>{m.team1_name} vs {m.team2_name}</>
              }
            </span>
            {m.status === 'live' && <span className="badge-live">LIVE</span>}
            {m.status === 'completed' && <span className="badge-completed">Final</span>}
            {m.status === 'scheduled' && <span className="badge-scheduled">Scheduled</span>}
            {m.walkover > 0 && <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">WO</span>}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {m.group_name}
            {m.court && ` · ${m.court}`}
            {m.scheduled_time && ` · ${new Date(m.scheduled_time).toLocaleString()}`}
          </p>
          <div className="mt-1.5 space-y-0.5">
            <p className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-wrap">
              <SwapPlayerName gender={m.team1_player1_gender} name={m.team1_player1_nickname || m.team1_player1_name} handedness={m.team1_player1_handedness}
                onClick={() => handleOpenSwap(m.team1_id, 'player1_id', m.team1_player1_nickname || m.team1_player1_name, m.team1_player1_id, m.team1_name)} />
              <span className="text-gray-300">&</span>
              <SwapPlayerName gender={m.team1_player2_gender} name={m.team1_player2_nickname || m.team1_player2_name} handedness={m.team1_player2_handedness}
                onClick={() => handleOpenSwap(m.team1_id, 'player2_id', m.team1_player2_nickname || m.team1_player2_name, m.team1_player2_id, m.team1_name)} />
              {(m.team1_player1_gender === 'Male' && m.team1_player2_gender === 'Male') && <span className="ml-1.5 text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded-full font-bold">MD</span>}
              {(m.team1_player1_gender === 'Female' && m.team1_player2_gender === 'Female') && <span className="ml-1.5 text-[9px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded-full font-bold">WD</span>}
              {(m.team1_player1_gender && m.team1_player2_gender && m.team1_player1_gender !== m.team1_player2_gender) && <span className="ml-1.5 text-[9px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded-full font-bold">XD</span>}
            </p>
            <p className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-wrap">
              <SwapPlayerName gender={m.team2_player1_gender} name={m.team2_player1_nickname || m.team2_player1_name} handedness={m.team2_player1_handedness}
                onClick={() => handleOpenSwap(m.team2_id, 'player1_id', m.team2_player1_nickname || m.team2_player1_name, m.team2_player1_id, m.team2_name)} />
              <span className="text-gray-300">&</span>
              <SwapPlayerName gender={m.team2_player2_gender} name={m.team2_player2_nickname || m.team2_player2_name} handedness={m.team2_player2_handedness}
                onClick={() => handleOpenSwap(m.team2_id, 'player2_id', m.team2_player2_nickname || m.team2_player2_name, m.team2_player2_id, m.team2_name)} />
              {(m.team2_player1_gender === 'Male' && m.team2_player2_gender === 'Male') && <span className="ml-1.5 text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded-full font-bold">MD</span>}
              {(m.team2_player1_gender === 'Female' && m.team2_player2_gender === 'Female') && <span className="ml-1.5 text-[9px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded-full font-bold">WD</span>}
              {(m.team2_player1_gender && m.team2_player2_gender && m.team2_player1_gender !== m.team2_player2_gender) && <span className="ml-1.5 text-[9px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded-full font-bold">XD</span>}
            </p>
          </div>
          {(m.status === 'live' || m.status === 'completed') && (
            <p className="text-lg font-bold mt-1 tabular-nums">
              {m.team1_score ?? 0} – {m.team2_score ?? 0}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 items-start flex-shrink-0">
          {m.status === 'scheduled' && (
            <button onClick={() => onStart(m.id)} className="btn-primary text-[10px] py-1 px-2 touch-target whitespace-nowrap">Start</button>
          )}
          {m.status === 'scheduled' && (
            <button onClick={() => onEdit(m)} className="text-[10px] font-medium text-pickle-600 bg-pickle-50 px-2 py-1 rounded-lg touch-target whitespace-nowrap">Edit</button>
          )}
          {m.status === 'scheduled' && (
            <button onClick={() => onDelete(m.id)} className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-1 rounded-lg touch-target whitespace-nowrap">Del</button>
          )}
          {m.status === 'scheduled' && (
            <button onClick={() => setWoMatch({ id: m.id, t1Id: m.team1_id, t1Name: m.team1_name, t2Id: m.team2_id, t2Name: m.team2_name })} className="text-[10px] font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded-lg touch-target whitespace-nowrap">WO</button>
          )}
          {m.status === 'scheduled' && (
            <button onClick={() => setFinalMatch({ id: m.id, t1Id: m.team1_id, t1Name: m.team1_name, t2Id: m.team2_id, t2Name: m.team2_name })} className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-lg touch-target whitespace-nowrap">Final</button>
          )}
          {m.status === 'live' && (
            <button onClick={() => setLiveMatchId(m.id)} className="btn-primary text-[10px] py-1 px-2 touch-target whitespace-nowrap">Score</button>
          )}
          {m.status === 'live' && (
            <button onClick={() => onEnd(m.id)} className="text-[10px] font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded-lg touch-target whitespace-nowrap">End</button>
          )}
          {m.status === 'completed' && (
            <button onClick={() => setEditComplete({
              id: m.id, team1_score: m.team1_score ?? 0, team2_score: m.team2_score ?? 0,
              team1_name: m.team1_name, team2_name: m.team2_name,
              team1_id: m.team1_id, team2_id: m.team2_id
            })} className="text-[10px] font-medium text-pickle-600 bg-pickle-50 px-2 py-1 rounded-lg touch-target whitespace-nowrap">Score</button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditMatchModal({ match, slug, allTeams, eventCourts, eventDate, onSave, onClose, loading }) {
  const [team1Id, setTeam1Id] = useState(match.team1_id);
  const [team2Id, setTeam2Id] = useState(match.team2_id);
  const [scheduledDate, setScheduledDate] = useState(match.scheduledDate || eventDate || '');
  const [scheduledTimeOfDay, setScheduledTimeOfDay] = useState(match.scheduledTimeOfDay || '');
  const [court, setCourt] = useState(match.court || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: match.id,
      team1_id: team1Id,
      team2_id: team2Id,
      stage_id: match.stage_id,
      group_id: match.group_id,
      scheduledDate,
      scheduledTimeOfDay,
      court,
    });
  };

  const courts = eventCourts.length > 0 ? eventCourts : ['Court 1','Court 2','Court 3','Court 4','Court 5','Court 6'];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-lg mb-3">Edit Match</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select value={team1Id} onChange={(e) => setTeam1Id(e.target.value)} className="input-field text-sm w-full" required>
            <option value="">Select Team 1</option>
            {allTeams.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.name} ({t.player1_name || '?'} & {t.player2_name || '?'}){t.player1_gender === 'Female' && t.player2_gender === 'Female' ? ' WD' : t.player1_gender === 'Male' && t.player2_gender === 'Male' ? ' MD' : t.player1_gender && t.player2_gender ? ' XD' : ''}
              </option>
            ))}
          </select>
          <select value={team2Id} onChange={(e) => setTeam2Id(e.target.value)} className="input-field text-sm w-full" required>
            <option value="">Select Team 2</option>
            {allTeams.filter(t => String(t.id) !== team1Id).map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.name} ({t.player1_name || '?'} & {t.player2_name || '?'}){t.player1_gender === 'Female' && t.player2_gender === 'Female' ? ' WD' : t.player1_gender === 'Male' && t.player2_gender === 'Male' ? ' MD' : t.player1_gender && t.player2_gender ? ' XD' : ''}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="input-field text-sm" />
            <select value={scheduledTimeOfDay} onChange={(e) => setScheduledTimeOfDay(e.target.value)} className="input-field text-sm">
              <option value="">Time</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <select value={court} onChange={(e) => setCourt(e.target.value)} className="input-field text-sm w-full">
            <option value="">No court</option>
            {courts.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1 touch-target py-2.5">Update</button>
            <button type="button" onClick={onClose} className="btn-secondary touch-target px-4 py-2.5">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCompleteModal({ match, slug, onClose, onReload, setLoading, setError }) {
  const [s1, setS1] = useState(String(match.team1_score));
  const [s2, setS2] = useState(String(match.team2_score));
  const [loading, setLocalLoading] = useState(false);

  const handleSave = async () => {
    const sc1 = parseInt(s1) || 0, sc2 = parseInt(s2) || 0;
    const winner = sc1 > sc2 ? match.team1_id : (sc2 > sc1 ? match.team2_id : null);
    setLocalLoading(true);
    try {
      await fetch(`/api/admin/events/${slug}/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pickle_live_token')}` },
        body: JSON.stringify({ team1_score: sc1, team2_score: sc2, winner_team_id: winner }),
      });
      await onReload();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset this match back to "Scheduled"? This clears the scores and walkover status.')) return;
    setLocalLoading(true);
    try {
      await fetch(`/api/admin/events/${slug}/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pickle_live_token')}` },
        body: JSON.stringify({ team1_score: 0, team2_score: 0, winner_team_id: null, walkover: 0, status: 'scheduled' }),
      });
      await onReload();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-lg mb-1">Edit Score</h3>
        <p className="text-sm text-gray-500 mb-4">Update or reset the final score:</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-1">{match.team1_name || 'Team 1'}</label>
            <input type="number" value={s1} onChange={e => setS1(e.target.value)} min="0" max="99"
              className="w-full text-center text-2xl font-black border border-gray-200 rounded-xl py-3 input-field" />
          </div>
          <span className="text-gray-300 font-bold pt-4">–</span>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-1">{match.team2_name || 'Team 2'}</label>
            <input type="number" value={s2} onChange={e => setS2(e.target.value)} min="0" max="99"
              className="w-full text-center text-2xl font-black border border-gray-200 rounded-xl py-3 input-field" />
          </div>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-pickle-600 text-white hover:bg-pickle-700 touch-target transition-all">
          {loading ? 'Saving...' : 'Save Score'}
        </button>
        <button onClick={handleReset} disabled={loading}
          className="w-full mt-2 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 touch-target transition-all">
          Reset to Scheduled
        </button>
        <button onClick={onClose} className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600 touch-target">
          Cancel
        </button>
      </div>
    </div>
  );
}

function FinalScoreModal({ match, onConfirm, onCancel, loading }) {
  const [s1, setS1] = useState('0');
  const [s2, setS2] = useState('0');
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-lg mb-1">Final Score</h3>
        <p className="text-sm text-gray-500 mb-4">Enter the final match score:</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-1">{match.t1Name || 'Team 1'}</label>
            <input type="number" value={s1} onChange={e => setS1(e.target.value)} min="0" max="99"
              className="w-full text-center text-2xl font-black border border-gray-200 rounded-xl py-3 input-field" />
          </div>
          <span className="text-gray-300 font-bold pt-4">–</span>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 block mb-1">{match.t2Name || 'Team 2'}</label>
            <input type="number" value={s2} onChange={e => setS2(e.target.value)} min="0" max="99"
              className="w-full text-center text-2xl font-black border border-gray-200 rounded-xl py-3 input-field" />
          </div>
        </div>
        <button onClick={() => onConfirm(s1, s2)} disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-pickle-600 text-white hover:bg-pickle-700 touch-target transition-all">
          {loading ? 'Saving...' : 'Confirm Final Score'}
        </button>
        <button onClick={onCancel} className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600 touch-target">
          Cancel
        </button>
      </div>
    </div>
  );
}

function SwapPlayerModal({ swap, slug, onConfirm, onClose, loading, participantsApi }) {
  const [players, setPlayers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    participantsApi.list(slug).then(p => {
      setPlayers(p);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [slug]);

  const slotLabel = swap.playerSlot === 'player1_id' ? 'Player 1' : 'Player 2';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-lg mb-1">Swap Player</h3>
        <p className="text-sm text-gray-500 mb-1">
          {swap.teamName} · {slotLabel}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Current: <span className="font-medium text-gray-600">{swap.currentName}</span>
        </p>
        {fetching ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading participants...</p>
        ) : (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="input-field text-sm w-full mb-4">
            <option value="">Select a player...</option>
            {players.filter(p => String(p.id) !== String(swap.currentId)).map(p => (
              <option key={p.id} value={p.id}>
                {p.nickname || p.name} ({p.gender || '?'}){p.handedness === 'lefty' ? ' ⬅' : p.handedness === 'righty' ? ' ➡' : ''}
              </option>
            ))}
          </select>
        )}
        <button onClick={() => onConfirm(selectedId)} disabled={loading || !selectedId}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-pickle-600 text-white hover:bg-pickle-700 touch-target transition-all disabled:opacity-40">
          {loading ? 'Swapping...' : 'Swap Player'}
        </button>
        <button onClick={onClose} className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600 touch-target">
          Cancel
        </button>
      </div>
    </div>
  );
}

