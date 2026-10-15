import { useRef, useEffect, useState, memo } from 'react';
import type { MatchState } from '../../types/cricket';
import { getMaxWickets, calculateRunRate, calculateRequiredRunRate } from '../../services/aiLogic';
import { Target, Activity } from 'lucide-react';

interface ScoreboardProps {
  matchState: MatchState;
}

export default memo(function Scoreboard({ matchState }: ScoreboardProps) {
  const isInnings2 = !!matchState.innings2;
  const currentInnings = isInnings2 ? matchState.innings2 : matchState.innings1;
  const scoreRef = useRef<HTMLSpanElement>(null);
  const [displayScore, setDisplayScore] = useState(0);

  // Animate score flip on change
  useEffect(() => {
    if (currentInnings?.score !== undefined && currentInnings.score !== displayScore) {
      setDisplayScore(currentInnings.score);
      if (scoreRef.current) {
        scoreRef.current.style.animation = 'none';
        scoreRef.current.offsetHeight; // Force reflow
        scoreRef.current.style.animation = 'score-flip 0.4s ease-out';
      }
    }
  }, [currentInnings?.score, displayScore]);

  if (!currentInnings) return null;

  const maxOvers = matchState.format === 'T20' ? 20 : matchState.format === 'ODI' ? 50 : matchState.customOvers;
  const maxWickets = getMaxWickets(maxOvers);
  const target = isInnings2 && matchState.innings1 ? matchState.innings1.score + 1 : null;

  const p1BattedFirst = matchState.player1.role === 'bat';
  let batterName: string | undefined;
  let bowlerName: string | undefined;

  if (isInnings2) {
    batterName = p1BattedFirst ? matchState.player2?.displayName : matchState.player1.displayName;
    bowlerName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
  } else {
    batterName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
    bowlerName = p1BattedFirst ? matchState.player2?.displayName : matchState.player1.displayName;
  }

  const runsNeeded = target ? target - currentInnings.score : null;
  const ballsRemaining = (maxOvers * 6) - (currentInnings.overs * 6 + currentInnings.balls);
  const wicketsLeft = maxWickets - currentInnings.wickets;

  // Current run rate
  const crr = calculateRunRate(currentInnings.score, currentInnings.overs, currentInnings.balls);

  // Required run rate (innings 2 only)
  const rrr = isInnings2 && target
    ? calculateRequiredRunRate(target, currentInnings.score, maxOvers, currentInnings.overs, currentInnings.balls)
    : null;

  // Partnership
  const partnerships = currentInnings.partnerships ?? [];
  const currentPartnership = partnerships.length > 0 ? partnerships[partnerships.length - 1] : null;

  // Boundary count
  const bc = currentInnings.boundaryCount ?? { fours: 0, sixes: 0 };

  return (
    <div
      className="relative bg-gradient-to-b from-[#070c08] via-[#0b140e] to-[#0f1c13] border-b-2 border-[#ffb800]/25 shadow-[0_12px_36px_rgba(0,0,0,0.85)] pb-2.5 pt-1.5 px-3 sm:px-6"
      style={{ zIndex: 'var(--z-hud)' as string }}
      role="region"
      aria-label="Broadcast Scoreboard"
    >
      {/* Target Ribbon (Innings 2) */}
      {isInnings2 && matchState.innings1 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#d9222a] via-[#ffb800] to-[#d9222a] text-[#070c08] px-5 py-0.5 rounded-b-xl font-sports font-black text-[11px] tracking-[0.2em] uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(255,184,0,0.4)] z-30">
          <Target className="w-3.5 h-3.5" aria-hidden="true" />
          <span>TARGET: {target} RUNS</span>
        </div>
      )}

      {/* 1st Innings Micro Badge */}
      {isInnings2 && matchState.innings1 && (
        <div className="flex items-center justify-center gap-2 mt-4 mb-1 text-[11px] bg-[#122417] w-fit mx-auto px-4 py-0.5 rounded-full border border-[#f5efe6]/10">
          <span className="text-[#8c8273] uppercase font-bold tracking-wider">1ST INN:</span>
          <span className="font-bold text-[#f5efe6] truncate max-w-[100px]">
            {p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName}
          </span>
          <span className="font-sports font-black text-[#ffb800]">
            {matchState.innings1.score}/{matchState.innings1.wickets}
          </span>
          <span className="text-[#8c8273] font-mono text-[10px]">
            ({matchState.innings1.overs}.{matchState.innings1.balls} ov)
          </span>
        </div>
      )}

      <div className={`flex justify-between items-center gap-2 sm:gap-4 ${!isInnings2 ? 'mt-1 sm:mt-2' : 'mt-1'}`}>

        {/* Left Column: Batting Score & Batter */}
        <div className="flex flex-col items-start w-1/3 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 bg-[#132419] px-2.5 py-0.5 rounded-full border border-[#4ade80]/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" aria-hidden="true" />
            <span className="text-[10px] sm:text-xs text-[#f5efe6] font-bold uppercase tracking-wider truncate max-w-[90px] sm:max-w-[160px]">
              {batterName}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            <span
              ref={scoreRef}
              className="font-sports text-3xl sm:text-5xl font-black text-[#f5efe6] leading-none drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)] tabular-nums"
              aria-live="polite"
              aria-label={`Score: ${currentInnings.score} for ${currentInnings.wickets}`}
            >
              {displayScore}
            </span>
            <span className="font-sports text-xl sm:text-3xl font-black text-[#ff2a36] leading-none">
              /{currentInnings.wickets}
            </span>
          </div>

          {/* Boundaries & Partnership Mini Tally */}
          <div className="flex gap-2 text-[9px] sm:text-[10px] text-[#8c8273] font-bold mt-0.5">
            <span className="text-[#10b981]">4s: {bc.fours}</span>
            <span className="text-[#ffb800]">6s: {bc.sixes}</span>
            {currentPartnership && (
              <span className="text-[#c8bead]">PART: {currentPartnership.runs}({currentPartnership.balls})</span>
            )}
          </div>
        </div>

        {/* Center Column: Overs & Required Equation */}
        <div className="flex flex-col items-center justify-center w-1/3 text-center">
          {matchState.isSuperOver && (
            <div className="mb-1 text-[9px] font-black text-white bg-[#ff2a36] px-2.5 py-0.5 rounded-full shadow-[0_0_15px_rgba(255,42,54,0.7)] uppercase tracking-widest border border-white/30 animate-pulse">
              ⚡ SUPER OVER ⚡
            </div>
          )}

          <div className="font-sports text-2xl sm:text-3xl font-black tracking-tight flex items-baseline leading-none mb-1">
            <span className="text-[#ffb800]">{currentInnings.overs}.{currentInnings.balls}</span>
            <span className="text-[#8c8273] text-xs sm:text-sm ml-1.5 uppercase font-bold">/ {maxOvers} OVR</span>
          </div>

          {/* Rates */}
          <div className="flex gap-3 text-[9px] sm:text-[10px] font-bold font-mono mb-1">
            <span className="text-[#8c8273]">CRR: <span className="text-[#f5efe6]">{crr}</span></span>
            {rrr !== null && rrr !== Infinity && (
              <span className="text-[#8c8273]">RRR: <span className={rrr > crr ? 'text-[#ff2a36]' : 'text-[#4ade80]'}>{rrr}</span></span>
            )}
          </div>

          {/* Situation Banner */}
          <div className="min-h-[20px]">
            {currentInnings.isFreeHitNextBall ? (
              <div className="text-[9px] sm:text-[10px] font-black text-[#070c08] bg-gradient-to-r from-[#ffb800] to-[#ffd000] px-3 py-0.5 rounded-full border border-white/50 uppercase tracking-widest animate-pulse shadow-[0_0_12px_rgba(255,184,0,0.8)]">
                🔥 FREE HIT NEXT BALL 🔥
              </div>
            ) : target && runsNeeded !== null && runsNeeded > 0 ? (
              <div className="text-[9px] sm:text-[10px] font-black text-[#ffb800] bg-[#2a1e0b] px-3 py-0.5 rounded-full border border-[#ffb800]/40 uppercase tracking-wider animate-pulse">
                Need {runsNeeded} runs from {ballsRemaining} balls
              </div>
            ) : target && runsNeeded !== null && runsNeeded <= 0 ? (
              <div className="text-[9px] sm:text-[10px] font-black text-[#4ade80] bg-[#102e1b] px-3 py-0.5 rounded-full border border-[#4ade80]/40 uppercase tracking-wider">
                🏆 TARGET ACHIEVED!
              </div>
            ) : (
              <div className="text-[9px] sm:text-[10px] font-bold text-[#8c8273] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-[#ff2a36]" aria-hidden="true" />
                <span>{wicketsLeft} Wickets in Hand</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bowler & Current Over Dots */}
        <div className="flex flex-col items-end w-1/3 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 bg-[#132419] px-2.5 py-0.5 rounded-full border border-[#f5efe6]/10 shadow-sm">
            <span className="text-[10px] sm:text-xs text-[#f5efe6] font-bold uppercase tracking-wider truncate max-w-[90px] sm:max-w-[160px]">
              {bowlerName}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#ff2a36]" aria-hidden="true" />
          </div>

          {/* Current Over Outcome Pills (Strict 60-30-10 Colors) */}
          <div className="flex gap-1 p-1 bg-[#070c08] rounded-xl border border-[#f5efe6]/10 shadow-inner">
            {(currentInnings.ballLog || []).slice(-6).map((ball, i) => {
              const isWicket = ball.wicket && !ball.isFreeHit;
              const isDot = ball.runs === 0 && !isWicket && !ball.isNoBall && !ball.isWide;

              return (
                <div
                  key={i}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex flex-col items-center justify-center font-sports font-black text-[11px] sm:text-xs shadow-sm transition-transform hover:scale-110 ${
                    ball.isWide ? 'bg-[#eab308] text-[#070c08]' :
                    ball.isNoBall ? 'bg-[#f97316] text-[#070c08]' :
                    isWicket ? 'bg-gradient-to-br from-[#ff2a36] to-[#b8141c] text-white shadow-[0_0_10px_rgba(255,42,54,0.6)]' :
                    ball.runs === 6 ? 'bg-gradient-to-br from-[#ffb800] to-[#cc9300] text-[#070c08] shadow-[0_0_10px_rgba(255,184,0,0.6)]' :
                    ball.runs === 4 ? 'bg-gradient-to-br from-[#10b981] to-[#059669] text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                    isDot ? 'bg-[#132419] text-[#8c8273] border border-[#f5efe6]/08' :
                    'bg-[#1b4d2e] text-[#f5efe6] border border-[#4ade80]/30'
                  }`}
                  aria-label={`Ball ${i + 1}`}
                >
                  {ball.isWide ? <span className="text-[8px] leading-none">WD</span> : null}
                  {ball.isNoBall ? <span className="text-[8px] leading-none">NB</span> : null}
                  {!ball.isWide && (isWicket ? 'W' : (ball.isNoBall && ball.runs === 0 ? '' : ball.runs))}
                </div>
              );
            })}
            {(!currentInnings.ballLog || currentInnings.ballLog.length === 0) && (
              <div className="text-[#8c8273] text-[10px] font-mono italic py-1 px-2">Over starting...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
