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

  // Update stats when match finishes (including forfeits)
  useEffect(() => {
    if (matchState?.status === 'finished' && user && !statsUpdatedRef.current) {
      statsUpdatedRef.current = true;
      updateMatchStats(matchState, user.uid).catch(err => {
        console.error('Failed to update match stats:', err);
      });
    }
  }, [matchState?.status, user]);

  // Setup my presence & subscribe to opponent's presence
  useEffect(() => {
    if (!matchId || !user || !matchState) return;

    const isP1 = matchState.player1.uid === user.uid;
    const opponentUid = isP1 ? matchState.player2?.uid : matchState.player1.uid;

    // Register my presence
    const cleanupPresence = setupPresence(matchId, user.uid);

    // Watch opponent presence
    let unsubPresence: (() => void) | undefined;
    if (opponentUid) {
      unsubPresence = subscribeToPresence(matchId, opponentUid, (isOnline) => {
        setOpponentOnline(isOnline);
      });
    }

    // Save active match ID for reconnection
    localStorage.setItem('activeMatchId', matchId);

    return () => {
      cleanupPresence();
      unsubPresence?.();
    };
  }, [matchId, user?.uid, matchState?.player1?.uid, matchState?.player2?.uid]);

  // Auto-forfeit if opponent disconnects for more than 90 seconds
  useEffect(() => {
    if (opponentOnline || !matchId || !user || !matchState) return;
    if (matchState.status === 'finished') return;

    const timer = setTimeout(() => {
      const opponentUid = matchState.player1.uid === user.uid
        ? matchState.player2?.uid
        : matchState.player1.uid;

      if (opponentUid) {
        leaveMatch(matchId, opponentUid);
      }
    }, 90000); // Increased from 10s to 90s to allow reconnecting on refresh

    return () => clearTimeout(timer);
  }, [opponentOnline, matchId, user, matchState?.status]);

  // Handle browser close / tab close with beforeunload
  useEffect(() => {
    if (!matchId || !user) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [matchId, user]);

  const handleLeaveMatch = async () => {
    if (!matchId || !user) return;
    await leaveMatch(matchId, user.uid);
    localStorage.removeItem('activeMatchId');
    navigate('/');
  };

  if (!matchState || !user) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading Game...</div>;

  // ========== MATCH FINISHED SCREEN ==========
  if (matchState.status === 'finished') {
    const isP1 = matchState.player1.uid === user.uid;
    const opponentName = isP1 ? matchState.player2?.displayName : matchState.player1.displayName;
    const iAmWinner = matchState.winner === user.uid;
    const opponentAbandoned = matchState.abandonedBy && matchState.abandonedBy !== user.uid;
    const iAbandoned = matchState.abandonedBy === user.uid;
    const isDraw = !matchState.winner && !matchState.abandonedBy;

    // Score details for normal finish
    const i1Score = matchState.innings1?.score ?? 0;
    const i1Wickets = matchState.innings1?.wickets ?? 0;
    const i2Score = matchState.innings2?.score ?? 0;
    const i2Wickets = matchState.innings2?.wickets ?? 0;
    const maxOvers = matchState.format === 'T20' ? 20 : matchState.format === 'ODI' ? 50 : matchState.customOvers;

    // Figure out who batted first
    const p1BattedFirst = matchState.player1.role === 'bat';
    const firstBatterName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
    const secondBatterName = p1BattedFirst ? matchState.player2?.displayName : matchState.player1.displayName;

    // Win margin
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

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
        {opponentAbandoned ? (
          <>
            <div className="text-6xl mb-6">🏆</div>
            <h1 className="text-4xl font-bold mb-2 text-green-400">You Win!</h1>
            <p className="text-xl text-gray-400 mb-2">{opponentName} left the match</p>
            <p className="text-gray-500 mb-8">Victory by forfeit</p>
          </>
        ) : iAbandoned ? (
          <>
            <div className="text-6xl mb-6">😞</div>
            <h1 className="text-4xl font-bold mb-2 text-red-400">Match Forfeited</h1>
            <p className="text-xl text-gray-400 mb-8">You left the match. {opponentName} wins.</p>
          </>
        ) : isDraw ? (
          <>
            <div className="text-6xl mb-6">🤝</div>
            <h1 className="text-4xl font-bold mb-2 text-yellow-400">Match Tied!</h1>
            <p className="text-xl text-gray-400 mb-8">Both teams scored {i1Score} runs</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">{iAmWinner ? '🏆' : '😢'}</div>
            <h1 className={`text-5xl font-bold mb-2 ${iAmWinner ? 'text-green-500' : 'text-red-400'}`}>
              {iAmWinner ? 'You Win!' : 'You Lost!'}
            </h1>
            <p className="text-lg text-gray-300 mb-6">{marginText}</p>
          </>
        )}

        {/* Score summary card */}
        {matchState.innings1 && (
          <div className="bg-gray-800 rounded-2xl p-6 mb-8 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-400 uppercase tracking-wider font-bold">Match Summary</span>
              <span className="text-sm text-gray-500">{matchState.isSuperOver ? 'SUPER OVER' : `${maxOvers} overs`}</span>
            </div>

            {matchState.isSuperOver && matchState.mainInnings1 && (
               <div className="mb-4 pb-4 border-b border-gray-700">
                 <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-bold">Main Match (Tied)</p>
                 <div className="space-y-2">
                   <div className="flex justify-between items-center text-sm text-gray-400">
                     <span>{matchState.mainInnings1.battingTeam === matchState.player1.uid ? matchState.player1.displayName : matchState.player2?.displayName}</span>
                     <span>{matchState.mainInnings1.score}/{matchState.mainInnings1.wickets}</span>
                   </div>
                   {matchState.mainInnings2 && (
                     <div className="flex justify-between items-center text-sm text-gray-400">
                       <span>{matchState.mainInnings2.battingTeam === matchState.player1.uid ? matchState.player1.displayName : matchState.player2?.displayName}</span>
                       <span>{matchState.mainInnings2.score}/{matchState.mainInnings2.wickets}</span>
                     </div>
                   )}
                 </div>
               </div>
            )}

            <div className="space-y-3">
              {matchState.isSuperOver && <p className="text-xs text-yellow-500 uppercase tracking-widest font-bold">Super Over Score</p>}
              <div className="flex justify-between items-center p-3 bg-gray-900 rounded-xl">
                <span className="font-semibold">{firstBatterName}</span>
                <span className="text-2xl font-black">{i1Score}<span className="text-gray-500 text-lg">/{i1Wickets}</span></span>
              </div>
              {matchState.innings2 && (
                <div className="flex justify-between items-center p-3 bg-gray-900 rounded-xl">
                  <span className="font-semibold">{secondBatterName}</span>
                  <span className="text-2xl font-black">{i2Score}<span className="text-gray-500 text-lg">/{i2Wickets}</span></span>
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={() => {
          localStorage.removeItem('activeMatchId');
          navigate('/');
        }} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition cursor-pointer">
          Return to Lobby
        </button>
      </div>
    );
  }

  // ========== INNINGS BREAK SCREEN ==========
  if (matchState.status === 'innings_break') {
    const target = (matchState.innings1?.score ?? 0) + 1;
    const maxOvers = matchState.format === 'T20' ? 20 : matchState.format === 'ODI' ? 50 : matchState.customOvers;
    const maxWickets = getMaxWickets(maxOvers);
    
    const isP1 = matchState.player1.uid === user.uid;
    const p1BattedFirst = matchState.player1.role === 'bat';
    
    // Who bats in innings 2? The one who bowled in innings 1
    const iWillBatNext = (isP1 && !p1BattedFirst) || (!isP1 && p1BattedFirst);
    
    const firstBatterName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
    const firstBatterScore = matchState.innings1?.score ?? 0;
    const firstBatterWickets = matchState.innings1?.wickets ?? 0;
    
    // If it's a super over, we know we just tied the match because innings2 exists during innings_break
    const isStartOfSuperOver = matchState.isSuperOver && !!matchState.innings2;

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
        <div className="text-6xl mb-6" style={{ animation: 'pulse 2s infinite' }}>🏏</div>
        <h1 className={`text-4xl font-black mb-3 ${isStartOfSuperOver ? 'text-red-500' : 'text-yellow-400'}`}>
          {isStartOfSuperOver ? 'SUPER OVER!' : 'Innings Break'}
        </h1>
        
        {isStartOfSuperOver && (
          <p className="text-gray-300 mb-6 text-center animate-pulse">The match is tied! We are going to a Super Over.</p>
        )}
        
        {!isStartOfSuperOver && (
          <div className="bg-gray-800 rounded-2xl p-6 mb-6 w-full max-w-md border border-gray-700 text-center">
            <p className="text-gray-400 mb-2">1st Innings</p>
            <p className="text-2xl font-bold mb-1">{firstBatterName}</p>
            <p className="text-5xl font-black text-white">
              {firstBatterScore}<span className="text-2xl text-gray-400">/{firstBatterWickets}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              ({matchState.innings1?.overs}.{matchState.innings1?.balls} overs)
            </p>
          </div>
        )}

        {!isStartOfSuperOver && (
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-6 text-center w-full max-w-md">
            <p className="text-yellow-500 font-bold text-lg mb-1">
              🎯 Target: {target} runs
            </p>
            <p className="text-gray-400 text-sm">
              in {maxOvers} overs ({maxWickets} wickets in hand)
            </p>
          </div>
        )}

        <p className="text-lg text-gray-300 animate-pulse">
          {isStartOfSuperOver
            ? "Get ready for the ultimate showdown! ⚔️"
            : (iWillBatNext 
              ? "You're batting next — get ready to chase! 🏏" 
              : "You're bowling next — defend the target! 🎯")}
        </p>
        
        <p className="text-sm text-gray-500 mt-4">Starting in a few seconds...</p>
      </div>
    );
  }

  // ========== ACTIVE GAME SCREEN ==========
  const isP1 = matchState.player1.uid === user.uid;
  const p1BattedFirst = matchState.player1.role === 'bat';
  const isInnings2 = !!matchState.innings2;
  
  // In innings 1: role 'bat' player bats
  // In innings 2: role 'bowl' player bats (swap)
  const amIBatting = isInnings2
    ? (isP1 ? !p1BattedFirst : p1BattedFirst)  // innings 2: roles swap
    : (isP1 ? p1BattedFirst : !p1BattedFirst);  // innings 1: original roles

  const inningsLabel = isInnings2 ? '2nd Innings' : '1st Innings';

  const inningsKey = isInnings2 ? 'innings2' : 'innings1';
  const currentInnings = matchState[inningsKey];
  const currentBallsInOver = currentInnings?.balls || 0;
  
  let bouncersBowledInOver = 0;
  if (currentInnings?.ballLog && currentBallsInOver > 0) {
    const ballsThisOver = currentInnings.ballLog.slice(-currentBallsInOver);
    bouncersBowledInOver = ballsThisOver.filter((b: any) => b.length === 'Bouncer').length;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Top bar with leave button & opponent status */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${opponentOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs sm:text-sm text-gray-400">
            {opponentOnline ? 'Opponent online' : 'Opponent disconnected...'}
          </span>
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 font-semibold">{inningsLabel}</span>
        </div>
        <LeaveConfirmDialog onConfirm={handleLeaveMatch} />
      </div>

      <Scoreboard matchState={matchState} />
      
      <div className="flex-1 relative bg-gradient-to-b from-green-800 to-green-600 border-t-4 border-b-4 border-white/20 flex flex-col overflow-y-auto">
        {/* Simple stadium representation */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, transparent 20%, #000 120%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[300px] sm:w-64 sm:h-[400px] bg-yellow-900/40 rounded-xl border-4 border-white/30 pointer-events-none" />
        
        {/* Ball result animation */}
        <BallResultOverlay matchState={matchState} />
        
        {/* Opponent disconnected warning overlay */}
        {!opponentOnline && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
            <div className="bg-gray-800 border border-yellow-600/50 rounded-2xl p-6 text-center shadow-2xl">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-yellow-400 font-bold text-lg">Opponent disconnected</p>
              <p className="text-gray-400 text-sm mt-1">Waiting 10 seconds for reconnection...</p>
              <p className="text-gray-500 text-xs mt-1">You will win by forfeit if they don't return</p>
            </div>
          </div>
        )}

        {/* UI block for action - Using relative + mt-auto to naturally rest at bottom without overlapping */}
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 z-10 pb-4 sm:pb-8 mt-auto pt-4 relative">
           {amIBatting ? (
              <BattingUI onSubmit={submitAction} ballReady={ballReady} />
           ) : (
              <BowlingUI onSubmit={submitAction} ballReady={ballReady} bouncersBowledInOver={bouncersBowledInOver} />
           )}
        </div>
      </div>
    </div>
  );
}
