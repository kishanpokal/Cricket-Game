import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useMatch } from '../../hooks/useMatch';
import { leaveMatch, setupPresence, subscribeToPresence } from '../../services/matchService';
import { updateMatchStats } from '../../services/statsService';
import { getMaxWickets } from '../../services/aiLogic';
import Scoreboard from './Scoreboard';
import BattingUI from './BattingUI';
import BowlingUI from './BowlingUI';
import Commentary from './Commentary';
import LeaveConfirmDialog from './LeaveConfirmDialog';
import BallResultOverlay from './BallResultOverlay';

export default function Game() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, matchState } = useGameStore();
  const { submitAction, ballReady } = useMatch(matchId || null);
  const [opponentOnline, setOpponentOnline] = useState(true);
  const statsUpdatedRef = useRef(false);

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
  }, [matchId, user?.uid, matchState?.player1?.uid, matchState?.player2?.uid]);

  // Auto-forfeit if opponent disconnects for 90s
  useEffect(() => {
    if (opponentOnline || !matchId || !user || !matchState) return;
    if (matchState.status === 'finished') return;

    const timer = setTimeout(() => {
      const opponentUid = matchState.player1.uid === user.uid
        ? matchState.player2?.uid
        : matchState.player1.uid;
      if (opponentUid) leaveMatch(matchId, opponentUid);
    }, 90000);

    return () => clearTimeout(timer);
  }, [opponentOnline, matchId, user, matchState?.status]);

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

  if (!matchState || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-night-sky)] text-white">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-green-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Loading Game...</p>
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

  // ========== ACTIVE GAME SCREEN ==========
  const isP1 = matchState.player1.uid === user.uid;
  const p1BattedFirst = matchState.player1.role === 'bat';
  const isInnings2 = !!matchState.innings2;

  const amIBatting = isInnings2
    ? (isP1 ? !p1BattedFirst : p1BattedFirst)
    : (isP1 ? p1BattedFirst : !p1BattedFirst);

  const inningsLabel = isInnings2 ? '2nd Innings' : '1st Innings';
  const inningsKey = isInnings2 ? 'innings2' : 'innings1';
  const currentInnings = matchState[inningsKey];
  const currentBallsInOver = currentInnings?.balls || 0;

  let bouncersBowledInOver = 0;
  if (currentInnings?.ballLog && currentBallsInOver > 0) {
    const ballsThisOver = currentInnings.ballLog.slice(-currentBallsInOver);
    bouncersBowledInOver = ballsThisOver.filter((b) => b.length === 'Bouncer').length;
  }

  return (
    <div
      className="h-screen flex flex-col bg-[var(--color-night-sky)] text-white overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr auto',
        gridTemplateAreas: `"topbar" "scoreboard" "field" "commentary"`,
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-950 border-b border-gray-800"
        style={{ gridArea: 'topbar' }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-2 h-2 rounded-full ${opponentOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-[10px] sm:text-xs text-gray-400">
            {opponentOnline ? 'Opponent online' : 'Opponent offline'}
          </span>
          <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 font-semibold">{inningsLabel}</span>
        </div>
        <LeaveConfirmDialog onConfirm={handleLeaveMatch} />
      </div>

      {/* Scoreboard — sticky top */}
      <div style={{ gridArea: 'scoreboard' }}>
        <Scoreboard matchState={matchState} />
      </div>

      {/* Field area */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          gridArea: 'field',
          background: 'linear-gradient(to bottom, var(--color-pitch-green-dark), var(--color-pitch-green))',
        }}
      >
        {/* Ambient grass sway */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ animation: 'grass-sway 4s ease-in-out infinite' }}
        />

        {/* Cloud shadow drift */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            background: 'radial-gradient(ellipse 300px 100px at center, rgba(0,0,0,0.4), transparent)',
            animation: 'cloud-drift 20s linear infinite',
          }}
        />

        {/* Stadium gradient */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, transparent 20%, #000 120%)' }}
        />

        {/* Pitch strip */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-[200px] sm:w-48 sm:h-[300px] bg-[var(--color-soil)]/30 rounded-xl border-2 border-white/20 pointer-events-none">
          {/* Stump marks */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {[0, 1, 2].map(i => <div key={i} className="w-0.5 h-3 bg-white/40 rounded" />)}
          </div>
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-1">
            {[0, 1, 2].map(i => <div key={i} className="w-0.5 h-3 bg-white/40 rounded" />)}
          </div>
        </div>

        {/* Ball result overlay */}
        <BallResultOverlay matchState={matchState} />

        {/* Opponent disconnected warning */}
        {!opponentOnline && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40" style={{ zIndex: 'var(--z-overlay)' as string }}>
            <div className="bg-gray-800 border border-yellow-600/50 rounded-2xl p-5 text-center shadow-2xl animate-[scale-in_0.2s_ease-out]">
              <div className="text-3xl mb-2" aria-hidden="true">⚠️</div>
              <p className="text-yellow-400 font-bold text-sm sm:text-base">Opponent disconnected</p>
              <p className="text-gray-400 text-xs mt-1">Waiting for reconnection...</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Auto-forfeit in 90s</p>
            </div>
          </div>
        )}

        {/* Controls at bottom of field */}
        <div className="w-full max-w-xl mx-auto px-2 sm:px-4 pb-2 sm:pb-4 mt-auto pt-2 relative" style={{ zIndex: 'var(--z-ui)' as string, maxHeight: '260px', overflowY: 'auto' }}>
          {amIBatting ? (
            <BattingUI onSubmit={submitAction} ballReady={ballReady} />
          ) : (
            <BowlingUI onSubmit={submitAction} ballReady={ballReady} bouncersBowledInOver={bouncersBowledInOver} />
          )}
        </div>
      </div>

      {/* Commentary */}
      <div style={{ gridArea: 'commentary' }}>
        <Commentary matchState={matchState} />
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

  // Boundary counts
  const i1Fours = matchState.innings1?.boundaryCount?.fours ?? 0;
  const i1Sixes = matchState.innings1?.boundaryCount?.sixes ?? 0;
  const i2Fours = matchState.innings2?.boundaryCount?.fours ?? 0;
  const i2Sixes = matchState.innings2?.boundaryCount?.sixes ?? 0;

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-night-sky)] text-white p-4 sm:p-6 overflow-y-auto">
      {opponentAbandoned ? (
        <>
          <div className="text-5xl sm:text-6xl mb-4 animate-[scale-in_0.5s_ease-out]" aria-hidden="true">🏆</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-green-400">You Win!</h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-1">{opponentName} left the match</p>
          <p className="text-gray-500 mb-6">Victory by forfeit</p>
        </>
      ) : iAbandoned ? (
        <>
          <div className="text-5xl sm:text-6xl mb-4" aria-hidden="true">😞</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-red-400">Match Forfeited</h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-6">You left the match. {opponentName} wins.</p>
        </>
      ) : isDraw ? (
        <>
          <div className="text-5xl sm:text-6xl mb-4" aria-hidden="true">🤝</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-yellow-400">Match Tied!</h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-6">Both teams scored {i1Score} runs</p>
        </>
      ) : (
        <>
          <div className="text-5xl sm:text-6xl mb-4 animate-[scale-in_0.5s_ease-out]" aria-hidden="true">{iAmWinner ? '🏆' : '😢'}</div>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-2 ${iAmWinner ? 'text-green-500' : 'text-red-400'}`}>
            {iAmWinner ? 'You Win!' : 'You Lost!'}
          </h1>
          <p className="text-base sm:text-lg text-gray-300 mb-4">{marginText}</p>
        </>
      )}

      {/* Score summary card */}
      {matchState.innings1 && (
        <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 mb-6 w-full max-w-md border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Match Summary</span>
            <span className="text-xs text-gray-500">{matchState.isSuperOver ? 'SUPER OVER' : `${maxOvers} overs`}</span>
          </div>

          {matchState.isSuperOver && matchState.mainInnings1 && (
            <div className="mb-3 pb-3 border-b border-gray-700">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Main Match (Tied)</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{matchState.mainInnings1.battingTeam === matchState.player1.uid ? matchState.player1.displayName : matchState.player2?.displayName}</span>
                  <span>{matchState.mainInnings1.score}/{matchState.mainInnings1.wickets}</span>
                </div>
                {matchState.mainInnings2 && (
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{matchState.mainInnings2.battingTeam === matchState.player1.uid ? matchState.player1.displayName : matchState.player2?.displayName}</span>
                    <span>{matchState.mainInnings2.score}/{matchState.mainInnings2.wickets}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {matchState.isSuperOver && <p className="text-[10px] text-yellow-500 uppercase tracking-widest font-bold">Super Over Score</p>}
            <div className="flex justify-between items-center p-3 bg-gray-900 rounded-xl">
              <div>
                <span className="font-semibold text-sm">{firstBatterName}</span>
                <div className="text-[10px] text-gray-500 mt-0.5">4s: {i1Fours} | 6s: {i1Sixes}</div>
              </div>
              <span className="text-xl sm:text-2xl font-black">{i1Score}<span className="text-gray-500 text-base">/{i1Wickets}</span></span>
            </div>
            {matchState.innings2 && (
              <div className="flex justify-between items-center p-3 bg-gray-900 rounded-xl">
                <div>
                  <span className="font-semibold text-sm">{secondBatterName}</span>
                  <div className="text-[10px] text-gray-500 mt-0.5">4s: {i2Fours} | 6s: {i2Sixes}</div>
                </div>
                <span className="text-xl sm:text-2xl font-black">{i2Score}<span className="text-gray-500 text-base">/{i2Wickets}</span></span>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => { localStorage.removeItem('activeMatchId'); navigate('/'); }}
        className="px-6 sm:px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-base sm:text-lg transition cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
      >
        Return to Lobby
      </button>
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
    <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-night-sky)] text-white p-4 sm:p-6">
      <div className="text-5xl sm:text-6xl mb-4" style={{ animation: 'pulse 2s infinite' }} aria-hidden="true">🏏</div>
      <h1 className={`text-3xl sm:text-4xl font-black mb-2 ${isSuperOverBreak ? 'text-red-500' : 'text-yellow-400'}`}>
        {isSuperOverBreak ? 'SUPER OVER!' : 'Innings Break'}
      </h1>

      {isSuperOverBreak && (
        <p className="text-gray-300 mb-4 text-center animate-pulse text-sm sm:text-base">
          The match is tied! We are going to a Super Over.
        </p>
      )}

      {!isSuperOverBreak && (
        <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 mb-4 w-full max-w-md border border-gray-700 text-center">
          <p className="text-gray-400 mb-1 text-xs sm:text-sm">1st Innings</p>
          <p className="text-xl sm:text-2xl font-bold mb-0.5">{firstBatterName}</p>
          <p className="text-4xl sm:text-5xl font-black">
            {firstBatterScore}<span className="text-xl sm:text-2xl text-gray-400">/{firstBatterWickets}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ({matchState.innings1?.overs}.{matchState.innings1?.balls} overs)
          </p>
        </div>
      )}

      {!isSuperOverBreak && (
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-3 sm:p-4 mb-4 text-center w-full max-w-md">
          <p className="text-yellow-500 font-bold text-base sm:text-lg mb-0.5">🎯 Target: {target} runs</p>
          <p className="text-gray-400 text-xs sm:text-sm">in {maxOvers} overs ({maxWickets} wickets in hand)</p>
        </div>
      )}

      <p className="text-sm sm:text-lg text-gray-300 animate-pulse text-center">
        {isSuperOverBreak
          ? "Get ready for the ultimate showdown! ⚔️"
          : (iWillBatNext
            ? "You're batting next — get ready to chase! 🏏"
            : "You're bowling next — defend the target! 🎯")}
      </p>

      <p className="text-xs text-gray-500 mt-3">
        {isSuperOverBreak ? 'Starting in 5 seconds...' : 'Starting in a few seconds...'}
      </p>
    </div>
  );
}
