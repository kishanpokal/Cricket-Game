import { useEffect, useState, useRef } from 'react';
import type { MatchState } from '../../types/cricket';
import { AudioManager } from '../../utils/audio';
import { createConfettiParticles } from '../../utils/animations';

interface BallResultOverlayProps {
  matchState: MatchState;
}

export default function BallResultOverlay({ matchState }: BallResultOverlayProps) {
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{
    type: string;
    text: string;
    color: string;
    emoji: string;
    bgClass: string;
  } | null>(null);
  
  const [lastBallCount, setLastBallCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioManager = useRef(AudioManager.getInstance());

  // Initialize crowd noise on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      audioManager.current.resumeContext();
      audioManager.current.startCrowdNoise();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Detect new ball results
  useEffect(() => {
    const innings = matchState.innings2 || matchState.innings1;
    if (!innings || !innings.ballLog || innings.ballLog.length === 0) return;

    const currentBallCount = innings.ballLog.length;
    if (currentBallCount <= lastBallCount) {
      setLastBallCount(currentBallCount);
      return;
    }

    setLastBallCount(currentBallCount);
    const lastBall = innings.ballLog[innings.ballLog.length - 1];
    if (!lastBall) return;

    let resultData: typeof result = null;
    let isBoundaryOrWicket = false;

    if (lastBall.isWide) {
      resultData = { type: 'WIDE', text: '+1 EXTRA RUN', color: 'text-[#eab308]', emoji: '↔️', bgClass: 'bg-[#eab308]/20' };
    } else if (lastBall.isNoBall) {
      resultData = { type: 'NO BALL!', text: `+${lastBall.runs + 1} RUNS • FREE HIT!`, color: 'text-[#f97316]', emoji: '🚨', bgClass: 'bg-[#f97316]/25' };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'WICKET') {
      resultData = { type: 'WICKET!', text: lastBall.dismissalType || 'BOWLED OUT!', color: 'text-[#ff2a36]', emoji: '🔴', bgClass: 'bg-[#d9222a]/30' };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'SIX') {
      resultData = { type: 'MAXIMUM 6!', text: 'CLEARED THE ROPE!', color: 'text-[#ffb800]', emoji: '💥', bgClass: 'bg-[#ffb800]/25' };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'FOUR') {
      resultData = { type: 'BOUNDARY 4!', text: 'CRACKING SHOT!', color: 'text-[#10b981]', emoji: '🏏', bgClass: 'bg-[#10b981]/25' };
      isBoundaryOrWicket = true;
    } else if (lastBall.runs === 3) {
      resultData = { type: '3 RUNS', text: 'GREAT RUNNING', color: 'text-[#f5efe6]', emoji: '🏃', bgClass: 'bg-[#1b4d2e]/25' };
    } else if (lastBall.runs === 2) {
      resultData = { type: '2 RUNS', text: 'COMFORTABLE DOUBLE', color: 'text-[#f5efe6]', emoji: '🏃', bgClass: 'bg-[#1b4d2e]/20' };
    } else if (lastBall.runs === 1) {
      resultData = { type: '1 RUN', text: 'SINGLE TAKEN', color: 'text-[#c8bead]', emoji: '👟', bgClass: 'bg-black/20' };
    } else if (lastBall.special === 'DOT') {
      resultData = { type: 'DOT BALL', text: 'SOLID DEFENCE', color: 'text-[#8c8273]', emoji: '⚫', bgClass: 'bg-black/30' };
    }

    if (resultData) {
      setResult(resultData);
      
      const am = audioManager.current;
      if (lastBall.commentary) am.speakCommentary(lastBall.commentary);
      if (isBoundaryOrWicket) am.cheerCrowd();
      
      if (lastBall.special === 'SIX' || lastBall.special === 'FOUR') am.playBatHit(false);
      else if (lastBall.special === 'WICKET') am.playWicket();
      else am.playBatHit(true);

      setShowResult(true);
      
      if (lastBall.special === 'SIX' && containerRef.current) {
        setTimeout(() => {
          if (containerRef.current) createConfettiParticles(containerRef.current, 14);
        }, 200);
      }

      const dismissTime = (lastBall.special === 'SIX' || lastBall.special === 'WICKET') ? 2200 : 1600;
      setTimeout(() => {
        setShowResult(false);
      }, dismissTime);
    }
  }, [matchState.innings1?.ballLog?.length, matchState.innings2?.ballLog?.length]);

  return (
    <>
      {showResult && result && (
        <div
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 'var(--z-overlay)' as string }}
          role="alert"
          aria-live="assertive"
        >
          {/* Floodlight Flash */}
          <div className={`absolute inset-0 ${result.bgClass} backdrop-blur-xs transition-opacity duration-300`} />

          {/* Broadcast Pop Card */}
          <div
            className="relative flex flex-col items-center bg-[#070c08]/90 px-8 py-6 rounded-3xl border border-[#f5efe6]/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
            style={{ animation: 'ballResultPop 1.3s ease-out forwards' }}
          >
            {/* Animated Emoji Badge */}
            <div className="text-5xl sm:text-6xl mb-1" style={{ animation: 'ballEmojiBounce 0.5s ease-out' }} aria-hidden="true">
              {result.emoji}
            </div>

            {/* Huge TV Title */}
            <div
              className={`font-display text-6xl sm:text-8xl font-black uppercase tracking-wider leading-none ${result.color}`}
              style={{
                textShadow: '0 0 30px currentColor, 0 4px 20px rgba(0,0,0,0.9)',
                animation: 'ballTextSlam 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
              }}
            >
              {result.type}
            </div>

            {/* Broadcast Commentary Subtitle */}
            <div
              className="text-xs sm:text-sm font-sports uppercase tracking-[0.2em] font-extrabold text-[#f5efe6] mt-2 bg-[#122417] px-4 py-1 rounded-full border border-[#f5efe6]/10"
              style={{ animation: 'ballSubFade 0.4s ease-out 0.25s both' }}
            >
              {result.text}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
