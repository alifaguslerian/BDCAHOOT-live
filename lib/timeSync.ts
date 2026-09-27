/**
 * Time Synchronization & Server-Authoritative Clock Utilities
 * Resolves client-side hardware clock drift (2-5s discrepancy across 50+ phones)
 * by establishing the server's absolute epoch timestamp as the single source of truth.
 */

export interface ClockSyncResult {
  roundTripTimeMs: number;
  serverOffsetMs: number;
  estimatedServerTimeMs: number;
}

/**
 * Calculates clock offset using the NTP / SNTP algorithm:
 * RTT = (t_client_receive - t_client_send)
 * Offset = t_server - t_client_send - (RTT / 2)
 */
export function calculateClockOffset(
  clientSentAtMs: number,
  serverReceivedAtMs: number,
  clientReceivedAtMs: number = Date.now()
): ClockSyncResult {
  const roundTripTimeMs = Math.max(0, clientReceivedAtMs - clientSentAtMs);
  const serverOffsetMs = Math.round(serverReceivedAtMs - clientSentAtMs - roundTripTimeMs / 2);

  return {
    roundTripTimeMs,
    serverOffsetMs,
    estimatedServerTimeMs: clientReceivedAtMs + serverOffsetMs,
  };
}

/**
 * Calculates remaining seconds with server-authoritative clock alignment
 */
export function computeAuthoritativeRemainingSeconds(
  questionEndsAtMs: number | null | undefined,
  serverOffsetMs: number = 0,
  clientNowMs: number = Date.now()
): number {
  if (!questionEndsAtMs) return 0;
  const synchronizedServerTime = clientNowMs + serverOffsetMs;
  const remainingMs = questionEndsAtMs - synchronizedServerTime;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Validates whether a response packet arrived within the authoritative server window
 */
export function isWithinServerSubmissionWindow(
  serverNowMs: number,
  questionEndsAtMs: number | null | undefined,
  gracePeriodMs: number = 200
): { isAllowed: boolean; driftMs: number } {
  if (!questionEndsAtMs) return { isAllowed: false, driftMs: 0 };
  const driftMs = serverNowMs - questionEndsAtMs;
  const isAllowed = driftMs <= gracePeriodMs;

  return { isAllowed, driftMs };
}
