import { useEffect, useState } from 'react';
import type { MatchState } from '../../types/cricket';
import { playBatHit, speakCommentary, startCrowdNoise, cheerCrowd } from '../../utils/audio';

interface BallResultOverlayProps {
  matchState: MatchState;
}

export default function BallResultOverlay({ matchState }: BallResultOverlayProps) {
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<{ type: string; text: string; color: string; emoji: string } | null>(null);
  const [lastBallCount, setLastBallCount] = useState(0);

  // Initialize crowd noise (browsers may require an interaction first, but we call it here so it's ready)
  useEffect(() => {
    const handleInteraction = () => {
      startCrowdNoise();
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

    let resultData: { type: string; text: string; color: string; emoji: string } | null = null;
    let isBoundaryOrWicket = false;

    if (lastBall.isNoBall) {
      resultData = {
        type: 'NO BALL!',
        text: `+${lastBall.runs + 1} RUNS & FREE HIT`,
        color: 'text-orange-500',
        emoji: '🚨'
      };
      isBoundaryOrWicket = true; // trigger cheer
    } else if (lastBall.special === 'WICKET') {
      resultData = {
        type: 'WICKET',
        text: lastBall.dismissalType || 'OUT!',
        color: 'text-red-500',
        emoji: '🔴'
      };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'SIX') {
      resultData = {
        type: 'SIX',
        text: '6 RUNS',
        color: 'text-purple-400',
        emoji: '💥'
      };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'FOUR') {
      resultData = {
        type: 'FOUR',
        text: '4 RUNS',
        color: 'text-green-400',
        emoji: '🏏'
      };
      isBoundaryOrWicket = true;
    } else if (lastBall.runs === 3) {
      resultData = {
        type: '3',
        text: '3 RUNS',
        color: 'text-blue-400',
        emoji: '🏃'
      };
    } else if (lastBall.runs === 2) {
      resultData = {
        type: '2',
        text: '2 RUNS',
        color: 'text-cyan-400',
        emoji: '🏃'
      };
    } else if (lastBall.runs === 1) {
      resultData = {
        type: '1',
        text: '1 RUN',
        color: 'text-white',
        emoji: '👟'
      };
    } else if (lastBall.special === 'DOT') {
      resultData = {
        type: 'DOT',
        text: 'NO RUN',
        color: 'text-gray-400',
        emoji: '⚫'
      };
    }

    if (resultData) {
      // Play Audio
      playBatHit();
      if (lastBall.commentary) {
        speakCommentary(lastBall.commentary);
      }
      if (isBoundaryOrWicket) {
        cheerCrowd();
      }

      setResult(resultData);
      setShow(true);

      const timer = setTimeout(() => {
        setShow(false);
      }, 1300);

      return () => clearTimeout(timer);
    }
  }, [matchState.innings1?.ballLog?.length, matchState.innings2?.ballLog?.length]);

  if (!show || !result) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      {/* Background flash */}
      <div className={`absolute inset-0 ${
        result.type === 'WICKET' ? 'bg-red-900/40' :
        result.type === 'SIX' ? 'bg-purple-900/40' :
        result.type === 'FOUR' ? 'bg-green-900/40' :
        'bg-black/20'
      } animate-pulse`} />

      {/* Main result display */}
      <div className="relative flex flex-col items-center" style={{
        animation: 'ballResultPop 1.3s ease-out forwards'
      }}>
        {/* Emoji burst */}
        <div className="text-7xl mb-2" style={{
          animation: 'ballEmojiBounce 0.6s ease-out'
        }}>
          {result.emoji}
        </div>

        {/* Main text */}
        <div className={`text-7xl font-black tracking-wider ${result.color}`} style={{
          textShadow: '0 0 40px currentColor, 0 4px 20px rgba(0,0,0,0.8)',
          animation: 'ballTextSlam 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}>
          {result.type}
        </div>

        {/* Sub text */}
        <div className="text-xl font-bold text-white/80 mt-2 tracking-widest uppercase" style={{
          animation: 'ballSubFade 0.6s ease-out 0.2s both'
        }}>
          {result.text}
        </div>

        {/* Decorative ring for SIX and WICKET */}
        {(result.type === 'SIX' || result.type === 'WICKET') && (
          <div className={`absolute w-48 h-48 rounded-full border-4 ${
            result.type === 'SIX' ? 'border-purple-500/50' : 'border-red-500/50'
          }`} style={{
            animation: 'ballRingExpand 0.8s ease-out forwards'
          }} />
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes ballResultPop {
          0% { transform: scale(0.3); opacity: 0; }
          30% { transform: scale(1.2); opacity: 1; }
          50% { transform: scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: scale(0.9) translateY(-20px); }
        }
        @keyframes ballEmojiBounce {
          0% { transform: scale(0) rotate(-30deg); }
          50% { transform: scale(1.4) rotate(10deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes ballTextSlam {
          0% { transform: scale(3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ballSubFade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ballRingExpand {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
