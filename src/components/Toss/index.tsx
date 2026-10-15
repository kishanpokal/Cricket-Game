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

  // Bot auto-decision if Bot wins the toss
  useEffect(() => {
    if (matchState?.isBotMatch && matchState.toss && matchState.toss.winner === 'bot-player-ai' && !submittingDecision && !tossing) {
      const timer = setTimeout(() => {
        const pitch = matchState.pitch;
        const weather = matchState.weather;
        let botChoice: TossDecision = 'bat';
        if (pitch === 'Green' || weather === 'Overcast') {
          botChoice = 'bowl';
        } else if (pitch === 'Dusty') {
          botChoice = 'bat';
        } else {
          botChoice = Math.random() > 0.5 ? 'bat' : 'bowl';
        }
        handleDecision(botChoice);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [matchState?.isBotMatch, matchState?.toss?.winner, matchState?.pitch, matchState?.weather, submittingDecision, tossing]);

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
      <div className="h-screen flex items-center justify-center bg-[#070c08] text-[#f5efe6]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#ffb800] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-display text-2xl tracking-wide uppercase text-[#ffb800]">Preparing Stadium Pitch...</p>
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
      <div className="h-screen flex flex-col items-center justify-center bg-[#070c08] text-[#f5efe6] p-6 relative">
        <div className="w-full max-w-md bg-[#112217] border border-[#f5efe6]/10 rounded-2xl p-8 text-center shadow-2xl">
          {opponentAbandoned ? (
            <>
              <div className="text-6xl mb-4" aria-hidden="true">🏆</div>
              <h1 className="font-display text-5xl font-bold text-[#ffb800] tracking-wide uppercase leading-none">
                VICTORY BY FORFEIT
              </h1>
              <p className="text-base text-[#c8bead] mt-2 mb-1">{opponentName} forfeited the match</p>
              <p className="text-xs font-mono text-[#8c8273] uppercase tracking-wider mb-8">Points credited to your profile</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4" aria-hidden="true">⚠️</div>
              <h1 className="font-display text-5xl font-bold text-[#ff2a36] tracking-wide uppercase leading-none">
                MATCH FORFEITED
              </h1>
              <p className="text-base text-[#c8bead] mt-2 mb-8">You left the pavilion before the match began.</p>
            </>
          )}
          <button 
            onClick={() => navigate('/')} 
            className="w-full py-3.5 bg-gradient-to-r from-[#1b4d2e] to-[#24623e] hover:from-[#24623e] hover:to-[#2e7d4c] rounded-xl font-display text-2xl tracking-wide uppercase font-bold transition cursor-pointer border border-[#4ade80]/30 shadow-lg"
          >
            Return to Pavilion
          </button>
        </div>
      </div>
    );
  }

  const isPlayer1 = matchState.player1.uid === user.uid;
  const isPlayer2 = matchState.player2?.uid === user.uid;
  const opponentName = isPlayer1 ? matchState.player2?.displayName : matchState.player1.displayName;

  // Waiting for Player 2
  if (matchState.status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070c08] p-4 sm:p-6 text-[#f5efe6] relative overflow-hidden">
        {/* Stadium Floodlight */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px]"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(34, 92, 55, 0.3) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />
        </div>

        <div className="w-full max-w-lg bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-6 sm:p-10 border border-[#f5efe6]/10 shadow-[0_24px_60px_rgba(0,0,0,0.8)] text-center relative z-10">
          
          <div className="w-16 h-16 rounded-2xl bg-[#1b4d2e]/40 border-2 border-[#ffb800]/40 flex items-center justify-center mx-auto text-3xl mb-4 shadow-[0_0_20px_rgba(27,77,46,0.6)]">
            🏟️
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase text-[#f5efe6] leading-none">
            MATCH PAVILION READY
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-[#ffb800] font-semibold mt-1 mb-6">
            WAITING FOR OPPONENT
          </p>

          {/* Room Code Card with Copy */}
          <div className="bg-[#070c08] border-2 border-dashed border-[#ffb800]/50 rounded-2xl p-5 mb-6 text-center shadow-inner">
            <span className="text-[10px] text-[#8c8273] uppercase tracking-[0.2em] font-extrabold block mb-1">
              SHARE THIS ROOM CODE
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-sports text-4xl sm:text-5xl font-black text-[#ffb800] tracking-[0.25em]">
                {matchId}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-3 bg-[#132419] hover:bg-[#1a3824] rounded-xl border border-[#f5efe6]/15 transition cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-5 h-5 text-[#4ade80]" /> : <Copy className="w-5 h-5 text-[#ffb800]" />}
              </button>
            </div>
            {copied && (
              <span className="text-[11px] text-[#4ade80] font-bold uppercase tracking-wider block mt-1.5">
                ✓ Copied to clipboard! Send to your friend.
              </span>
            )}
          </div>

          {/* Versus Lineup */}
          <div className="flex items-center justify-between bg-[#0e1a12] rounded-xl p-4 border border-[#f5efe6]/08 mb-6">
            <div className="text-center flex-1">
              <img 
                src={matchState.player1.photoURL} 
                alt="P1" 
                className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-[#4ade80] shadow-md" 
              />
              <p className="font-bold text-xs truncate max-w-[110px] mx-auto text-[#f5efe6]">
                {matchState.player1.displayName}
              </p>
              <span className="text-[10px] text-[#4ade80] font-semibold uppercase tracking-wider">
                ● Ready on Pitch
              </span>
            </div>

            <div className="font-display text-3xl font-bold text-[#ffb800] px-3">
              VS
            </div>

            <div className="text-center flex-1 opacity-60">
              <div className="w-14 h-14 rounded-full bg-[#1b3323] mx-auto mb-2 flex items-center justify-center text-xl border-2 border-dashed border-[#8c8273]">
                ?
              </div>
              <p className="font-bold text-xs text-[#8c8273]">Awaiting Opponent</p>
              <span className="text-[10px] text-[#ffb800] animate-pulse font-semibold uppercase tracking-wider">
                Connecting...
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-[#16271c] hover:bg-[#1e3827] rounded-xl font-display text-xl uppercase tracking-wider font-bold transition cursor-pointer border border-[#f5efe6]/10 text-[#c8bead]"
          >
            Cancel & Return to Pavilion
          </button>
        </div>
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070c08] text-[#f5efe6] p-4 sm:p-6 relative overflow-hidden">
      
      {/* Top Header Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
        {matchState.player2 && (
          <div className="flex items-center gap-2 bg-[#0e1a12] px-3 py-1.5 rounded-full border border-[#f5efe6]/10 text-xs">
            <span className={`w-2 h-2 rounded-full ${opponentOnline ? 'bg-[#4ade80]' : 'bg-[#ff2a36] animate-pulse'}`} />
            <span className="text-[#c8bead] font-medium">
              {opponentOnline ? `${opponentName} online` : `${opponentName} disconnected`}
            </span>
          </div>
        )}
        <LeaveConfirmDialog onConfirm={handleLeaveMatch} />
      </div>

      {/* Floodlight Backlight */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 92, 55, 0.35) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* Main Toss Box */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ffb800] block mb-1">
            OFFICIAL MATCH COIN TOSS
          </span>
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-wide text-[#f5efe6] uppercase leading-none">
            THE TOSS
          </h1>
          <p className="text-xs text-[#8c8273] font-mono mt-1">
            VENUE: {matchState.stadium || "Lord's"} • {matchState.format || 'T20'} FORMAT
          </p>
        </div>

        {/* Opponent Disconnected Warning */}
        {!opponentOnline && matchState.player2 && (
          <div className="mb-6 bg-[#2a1215] border border-[#ff2a36]/50 rounded-2xl p-4 text-center animate-[scale-in_0.2s_ease-out]">
            <p className="text-[#ff2a36] font-bold text-sm">⚠️ {opponentName} disconnected</p>
            <p className="text-[#c8bead] text-xs mt-0.5">Waiting for reconnection... Forfeit win in 10s</p>
          </div>
        )}

        {/* Phase 1: Calling Heads or Tails (Player 2 or Human in Bot Match) */}
        {!tossState && (isPlayer2 || matchState.isBotMatch) && (
          <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-8 border border-[#f5efe6]/10 shadow-2xl text-center">
            
            {/* 3D Coin Graphic */}
            <div className="w-24 h-24 rounded-full mx-auto mb-6 bg-gradient-to-br from-[#ffd000] via-[#ffb800] to-[#b38000] p-1.5 shadow-[0_0_35px_rgba(255,184,0,0.5)] border-2 border-white/40 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-2 border-dashed border-[#735000] flex items-center justify-center text-3xl font-black text-[#5a3e00]">
                🏏
              </div>
            </div>

            <h2 className="font-display text-3xl font-bold uppercase text-[#f5efe6] mb-1">
              CALL THE COIN
            </h2>
            <p className="text-xs text-[#c8bead] mb-6">
              {matchState.isBotMatch ? 'Call Heads or Tails against the AI.' : 'You are the visiting player. Choose Heads or Tails for the toss.'}
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => handleCall('heads')}
                className="flex-1 py-4 px-6 rounded-xl font-display text-2xl uppercase tracking-wider font-bold bg-gradient-to-r from-[#ffb800] to-[#e69d00] hover:from-[#ffd000] hover:to-[#ffb800] text-[#070c08] shadow-[0_6px_20px_rgba(255,184,0,0.4)] transition cursor-pointer"
              >
                👑 Heads
              </button>
              <button
                onClick={() => handleCall('tails')}
                className="flex-1 py-4 px-6 rounded-xl font-display text-2xl uppercase tracking-wider font-bold bg-[#1e3a27] hover:bg-[#284f35] text-[#f5efe6] border border-[#f5efe6]/15 transition cursor-pointer shadow-md"
              >
                🪙 Tails
              </button>
            </div>
          </div>
        )}

        {/* Phase 1 Waiting: Player 1 Waiting for Player 2 Call (PvP only) */}
        {!tossState && isPlayer1 && !matchState.isBotMatch && (
          <div className="bg-[#112217] rounded-2xl p-8 border border-[#f5efe6]/10 text-center shadow-xl">
            <div className="w-14 h-14 rounded-full border-2 border-[#ffb800] border-t-transparent animate-spin mx-auto mb-4" />
            <h2 className="font-display text-3xl font-bold uppercase text-[#f5efe6] leading-none mb-2">
              WAITING FOR OPPONENT
            </h2>
            <p className="text-xs text-[#c8bead]">
              {opponentName} is calling Heads or Tails...
            </p>
          </div>
        )}

        {/* Flipping Coin Animation */}
        {tossing && (
          <div className="bg-[#112217] rounded-2xl p-8 border border-[#f5efe6]/10 text-center shadow-xl">
            <div className="text-7xl mb-4" style={{ animation: 'coin-flip 1.5s ease-out' }}>
              🪙
            </div>
            <p className="font-display text-3xl uppercase tracking-wider text-[#ffb800] font-bold">
              FLIPPING COIN IN AIR...
            </p>
          </div>
        )}

        {/* Phase 2: Toss Result + Bat/Bowl Decision */}
        {tossState && tossState.winner !== 'pending' && !tossing && (
          <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-8 border border-[#f5efe6]/10 text-center shadow-2xl">
            
            <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-[#ffd000] via-[#ffb800] to-[#b38000] p-1 shadow-[0_0_30px_rgba(255,184,0,0.5)] flex items-center justify-center text-4xl">
              {tossState.result === 'heads' ? '👑' : '🪙'}
            </div>

            <span className="text-[10px] text-[#8c8273] uppercase tracking-[0.2em] font-extrabold block mb-1">
              TOSS RESULT
            </span>
            <h2 className="font-display text-4xl font-bold text-[#f5efe6] uppercase leading-none mb-2">
              IT'S {tossState.result.toUpperCase()}!
            </h2>
            
            <p className="text-sm font-semibold text-[#ffb800] mb-6">
              {isWinner ? '🎉 You won the toss!' : `${opponentName} won the toss.`}
            </p>

            {isWinner && !submittingDecision ? (
              <div>
                <span className="text-xs text-[#c8bead] uppercase tracking-wider font-bold block mb-3">
                  CHOOSE YOUR MATCH STRATEGY:
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision('bat')}
                    className="flex-1 py-3.5 px-6 rounded-xl font-display text-2xl uppercase tracking-wider font-bold bg-gradient-to-r from-[#1b4d2e] to-[#24623e] hover:from-[#24623e] hover:to-[#2e7d4c] text-white border border-[#4ade80]/40 shadow-lg transition cursor-pointer"
                  >
                    🏏 Bat First
                  </button>
                  <button
                    onClick={() => handleDecision('bowl')}
                    className="flex-1 py-3.5 px-6 rounded-xl font-display text-2xl uppercase tracking-wider font-bold bg-gradient-to-r from-[#d9222a] to-[#a81018] hover:from-[#ff2a36] hover:to-[#c4131b] text-white border border-white/20 shadow-lg transition cursor-pointer"
                  >
                    🎯 Bowl First
                  </button>
                </div>
              </div>
            ) : isWinner && submittingDecision ? (
              <div className="flex items-center justify-center gap-2 text-[#ffb800] font-sports">
                <div className="w-5 h-5 rounded-full border-2 border-[#ffb800] border-t-transparent animate-spin" />
                <span>Entering Pitch Arena...</span>
              </div>
            ) : (
              <div className="text-[#8c8273] font-semibold text-xs animate-pulse uppercase tracking-wider">
                Waiting for {opponentName} to decide Bat or Bowl...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
