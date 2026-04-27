import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { subscribeToMatch, callToss, submitTossDecision, leaveMatch, setupPresence, subscribeToPresence } from '../../services/matchService';
import LeaveConfirmDialog from '../Game/LeaveConfirmDialog';
import type { TossCall, TossDecision } from '../../types/cricket';
import { Copy, Check } from 'lucide-react';

export default function Toss() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, matchState, setMatchState } = useGameStore();
  const [tossing, setTossing] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(true);
  const [copied, setCopied] = useState(false);
  const tossAnimStartRef = useRef<number>(0);

  useEffect(() => {
    if (!matchId) return;
    const unsub = subscribeToMatch(matchId, (state) => {
      setMatchState(state);
      if (state?.status === 'batting') {
        navigate(`/game/${matchId}`);
      }
    });
    return () => unsub();
  }, [matchId, setMatchState, navigate]);

  // Setup presence tracking
  useEffect(() => {
    if (!matchId || !user || !matchState) return;
    if (!matchState.player2) return;

    const isP1 = matchState.player1.uid === user.uid;
    const opponentUid = isP1 ? matchState.player2.uid : matchState.player1.uid;

    const cleanupPresence = setupPresence(matchId, user.uid);

    const unsubPresence = subscribeToPresence(matchId, opponentUid, (isOnline) => {
      setOpponentOnline(isOnline);
    });

    return () => {
      cleanupPresence();
      unsubPresence();
    };
  }, [matchId, user?.uid, matchState?.player2?.uid]);

  // Auto-forfeit if opponent disconnects during toss
  useEffect(() => {
    if (opponentOnline || !matchId || !user || !matchState) return;
    if (matchState.status === 'finished' || matchState.status === 'waiting') return;

    const timer = setTimeout(() => {
      const opponentUid = matchState.player1.uid === user.uid
        ? matchState.player2?.uid
        : matchState.player1.uid;

      if (opponentUid) {
        leaveMatch(matchId, opponentUid);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [opponentOnline, matchId, user, matchState?.status]);

  // Clear tossing animation once toss result arrives
  useEffect(() => {
    if (tossing && matchState?.toss && matchState.toss.winner !== 'pending') {
      const elapsed = Date.now() - tossAnimStartRef.current;
      const minAnimTime = 1500;
      const remaining = Math.max(0, minAnimTime - elapsed);
      const timer = setTimeout(() => setTossing(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [tossing, matchState?.toss]);

  const handleLeaveMatch = async () => {
    if (!matchId || !user) return;
    await leaveMatch(matchId, user.uid);
    navigate('/');
  };

  const handleCopyCode = () => {
    if (matchId) {
      navigator.clipboard.writeText(matchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!matchState || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-night-sky)] text-white">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-green-400 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Loading Toss...</p>
        </div>
      </div>
    );
  }

  // Match was abandoned
  if (matchState.status === 'finished' && matchState.abandonedBy) {
    const opponentAbandoned = matchState.abandonedBy !== user.uid;
    const isP1 = matchState.player1.uid === user.uid;
    const opponentName = isP1 ? matchState.player2?.displayName : matchState.player1.displayName;

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-night-sky)] text-white p-6">
        {opponentAbandoned ? (
          <>
            <div className="text-6xl mb-6 animate-[scale-in_0.5s_ease-out]" aria-hidden="true">🏆</div>
            <h1 className="text-4xl font-bold mb-2 text-green-400">You Win!</h1>
            <p className="text-xl text-gray-400 mb-2">{opponentName} left the match</p>
            <p className="text-gray-500 mb-8">Victory by forfeit</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6" aria-hidden="true">😞</div>
            <h1 className="text-4xl font-bold mb-2 text-red-400">Match Forfeited</h1>
            <p className="text-xl text-gray-400 mb-8">You left the match.</p>
          </>
        )}
        <button onClick={() => navigate('/')} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition cursor-pointer">
          Return to Lobby
        </button>
      </div>
    );
  }

  const isPlayer1 = matchState.player1.uid === user.uid;
  const isPlayer2 = matchState.player2?.uid === user.uid;
  const opponentName = isPlayer1 ? matchState.player2?.displayName : matchState.player1.displayName;

  if (matchState.status === 'waiting') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--color-night-sky)] p-6 text-white">
        <div className="text-5xl mb-6" aria-hidden="true">🏟️</div>
        <h2 className="text-xl sm:text-2xl mb-2 font-black text-center">Room Created</h2>

        {/* Room code with copy */}
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-gray-800 px-6 py-3 rounded-xl border-2 border-dashed border-green-500/50 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Room Code</p>
            <p className="text-4xl font-mono font-black text-green-400 tracking-[0.3em]">{matchId}</p>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition cursor-pointer"
            aria-label="Copy room code"
          >
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        <p className="text-gray-400 mb-6 animate-pulse text-sm">Waiting for opponent to join...</p>

        <div className="flex gap-6 bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="text-center">
            <img src={matchState.player1.photoURL} alt="P1" className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-green-500" />
            <p className="font-bold text-sm">{matchState.player1.displayName}</p>
            <p className="text-[10px] text-green-400 font-semibold">Ready</p>
          </div>
          <div className="flex items-center text-gray-600 font-black text-2xl">VS</div>
          <div className="text-center opacity-50">
            <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto mb-2 flex items-center justify-center text-2xl border-2 border-gray-600">?</div>
            <p className="font-bold text-sm text-gray-400">Waiting...</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-8 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition cursor-pointer border border-gray-700"
        >
          Cancel & Return
        </button>
      </div>
    );
  }

  const handleCall = (call: TossCall) => {
    if (!matchId) return;
    setTossing(true);
    tossAnimStartRef.current = Date.now();
    callToss(matchId, user.uid, call);
  };

  const handleDecision = async (decision: TossDecision) => {
    if (!matchId || submittingDecision) return;
    setSubmittingDecision(true);
    try {
      await submitTossDecision(matchId, decision);
    } catch (err) {
      console.error('Failed to submit toss decision:', err);
      setSubmittingDecision(false);
    }
  };

  const tossState = matchState.toss;
  const isWinner = tossState?.winner === user.uid;

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[var(--color-pitch-green-dark)] to-[var(--color-pitch-green)] p-6 relative overflow-hidden">
      {/* Leave button */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        {matchState.player2 && (
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${opponentOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-sm text-white/80">
              {opponentOnline ? `${opponentName} online` : `${opponentName} disconnected`}
            </span>
          </div>
        )}
        <LeaveConfirmDialog onConfirm={handleLeaveMatch} />
      </div>

      {/* Decorative grass pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, transparent 20%, #000 120%)' }} />

      <h1 className="text-3xl sm:text-4xl font-black text-white mb-8 tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] animate-[slide-up_0.4s_ease-out]">
        The Toss
      </h1>

      {/* Opponent disconnected warning */}
      {!opponentOnline && matchState.player2 && (
        <div className="mb-6 bg-yellow-900/40 border border-yellow-600/50 rounded-xl p-4 text-center animate-[scale-in_0.2s_ease-out]">
          <p className="text-yellow-400 font-semibold">⚠️ {opponentName} appears to be disconnected</p>
          <p className="text-gray-300 text-sm">Waiting for reconnection... You'll win by forfeit in 10s</p>
        </div>
      )}

      {/* Toss call phase */}
      {!tossState && isPlayer2 && (
        <div className="bg-gray-900/80 backdrop-blur-xl p-8 rounded-3xl text-center shadow-2xl border border-green-500/20 animate-[scale-in_0.3s_ease-out]">
          <h2 className="text-2xl font-bold mb-6 text-white">Call the coin!</h2>
          <div className="flex gap-4">
            <button
              onClick={() => handleCall('heads')}
              className="flex-1 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 py-4 px-8 rounded-xl font-black text-xl text-yellow-900 shadow-[0_4px_20px_rgba(234,179,8,0.3)] transition cursor-pointer"
            >
              👑 Heads
            </button>
            <button
              onClick={() => handleCall('tails')}
              className="flex-1 bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 py-4 px-8 rounded-xl font-black text-xl text-white shadow-lg transition cursor-pointer"
            >
              🪙 Tails
            </button>
          </div>
        </div>
      )}

      {!tossState && isPlayer1 && (
        <div className="text-xl text-white text-center animate-pulse bg-gray-900/50 px-8 py-4 rounded-2xl backdrop-blur-sm">
          Waiting for {opponentName} to call...
        </div>
      )}

      {/* Coin flip animation */}
      {tossing && (
        <div className="text-center animate-[scale-in_0.2s_ease-out]">
          <div className="text-7xl mb-4" style={{ animation: 'coin-flip 1.5s ease-out' }}>🪙</div>
          <p className="text-xl text-white animate-pulse">Flipping coin...</p>
        </div>
      )}

      {/* Toss result + decision */}
      {tossState && tossState.winner !== 'pending' && !tossing && (
        <div className="bg-gray-900/80 backdrop-blur-xl p-8 rounded-3xl text-center shadow-2xl border border-green-500/20 animate-[scale-in_0.3s_ease-out] max-w-md w-full">
          <div className="text-5xl mb-3" aria-hidden="true">{tossState.result === 'heads' ? '👑' : '🪙'}</div>
          <h2 className="text-3xl font-black mb-1 text-white">{tossState.result.toUpperCase()}!</h2>
          <p className="text-lg mb-6 text-gray-300">
            {isWinner ? '🎉 You won the toss!' : `${opponentName} won the toss.`}
          </p>

          {isWinner && !submittingDecision ? (
            <div>
              <h3 className="mb-4 text-gray-400 text-sm font-semibold uppercase tracking-wider">What will you do?</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDecision('bat')}
                  className="flex-1 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 py-3 px-6 rounded-xl font-bold text-base sm:text-lg cursor-pointer transition shadow-[0_4px_15px_rgba(59,130,246,0.3)]"
                >
                  🏏 Bat First
                </button>
                <button
                  onClick={() => handleDecision('bowl')}
                  className="flex-1 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 py-3 px-6 rounded-xl font-bold text-base sm:text-lg cursor-pointer transition shadow-[0_4px_15px_rgba(239,68,68,0.3)]"
                >
                  🎯 Bowl First
                </button>
              </div>
            </div>
          ) : isWinner && submittingDecision ? (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
              Starting match...
            </div>
          ) : (
            <div className="text-gray-400 italic animate-pulse">Waiting for opponent's decision...</div>
          )}
        </div>
      )}
    </div>
  );
}
