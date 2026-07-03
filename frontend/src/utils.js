// Deterministic animal emoji for a team based on its ID
export const ANIMALS = [
  '🦊', '🐶', '🐱', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🦄',
  '🐙', '🦋', '🐝', '🦉', '🐢', '🦎', '🐬', '🦭', '🦩', '🐧',
  '🦆', '🦅', '🐺', '🦝', '🐮', '🐷', '🐭', '🐹', '🐰', '🐻',
  '🦇', '🐳', '🦈', '🐊', '🦍', '🦒', '🦏', '🐘', '🦛', '🐪',
  '🐑', '🐐', '🦌', '🐕', '🐈', '🦜', '🐾', '🐿️',
];

/**
 * Returns a deterministic animal emoji for a given team ID.
 * Same team ID always gets the same emoji.
 */
export function getTeamEmoji(teamId) {
  if (!teamId) return '🦊';
  // Simple hash of the team ID
  let hash = 0;
  const str = String(teamId);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return ANIMALS[Math.abs(hash) % ANIMALS.length];
}

/**
 * Returns the next animal emoji in the list after the given one.
 */
export function getNextEmoji(current) {
  const idx = ANIMALS.indexOf(current);
  return idx === -1 ? ANIMALS[0] : ANIMALS[(idx + 1) % ANIMALS.length];
}
