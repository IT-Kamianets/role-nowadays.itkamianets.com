/**
 * Calculates seconds remaining for a game phase.
 *
 * @param phaseStartedAt  Unix ms timestamp when the phase began
 * @param duration        Total phase duration in seconds
 * @param revealActive    Whether a role-reveal animation is playing (freezes timer)
 * @param now             Current time in ms (defaults to Date.now(); injectable for tests)
 */
export function calcSecondsLeft(
  phaseStartedAt: number,
  duration: number,
  revealActive: boolean,
  now: number = Date.now(),
): number {
  if (revealActive) return duration;
  const elapsed = Math.floor((now - phaseStartedAt) / 1000);
  return Math.max(0, duration - elapsed);
}

/**
 * Returns seconds left for a lobby based on the game's MongoDB ObjectId timestamp.
 * ObjectId hex prefix encodes the creation time in seconds.
 *
 * @param gameId   MongoDB ObjectId string
 * @param maxSecs  Lobby lifetime in seconds (default 1200 = 20 min)
 * @param now      Current time in ms (injectable for tests)
 */
export function calcLobbySecondsLeft(
  gameId: string,
  maxSecs: number = 1200,
  now: number = Date.now(),
): number {
  const created = parseInt(gameId.substring(0, 8), 16) * 1000;
  return Math.max(0, maxSecs - Math.floor((now - created) / 1000));
}
