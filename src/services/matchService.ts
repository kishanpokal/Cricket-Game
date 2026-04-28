import { ref, set, onValue, update, remove, get, onDisconnect, query, orderByChild, endAt } from 'firebase/database';
import { rtdb } from './firebase';
import type { MatchState, UserProfile, TossDecision, TossCall, PitchType, Weather, MatchFormat } from '../types/cricket';

// ─── Retry Logic ────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const MATCH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  baseDelay: number = 300
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ─── Auto-Cleanup: Delete matches older than 24 hours ───────────────────────

/**
 * Scans all matches in RTDB and deletes any that are older than 24 hours.
 * This runs once per session to prevent unbounded data growth.
 */
export const cleanupOldMatches = async () => {
  try {
    const cutoffTime = Date.now() - MATCH_TTL_MS;
    const matchesRef = ref(rtdb, 'matches');
    const oldMatchesQuery = query(matchesRef, orderByChild('createdAt'), endAt(cutoffTime));
    const snapshot = await get(oldMatchesQuery);

    if (!snapshot.exists()) return 0;

    const deletions: Promise<void>[] = [];
    snapshot.forEach((child) => {
      deletions.push(remove(ref(rtdb, `matches/${child.key}`)));
    });

    await Promise.all(deletions);
    console.log(`[Cleanup] Deleted ${deletions.length} expired match(es) older than 24 hours.`);
    return deletions.length;
  } catch (err) {
    console.error('[Cleanup] Failed to cleanup old matches:', err);
    return 0;
  }
};

// ─── Match CRUD ─────────────────────────────────────────────────────────────

export const createMatch = async (
  user: UserProfile,
  format: MatchFormat,
  customOvers: number,
  stadium: string,
  pitch: PitchType,
  weather: Weather
) => {
  const matchId = Math.floor(100000 + Math.random() * 900000).toString();

  const initialState: MatchState = {
    status: 'waiting',
    format,
    customOvers,
    stadium,
    pitch,
    weather,
    player1: { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, role: 'bat' },
    lastUpdated: Date.now(),
    createdAt: Date.now(),
  };

  await withRetry(() => set(ref(rtdb, `matches/${matchId}`), initialState));
  return matchId;
};

export const joinMatch = async (matchId: string, user: UserProfile) => {
  return withRetry(async () => {
    const matchRef = ref(rtdb, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    if (snapshot.exists()) {
      const match = snapshot.val() as MatchState;
      if (match.status === 'waiting' && match.player1.uid !== user.uid) {
        await update(matchRef, {
          player2: { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, role: 'bowl' },
          status: 'toss',
          lastUpdated: Date.now(),
        });
        return true;
      }
    }
    return false;
  });
};

// ─── Real-time Subscription ─────────────────────────────────────────────────

export const subscribeToMatch = (matchId: string, callback: (match: MatchState | null) => void) => {
  const matchRef = ref(rtdb, `matches/${matchId}`);
  return onValue(matchRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as MatchState);
    } else {
      callback(null);
    }
  });
};

// ─── Toss System ────────────────────────────────────────────────────────────

export const callToss = async (matchId: string, callerUid: string, call: TossCall) => {
  return withRetry(async () => {
    const matchRef = ref(rtdb, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    if (!snapshot.exists()) return;
    const match = snapshot.val() as MatchState;

    const result: TossCall = Math.random() > 0.5 ? 'heads' : 'tails';
    const opponentUid = match.player1.uid === callerUid ? match.player2?.uid : match.player1.uid;
    const winner = call === result ? callerUid : opponentUid;

    await update(matchRef, {
      toss: {
        calledBy: callerUid,
        call,
        result,
        winner: winner || 'pending',
        decision: 'bat',
      },
      status: 'coin_flip',
      lastUpdated: Date.now(),
    });
  });
};

export const submitTossDecision = async (matchId: string, decision: TossDecision) => {
  return withRetry(async () => {
    const matchRef = ref(rtdb, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    if (!snapshot.exists()) return;
    const match = snapshot.val() as MatchState;

    const tossWinner = match.toss?.winner;
    const isP1Winner = match.player1.uid === tossWinner;

    const p1Role = isP1Winner ? (decision === 'bat' ? 'bat' : 'bowl') : (decision === 'bat' ? 'bowl' : 'bat');
    const p2Role = p1Role === 'bat' ? 'bowl' : 'bat';

    await update(matchRef, {
      'toss/decision': decision,
      'player1/role': p1Role,
      'player2/role': p2Role,
      status: 'batting',
      matchStartTime: Date.now(),
      lastUpdated: Date.now(),
    });
  });
};

// ─── Public Matchmaking Queue ───────────────────────────────────────────────

export const joinPublicQueue = async (user: UserProfile) => {
  const queueRef = ref(rtdb, `publicQueue/${user.uid}`);
  await set(queueRef, {
    uid: user.uid,
    displayName: user.displayName,
    elo: user.stats.elo ?? 1000,
    joinedAt: Date.now(),
  });
};

export const leavePublicQueue = async (uid: string) => {
  await remove(ref(rtdb, `publicQueue/${uid}`));
};

// ─── Leave / Forfeit ────────────────────────────────────────────────────────

export const leaveMatch = async (matchId: string, leavingUid: string) => {
  return withRetry(async () => {
    const matchRef = ref(rtdb, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    if (!snapshot.exists()) return;
    const match = snapshot.val() as MatchState;

    const winnerUid = match.player1.uid === leavingUid
      ? match.player2?.uid
      : match.player1.uid;

    await update(matchRef, {
      status: 'finished',
      abandonedBy: leavingUid,
      winner: winnerUid || null,
      lastUpdated: Date.now(),
    });
  });
};

// ─── Presence Tracking ──────────────────────────────────────────────────────

export const setupPresence = (matchId: string, userUid: string) => {
  const presenceRef = ref(rtdb, `matches/${matchId}/presence/${userUid}`);

  set(presenceRef, true);
  onDisconnect(presenceRef).set(false);

  return () => {
    onDisconnect(presenceRef).cancel();
    remove(presenceRef);
  };
};

export const subscribeToPresence = (
  matchId: string,
  opponentUid: string,
  callback: (isOnline: boolean) => void
) => {
  const presenceRef = ref(rtdb, `matches/${matchId}/presence/${opponentUid}`);
  return onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() === true);
    } else {
      callback(true);
    }
  });
};

// ─── Reconnection ───────────────────────────────────────────────────────────

/**
 * Check if the user has an active match to reconnect to.
 */
export const checkForActiveMatch = async (matchId: string, userUid: string): Promise<boolean> => {
  try {
    const matchRef = ref(rtdb, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    if (!snapshot.exists()) return false;

    const match = snapshot.val() as MatchState;
    if (match.status === 'finished') return false;

    // Verify this user is part of the match
    return match.player1.uid === userUid || match.player2?.uid === userUid;
  } catch {
    return false;
  }
};
