import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useMatch } from '../../hooks/useMatch';
import { leaveMatch, setupPresence, subscribeToPresence } from '../../services/matchService';
import { updateMatchStats } from '../../services/statsService';
import { getMaxWickets } from '../../services/aiLogic';
import Scoreboard from './Scoreboard';
import PitchArena from './PitchArena';
import BattingUI from './BattingUI';
import BowlingUI from './BowlingUI';
import Commentary from './Commentary';
import LeaveConfirmDialog from './LeaveConfirmDialog';
import BallResultOverlay from './BallResultOverlay';

export default function Game() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, matchState } = useGameStore();
  const { submitAction, submitBowlType, ballReady } = useMatch(matchId || null);
  const [opponentOnline, setOpponentOnline] = useState(true);
  const statsUpdatedRef = useRef(false);

  // Over change tracking
  const [showOverChange, setShowOverChange] = useState(false);
  const prevOversRef = useRef<number | null>(null);

  // Update stats when match finishes
  useEffect(() => {
    if (matchState?.status === 'finished' && user && !statsUpdatedRef.current) {
      statsUpdatedRef.current = true;
      updateMatchStats(matchState, user.uid).catch(err => {
        console.error('Failed to update match stats:', err);
      });
    }
  }, [matchState?.status, user]);

  // Setup presence & subscribe to opponent's presence
  useEffect(() => {
    if (!matchId || !user || !matchState) return;

    if (matchState.isBotMatch) {
      setOpponentOnline(true);
      localStorage.setItem('activeMatchId', matchId);
      return;
    }

    const isP1 = matchState.player1.uid === user.uid;
    const opponentUid = isP1 ? matchState.player2?.uid : matchState.player1.uid;

    const cleanupPresence = setupPresence(matchId, user.uid);

    let unsubPresence: (() => void) | undefined;
    if (opponentUid) {
      unsubPresence = subscribeToPresence(matchId, opponentUid, (isOnline) => {
        setOpponentOnline(isOnline);
      });
    }

    localStorage.setItem('activeMatchId', matchId);

    return () => {
      cleanupPresence();
      unsubPresence?.();
    };
  }, [matchId, user?.uid, matchState?.isBotMatch, matchState?.player1?.uid, matchState?.player2?.uid]);

  // Auto-forfeit if opponent disconnects for 90s (PvP only)
  useEffect(() => {
    if (matchState?.isBotMatch || opponentOnline || !matchId || !user || !matchState) return;
    if (matchState.status === 'finished') return;

    const timer = setTimeout(() => {
      const opponentUid = matchState.player1.uid === user.uid
        ? matchState.player2?.uid
        : matchState.player1.uid;
      if (opponentUid) leaveMatch(matchId, opponentUid);
    }, 90000);

    return () => clearTimeout(timer);
  }, [opponentOnline, matchId, user, matchState?.status, matchState?.isBotMatch]);

  // Before unload warning
  useEffect(() => {
    if (!matchId || !user) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [matchId, user]);

  const handleLeaveMatch = async () => {
    if (!matchId || !user) return;
    await leaveMatch(matchId, user.uid);
    localStorage.removeItem('activeMatchId');
    navigate('/');
  };

  // Check for over change
  useEffect(() => {
    const innings = matchState?.innings2 || matchState?.innings1;
    if (!innings) return;

    const currentOvers = innings.overs;

    if (prevOversRef.current !== null && currentOvers > prevOversRef.current) {
      setShowOverChange(true);
      const timer = setTimeout(() => {
        setShowOverChange(false);
      }, 3500);

      return () => clearTimeout(timer);
    }

    prevOversRef.current = currentOvers;
  }, [matchState?.innings1?.overs, matchState?.innings2?.overs]);

  if (!matchState || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#070c08] text-[#f5efe6]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#ffb800] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-display text-2xl uppercase tracking-wider text-[#ffb800]">Initializing Stadium Pitch...</p>
        </div>
      </div>
    );
  }

  // ========== MATCH FINISHED SCREEN ==========
  if (matchState.status === 'finished') {
    return <MatchFinishedScreen matchState={matchState} user={user} navigate={navigate} />;
  }

  // ========== INNINGS BREAK / SUPER OVER BREAK ==========
  if (matchState.status === 'innings_break' || matchState.status === 'super_over_break') {
    return <InningsBreakScreen matchState={matchState} user={user} />;
  }

  // ========== ACTIVE GAME ARENA ==========
  const isP1 = matchState.player1.uid === user.uid;
  const p1BattedFirst = matchState.player1.role === 'bat';
  const isInnings2 = !!matchState.innings2;

  const amIBatting = isInnings2
    ? (isP1 ? !p1BattedFirst : p1BattedFirst)
    : (isP1 ? p1BattedFirst : !p1BattedFirst);

  const inningsLabel = isInnings2 ? '2ND INNINGS' : '1ST INNINGS';
  const inningsKey = isInnings2 ? 'innings2' : 'innings1';
  const currentInnings = matchState[inningsKey];
  const currentBallsInOver = currentInnings?.balls || 0;

  let bouncersBowledInOver = 0;
  if (currentInnings?.ballLog && currentBallsInOver > 0) {
    const ballsThisOver = currentInnings.ballLog.slice(-currentBallsInOver);
    bouncersBowledInOver = ballsThisOver.filter((b) => b.length === 'Bouncer').length;
  }

  return (
    <div className="h-screen flex flex-col bg-[#070c08] text-[#f5efe6] overflow-hidden">
      
      {/* Top Stadium Status Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 bg-[#09120c] border-b border-[#f5efe6]/10 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${matchState.isBotMatch ? 'bg-[#ffb800]' : (opponentOnline ? 'bg-[#4ade80]' : 'bg-[#ff2a36] animate-pulse')}`} />
            <span className="text-[11px] font-sports font-bold uppercase tracking-wider text-[#c8bead]">
              {matchState.isBotMatch ? `AI BOT [${matchState.botDifficulty?.toUpperCase() || 'PRO'}]` : (opponentOnline ? 'OPPONENT LIVE' : 'OPPONENT DISCONNECTED')}
            </span>
          </div>

          <span className="text-[10px] bg-[#122417] px-2.5 py-0.5 rounded-full text-[#ffb800] font-sports font-bold border border-[#ffb800]/25">
            {inningsLabel}
          </span>
          <span className="hidden sm:inline text-[10px] text-[#8c8273] font-mono">
            VENUE: {matchState.stadium || "Lord's"}
          </span>
        </div>

        <LeaveConfirmDialog onConfirm={handleLeaveMatch} />
      </div>

      {/* Broadcast Scoreboard (Sticky Top) */}
      <div className="flex-shrink-0">
        <Scoreboard matchState={matchState} />
      </div>

      {/* Main Pitch Field & Action Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Field Area */}
        <div
          className="relative flex flex-col overflow-hidden flex-1 lg:flex-[3]"
          style={{
            background: 'linear-gradient(to bottom, #09170e 0%, #0d2215 50%, #112d1b 100%)',
          }}
        >
          {/* Interactive Multi-View Pitch Arena with Delivery Sequence & 3D Flight Physics */}
          <PitchArena matchState={matchState} />

          {/* Result Pop Overlay */}
          <BallResultOverlay matchState={matchState} />

          {/* Over Transition Overlay */}
          {showOverChange && amIBatting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md" style={{ zIndex: 'var(--z-overlay)' as string }}>
              <div className="bg-[#0b140e] border border-[#ffb800]/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl max-w-sm w-full mx-4 animate-[scale-in_0.3s_ease-out]">
                <div className="text-4xl mb-2" aria-hidden="true">🏏</div>
                <h2 className="font-display text-4xl font-bold text-[#ffb800] uppercase tracking-wide leading-none mb-1">
                  OVER COMPLETE
                </h2>
                <p className="text-[#c8bead] text-xs font-mono mb-4">
                  Bowler ends over • Strike changes
                </p>
                <div className="w-8 h-8 rounded-full border-2 border-[#ffb800] border-t-transparent animate-spin mx-auto" />
              </div>
            </div>
          )}

          {/* Controls at bottom of field — MOBILE ONLY */}
          <div className="lg:hidden w-full max-w-xl mx-auto px-2 sm:px-4 pb-2 sm:pb-4 mt-auto pt-1 relative z-20">
            {amIBatting ? (
              <BattingUI onSubmit={submitAction} ballReady={ballReady} currentBallInOver={currentBallsInOver} currentBowlType={currentInnings?.currentBowlType} />
            ) : (
              <BowlingUI onSubmit={submitAction} ballReady={ballReady} bouncersBowledInOver={bouncersBowledInOver} currentBallInOver={currentBallsInOver} currentBowlType={currentInnings?.currentBowlType} onSelectBowlType={submitBowlType} />
            )}
          </div>

          {/* Commentary Bar — MOBILE */}
          <div className="lg:hidden flex-shrink-0">
            <Commentary matchState={matchState} />
          </div>
        </div>

        {/* Right Sidebar — DESKTOP ONLY */}
        <div className="hidden lg:flex lg:flex-col lg:flex-[2] lg:max-w-[420px] lg:min-w-[340px] border-l border-[#f5efe6]/10 bg-gradient-to-b from-[#09120c] to-[#070c08]">
          <div className="flex-1 overflow-y-auto p-4 xl:p-5">
            <div className="mb-3">
              <span className="text-[10px] font-sports font-bold text-[#ffb800] uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                {amIBatting ? 'TACTICAL BATTING CONTROLS' : 'TACTICAL BOWLING CONTROLS'}
              </span>
            </div>
            {amIBatting ? (
              <BattingUI onSubmit={submitAction} ballReady={ballReady} currentBallInOver={currentBallsInOver} currentBowlType={currentInnings?.currentBowlType} />
            ) : (
              <BowlingUI onSubmit={submitAction} ballReady={ballReady} bouncersBowledInOver={bouncersBowledInOver} currentBallInOver={currentBallsInOver} currentBowlType={currentInnings?.currentBowlType} onSelectBowlType={submitBowlType} />
            )}
          </div>

          {/* Commentary Panel */}
          <div className="flex-shrink-0 border-t border-[#f5efe6]/10">
            <Commentary matchState={matchState} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Match Finished Screen ──────────────────────────────────────────────────

function MatchFinishedScreen({
  matchState,
  user,
  navigate,
}: {
  matchState: import('../../types/cricket').MatchState;
  user: import('../../types/cricket').UserProfile;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const isP1 = matchState.player1.uid === user.uid;
  const opponentName = isP1 ? matchState.player2?.displayName : matchState.player1.displayName;
  const iAmWinner = matchState.winner === user.uid;
  const opponentAbandoned = matchState.abandonedBy && matchState.abandonedBy !== user.uid;
  const iAbandoned = matchState.abandonedBy === user.uid;
  const isDraw = !matchState.winner && !matchState.abandonedBy;

  const i1Score = matchState.innings1?.score ?? 0;
  const i1Wickets = matchState.innings1?.wickets ?? 0;
  const i2Score = matchState.innings2?.score ?? 0;
  const i2Wickets = matchState.innings2?.wickets ?? 0;
  const maxOvers = matchState.format === 'T20' ? 20 : matchState.format === 'ODI' ? 50 : matchState.customOvers;

  const p1BattedFirst = matchState.player1.role === 'bat';
  const firstBatterName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
  const secondBatterName = p1BattedFirst ? matchState.player2?.displayName : matchState.player1.displayName;

  let marginText = '';
  if (!matchState.abandonedBy && matchState.winner) {
    const winnerBattedSecond = matchState.winner === matchState.innings2?.battingTeam;
    if (winnerBattedSecond) {
      const maxWickets = getMaxWickets(maxOvers);
      const wicketsLeft = maxWickets - i2Wickets;
      marginText = `Won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
    } else {
      const runDiff = i1Score - i2Score;
      marginText = `Won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
    }
  }

  const i1Fours = matchState.innings1?.boundaryCount?.fours ?? 0;
  const i1Sixes = matchState.innings1?.boundaryCount?.sixes ?? 0;
  const i2Fours = matchState.innings2?.boundaryCount?.fours ?? 0;
  const i2Sixes = matchState.innings2?.boundaryCount?.sixes ?? 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070c08] text-[#f5efe6] p-4 sm:p-6 overflow-y-auto relative">
      <div className="w-full max-w-md bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-6 sm:p-8 border border-[#f5efe6]/10 shadow-[0_24px_60px_rgba(0,0,0,0.85)] text-center relative z-10">
        
        {opponentAbandoned ? (
          <>
            <div className="text-6xl mb-3" aria-hidden="true">🏆</div>
            <h1 className="font-display text-5xl font-bold uppercase text-[#ffb800] leading-none mb-1">
              YOU WIN!
            </h1>
            <p className="text-sm text-[#c8bead]">{opponentName} forfeited the match</p>
            <p className="text-xs font-mono text-[#8c8273] uppercase tracking-wider mt-1 mb-6">Victory by default</p>
          </>
        ) : iAbandoned ? (
          <>
            <div className="text-6xl mb-3" aria-hidden="true">⚠️</div>
            <h1 className="font-display text-5xl font-bold uppercase text-[#ff2a36] leading-none mb-1">
              MATCH FORFEITED
            </h1>
            <p className="text-sm text-[#c8bead] mb-6">You left the match. {opponentName} awarded victory.</p>
          </>
        ) : isDraw ? (
          <>
            <div className="text-6xl mb-3" aria-hidden="true">🤝</div>
            <h1 className="font-display text-5xl font-bold uppercase text-[#ffb800] leading-none mb-1">
              MATCH TIED!
            </h1>
            <p className="text-sm text-[#c8bead] mb-6">Both sides finished dead level on {i1Score} runs.</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-3" aria-hidden="true">{iAmWinner ? '🏆' : '🏏'}</div>
            <h1 className={`font-display text-5xl sm:text-6xl font-bold uppercase leading-none mb-1 ${iAmWinner ? 'text-[#ffb800]' : 'text-[#c8bead]'}`}>
              {iAmWinner ? 'MATCH VICTORY!' : 'MATCH CONCLUDED'}
            </h1>
            <p className="text-base text-[#4ade80] font-sports font-bold mb-6">{marginText}</p>
          </>
        )}

        {/* Score Summary Card */}
        {matchState.innings1 && (
          <div className="bg-[#070c08] rounded-xl p-4 mb-6 border border-[#f5efe6]/10 text-left">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#f5efe6]/10">
              <span className="text-[10px] font-sports font-bold text-[#ffb800] uppercase tracking-wider">
                OFFICIAL SCORECARD
              </span>
              <span className="text-[10px] font-mono text-[#8c8273]">
                {matchState.isSuperOver ? 'SUPER OVER' : `${maxOvers} OVERS`}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-2.5 bg-[#122417] rounded-lg border border-[#f5efe6]/05">
                <div>
                  <span className="font-bold text-sm text-[#f5efe6]">{firstBatterName}</span>
                  <div className="text-[10px] text-[#8c8273] font-mono mt-0.5">4s: {i1Fours} • 6s: {i1Sixes}</div>
                </div>
                <span className="font-sports text-2xl font-black text-[#ffb800] tabular-nums">
                  {i1Score}<span className="text-xs text-[#8c8273]">/{i1Wickets}</span>
                </span>
              </div>

              {matchState.innings2 && (
                <div className="flex justify-between items-center p-2.5 bg-[#122417] rounded-lg border border-[#f5efe6]/05">
                  <div>
                    <span className="font-bold text-sm text-[#f5efe6]">{secondBatterName}</span>
                    <div className="text-[10px] text-[#8c8273] font-mono mt-0.5">4s: {i2Fours} • 6s: {i2Sixes}</div>
                  </div>
                  <span className="font-sports text-2xl font-black text-[#ffb800] tabular-nums">
                    {i2Score}<span className="text-xs text-[#8c8273]">/{i2Wickets}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => { localStorage.removeItem('activeMatchId'); navigate('/'); }}
          className="w-full py-3.5 bg-gradient-to-r from-[#1b4d2e] to-[#24623e] hover:from-[#24623e] hover:to-[#2e7d4c] rounded-xl font-display text-2xl uppercase tracking-wider font-bold transition cursor-pointer border border-[#4ade80]/40 text-white shadow-lg"
        >
          Return to Pavilion
        </button>
      </div>
    </div>
  );
}

// ─── Innings Break Screen ───────────────────────────────────────────────────

function InningsBreakScreen({
  matchState,
  user,
}: {
  matchState: import('../../types/cricket').MatchState;
  user: import('../../types/cricket').UserProfile;
}) {
  const [timeLeft, setTimeLeft] = useState(6);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const target = (matchState.innings1?.score ?? 0) + 1;
  const maxOvers = matchState.format === 'T20' ? 20 : matchState.format === 'ODI' ? 50 : matchState.customOvers;
  const maxWickets = getMaxWickets(maxOvers);

  const isP1 = matchState.player1.uid === user.uid;
  const p1BattedFirst = matchState.player1.role === 'bat';
  const iWillBatNext = (isP1 && !p1BattedFirst) || (!isP1 && p1BattedFirst);

  const firstBatterName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
  const firstBatterScore = matchState.innings1?.score ?? 0;
  const firstBatterWickets = matchState.innings1?.wickets ?? 0;

  const isSuperOverBreak = matchState.status === 'super_over_break' || (matchState.isSuperOver && !!matchState.innings2);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#070c08] text-[#f5efe6] p-4 sm:p-6 relative">
      <div className="w-full max-w-md bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-6 sm:p-8 border border-[#f5efe6]/10 text-center shadow-2xl relative z-10">
        
        <div className="text-6xl mb-3" aria-hidden="true">🏏</div>
        <h1 className={`font-display text-5xl font-bold uppercase leading-none mb-2 ${isSuperOverBreak ? 'text-[#ff2a36]' : 'text-[#ffb800]'}`}>
          {isSuperOverBreak ? 'SUPER OVER DECIDER!' : 'INNINGS BREAK'}
        </h1>

        {!isSuperOverBreak && (
          <div className="bg-[#070c08] rounded-xl p-4 mb-4 border border-[#f5efe6]/10">
            <p className="text-[#8c8273] text-[10px] font-sports uppercase tracking-wider mb-1">1st Innings Closed</p>
            <p className="font-bold text-base text-[#f5efe6] mb-1">{firstBatterName}</p>
            <p className="font-sports text-4xl font-black text-[#ffb800] leading-none">
              {firstBatterScore}<span className="text-xl text-[#8c8273]">/{firstBatterWickets}</span>
            </p>
            <p className="text-xs text-[#8c8273] font-mono mt-1">
              ({matchState.innings1?.overs}.{matchState.innings1?.balls} Overs)
            </p>
          </div>
        )}

        {!isSuperOverBreak && (
          <div className="bg-[#2a1e0b] border border-[#ffb800]/40 rounded-xl p-3.5 mb-5 text-center">
            <p className="font-sports text-xl font-bold text-[#ffb800] leading-none mb-1">
              🎯 TARGET: {target} RUNS
            </p>
            <p className="text-xs text-[#c8bead]">
              in {maxOvers} overs ({maxWickets} wickets in hand)
            </p>
          </div>
        )}

        <p className="text-sm font-semibold text-[#f5efe6] mb-4">
          {isSuperOverBreak
            ? "Tie breaker: 1 Over each for match glory!"
            : (iWillBatNext
              ? "You're batting next — pads on to chase the target! 🏏"
              : "You're bowling next — defend the total on the pitch! 🎯")}
        </p>

        <p className="text-xs text-[#ffb800] font-sports font-bold uppercase tracking-wider">
          Resuming match in {timeLeft} seconds...
        </p>
      </div>
    </div>
  );
}
