/**
 * Standings table - shows W/L record and point differential
 * Supports both player-level and team-level (with player names + MD/WD/XD badges)
 */
import React from 'react';

function PlayerName({ name, gender }) {
  const genderIcon = gender === 'Female' ? '♀' : gender === 'Male' ? '♂' : '';
  const genderColor = gender === 'Female' ? 'text-rose-500' : gender === 'Male' ? 'text-blue-500' : 'text-gray-400';
  return (
    <span className="inline-flex items-center gap-1">
      {genderIcon && <span className={`text-xs font-bold flex-shrink-0 w-3.5 text-center ${genderColor}`}>{genderIcon}</span>}
      <span className="text-gray-700">{name}</span>
    </span>
  );
}

function TeamTypeBadge({ p1Gender, p2Gender }) {
  if (p1Gender === 'Male' && p2Gender === 'Male') {
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">MD</span>;
  }
  if (p1Gender === 'Female' && p2Gender === 'Female') {
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 flex-shrink-0">WD</span>;
  }
  if (p1Gender && p2Gender) {
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0">XD</span>;
  }
  return null;
}

export default function StandingsTable({ standings, type, participants }) {
  if (!standings || standings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400">No standings yet</p>
      </div>
    );
  }

  const isPlayers = type === 'players';

  // Build a lookup for participant details if we have them
  const participantMap = {};
  if (participants) {
    for (const p of participants) {
      participantMap[p.name] = p;
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="py-2.5 pl-4 pr-1 text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
            <th className="py-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {isPlayers ? 'Player' : 'Team'}
            </th>
            <th className="py-2.5 px-1 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-10">W</th>
            <th className="py-2.5 px-1 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-10">L</th>
            <th className="py-2.5 px-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">+/-</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {standings.map((row, idx) => {
            const pInfo = isPlayers ? participantMap[row.name] : null;
            const gender = isPlayers ? (pInfo?.gender || '') : '';
            const diffNum = row.diff;
            const diffColor = diffNum > 0 ? 'text-green-600' : diffNum < 0 ? 'text-red-500' : 'text-gray-400';
            const diffStr = diffNum > 0 ? `+${diffNum}` : `${diffNum}`;
            const isTop = idx < 3 && standings.length > 3;
            const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';

            return (
              <tr key={isPlayers ? row.name : row.team_id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-2.5 pl-4 pr-1 text-gray-500 font-medium text-xs align-top">
                  {rankEmoji || (idx + 1)}
                </td>
                <td className="py-2.5 px-2">
                  {isPlayers ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PlayerName name={row.name} gender={gender} />
                      {isTop && <span className="flex-shrink-0">{rankEmoji}</span>}
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-800 truncate">{row.team_name || `Team ${row.team_id}`}</span>
                        <TeamTypeBadge p1Gender={row.player1_gender} p2Gender={row.player2_gender} />
                        {isTop && <span className="flex-shrink-0">{rankEmoji}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        {row.player1_name && (
                          <PlayerName name={row.player1_nickname || row.player1_name} gender={row.player1_gender} />
                        )}
                        {row.player2_name && (
                          <>
                            <span className="text-gray-300">&</span>
                            <PlayerName name={row.player2_nickname || row.player2_name} gender={row.player2_gender} />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-1 text-center font-semibold text-gray-700 align-top">{row.wins}</td>
                <td className="py-2.5 px-1 text-center text-gray-500 align-top">{row.losses}</td>
                <td className={`py-2.5 px-2 text-right font-semibold text-xs ${diffColor} align-top`}>{diffStr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
