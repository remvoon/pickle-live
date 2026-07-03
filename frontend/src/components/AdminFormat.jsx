/**
 * Tournament Format Setup — visual builder for round-robin + knockout
 */
import React, { useState, useEffect, useRef } from 'react';
import { teamsApi, participantsApi, eventsApi } from '../api';

const DEFAULT_SCORING = { scoring_type: 'rally', points_to_win: 15, deuce_allowed: true };
const POINT_OPTIONS = [11, 15, 21];

const FORMATS = [
  {
    id: 'royal_rumble',
    label: 'Royal Rumble',
    desc: 'Random pairings each round — no fixed teams',
    icon: '👑',
    popular: true,
  },
  {
    id: 'round_robin_knockout',
    label: 'Groups → Bracket',
    desc: 'Round robin groups, then knockout playoffs',
    icon: '🏟️',
    popular: true,
  },
  {
    id: 'round_robin_only',
    label: 'Round Robin Only',
    desc: 'Every team plays every other team',
    icon: '🔄',
  },
  {
    id: 'knockout_only',
    label: 'Knockout Only',
    desc: 'Single-elimination bracket',
    icon: '🏆',
  },
];

function BracketPreview({ groupCount, advancePerGroup }) {
  const advancing = groupCount * advancePerGroup;
  let size = 2;
  while (size < advancing) size *= 2;

  const rounds = [];
  let n = size;
  const labels = ['Final', 'Semi-Finals', 'Quarter-Finals', 'Round of 16', 'Round of 32', 'Round of 64'];
  while (n >= 2) {
    rounds.push({ label: labels[Math.log2(n) - 1] || `Round of ${n}`, matches: n / 2 });
    n /= 2;
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bracket Preview</p>
      <div className="flex items-end gap-1.5 h-24">
        {rounds.map((r, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-pickle-200 rounded-t-md" style={{ height: `${(r.matches / rounds[0].matches) * 100}%`, minHeight: '16px' }} />
            <span className="text-[9px] text-gray-500 font-medium text-center leading-tight">{r.label}</span>
            <span className="text-[8px] text-gray-400">{r.matches} match{r.matches > 1 ? 'es' : ''}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">{advancing} team{advancing > 1 ? 's' : ''} advance · {size}-team bracket</p>
    </div>
  );
}

function ToggleGroup({ options, value, onClick, size = 'sm' }) {
  return (
    <div className="flex gap-1">
      {options.map(opt => (
        <button key={opt.key || opt} type="button" onClick={() => onClick(opt.key || opt)}
          className={`touch-target transition-all rounded-lg font-medium
            ${size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}
            ${(value === (opt.key || opt))
              ? 'bg-pickle-600 text-white shadow-sm'
              : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
            }`}>
          {opt.label || opt}
        </button>
      ))}
    </div>
  );
}

function ScoringPicker({ value, onChange, label }) {
  const v = value || DEFAULT_SCORING;
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {/* Scoring type */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Type</p>
        <ToggleGroup
          options={[
            { key: 'rally', label: 'Rally' },
            { key: 'side_out', label: 'Side-Out' },
          ]}
          value={v.scoring_type}
          onClick={(key) => onChange({ ...v, scoring_type: key, points_to_win: key === 'side_out' ? 11 : 15, deuce_allowed: true })}
        />
      </div>
      {/* Points to win */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Points to Win</p>
        <ToggleGroup
          options={POINT_OPTIONS.map(p => ({ key: p, label: `${p}` }))}
          value={v.points_to_win}
          onClick={(val) => onChange({ ...v, points_to_win: val })}
        />
      </div>
      {/* Deuce toggle */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Deuce</p>
        <ToggleGroup
          options={[
            { key: true, label: 'Deuce (win by 2)' },
            { key: false, label: 'Sudden Death' },
          ]}
          value={v.deuce_allowed}
          onClick={(val) => onChange({ ...v, deuce_allowed: val })}
        />
      </div>
    </div>
  );
}

export default function AdminFormat({ slug }) {
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [formatType, setFormatType] = useState('royal_rumble');
  const [groupCount, setGroupCount] = useState(2);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);
  const [rrScoring, setRrScoring] = useState({ ...DEFAULT_SCORING });
  const [koScoring, setKoScoring] = useState({ ...DEFAULT_SCORING });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  // Royal Rumble state
  const [matchCount, setMatchCount] = useState(0);
  const [courtCount, setCourtCount] = useState(1);
  const [totalPermutations, setTotalPermutations] = useState(0);
  const [availableCourts, setAvailableCourts] = useState([]);
  const [eventDuration, setEventDuration] = useState(0); // minutes

  // Refs for auto-scroll
  const formatPickerRef = useRef(null);
  const rrConfigRef = useRef(null);
  const koConfigRef = useRef(null);
  const rumbleConfigRef = useRef(null);
  const scoringRef = useRef(null);

  // Auto-propose format based on REAL team count (exclude Royal Rumble ad-hoc teams without emoji)
  const autoPropose = (realTeamCount) => {
    if (realTeamCount <= 2) {
      setFormatType('knockout_only');
      setGroupCount(1);
      setAdvancePerGroup(1);
    } else if (realTeamCount <= 4) {
      setFormatType('round_robin_knockout');
      setGroupCount(1);
      setAdvancePerGroup(2);
    } else if (realTeamCount <= 8) {
      setFormatType('round_robin_knockout');
      setGroupCount(2);
      setAdvancePerGroup(2);
    } else {
      const groups = Math.min(4, Math.ceil(realTeamCount / 4));
      setFormatType('round_robin_knockout');
      setGroupCount(groups);
      setAdvancePerGroup(2);
    }
  };

  useEffect(() => { loadData(); }, [slug]);

  const loadData = async () => {
    try {
      const [t, p, event] = await Promise.all([
        teamsApi.list(slug),
        participantsApi.list(slug),
        eventsApi.get(slug).catch(() => null),
      ]);
      setTeams(t);
      setParticipants(p);

      // If the event already has a format_type set, respect it
      if (event && event.format_type) {
        setFormatType(event.format_type);
      } else {
        // Only auto-propose based on REAL teams (with emoji — Royal Rumble ad-hoc teams lack emoji)
        const realTeams = t.filter(team => team.emoji);
        if (realTeams.length > 0) autoPropose(realTeams.length);
      }

      // Fetch Royal Rumble info (permutation count, courts, event times)
      try {
        const res = await fetch(`/api/admin/events/${slug}/royal-rumble-info`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('pickle_live_token')}` },
        });
        if (res.ok) {
          const info = await res.json();
          setTotalPermutations(info.total_permutations || 0);
          setAvailableCourts(info.courts || []);
          const cc = info.court_count || 1;
          setCourtCount(cc);
          const dur = info.duration_minutes || 0;
          setEventDuration(dur);
          // Default match count: event_duration / 15min per match * court_count
          const defaultByDuration = dur > 0 ? Math.floor(dur / 15) * cc : 0;
          const defaultCount = defaultByDuration > 0 ? Math.min(defaultByDuration, info.total_permutations || 0) : (info.total_permutations || 0);
          if (defaultCount > 0) setMatchCount(defaultCount);
        }
      } catch { /* ignore */ }
    } catch (err) {
      setError(err.message);
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body = {
        format_type: formatType,
        round_robin: {
          group_count: groupCount,
          advance_per_group: advancePerGroup,
          scoring: rrScoring,
          match_count: matchCount,
          court_count: courtCount,
        },
        knockout: {
          scoring: koScoring,
        },
      };
      const res = await fetch(`/api/admin/events/${slug}/setup-format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pickle_live_token')}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');
      setResult(data);
      // Notify dashboard of format type change so Teams tab visibility updates
      window.dispatchEvent(new CustomEvent('formatTypeChanged', { detail: formatType }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Real teams = user-created teams with emoji (exclude Royal Rumble ad-hoc pairs)
  const realTeams = teams.filter(t => t.emoji);
  const hasRoyalRumbleTeams = teams.some(t => !t.emoji);

  const advancing = (formatType === 'round_robin_knockout' || formatType === 'round_robin_only')
    ? groupCount * advancePerGroup : realTeams.length;

  let bracketSize = 2;
  while (bracketSize < advancing) bracketSize *= 2;

  // --- Validation ---
  const validationErrors = [];
  const teamsPerGroup = realTeams.length > 0 ? Math.ceil(realTeams.length / groupCount) : 0;

  if (formatType === 'royal_rumble') {
    if (participants.length < 4) {
      validationErrors.push(`Need at least 4 players for Royal Rumble. You have ${participants.length}.`);
    }
  } else if (formatType !== 'knockout_only') {
    if (realTeams.length < 2) {
      validationErrors.push(`Need at least 2 proper teams. You have ${realTeams.length}. Create teams in the Teams step.`);
    } else if (teamsPerGroup < 2) {
      validationErrors.push(`With ${realTeams.length} teams and ${groupCount} group${groupCount > 1 ? 's' : ''}, at least one group would have fewer than 2 teams and can't play round-robin matches.`);
    }
    if (advancePerGroup > teamsPerGroup) {
      validationErrors.push(`Can't advance ${advancePerGroup} teams per group when groups only have ~${teamsPerGroup} teams each.`);
    }
    if (groupCount > realTeams.length) {
      validationErrors.push(`Can't have more groups (${groupCount}) than teams (${realTeams.length}).`);
    }
    if (advancing > realTeams.length) {
      validationErrors.push(`${advancing} teams advancing exceeds total ${realTeams.length} teams.`);
    }
  }

  const hasValidationErrors = validationErrors.length > 0;

  return (
    <div className="space-y-4">
      {/* Step 1: Choose Format */}
      <div ref={formatPickerRef} className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Format</p>
        <div className="grid gap-2">
          {FORMATS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFormatType(f.id);
                setResult(null);
                setConfirmOverwrite(false);
                // Auto-scroll to config section after a short delay (allow render)
                setTimeout(() => {
                  if (f.id === 'royal_rumble') {
                    rumbleConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else if (f.id === 'knockout_only') {
                    koConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    rrConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              className={`card-flat flex items-center gap-4 text-left touch-target transition-all
                ${formatType === f.id ? 'border-pickle-500 bg-pickle-50/50 ring-2 ring-pickle-200' : 'hover:border-gray-200'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                ${formatType === f.id ? 'bg-pickle-100' : 'bg-gray-50'}`}>
                {f.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm">{f.label}</p>
                  {f.popular && <span className="text-[9px] bg-pickle-100 text-pickle-700 px-1.5 py-0.5 rounded-full font-medium">Popular</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
              </div>
              {formatType === f.id && (
                <svg className="w-5 h-5 text-pickle-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Warning: switching from Royal Rumble to a format that needs real teams */}
      {formatType !== 'royal_rumble' && teams.some(t => !t.emoji) && (
        <div className="card-flat border-amber-200 bg-amber-50/70 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800">Royal Rumble teams are temporary</p>
              <p className="text-xs text-amber-600">
                The current team pairings were auto-generated for Royal Rumble. 
                For {FORMATS.find(f => f.id === formatType)?.label || 'this format'}, you need to create proper fixed teams.
              </p>
              <p className="text-xs text-amber-600">
                Go to the <strong>Teams</strong> step to unpair all teams, then re-pair players for this format.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {(formatType === 'round_robin_knockout' || formatType === 'round_robin_only') && (
        <div ref={rrConfigRef} className="card-flat space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Round Robin Setup</p>

          {/* Group count stepper */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Number of Groups</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setGroupCount(Math.max(1, groupCount - 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-target flex items-center justify-center">−</button>
              <span className="text-2xl font-black text-gray-800 w-8 text-center">{groupCount}</span>
              <button type="button" onClick={() => setGroupCount(Math.min(Math.max(1, Math.floor(realTeams.length / 2)), groupCount + 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-target flex items-center justify-center">+</button>
            </div>
            {realTeams.length === 2 && groupCount > 1 && (
              <p className="text-xs text-amber-500 mt-1">With only 2 teams, you can only have 1 group.</p>
            )}
          </div>

          {/* Advance per group stepper */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Teams advancing per group</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAdvancePerGroup(Math.max(1, advancePerGroup - 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-target flex items-center justify-center">−</button>
              <span className="text-2xl font-black text-gray-800 w-8 text-center">{advancePerGroup}</span>
              <button type="button" onClick={() => setAdvancePerGroup(Math.min(teamsPerGroup, advancePerGroup + 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-target flex items-center justify-center">+</button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-pickle-50 rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-pickle-800">
              {realTeams.length} teams · {groupCount} group{groupCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-pickle-600">
              ~{Math.ceil(realTeams.length / groupCount)} teams per group · Top {advancePerGroup} advance
              {formatType === 'round_robin_knockout' && ` · ${advancing} into knockout`}
            </p>
          </div>

          {/* Scoring for round robin */}
          <ScoringPicker label="Round Robin Scoring" value={rrScoring} onChange={setRrScoring} />
        </div>
      )}

      {/* Knockout config */}
      {formatType === 'round_robin_knockout' && (
        <div ref={koConfigRef} className="card-flat space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Knockout Stage</p>
          <BracketPreview groupCount={groupCount} advancePerGroup={advancePerGroup} />
          <ScoringPicker label="Knockout Scoring" value={koScoring} onChange={setKoScoring} />
        </div>
      )}

      {formatType === 'knockout_only' && (
        <div ref={koConfigRef} className="card-flat space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Knockout Bracket</p>
          <div className="bg-pickle-50 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-pickle-800">{realTeams.length} teams</p>
            <p className="text-xs text-pickle-600">{bracketSize}-team bracket · {Math.log2(bracketSize)} rounds</p>
          </div>
          <ScoringPicker label="Match Scoring" value={koScoring} onChange={setKoScoring} />
        </div>
      )}

      {/* Royal Rumble config */}
      {formatType === 'royal_rumble' && (
        <div ref={rumbleConfigRef} className="card-flat space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Royal Rumble Setup</p>

          {/* Player summary */}
          <div className="bg-pickle-50 rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-pickle-800">
              {participants.length} players
            </p>
            <p className="text-xs text-pickle-600">
              Total possible unique matchups: <span className="font-bold">{totalPermutations}</span>
            </p>
            {eventDuration > 0 && (
              <p className="text-xs text-pickle-600">
                Event duration: <span className="font-bold">{Math.floor(eventDuration / 60)}h {eventDuration % 60 > 0 ? `${eventDuration % 60}m` : ''}</span>
                {' → '}
                <span className="font-bold">{Math.floor(eventDuration / 15)}</span> slots per court
              </p>
            )}
            <p className="text-[10px] text-pickle-500">
              Random pairings each round — no fixed teams
            </p>
          </div>

          {/* Court count stepper */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Courts to use</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCourtCount(Math.max(1, courtCount - 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-target flex items-center justify-center">−</button>
              <span className="text-2xl font-black text-gray-800 w-8 text-center">{courtCount}</span>
              <button type="button" onClick={() => setCourtCount(Math.min(availableCourts.length || 8, courtCount + 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 touch-target flex items-center justify-center">+</button>
            </div>
            {availableCourts.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">{availableCourts.length} court{availableCourts.length > 1 ? 's' : ''} available from venue</p>
            )}
          </div>

          {/* Match count - defaults to event_duration / 15min per court */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Matches to generate</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={matchCount || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { setMatchCount(0); return; }
                  const v = parseInt(raw);
                  if (!isNaN(v)) setMatchCount(v);
                }}
                onBlur={() => {
                  if (matchCount < 1) setMatchCount(1);
                  if (matchCount > totalPermutations) setMatchCount(totalPermutations);
                }}
                min={1}
                max={totalPermutations}
                className="input-field text-lg font-bold text-center w-24 py-2"
              />
              <span className="text-xs text-gray-400">/ {totalPermutations}</span>
              <button type="button" onClick={() => setMatchCount(totalPermutations)}
                className="text-[10px] text-pickle-600 font-medium hover:text-pickle-800 touch-target px-2 py-1 bg-pickle-50 rounded-lg">
                Max
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              ~{Math.ceil(matchCount / courtCount)} rounds · {courtCount} concurrent match{courtCount > 1 ? 'es' : ''} per round
              {eventDuration > 0 && (
                <span className="text-pickle-500"> · {Math.floor(eventDuration / 15)} time slots available</span>
              )}
              {matchCount < totalPermutations && matchCount > 0 && (
                <span className="text-amber-500"> · {totalPermutations - matchCount} matchups not used</span>
              )}
            </p>
          </div>

          {/* Scoring */}
          <ScoringPicker label="Match Scoring" value={rrScoring} onChange={setRrScoring} />
        </div>
      )}

      {/* Validation errors */}
      {hasValidationErrors && (
        <div className="card-flat border-red-200 bg-red-50/50 space-y-1">
          {validationErrors.map((err, i) => (
            <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Submit */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {formatType === 'royal_rumble' ? (
        participants.length < 4 ? (
          <div className="card-flat border-amber-200 bg-amber-50/50 text-center py-4">
            <p className="text-sm font-medium text-amber-700">Need at least 4 players</p>
            <p className="text-xs text-amber-500 mt-1">Add more players in the Players step</p>
          </div>
        ) : (
          <button onClick={onSubmit} disabled={loading || hasValidationErrors} className="btn-primary w-full touch-target">
            {loading ? 'Setting up...' : 'Build Royal Rumble'}
          </button>
        )
      ) : realTeams.length < 2 ? (
        <div className="card-flat border-amber-200 bg-amber-50/50 text-center py-4">
          <p className="text-sm font-medium text-amber-700">Need at least 2 proper teams</p>
          <p className="text-xs text-amber-500 mt-1">
            {hasRoyalRumbleTeams
              ? 'Royal Rumble teams are temporary. Go to the Teams step to unpair and create proper teams for this format.'
              : 'Create teams in the previous step first.'}
          </p>
        </div>
      ) : (
        <button onClick={onSubmit} disabled={loading || hasValidationErrors} className="btn-primary w-full touch-target">
          {loading ? 'Setting up...' : 'Build Tournament'}
        </button>
      )}

      {/* Result summary */}
      {result && (
        <div className="card-flat border-green-200 bg-green-50/50 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-green-800 text-sm">Tournament built!</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-xl py-2">
              <p className="text-lg font-black text-gray-800">{result.summary?.groups_created || 0}</p>
              <p className="text-[10px] text-gray-400">Groups</p>
            </div>
            <div className="bg-white rounded-xl py-2">
              <p className="text-lg font-black text-gray-800">{result.summary?.stages_created || 0}</p>
              <p className="text-[10px] text-gray-400">Stages</p>
            </div>
            <div className="bg-white rounded-xl py-2">
              <p className="text-lg font-black text-gray-800">{result.summary?.matches_created || 0}</p>
              <p className="text-[10px] text-gray-400">Matches</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
