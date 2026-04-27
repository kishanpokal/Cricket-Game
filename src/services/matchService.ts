import { ref, set, onValue, update, remove, get, onDisconnect } from 'firebase/database';
import { rtdb } from './firebase';
import type {  MatchState, UserProfile, TossDecision, TossCall  } from '../types/cricket';

export const createMatch = async (user: UserProfile, format: 'T20'|'ODI'|'custom', customOvers: number, stadium: string, pitch: any, weather: any) => {
  const matchId = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
  
  const initialState: MatchState = {
    status: 'waiting',
    format,
    customOvers,
    stadium,
    pitch,
    weather,
    player1: { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, role: 'bat' }, // Role decided after toss
    lastUpdated: Date.now()
  };

  await set(ref(rtdb, `matches/${matchId}`), initialState);
  return matchId;
};

export const joinMatch = async (matchId: string, user: UserProfile) => {
  const matchRef = ref(rtdb, `matches/${matchId}`);
  const snapshot = await get(matchRef);
  if (snapshot.exists()) {
    const match = snapshot.val() as MatchState;
    if (match.status === 'waiting' && match.player1.uid !== user.uid) {
      await update(matchRef, {
        player2: { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, role: 'bowl' },
        status: 'toss',
        lastUpdated: Date.now()
      });
      return true;
    }
  }
  return false;
};

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

export const callToss = async (matchId: string, callerUid: string, call: TossCall) => {
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
      decision: 'bat'
    },
    lastUpdated: Date.now()
  });
};

export const submitTossDecision = async (matchId: string, decision: TossDecision) => {
  const matchRef = ref(rtdb, `matches/${matchId}`);
  const snapshot = await get(matchRef);
  if (!snapshot.exists()) return;
  const match = snapshot.val() as MatchState;
  
  const tossWinner = match.toss?.winner;
  const isP1Winner = match.player1.uid === tossWinner;
  
  // If P1 won and chose bat -> P1 bat, P2 bowl
  // If P1 won and chose bowl -> P1 bowl, P2 bat
  // If P2 won and chose bat -> P2 bat, P1 bowl
  // If P2 won and chose bowl -> P2 bowl, P1 bat
  const p1Role = isP1Winner ? (decision === 'bat' ? 'bat' : 'bowl') : (decision === 'bat' ? 'bowl' : 'bat');
  const p2Role = p1Role === 'bat' ? 'bowl' : 'bat';

  await update(matchRef, {
    'toss/decision': decision,
    'player1/role': p1Role,
    'player2/role': p2Role,
    status: 'batting',
    lastUpdated: Date.now()
  });
};

// Queue system for public matchmaking
export const joinPublicQueue = async (user: UserProfile) => {
  const queueRef = ref(rtdb, `publicQueue/${user.uid}`);
  await set(queueRef, {
    uid: user.uid,
    displayName: user.displayName,
    joinedAt: Date.now()
  });
};

export const leavePublicQueue = async (uid: string) => {
  await remove(ref(rtdb, `publicQueue/${uid}`));
};

// Player explicitly leaves / forfeits the match
export const leaveMatch = async (matchId: string, leavingUid: string) => {
  const matchRef = ref(rtdb, `matches/${matchId}`);
  const snapshot = await get(matchRef);
  if (!snapshot.exists()) return;
  const match = snapshot.val() as MatchState;

  // Determine the winner (the other player)
  const winnerUid = match.player1.uid === leavingUid
    ? match.player2?.uid
    : match.player1.uid;

  await update(matchRef, {
    status: 'finished',
    abandonedBy: leavingUid,
    winner: winnerUid || null,
    lastUpdated: Date.now()
  });
};

// Setup presence tracking — auto-forfeits if the player disconnects
export const setupPresence = (matchId: string, userUid: string) => {
  const presenceRef = ref(rtdb, `matches/${matchId}/presence/${userUid}`);

  // Mark as online
  set(presenceRef, true);

  // When this client disconnects, mark as offline
  onDisconnect(presenceRef).set(false);

  // Return cleanup function
  return () => {
    // Remove the onDisconnect hook and set to null (player is navigating away intentionally)
    onDisconnect(presenceRef).cancel();
    remove(presenceRef);
  };
};

// Subscribe to opponent presence
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
      // No presence data yet — assume online (they might not have set it up yet)
      callback(true);
    }
  });
};

