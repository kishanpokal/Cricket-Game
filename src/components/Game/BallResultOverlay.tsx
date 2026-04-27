import { useEffect, useState, useRef } from 'react';
import type { MatchState } from '../../types/cricket';
import { AudioManager } from '../../utils/audio';
import { createConfettiParticles } from '../../utils/animations';

interface BallResultOverlayProps {
  matchState: MatchState;
}

export default function BallResultOverlay({ matchState }: BallResultOverlayProps) {
  const [show, setShow] = useState(false);
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
    const am = audioManager.current;

    if (lastBall.isWide) {
      resultData = {
        type: 'WIDE',
        text: '+1 RUN',
        color: 'text-[var(--color-wide)]',
        emoji: '↔️',
        bgClass: 'bg-yellow-900/30',
      };
      am.playBatHit(true);
    } else if (lastBall.isNoBall) {
      resultData = {
        type: 'NO BALL!',
        text: `+${lastBall.runs + 1} RUNS & FREE HIT`,
        color: 'text-[var(--color-noball)]',
        emoji: '🚨',
        bgClass: 'bg-orange-900/30',
      };
      am.playNoBall();
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'WICKET') {
      resultData = {
        type: 'WICKET',
        text: lastBall.dismissalType || 'OUT!',
        color: 'text-[var(--color-wicket)]',
        emoji: '🔴',
        bgClass: 'bg-red-900/40',
      };
      am.playWicket();
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'SIX') {
      resultData = {
        type: 'SIX',
        text: '6 RUNS',
        color: 'text-[var(--color-six)]',
        emoji: '💥',
        bgClass: 'bg-purple-900/40',
      };
      am.playSix();
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'FOUR') {
      resultData = {
        type: 'FOUR',
        text: '4 RUNS',
        color: 'text-[var(--color-four)]',
        emoji: '🏏',
        bgClass: 'bg-green-900/40',
      };
      am.playFour();
      isBoundaryOrWicket = true;
    } else if (lastBall.runs === 3) {
      resultData = { type: '3', text: '3 RUNS', color: 'text-blue-400', emoji: '🏃', bgClass: 'bg-blue-900/20' };
      am.playBatHit(false);
    } else if (lastBall.runs === 2) {
      resultData = { type: '2', text: '2 RUNS', color: 'text-cyan-400', emoji: '🏃', bgClass: 'bg-cyan-900/20' };
      am.playBatHit(false);
    } else if (lastBall.runs === 1) {
      resultData = { type: '1', text: '1 RUN', color: 'text-white', emoji: '👟', bgClass: 'bg-black/10' };
      am.playBatHit(false);
    } else if (lastBall.special === 'DOT') {
      resultData = { type: 'DOT', text: 'NO RUN', color: 'text-gray-400', emoji: '⚫', bgClass: 'bg-black/20' };
      am.playBatHit(true);
    }

    if (resultData) {
      // Speak commentary
      if (lastBall.commentary) {
        am.speakCommentary(lastBall.commentary);
      }
      if (isBoundaryOrWicket) {
        am.cheerCrowd();
      }

      setResult(resultData);
      setShow(true);

      // Confetti for SIX
      if (lastBall.special === 'SIX' && containerRef.current) {
        setTimeout(() => {
          if (containerRef.current) {
            createConfettiParticles(containerRef.current, 12);
          }
        }, 200);
      }

      // Auto-dismiss — longer for impactful events
      const dismissTime = (lastBall.special === 'SIX' || lastBall.special === 'WICKET') ? 1800 : 1300;
      const timer = setTimeout(() => {
        setShow(false);
      }, dismissTime);

      return () => clearTimeout(timer);
    }
  }, [matchState.innings1?.ballLog?.length, matchState.innings2?.ballLog?.length]);

  if (!show || !result) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 'var(--z-overlay)' as string }}
      role="alert"
      aria-live="assertive"
    >
      {/* Background flash */}
      <div className={`absolute inset-0 ${result.bgClass} animate-pulse`} />

      {/* Main result display */}
      <div
        className="relative flex flex-col items-center"
        style={{ animation: 'ballResultPop 1.3s ease-out forwards' }}
      >
        {/* Emoji — staggered at 0ms */}
        <div
          className="text-6xl sm:text-7xl mb-2"
          style={{ animation: 'ballEmojiBounce 0.6s ease-out' }}
          aria-hidden="true"
        >
          {result.emoji}
        </div>

        {/* Main text — staggered at 150ms */}
        <div
          className={`text-5xl sm:text-7xl font-black tracking-wider ${result.color}`}
          style={{
            textShadow: '0 0 40px currentColor, 0 4px 20px rgba(0,0,0,0.8)',
            animation: 'ballTextSlam 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both',
          }}
        >
          {result.type}
        </div>

        {/* Sub text — staggered at 300ms */}
        <div
          className="text-base sm:text-xl font-bold text-white/80 mt-2 tracking-widest uppercase"
          style={{ animation: 'ballSubFade 0.6s ease-out 0.3s both' }}
        >
          {result.text}
        </div>

        {/* Decorative ring for SIX and WICKET */}
        {(result.type === 'SIX' || result.type === 'WICKET') && (
          <div
            className={`absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 ${
              result.type === 'SIX' ? 'border-[var(--color-six)]/50' : 'border-[var(--color-wicket)]/50'
            }`}
            style={{ animation: 'ballRingExpand 0.8s ease-out forwards' }}
          />
        )}

        {/* Second expanding ring for extra drama */}
        {result.type === 'SIX' && (
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-purple-400/30"
            style={{ animation: 'ballRingExpand 1s ease-out 0.2s forwards' }}
          />
        )}
      </div>
    </div>
  );
}
