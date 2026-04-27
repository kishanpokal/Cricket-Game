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

      const opKey = isPlayer1 ? 'p2' : 'p1';
      
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
             target: currentMatch.innings1 && !isInnings1 ? currentMatch.innings1.score + 1 : undefined,
             isFreeHit: currentInnings.isFreeHitNextBall
         }
     );

     // Update score
     const updatedInnings = { ...currentInnings };
     
     // Base runs
     updatedInnings.score += outcome.runs;
     if (outcome.isNoBall) {
       updatedInnings.score += 1; // Penalty run for No Ball
     }

     if (outcome.wicket) updatedInnings.wickets += 1;
     
     // Ball only counts if it's NOT a no ball
     if (!outcome.isNoBall) {
       updatedInnings.balls += 1;
       if (updatedInnings.balls === 6) {
           updatedInnings.overs += 1;
           updatedInnings.balls = 0;
       }
     }

     updatedInnings.isFreeHitNextBall = outcome.isNoBall;

     updatedInnings.ballLog = [...(currentInnings.ballLog || []), { ...outcome, ...batAction, ...bowlAction }];
     updatedInnings.currentBall = batAction;

     // Check innings end conditions
     const maxWickets = getMaxWickets(maxOvers);
     const allOut = updatedInnings.wickets >= maxWickets;
     const oversComplete = updatedInnings.overs >= maxOvers;
     const targetChased = !isInnings1 && currentMatch.innings1 && updatedInnings.score >= currentMatch.innings1.score + 1;

     let newStatus = currentMatch.status;
     let winner: string | null = null;
     let isSuperOverTriggered = false;

     if (isInnings1 && (allOut || oversComplete)) {
       // Innings 1 over → go to innings break
       newStatus = 'innings_break';
     }

     if (!isInnings1 && (allOut || oversComplete || targetChased)) {
       // Innings 2 over
       const innings1Score = currentMatch.innings1?.score ?? 0;
       const innings2Score = updatedInnings.score;
       
       if (targetChased) {
         // Batting team in innings 2 wins (chased target)
         winner = updatedInnings.battingTeam;
         newStatus = 'finished';
       } else if (innings2Score < innings1Score) {
         // Batting team in innings 1 wins (defended target)
         winner = currentMatch.innings1?.battingTeam || null;
         newStatus = 'finished';
       } else if (innings2Score === innings1Score) {
         // TIE! SUPER OVER!
         isSuperOverTriggered = true;
         newStatus = 'innings_break'; // Go to break to prepare for Super Over
       }
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

     if (isSuperOverTriggered) {
       dbUpdate.isSuperOver = true;
       // Move current innings to history so we don't lose the scoreboard stats for main match
       // If it's already a super over and they tie again, we just override.
       if (!currentMatch.isSuperOver) {
         dbUpdate.mainInnings1 = currentMatch.innings1;
         dbUpdate.mainInnings2 = updatedInnings;
       }
       dbUpdate.customOvers = 1; // Force max 1 over
     }

     // If innings break, auto-start innings 2 (or Super Over) after delay
     if (newStatus === 'innings_break') {
       // First, push the innings result
       setTimeout(async () => {
         await update(ref(rtdb, `matches/${currentMatchId}`), dbUpdate);
         
         // After showing innings break screen for 4 seconds, start next innings
         setTimeout(async () => {
           // For super over, the team that batted second will now bat first (swap again? Actually let's just make it same as innings 2 starting, so p2 or p1)
           // Standard logic: if it was normal innings break, innings2 batting team is whoever bowled in innings1.
           // If it's a super over triggered, we are moving from Innings 2 to Innings 1 of Super Over. So we need to reset innings1.
           
           if (isSuperOverTriggered) {
             // Start Super Over Innings 1
             // The team that batted second in main match usually bats first in super over.
             const superOverBattingTeam = updatedInnings.battingTeam;
             
             const freshInnings1: InningsState = {
               battingTeam: superOverBattingTeam,
               score: 0,
               wickets: 0,
               overs: 0,
               balls: 0,
               ballLog: [],
               currentBall: {}
             };

             await update(ref(rtdb, `matches/${currentMatchId}`), {
               innings1: freshInnings1,
               innings2: null, // clear innings 2 for super over
               status: 'batting',
               actions: null,
               lastUpdated: Date.now()
             });
           } else {
             // Normal Innings 2 Start
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
           }
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
