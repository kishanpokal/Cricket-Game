import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { MatchState } from '../types/cricket';

const GUEST_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

/**
 * Deletes guest user profiles from Firestore that haven't been active in 3+ days.
 * Runs once per session (called from Lobby mount).
 */
export const cleanupInactiveGuests = async () => {
  try {
    const cutoffTime = Date.now() - GUEST_TTL_MS;
    const guestsQuery = query(
      collection(db, 'users'),
      where('isGuest', '==', true),
      where('lastActive', '<', cutoffTime)
    );

    const snapshot = await getDocs(guestsQuery);
    if (snapshot.empty) return 0;

    const deletions: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
      deletions.push(deleteDoc(doc(db, 'users', docSnap.id)));
    });

    await Promise.all(deletions);
    console.log(`[Cleanup] Deleted ${deletions.length} inactive guest account(s) (3+ days inactive).`);
    return deletions.length;
  } catch (err) {
    console.error('[Cleanup] Failed to cleanup inactive guests:', err);
    return 0;
  }
};

/**
 * Updates both players' stats in Firestore when a match ends.
 * Handles both normal finishes and forfeits.
 * Includes win streak tracking and best bowling figures.
 * Only Player 1's client processes this to prevent double-counting.
 */
export const updateMatchStats = async (matchState: MatchState, currentUserUid: string) => {
  const isP1 = matchState.player1.uid === currentUserUid;

  // Only Player 1 processes stats to prevent double-counting
  if (!isP1) return;

  const p1Uid = matchState.player1.uid;
  const p2Uid = matchState.player2?.uid;
  if (!p2Uid) return;

  const isForfeit = !!matchState.abandonedBy;

  let winnerUid: string | null = null;
  let loserUid: string | null = null;

  if (isForfeit) {
    winnerUid = matchState.winner || (matchState.abandonedBy === p1Uid ? p2Uid : p1Uid);
    loserUid = matchState.abandonedBy === p1Uid ? p1Uid : p2Uid;
  } else {
    const innings1Score = matchState.innings1?.score ?? 0;
    const innings2Score = matchState.innings2?.score ?? 0;
    const p1BattedFirst = matchState.player1.role === 'bat';

    if (innings2Score > innings1Score) {
      winnerUid = p1BattedFirst ? p2Uid : p1Uid;
      loserUid = p1BattedFirst ? p1Uid : p2Uid;
    } else if (innings1Score > innings2Score) {
      winnerUid = p1BattedFirst ? p1Uid : p2Uid;
      loserUid = p1BattedFirst ? p2Uid : p1Uid;
    }
  }

  const p1Runs = getPlayerRuns(matchState, p1Uid);
  const p1Wickets = getPlayerWickets(matchState, p1Uid);
  const p2Runs = getPlayerRuns(matchState, p2Uid);
  const p2Wickets = getPlayerWickets(matchState, p2Uid);

  // Update Player 1 stats
  await updatePlayerStats(p1Uid, p1Runs, p1Wickets, winnerUid, loserUid, matchState);

  // Update Player 2 stats
  await updatePlayerStats(p2Uid, p2Runs, p2Wickets, winnerUid, loserUid, matchState);
};

async function updatePlayerStats(
  uid: string,
  runs: number,
  wickets: number,
  winnerUid: string | null,
  loserUid: string | null,
  matchState: MatchState
) {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const currentHighScore = data?.stats?.highScore ?? 0;
    const currentWinStreak = data?.stats?.winStreak ?? 0;
    const longestWinStreak = data?.stats?.longestWinStreak ?? 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      'stats.matches': increment(1),
      'stats.runs': increment(runs),
      'stats.wickets': increment(wickets),
    };

    if (winnerUid === uid) {
      updates['stats.wins'] = increment(1);
      const newStreak = currentWinStreak + 1;
      updates['stats.winStreak'] = newStreak;
      if (newStreak > longestWinStreak) {
        updates['stats.longestWinStreak'] = newStreak;
      }
    }
    if (loserUid === uid) {
      updates['stats.losses'] = increment(1);
      updates['stats.winStreak'] = 0; // Reset streak on loss
    }

    if (runs > currentHighScore) {
      updates['stats.highScore'] = runs;
    }

    // Best bowling figures (e.g., "3-15")
    const bowlingFigures = getPlayerBowlingFigures(matchState, uid);
    if (bowlingFigures) {
      const currentBest = data?.stats?.bestBowling ?? '0-0';
      if (isBetterBowling(bowlingFigures, currentBest)) {
        updates['stats.bestBowling'] = bowlingFigures;
      }
    }

    await updateDoc(userRef, updates);
  } catch (err) {
    console.error(`Failed to update stats for ${uid}:`, err);
  }
}

/** Get total runs scored by a player across both innings */
function getPlayerRuns(match: MatchState, uid: string): number {
  let runs = 0;
  if (match.innings1?.battingTeam === uid) runs += match.innings1.score;
  if (match.innings2?.battingTeam === uid) runs += match.innings2.score;
  return runs;
}

/** Get total wickets taken by a player (they bowl when opponent bats) */
function getPlayerWickets(match: MatchState, uid: string): number {
  let wickets = 0;
  if (match.innings1 && match.innings1.battingTeam !== uid) wickets += match.innings1.wickets;
  if (match.innings2 && match.innings2.battingTeam !== uid) wickets += match.innings2.wickets;
  return wickets;
}

/** Get bowling figures string like "3-15" for a player */
function getPlayerBowlingFigures(match: MatchState, uid: string): string | null {
  let totalWickets = 0;
  let totalRunsConceded = 0;

  // Player bowls in innings where they are NOT batting
  if (match.innings1 && match.innings1.battingTeam !== uid) {
    totalWickets += match.innings1.wickets;
    totalRunsConceded += match.innings1.score;
  }
  if (match.innings2 && match.innings2.battingTeam !== uid) {
    totalWickets += match.innings2.wickets;
    totalRunsConceded += match.innings2.score;
  }

  if (totalWickets === 0 && totalRunsConceded === 0) return null;
  return `${totalWickets}-${totalRunsConceded}`;
}

/** Compare bowling figures — more wickets is better, fewer runs if equal */
function isBetterBowling(newFigures: string, currentBest: string): boolean {
  const [newW, newR] = newFigures.split('-').map(Number);
  const [curW, curR] = currentBest.split('-').map(Number);

  if (newW > curW) return true;
  if (newW === curW && newR < curR) return true;
  return false;
}
