import { useEffect, useState, useRef } from 'react';
import type { MatchState } from '../../types/cricket';
import { AudioManager } from '../../utils/audio';
import { createConfettiParticles } from '../../utils/animations';
import type { AnimationOutput } from '../../types/animationEngine';

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
  
  // Animation Sequence State
  const [currentPhase, setCurrentPhase] = useState<number>(-1);
  const [animSequence, setAnimSequence] = useState<AnimationOutput | null>(null);
  
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
      resultData = { type: 'WIDE', text: '+1 RUN', color: 'text-[var(--color-wide)]', emoji: '↔️', bgClass: 'bg-yellow-900/30' };
    } else if (lastBall.isNoBall) {
      resultData = { type: 'NO BALL!', text: `+${lastBall.runs + 1} RUNS & FREE HIT`, color: 'text-[var(--color-noball)]', emoji: '🚨', bgClass: 'bg-orange-900/30' };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'WICKET') {
      resultData = { type: 'WICKET', text: lastBall.dismissalType || 'OUT!', color: 'text-[var(--color-wicket)]', emoji: '🔴', bgClass: 'bg-red-900/40' };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'SIX') {
      resultData = { type: 'SIX', text: '6 RUNS', color: 'text-[var(--color-six)]', emoji: '💥', bgClass: 'bg-purple-900/40' };
      isBoundaryOrWicket = true;
    } else if (lastBall.special === 'FOUR') {
      resultData = { type: 'FOUR', text: '4 RUNS', color: 'text-[var(--color-four)]', emoji: '🏏', bgClass: 'bg-green-900/40' };
      isBoundaryOrWicket = true;
    } else if (lastBall.runs === 3) {
      resultData = { type: '3', text: '3 RUNS', color: 'text-blue-400', emoji: '🏃', bgClass: 'bg-blue-900/20' };
    } else if (lastBall.runs === 2) {
      resultData = { type: '2', text: '2 RUNS', color: 'text-cyan-400', emoji: '🏃', bgClass: 'bg-cyan-900/20' };
    } else if (lastBall.runs === 1) {
      resultData = { type: '1', text: '1 RUN', color: 'text-white', emoji: '👟', bgClass: 'bg-black/10' };
    } else if (lastBall.special === 'DOT') {
      resultData = { type: 'DOT', text: 'NO RUN', color: 'text-gray-400', emoji: '⚫', bgClass: 'bg-black/20' };
    }

    if (resultData) {
      setResult(resultData);
      
      // If we have an animation sequence, play it!
      if (lastBall.animationSequence) {
        setAnimSequence(lastBall.animationSequence);
        setCurrentPhase(0); // Start Phase 0
        setShowResult(false);
      } else {
        // Fallback: Show result immediately
        handleImmediateResult(lastBall, resultData, isBoundaryOrWicket);
      }
    }
  }, [matchState.innings1?.ballLog?.length, matchState.innings2?.ballLog?.length]);

  // Phase Player Effect
  useEffect(() => {
    if (currentPhase < 0 || !animSequence) return;
    
    const phase = animSequence.phases[currentPhase];
    if (!phase) {
      // Sequence ended
      setCurrentPhase(-1);
      return;
    }

    const am = audioManager.current;
    
    // Phase-specific actions
    if (phase.id === 'bowler_runup') {
       if (animSequence.commentary.preDelivery) {
         am.speakCommentary(animSequence.commentary.preDelivery);
       }
    } else if (phase.id === 'ball_release') {
       if (animSequence.audioDirectives.playBallWhizz) am.playBatHit(true); // approximate whizz
    } else if (phase.id === 'bat_contact') {
       if (animSequence.commentary.onContact) am.speakCommentary(animSequence.commentary.onContact);
       if (animSequence.audioDirectives.playBatSound) am.playBatHit(false);
       if (animSequence.audioDirectives.playStumpsSound) am.playWicket();
    } else if (phase.id === 'result_reveal') {
       if (animSequence.commentary.postResult) am.speakCommentary(animSequence.commentary.postResult);
       if (animSequence.audioDirectives.playCrowdCheer) am.cheerCrowd();
       
       // Show the actual visual result pop-up after a slight delay
       setTimeout(() => {
         setShowResult(true);
         if (result?.type === 'SIX' && containerRef.current) {
           createConfettiParticles(containerRef.current, 12);
         }
       }, phase.resultOverlayDelay || 0);
    }

    // Schedule next phase
    const timer = setTimeout(() => {
      setCurrentPhase(prev => prev + 1);
    }, phase.durationMs);

    return () => clearTimeout(timer);
  }, [currentPhase, animSequence, result]);

  // Fallback behavior for immediate result
  const handleImmediateResult = (lastBall: any, _resultData: any, isBoundaryOrWicket: boolean) => {
    const am = audioManager.current;
    if (lastBall.commentary) am.speakCommentary(lastBall.commentary);
    if (isBoundaryOrWicket) am.cheerCrowd();
    
    if (lastBall.special === 'SIX' || lastBall.special === 'FOUR') am.playBatHit(false);
    else if (lastBall.special === 'WICKET') am.playWicket();
    else am.playBatHit(true);

    setShowResult(true);
    
    if (lastBall.special === 'SIX' && containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) createConfettiParticles(containerRef.current, 12);
      }, 200);
    }

    const dismissTime = (lastBall.special === 'SIX' || lastBall.special === 'WICKET') ? 1800 : 1300;
    setTimeout(() => {
      setShowResult(false);
    }, dismissTime);
  };

  // Hide result after a while if generated via animation sequence
  useEffect(() => {
    if (showResult && currentPhase >= (animSequence?.phases.length || 0)) {
       const timer = setTimeout(() => {
         setShowResult(false);
         setAnimSequence(null);
       }, 2000);
       return () => clearTimeout(timer);
    }
  }, [showResult, currentPhase, animSequence]);

  const activePhase = animSequence && currentPhase >= 0 && currentPhase < animSequence.phases.length 
    ? animSequence.phases[currentPhase] 
    : null;

  return (
    <>
      {/* Broadcast UI overlay for ambient text & camera angle */}
      {activePhase && (
        <div className="absolute inset-x-0 bottom-10 z-50 flex flex-col items-center pointer-events-none px-4">
          <div 
            className="bg-black/80 backdrop-blur-md border-t-2 border-[var(--color-six)] px-6 py-3 rounded-t-xl shadow-2xl flex flex-col items-center min-w-[280px]"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="text-[var(--color-six)] text-xs font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE <span className="opacity-50">| {activePhase.cameraAngle.replace('_', ' ')}</span>
            </div>
            <div className="text-white text-lg font-medium text-center">
              {activePhase.ambientText}
            </div>
          </div>
        </div>
      )}

      {/* Result Pop-up */}
      {showResult && result && (
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
            {/* Emoji */}
            <div className="text-6xl sm:text-7xl mb-2" style={{ animation: 'ballEmojiBounce 0.6s ease-out' }} aria-hidden="true">
              {result.emoji}
            </div>

            {/* Main text */}
            <div
              className={`text-5xl sm:text-7xl font-black tracking-wider ${result.color}`}
              style={{
                textShadow: '0 0 40px currentColor, 0 4px 20px rgba(0,0,0,0.8)',
                animation: 'ballTextSlam 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both',
              }}
            >
              {result.type}
            </div>

            {/* Sub text */}
            <div className="text-base sm:text-xl font-bold text-white/80 mt-2 tracking-widest uppercase" style={{ animation: 'ballSubFade 0.6s ease-out 0.3s both' }}>
              {result.text}
            </div>

            {/* Decorative ring */}
            {(result.type === 'SIX' || result.type === 'WICKET') && (
              <div
                className={`absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 ${
                  result.type === 'SIX' ? 'border-[var(--color-six)]/50' : 'border-[var(--color-wicket)]/50'
                }`}
                style={{ animation: 'ballRingExpand 0.8s ease-out forwards' }}
              />
            )}

            {/* Second expanding ring */}
            {result.type === 'SIX' && (
              <div className="absolute w-32 h-32 rounded-full border-2 border-purple-400/30" style={{ animation: 'ballRingExpand 1s ease-out 0.2s forwards' }} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
