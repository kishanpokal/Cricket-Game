import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useGameStore } from '../store/useGameStore';
import {
  calculateBallOutcome,
  getMaxWickets,
  isPowerplayOver,
  isDeathOver,
  calculateRunRate,
} from '../services/aiLogic';
import { subscribeToMatch } from '../services/matchService';
import type { BallAction, MatchState, InningsState, ShotType, BowlType, Line, Length } from '../types/cricket';

/** Ball processing state machine */
type BallPhase = 'idle' | 'waiting_both' | 'processing' | 'result_shown';

export const useMatch = (matchId: string | null) => {
  const { user, matchState, setMatchState, setMyAction, setOpponentAction } = useGameStore();

  const [ballReady, setBallReady] = useState(true);
  const [ballPhase, setBallPhase] = useState<BallPhase>('idle');

  // Use refs for latest values in callbacks without re-subscribing
  const matchStateRef = useRef(matchState);
  const myActionRef = useRef<BallAction | null>(null);
  const userRef = useRef(user);
  const processingRef = useRef(false);

  // Debounce lock to prevent double-tap submissions
  const submitLockRef = useRef(false);

  // Single reset timeout ref — prevents competing resets
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { matchStateRef.current = matchState; }, [matchState]);
  useEffect(() => { userRef.current = user; }, [user]);

  // ─── Bulletproof UI Reset via totalBalls ───────────────────────────
  // Using totalBalls guarantees we reset the UI even if the client misses
  // the intermediate `actions: null` state due to network batching/disconnects.
  const prevTotalBallsRef = useRef(-1);
  useEffect(() => {
    if (!matchState) return;
    const currentTotalBalls = matchState.totalBalls ?? 0;

    // Initialize on first load without triggering reset
    if (prevTotalBallsRef.current === -1) {
      prevTotalBallsRef.current = currentTotalBalls;
      return;
    }

    if (currentTotalBalls > prevTotalBallsRef.current) {
      prevTotalBallsRef.current = currentTotalBalls;
      
      // Cancel any pending reset to prevent stacking
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      const isBattingPhase = matchState.status === 'batting';
      
      if (isBattingPhase) {
        // Delay reset by 1.5s to allow BallResultOverlay to show
        resetTimeoutRef.current = setTimeout(() => {
          myActionRef.current = null;
          setMyAction(null);
          processingRef.current = false;
          submitLockRef.current = false;
          setBallReady(true);
          setBallPhase('idle');
          resetTimeoutRef.current = null;
          console.log('[useMatch] UI Reset triggered by totalBalls increment');
        }, 1500);
      } else {
        // Immediate reset during breaks
        myActionRef.current = null;
        setMyAction(null);
        processingRef.current = false;
        submitLockRef.current = false;
        setBallReady(true);
        setBallPhase('idle');
      }
    }
  }, [matchState?.totalBalls, matchState?.status, setMyAction]);

  // Subscribe to match state
  useEffect(() => {
    if (!matchId) return;
    const unsubscribe = subscribeToMatch(matchId, (state) => {
      setMatchState(state);
    });
    return () => unsubscribe();
  }, [matchId, setMatchState]);
  // ─── Safety Watchdog: ensure innings break ALWAYS transitions ───────────────
  // If the processing player's setTimeout doesn't fire (e.g., tab backgrounded),
  // this watchdog on the OTHER player will handle it after 6 seconds.
  useEffect(() => {
    if (!matchId || !matchState) return;
    if (matchState.status !== 'innings_break' && matchState.status !== 'super_over_break') return;

    const safetyDelay = 6000; // 6s safety — processBall uses 4s for break, 5s for super over
    const safetyTimer = setTimeout(async () => {
      const currentStatus = matchStateRef.current?.status;
      if (currentStatus !== 'innings_break' && currentStatus !== 'super_over_break') return;

      console.log('[useMatch] Safety watchdog: innings break still active after 6s, forcing transition');
      const currentMatch = matchStateRef.current!;
      const isP1BattingInnings1 = currentMatch.player1.role === 'bat';
      const isSuperOver = currentMatch.status === 'super_over_break';

      try {
        if (isSuperOver) {
          const superOverBattingTeam = currentMatch.innings2?.battingTeam || currentMatch.innings1?.battingTeam || '';
          await update(ref(rtdb, `matches/${matchId}`), {
            innings1: {
              battingTeam: superOverBattingTeam,
              score: 0, wickets: 0, overs: 0, balls: 0,
              ballLog: [], currentBall: {},
              runRateByOver: [], boundaryCount: { fours: 0, sixes: 0 },
              dotBallStreak: 0, boundaryStreak: 0,
              partnerships: [{ runs: 0, balls: 0 }],
            },
            innings2: null,
            status: 'batting',
            actions: null,
            lastUpdated: Date.now(),
          });
        } else {
          const innings2BattingTeam = isP1BattingInnings1
            ? (currentMatch.player2?.uid || '')
            : currentMatch.player1.uid;
          await update(ref(rtdb, `matches/${matchId}`), {
            innings2: {
              battingTeam: innings2BattingTeam,
              score: 0, wickets: 0, overs: 0, balls: 0,
              ballLog: [], currentBall: {},
              runRateByOver: [], boundaryCount: { fours: 0, sixes: 0 },
              dotBallStreak: 0, boundaryStreak: 0,
              partnerships: [{ runs: 0, balls: 0 }],
            },
            status: 'batting',
            actions: null,
            lastUpdated: Date.now(),
          });
        }
        console.log('[useMatch] Safety watchdog: transition complete');
      } catch (err) {
        console.error('[useMatch] Safety watchdog: failed to transition:', err);
      }
    }, safetyDelay);

    return () => clearTimeout(safetyTimer);
  }, [matchId, matchState?.status]);

  // ─── Process Ball (stable function using only parameters, no closures) ──────
  const processBallRef = useRef(async (
    currentMatch: MatchState,
    currentMatchId: string,
    p1Action: BallAction,
    p2Action: BallAction
  ) => {
    try {
      if (!currentMatch) return;

      // ─── Determine batting roles ─────────────────────────────────────
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
          currentBall: batAction,
          runRateByOver: [],
          boundaryCount: { fours: 0, sixes: 0 },
          dotBallStreak: 0,
          boundaryStreak: 0,
          partnerships: [{ runs: 0, balls: 0 }],
        };
      }

      const maxOvers = currentMatch.format === 'T20' ? 20 : currentMatch.format === 'ODI' ? 50 : currentMatch.customOvers;

      // ─── Calculate outcome ─────────────────────────────────────────────
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
          isFreeHit: currentInnings.isFreeHitNextBall,
          totalBallsBowled: currentMatch.totalBalls ?? 0,
          totalOversBatted: currentInnings.overs,
          dotBallStreak: currentInnings.dotBallStreak ?? 0,
          boundaryStreak: currentInnings.boundaryStreak ?? 0,
          isPowerplay: isPowerplayOver(currentInnings.overs, currentMatch.format),
          isDeathOver: isDeathOver(currentInnings.overs, currentMatch.format, maxOvers),
          maxOvers,
        }
      );

      console.log('[useMatch] Ball outcome:', outcome);

      // ─── Update innings state ──────────────────────────────────────────
      const updatedInnings: InningsState = { ...currentInnings };

      // Score
      updatedInnings.score += outcome.runs;
      if (outcome.isNoBall) updatedInnings.score += 1;

      // Wicket
      if (outcome.wicket) {
        updatedInnings.wickets += 1;
        const partnerships = [...(updatedInnings.partnerships ?? [])];
        partnerships.push({ runs: 0, balls: 0 });
        updatedInnings.partnerships = partnerships;
      }

      // Ball counting: wides and no-balls don't count as legal deliveries
      if (!outcome.isNoBall && !outcome.isWide) {
        updatedInnings.balls += 1;

        // Update current partnership
        const partnerships = [...(updatedInnings.partnerships ?? [{ runs: 0, balls: 0 }])];
        const currentPartnership = { ...partnerships[partnerships.length - 1] };
        currentPartnership.balls += 1;
        currentPartnership.runs += outcome.runs;
        partnerships[partnerships.length - 1] = currentPartnership;
        updatedInnings.partnerships = partnerships;

        if (updatedInnings.balls === 6) {
          updatedInnings.overs += 1;
          updatedInnings.balls = 0;

          const rrByOver = [...(updatedInnings.runRateByOver ?? [])];
          rrByOver.push(calculateRunRate(updatedInnings.score, updatedInnings.overs, 0));
          updatedInnings.runRateByOver = rrByOver;
        }
      } else if (!outcome.isWide) {
        // No-ball: update partnership runs
        const partnerships = [...(updatedInnings.partnerships ?? [{ runs: 0, balls: 0 }])];
        const currentPartnership = { ...partnerships[partnerships.length - 1] };
        currentPartnership.runs += outcome.runs + 1;
        partnerships[partnerships.length - 1] = currentPartnership;
        updatedInnings.partnerships = partnerships;
      }

      // Free hit tracking
      updatedInnings.isFreeHitNextBall = outcome.isNoBall || false;

      // Boundary tracking
      const bc = { ...(updatedInnings.boundaryCount ?? { fours: 0, sixes: 0 }) };
      if (outcome.special === 'SIX') bc.sixes += 1;
      if (outcome.special === 'FOUR') bc.fours += 1;
      updatedInnings.boundaryCount = bc;

      // Streak tracking
      if (outcome.special === 'FOUR' || outcome.special === 'SIX') {
        updatedInnings.boundaryStreak = (updatedInnings.boundaryStreak ?? 0) + 1;
        updatedInnings.dotBallStreak = 0;
      } else if (outcome.special === 'DOT') {
        updatedInnings.dotBallStreak = (updatedInnings.dotBallStreak ?? 0) + 1;
        updatedInnings.boundaryStreak = 0;
      } else {
        updatedInnings.dotBallStreak = 0;
        updatedInnings.boundaryStreak = 0;
      }

      // Ball log — strip undefined values (Firebase rejects them)
      const logEntry = { ...outcome, ...batAction, ...bowlAction };
      const cleanEntry: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(logEntry)) {
        if (v !== undefined) cleanEntry[k] = v;
      }
      updatedInnings.ballLog = [...(currentInnings.ballLog || []), cleanEntry as (typeof updatedInnings.ballLog)[0]];
      // Strip undefined from currentBall
      const cleanBatAction: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(batAction)) {
        if (v !== undefined) cleanBatAction[k] = v;
      }
      updatedInnings.currentBall = cleanBatAction as typeof updatedInnings.currentBall;

      // ─── Check innings end conditions ──────────────────────────────────
      const maxWickets = getMaxWickets(maxOvers);
      const allOut = updatedInnings.wickets >= maxWickets;
      const oversComplete = updatedInnings.overs >= maxOvers;
      const targetChased = !isInnings1 && currentMatch.innings1 && updatedInnings.score >= currentMatch.innings1.score + 1;

      let newStatus = currentMatch.status;
      let winner: string | null = null;
      let isSuperOverTriggered = false;

      if (isInnings1 && (allOut || oversComplete)) {
        newStatus = 'innings_break';
      }

      if (!isInnings1 && (allOut || oversComplete || targetChased)) {
        const innings1Score = currentMatch.innings1?.score ?? 0;
        const innings2Score = updatedInnings.score;

        if (targetChased) {
          winner = updatedInnings.battingTeam;
          newStatus = 'finished';
        } else if (innings2Score < innings1Score) {
          winner = currentMatch.innings1?.battingTeam || null;
          newStatus = 'finished';
        } else if (innings2Score === innings1Score) {
          isSuperOverTriggered = true;
          newStatus = 'super_over_break';
        }
      }

      // ─── Build the database update ─────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbUpdate: Record<string, any> = {
        [inningsKey]: updatedInnings,
        status: newStatus,
        actions: null,
        lastUpdated: Date.now(),
        totalBalls: (currentMatch.totalBalls ?? 0) + 1,
      };

      if (winner) dbUpdate.winner = winner;

      if (isSuperOverTriggered) {
        dbUpdate.isSuperOver = true;
        if (!currentMatch.isSuperOver) {
          dbUpdate.mainInnings1 = currentMatch.innings1;
          dbUpdate.mainInnings2 = updatedInnings;
        }
        dbUpdate.customOvers = 1;
      }

      // ─── Bulletproof undefined stripper ─────────────────────────────────
      // Firebase RTDB will instantly reject the entire write if ANY nested
      // property is `undefined`. JSON stringify/parse safely removes them all.
      const cleanDbUpdate = JSON.parse(JSON.stringify(dbUpdate));

      // ─── Write update immediately (no delay) ───────────────────────────
      console.log('[useMatch] Writing DB update for', newStatus);
      try {
        await update(ref(rtdb, `matches/${currentMatchId}`), cleanDbUpdate);
        console.log('[useMatch] DB update successful');
      } catch (err) {
        console.error('[useMatch] Failed to update ball result:', err);
        throw err; // Re-throw so the caller can reset processingRef
      }

      // ─── Handle innings transitions after the primary update ───────────
      // BOTH players will attempt this transition. Firebase write is atomic,
      // so whichever player writes first wins; the second write is a no-op
      // (same data). This prevents stuck innings breaks if one browser is backgrounded.
      if (newStatus === 'innings_break' || newStatus === 'super_over_break') {
        const breakDuration = newStatus === 'super_over_break' ? 5000 : 4000;
        setTimeout(async () => {
          try {
            if (isSuperOverTriggered) {
              const superOverBattingTeam = updatedInnings.battingTeam;

              const freshInnings1: InningsState = {
                battingTeam: superOverBattingTeam,
                score: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                ballLog: [],
                currentBall: {},
                runRateByOver: [],
                boundaryCount: { fours: 0, sixes: 0 },
                dotBallStreak: 0,
                boundaryStreak: 0,
                partnerships: [{ runs: 0, balls: 0 }],
              };

              await update(ref(rtdb, `matches/${currentMatchId}`), {
                innings1: freshInnings1,
                innings2: null,
                status: 'batting',
                actions: null,
                lastUpdated: Date.now(),
              });
            } else {
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
                currentBall: {},
                runRateByOver: [],
                boundaryCount: { fours: 0, sixes: 0 },
                dotBallStreak: 0,
                boundaryStreak: 0,
                partnerships: [{ runs: 0, balls: 0 }],
              };

              await update(ref(rtdb, `matches/${currentMatchId}`), {
                innings2: freshInnings2,
                status: 'batting',
                actions: null,
                lastUpdated: Date.now(),
              });
            }
          } catch (err) {
            console.error('[useMatch] Failed to start next innings:', err);
          }
        }, breakDuration);
      }
    } catch (err) {
      console.error('[useMatch] CRITICAL: processBall failed:', err);
    }
  });

  // Reset ballReady when transitioning to active/batting
  useEffect(() => {
    if (matchState?.status === 'batting') {
      setBallReady(true);
      setMyAction(null);
      myActionRef.current = null;
      setOpponentAction(null);
      setBallPhase('idle');
    }
  }, [matchState?.status]);

  // Listen for actions — SINGLE listener
  useEffect(() => {
    if (!matchId || !user) return;

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const actionRef = ref(rtdb, `matches/${matchId}/actions`);

    const unsub = onValue(actionRef, (snapshot) => {
      const actions = snapshot.val();
      const currentMatchState = matchStateRef.current;

      // Clear any existing watchdog
      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = undefined;
      }

      if (!currentMatchState) {
        console.log('[useMatch] No matchState yet, skipping action processing');
        return;
      }

      // During non-batting phases, still allow state resets but don't process actions
      const isBattingPhase = currentMatchState.status === 'batting';

      const isPlayer1 = currentMatchState.player1.uid === user.uid;

      if (!actions) {
        // Actions cleared — opponent action is now definitely null.
        // UI reset for myAction and ballReady is handled by totalBalls listener.
        setOpponentAction(null);
        return;
      }

      // Don't process new actions during non-batting phases
      if (!isBattingPhase) return;

      // Update opponent action display
      const opKey = isPlayer1 ? 'p2' : 'p1';
      const opSubmitted = actions[opKey];
      if (opSubmitted && myActionRef.current) {
        setOpponentAction(opSubmitted);
      }

      // ─── Watchdog: auto-submit for missing player after 30s ──────────
      const hasP1 = !!actions.p1;
      const hasP2 = !!actions.p2;

      if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
        watchdog = setTimeout(() => {
          const missingKey = hasP1 ? 'p2' : 'p1';
          // Randomize the auto-submit so outcomes aren't always 0 runs
          const shotTypes: ShotType[] = ['Defensive', 'Drive', 'Cut', 'Pull', 'Sweep', 'Slog', 'Loft'];
          const bowlTypes: BowlType[] = ['Pace', 'Spin', 'Swing'];
          const lines: Line[] = ['Off Stump', 'Middle', 'Leg', 'Outside Off'];
          const lengths: Length[] = ['Full', 'Good Length', 'Short', 'Yorker'];
          
          const defaultAction: BallAction = hasP1
            ? { bowlType: bowlTypes[Math.floor(Math.random() * bowlTypes.length)], line: lines[Math.floor(Math.random() * lines.length)], length: lengths[Math.floor(Math.random() * lengths.length)] }
            : { shotType: shotTypes[Math.floor(Math.random() * shotTypes.length)], power: Math.floor(Math.random() * 61) + 40 };

          console.log('[useMatch] Watchdog: auto-submitting for', missingKey);
          update(ref(rtdb, `matches/${matchId}/actions`), JSON.parse(JSON.stringify({
            [missingKey]: defaultAction,
          }))).catch(console.error);
        }, 16000);
      }

      // ─── If both submitted, the LAST player to submit processes the ball ──────
      // This ensures the player whose browser is active handles the computation,
      // avoiding deadlocks if Player 1 is backgrounded or disconnected.
      if (hasP1 && hasP2 && !processingRef.current) {
        const p1Time = actions.p1.submitTime || 0;
        const p2Time = actions.p2.submitTime || 0;
        
        // If p1 submitted after p2 (or same time), p1 processes. Otherwise p2 processes.
        const p1IsLast = p1Time >= p2Time;
        const shouldProcess = isPlayer1 ? p1IsLast : !p1IsLast;

        if (shouldProcess) {
          processingRef.current = true;
          setBallPhase('processing');
          console.log(`[useMatch] Both actions received. ${isPlayer1 ? 'P1' : 'P2'} processing ball...`);
          console.log('[useMatch] P1 action:', actions.p1);
          console.log('[useMatch] P2 action:', actions.p2);

          // Call processBall and handle errors
          processBallRef.current(currentMatchState, matchId, actions.p1, actions.p2)
            .catch((err) => {
              console.error('[useMatch] processBall error:', err);
              processingRef.current = false;
              // Reset local UI so they can try again if it fails
              setBallReady(true);
              myActionRef.current = null;
              setMyAction(null);
              setBallPhase('idle');
            });
        }
      }
    });

    return () => {
      unsub();
      if (watchdog) clearTimeout(watchdog);
    };
  }, [matchId, user?.uid]);

  /**
   * Submit the player's action for the current ball.
   */
  const submitAction = useCallback(async (action: BallAction) => {
    if (!matchId || !userRef.current || !matchStateRef.current) return;
    if (submitLockRef.current) return;

    const currentUser = userRef.current;
    const currentMatch = matchStateRef.current;

    // Don't allow actions during breaks
    if (currentMatch.status === 'innings_break' || currentMatch.status === 'super_over_break') return;
    if (currentMatch.status === 'finished') return;

    submitLockRef.current = true;
    setTimeout(() => { submitLockRef.current = false; }, 300);

    myActionRef.current = action;
    setMyAction(action);
    setBallReady(false);
    setBallPhase('waiting_both');

    const isPlayer1 = currentMatch.player1.uid === currentUser.uid;
    const key = isPlayer1 ? 'p1' : 'p2';

    console.log(`[useMatch] Submitting action as ${key}:`, action);

    try {
      const actionWithTime = { ...action, submitTime: Date.now() };
      await update(ref(rtdb, `matches/${matchId}/actions`), JSON.parse(JSON.stringify({
        [key]: actionWithTime,
      })));
      console.log(`[useMatch] Action submitted successfully as ${key}`);
    } catch (err) {
      console.error('[useMatch] Failed to submit action:', err);
      submitLockRef.current = false;
      myActionRef.current = null;
      setBallReady(true);
      setBallPhase('idle');
    }
  }, [matchId, setMyAction]);

  return { submitAction, ballReady, ballPhase };
};
