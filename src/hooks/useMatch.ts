import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useGameStore } from '../store/useGameStore';
import { calculateBallOutcome, getMaxWickets } from '../services/aiLogic';
import { subscribeToMatch } from '../services/matchService';
import type {  BallAction, MatchState, InningsState  } from '../types/cricket';

export const useMatch = (matchId: string | null) => {
  const { user, matchState, setMatchState, myAction, setMyAction, opponentAction, setOpponentAction } = useGameStore();
  
  // Track ball number so components know when a new ball starts
  const [ballReady, setBallReady] = useState(true);

  // Use refs to always have the latest values in callbacks without re-subscribing
  const matchStateRef = useRef(matchState);
  const myActionRef = useRef(myAction);
  const opponentActionRef = useRef(opponentAction);
  const userRef = useRef(user);
  const processingRef = useRef(false);

  useEffect(() => { matchStateRef.current = matchState; }, [matchState]);
  useEffect(() => { myActionRef.current = myAction; }, [myAction]);
  useEffect(() => { opponentActionRef.current = opponentAction; }, [opponentAction]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Subscribe to match state
  useEffect(() => {
    if (!matchId) return;
    const unsubscribe = subscribeToMatch(matchId, (state) => {
      setMatchState(state);
    });
    return () => unsubscribe();
  }, [matchId, setMatchState]);

  // Listen for actions - only depends on matchId and user.uid (stable values)
  useEffect(() => {
    if (!matchId || !user) return;

    const actionRef = ref(rtdb, `matches/${matchId}/actions`);
    const unsub = onValue(actionRef, (snapshot) => {
      const actions = snapshot.val();
      const currentMatchState = matchStateRef.current;
      
      if (!currentMatchState) return;

      const isPlayer1 = currentMatchState.player1.uid === user.uid;

      if (!actions) {
        // Actions were cleared — a new ball is starting
        // Reset local state for BOTH players
        if (myActionRef.current !== null) {
          setMyAction(null);
        }
        if (opponentActionRef.current !== null) {
          setOpponentAction(null);
        }
        setBallReady(true);
        processingRef.current = false;
        return;
      }

      const myKey = isPlayer1 ? 'p1' : 'p2';
      const opKey = isPlayer1 ? 'p2' : 'p1';
      
      const mySubmitted = actions[myKey];
      const opSubmitted = actions[opKey];

      if (opSubmitted && myActionRef.current) {
        setOpponentAction(opSubmitted);
      }

      // If both submitted, Player 1 processes the ball outcome
      if (actions.p1 && actions.p2 && isPlayer1 && !processingRef.current) {
        processingRef.current = true;
        processBall(currentMatchState, matchId, actions.p1, actions.p2);
      }
    });
    
    return () => unsub();
  }, [matchId, user?.uid]);

  const processBall = async (currentMatch: MatchState, currentMatchId: string, p1Action: BallAction, p2Action: BallAction) => {
     if (!currentMatch) return;
     
     // Determine who is batting in THIS innings
     // Innings 1: whoever has role 'bat' bats first
     // Innings 2: roles swap — whoever had 'bowl' now bats
     const isInnings1 = !currentMatch.innings2;
     const isP1BattingInnings1 = currentMatch.player1.role === 'bat';
     const isP1Batting = isInnings1 ? isP1BattingInnings1 : !isP1BattingInnings1;
     
     const batAction = isP1Batting ? p1Action : p2Action;
     const bowlAction = isP1Batting ? p2Action : p1Action;

     const inningsKey = isInnings1 ? 'innings1' : 'innings2';
     let currentInnings = currentMatch[inningsKey] as InningsState | undefined;
     
     if (!currentInnings) {
         const battingTeamUid = isP1Batting 
           ? currentMatch.player1.uid 
           : (currentMatch.player2?.uid || '');
         currentInnings = {
             battingTeam: battingTeamUid,
             score: 0,
             wickets: 0,
             overs: 0,
             balls: 0,
             ballLog: [],
             currentBall: batAction
         };
     }

     const maxOvers = currentMatch.format === 'T20' ? 20 : currentMatch.format === 'ODI' ? 50 : currentMatch.customOvers;

     const outcome = calculateBallOutcome(
         batAction, 
         bowlAction, 
         currentMatch.pitch, 
         currentMatch.weather, 
         currentMatch.format, 
         { 
             overs: currentInnings.overs, 
             balls: currentInnings.balls, 
             score: currentInnings.score, 
             wickets: currentInnings.wickets,
             target: currentMatch.innings1 && !isInnings1 ? currentMatch.innings1.score + 1 : undefined
         }
     );

     // Update score
     const updatedInnings = { ...currentInnings };
     updatedInnings.score += outcome.runs;
     if (outcome.wicket) updatedInnings.wickets += 1;
     updatedInnings.balls += 1;
     if (updatedInnings.balls === 6) {
         updatedInnings.overs += 1;
         updatedInnings.balls = 0;
     }

     updatedInnings.ballLog = [...(currentInnings.ballLog || []), { ...outcome, ...batAction, ...bowlAction }];
     updatedInnings.currentBall = batAction;

     // Check innings end conditions
     const maxWickets = getMaxWickets(maxOvers);
     const allOut = updatedInnings.wickets >= maxWickets;
     const oversComplete = updatedInnings.overs >= maxOvers;
     const targetChased = !isInnings1 && currentMatch.innings1 && updatedInnings.score >= currentMatch.innings1.score + 1;

     let newStatus = currentMatch.status;
     let winner: string | null = null;

     if (isInnings1 && (allOut || oversComplete)) {
       // Innings 1 over → go to innings break
       newStatus = 'innings_break';
     }

     if (!isInnings1 && (allOut || oversComplete || targetChased)) {
       // Innings 2 over → match finished
       newStatus = 'finished';
       
       // Determine winner
       const innings1Score = currentMatch.innings1?.score ?? 0;
       const innings2Score = updatedInnings.score;
       
       if (targetChased) {
         // Batting team in innings 2 wins (chased target)
         winner = updatedInnings.battingTeam;
       } else if (innings2Score < innings1Score + 1) {
         // Batting team in innings 1 wins (defended target)
         // innings1.battingTeam is the first batter's uid
         winner = currentMatch.innings1?.battingTeam || null;
       }
       // If tied (innings2Score === innings1Score), winner stays null (draw)
     }

     // Build the database update
     const dbUpdate: Record<string, any> = {
       [inningsKey]: updatedInnings,
       status: newStatus,
       actions: null, // clear actions for next ball
       lastUpdated: Date.now()
     };

     // If match is finished, set the winner
     if (winner) {
       dbUpdate.winner = winner;
     }

     // If innings break, auto-start innings 2 after delay
     if (newStatus === 'innings_break') {
       // First, push the innings 1 result
       setTimeout(async () => {
         await update(ref(rtdb, `matches/${currentMatchId}`), dbUpdate);
         
         // After showing innings break screen for 3 seconds, start innings 2
         setTimeout(async () => {
           // Create empty innings 2 with swapped batting team
           const innings2BattingTeam = isP1BattingInnings1 
             ? (currentMatch.player2?.uid || '')
             : currentMatch.player1.uid;

           const freshInnings2: InningsState = {
             battingTeam: innings2BattingTeam,
             score: 0,
             wickets: 0,
             overs: 0,
             balls: 0,
             ballLog: [],
             currentBall: {}
           };

           await update(ref(rtdb, `matches/${currentMatchId}`), {
             innings2: freshInnings2,
             status: 'batting',
             actions: null,
             lastUpdated: Date.now()
           });
         }, 4000); // 4 second innings break screen
       }, 1500);
     } else {
       // Normal ball or match finished — show result then update
       setTimeout(async () => {
         await update(ref(rtdb, `matches/${currentMatchId}`), dbUpdate);
       }, 1500);
     }
  };

  const submitAction = useCallback(async (action: BallAction) => {
    if (!matchId || !userRef.current || !matchStateRef.current) return;
    const currentUser = userRef.current;
    const currentMatch = matchStateRef.current;
    
    // Don't allow actions during innings break
    if (currentMatch.status === 'innings_break') return;
    
    setMyAction(action);
    setBallReady(false);
    
    const isPlayer1 = currentMatch.player1.uid === currentUser.uid;
    const key = isPlayer1 ? 'p1' : 'p2';
    
    await update(ref(rtdb, `matches/${matchId}/actions`), {
      [key]: action
    });
  }, [matchId, setMyAction]);

  return { submitAction, ballReady };
};
