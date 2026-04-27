import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { subscribeToMatch, callToss, submitTossDecision, leaveMatch, setupPresence, subscribeToPresence } from '../../services/matchService';
import LeaveConfirmDialog from '../Game/LeaveConfirmDialog';
import type {  TossCall, TossDecision  } from '../../types/cricket';

export default function Toss() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, matchState, setMatchState } = useGameStore();
  const [tossing, setTossing] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(true);
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
    // Only setup presence if there are two players
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

  // Clear tossing animation once toss result arrives (with minimum animation time)
  useEffect(() => {
    if (tossing && matchState?.toss && matchState.toss.winner !== 'pending') {
      const elapsed = Date.now() - tossAnimStartRef.current;
      const minAnimTime = 1500; // minimum 1.5s coin flip animation
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

  if (!matchState || !user) return <div className="h-screen flex items-center justify-center">Loading Toss...</div>;

  // Match was abandoned
  if (matchState.status === 'finished' && matchState.abandonedBy) {
    const opponentAbandoned = matchState.abandonedBy !== user.uid;
    const isP1 = matchState.player1.uid === user.uid;
    const opponentName = isP1 ? matchState.player2?.displayName : matchState.player1.displayName;

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
        {opponentAbandoned ? (
          <>
            <div className="text-6xl mb-6">🏆</div>
            <h1 className="text-4xl font-bold mb-2 text-green-400">You Win!</h1>
            <p className="text-xl text-gray-400 mb-2">{opponentName} left the match</p>
            <p className="text-gray-500 mb-8">Victory by forfeit</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">😞</div>
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
  
  if (matchState.status === 'waiting') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
        <h2 className="text-2xl mb-4 font-bold">Room Code: <span className="text-green-500">{matchId}</span></h2>
        <p className="text-gray-400">Waiting for opponent to join...</p>
        <div className="mt-8 p-6 bg-gray-800 rounded-2xl flex gap-6">
           <div className="text-center">
             <img src={matchState.player1.photoURL} alt="P1" className="w-16 h-16 rounded-full mx-auto mb-2" />
             <p>{matchState.player1.displayName}</p>
           </div>
           <div className="flex items-center text-gray-500 font-bold">VS</div>
           <div className="text-center opacity-50">
             <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto mb-2 flex items-center justify-center">?</div>
             <p>Waiting...</p>
           </div>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="mt-8 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition cursor-pointer"
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
  const opponentName = isPlayer1 ? matchState.player2?.displayName : matchState.player1.displayName;

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-green-900 p-6 relative">
      {/* Leave button - top right */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {matchState.player2 && (
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${opponentOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-sm text-gray-300">
              {opponentOnline ? `${opponentName} online` : `${opponentName} disconnected`}
            </span>
          </div>
        )}
        <LeaveConfirmDialog onConfirm={handleLeaveMatch} />
      </div>

      <h1 className="text-4xl font-black text-white mb-10 tracking-widest uppercase">The Toss</h1>
      
      {/* Opponent disconnected warning */}
      {!opponentOnline && matchState.player2 && (
        <div className="mb-6 bg-yellow-900/40 border border-yellow-600/50 rounded-xl p-4 text-center">
          <p className="text-yellow-400 font-semibold">⚠️ {opponentName} appears to be disconnected</p>
          <p className="text-gray-400 text-sm">Waiting for reconnection... You'll win by forfeit in 10s</p>
        </div>
      )}

      {!tossState && isPlayer2 && (
        <div className="bg-gray-800 p-8 rounded-3xl text-center shadow-2xl">
           <h2 className="text-2xl mb-6">Call the coin!</h2>
           <div className="flex gap-4">
             <button onClick={() => handleCall('heads')} className="flex-1 bg-yellow-600 hover:bg-yellow-500 py-4 px-8 rounded-xl font-bold text-xl">Heads</button>
             <button onClick={() => handleCall('tails')} className="flex-1 bg-gray-600 hover:bg-gray-500 py-4 px-8 rounded-xl font-bold text-xl">Tails</button>
           </div>
        </div>
      )}

      {!tossState && isPlayer1 && (
        <div className="text-2xl text-center animate-pulse">Waiting for {opponentName} to call...</div>
      )}

      {tossing && <div className="text-3xl animate-bounce">Flipping coin...</div>}

      {tossState && tossState.winner !== 'pending' && !tossing && (
        <div className="bg-gray-800 p-8 rounded-3xl text-center shadow-2xl">
          <h2 className="text-3xl font-bold mb-2">{tossState.result.toUpperCase()}!</h2>
          <p className="text-xl mb-8">
             {isWinner ? "You won the toss!" : `${opponentName} won the toss.`}
          </p>

          {isWinner && !submittingDecision ? (
            <div>
              <h3 className="mb-4 text-gray-400">What will you do?</h3>
              <div className="flex gap-4">
                <button onClick={() => handleDecision('bat')} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 px-6 rounded-xl font-bold text-lg cursor-pointer">Bat First</button>
                <button onClick={() => handleDecision('bowl')} className="flex-1 bg-red-600 hover:bg-red-500 py-3 px-6 rounded-xl font-bold text-lg cursor-pointer">Bowl First</button>
              </div>
            </div>
          ) : isWinner && submittingDecision ? (
            <div className="text-gray-400 italic">Starting match...</div>
          ) : (
            <div className="text-gray-400 italic">Waiting for opponent's decision...</div>
          )}
        </div>
      )}
    </div>
  );
}
