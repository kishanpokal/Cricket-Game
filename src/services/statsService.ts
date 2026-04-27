import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import type { MatchState } from '../types/cricket';

/**
 * Updates both players' stats in Firestore when a match ends.
 * Handles both normal finishes and forfeits.
 */
export const updateMatchStats = async (matchState: MatchState, currentUserUid: string) => {
  // Only the winner (or Player 1 if no forfeit) should update stats to avoid double counting
  // We use the currentUserUid to determine if this client should process stats
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
    // Forfeit: the one who abandoned loses, the other wins
    winnerUid = matchState.winner || (matchState.abandonedBy === p1Uid ? p2Uid : p1Uid);
    loserUid = matchState.abandonedBy === p1Uid ? p1Uid : p2Uid;
  } else {
    // Normal finish: determine winner from innings scores
    const innings1Score = matchState.innings1?.score ?? 0;
    const innings2Score = matchState.innings2?.score ?? 0;
    
    // Figure out who batted first
    const p1BattedFirst = matchState.player1.role === 'bat';
    const firstInningsScore = innings1Score;
    const secondInningsScore = innings2Score;

    if (secondInningsScore > firstInningsScore) {
      // Second batting team won (chased successfully)
      winnerUid = p1BattedFirst ? p2Uid : p1Uid;
      loserUid = p1BattedFirst ? p1Uid : p2Uid;
    } else if (firstInningsScore > secondInningsScore) {
      // First batting team won (defended)
      winnerUid = p1BattedFirst ? p1Uid : p2Uid;
      loserUid = p1BattedFirst ? p2Uid : p1Uid;
    }
    // If tie, winnerUid stays null (no winner/loser)
  }

  // Calculate match stats for both players
  const p1Runs = getPlayerRuns(matchState, p1Uid);
  const p1Wickets = getPlayerWickets(matchState, p1Uid);
  const p2Runs = getPlayerRuns(matchState, p2Uid);
  const p2Wickets = getPlayerWickets(matchState, p2Uid);

  // Update Player 1 stats
  try {
    const p1Ref = doc(db, 'users', p1Uid);
    const p1Snap = await getDoc(p1Ref);
    if (p1Snap.exists()) {
      const p1Data = p1Snap.data();
      const currentHighScore = p1Data?.stats?.highScore ?? 0;
      const updates: Record<string, any> = {
        'stats.matches': increment(1),
        'stats.runs': increment(p1Runs),
        'stats.wickets': increment(p1Wickets),
      };
      if (winnerUid === p1Uid) updates['stats.wins'] = increment(1);
      if (loserUid === p1Uid) updates['stats.losses'] = increment(1);
      if (p1Runs > currentHighScore) updates['stats.highScore'] = p1Runs;
      
      await updateDoc(p1Ref, updates);
    }
  } catch (err) {
    console.error('Failed to update P1 stats:', err);
  }

  // Update Player 2 stats
  try {
    const p2Ref = doc(db, 'users', p2Uid);
    const p2Snap = await getDoc(p2Ref);
    if (p2Snap.exists()) {
      const p2Data = p2Snap.data();
      const currentHighScore = p2Data?.stats?.highScore ?? 0;
      const updates: Record<string, any> = {
        'stats.matches': increment(1),
        'stats.runs': increment(p2Runs),
        'stats.wickets': increment(p2Wickets),
      };
      if (winnerUid === p2Uid) updates['stats.wins'] = increment(1);
      if (loserUid === p2Uid) updates['stats.losses'] = increment(1);
      if (p2Runs > currentHighScore) updates['stats.highScore'] = p2Runs;
      
      await updateDoc(p2Ref, updates);
    }
  } catch (err) {
    console.error('Failed to update P2 stats:', err);
  }
};

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
  // Player takes wickets in innings where THEY are NOT the batting team
  if (match.innings1 && match.innings1.battingTeam !== uid) wickets += match.innings1.wickets;
  if (match.innings2 && match.innings2.battingTeam !== uid) wickets += match.innings2.wickets;
  return wickets;
}
