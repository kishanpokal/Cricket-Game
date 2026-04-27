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
      className="relative bg-gradient-to-b from-[var(--color-night-sky)] to-gray-900 border-b-2 border-gray-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pb-2 sm:pb-3 pt-1 sm:pt-2 px-2 sm:px-4"
      style={{ zIndex: 'var(--z-hud)' as string, maxHeight: '96px' }}
      role="region"
      aria-label="Scoreboard"
    >
      {/* Target banner (Innings 2) */}
      {isInnings2 && matchState.innings1 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[var(--color-stadium-gold)] text-[var(--color-night-sky)] px-4 sm:px-6 py-0.5 rounded-b-xl font-bold text-[10px] sm:text-xs tracking-widest uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.3)] border-b-2 border-x-2 border-yellow-400 z-30">
          <Target className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
          <span>Target: {target}</span>
        </div>
      )}

      {/* 1st innings score (during 2nd innings) */}
      {isInnings2 && matchState.innings1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-3 sm:mt-4 mb-1 text-[10px] sm:text-xs bg-gray-800/50 w-fit mx-auto px-3 sm:px-4 py-0.5 rounded-full border border-gray-700/50">
          <span className="text-gray-400 uppercase tracking-wider font-semibold">1st:</span>
          <span className="font-bold text-gray-200 truncate max-w-[80px] sm:max-w-none">
            {p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName}
          </span>
          <span className="font-black text-blue-400">
            {matchState.innings1.score}/{matchState.innings1.wickets}
          </span>
          <span className="text-gray-500 font-mono">
            ({matchState.innings1.overs}.{matchState.innings1.balls})
          </span>
        </div>
      )}

      <div className={`flex justify-between items-center gap-2 sm:gap-0 ${!isInnings2 ? 'mt-2 sm:mt-3' : 'mt-1'}`}>

        {/* Score & Batter */}
        <div className="flex flex-col items-center sm:items-start w-1/3 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 bg-gray-800/80 px-2 py-0.5 rounded-full border border-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
            <span className="text-[9px] sm:text-xs text-gray-300 font-bold uppercase tracking-wider truncate max-w-[80px] sm:max-w-[150px]">
              {batterName}
            </span>
          </div>
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span
              ref={scoreRef}
              className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
              aria-live="polite"
              aria-label={`Score: ${currentInnings.score} for ${currentInnings.wickets}`}
            >
              {displayScore}
            </span>
            <span className="text-lg sm:text-2xl font-black text-[var(--color-wicket)] leading-none">
              -{currentInnings.wickets}
            </span>
          </div>
          {/* Mini stats */}
          <div className="flex gap-2 text-[8px] sm:text-[10px] text-gray-500 font-semibold mt-0.5">
            <span>4s: {bc.fours}</span>
            <span>6s: {bc.sixes}</span>
            {currentPartnership && (
              <span className="text-gray-400">P: {currentPartnership.runs}({currentPartnership.balls})</span>
            )}
          </div>
        </div>

        {/* Center: Overs + Situation */}
        <div className="flex flex-col items-center justify-center w-1/3 relative">
          {matchState.isSuperOver && (
            <div className="absolute -top-3 sm:-top-5 text-[8px] font-black text-red-100 bg-red-600 px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.6)] uppercase tracking-widest border border-red-400 z-10 animate-pulse">
              Super Over
            </div>
          )}

          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tighter flex items-baseline mb-0.5">
            <span className="text-blue-400">{currentInnings.overs}.{currentInnings.balls}</span>
            <span className="text-gray-600 text-[10px] sm:text-sm ml-1 tracking-normal uppercase font-bold">/ {maxOvers}</span>
          </div>

          {/* Run rate bar */}
          <div className="flex gap-2 text-[8px] sm:text-[10px] font-bold mb-0.5">
            <span className="text-gray-400">CRR: <span className="text-blue-400">{crr}</span></span>
            {rrr !== null && rrr !== Infinity && (
              <span className="text-gray-400">RRR: <span className={rrr > crr ? 'text-red-400' : 'text-green-400'}>{rrr}</span></span>
            )}
          </div>

          <div className="min-h-[18px]">
            {currentInnings.isFreeHitNextBall ? (
              <div className="text-[8px] sm:text-[10px] font-black text-white bg-[var(--color-freehit)] px-2 sm:px-3 py-0.5 rounded-full border border-blue-400 uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                🔥 FREE HIT 🔥
              </div>
            ) : target && runsNeeded !== null && runsNeeded > 0 ? (
              <div className="text-[8px] sm:text-[10px] font-black text-yellow-400 bg-yellow-900/40 px-2 sm:px-3 py-0.5 rounded-full border border-yellow-600/50 uppercase tracking-widest animate-pulse">
                Need {runsNeeded} from {ballsRemaining}
              </div>
            ) : target && runsNeeded !== null && runsNeeded <= 0 ? (
              <div className="text-[8px] sm:text-[10px] font-black text-green-400 bg-green-900/40 px-2 sm:px-3 py-0.5 rounded-full border border-green-600/50 uppercase tracking-widest">
                Target Achieved 🎉
              </div>
            ) : (
              <div className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-3 h-3 text-red-400" aria-hidden="true" /> {wicketsLeft} Wkts Left
              </div>
            )}
          </div>
        </div>

        {/* Bowler & Over Timeline */}
        <div className="flex flex-col items-center sm:items-end w-1/3 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 bg-gray-800/80 px-2 py-0.5 rounded-full border border-gray-700">
            <span className="text-[9px] sm:text-xs text-gray-300 font-bold uppercase tracking-wider truncate max-w-[80px] sm:max-w-[150px]">
              {bowlerName}
            </span>
            <span className="w-2 h-2 rounded-full bg-orange-500" aria-hidden="true" />
          </div>

          <div className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-800 shadow-inner">
            {(currentInnings.ballLog || []).slice(-6).map((ball, i) => {
              const isWicket = ball.wicket && !ball.isFreeHit;
              const isDot = ball.runs === 0 && !isWicket && !ball.isNoBall && !ball.isWide;

              return (
                <div
                  key={i}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex flex-col items-center justify-center font-black text-[10px] sm:text-xs shadow-sm transition-transform hover:scale-110 ${
                    ball.isWide ? 'bg-[var(--color-wide)] text-white' :
                    ball.isNoBall ? 'bg-[var(--color-noball)] text-white shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                    isWicket ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                    ball.runs === 6 ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
                    ball.runs === 4 ? 'bg-gradient-to-br from-green-500 to-green-700 text-white shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                    isDot ? 'bg-gray-800 text-gray-500 border border-gray-700' :
                    'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
                  }`}
                  aria-label={`Ball ${i + 1}: ${ball.isWide ? 'Wide' : ball.isNoBall ? 'No ball' : isWicket ? 'Wicket' : `${ball.runs} runs`}`}
                >
                  {ball.isWide ? <span className="text-[8px] leading-tight">WD</span> : null}
                  {ball.isNoBall ? <span className="text-[8px] leading-tight">NB</span> : null}
                  {!ball.isWide && (isWicket ? 'W' : (ball.isNoBall && ball.runs === 0 ? '' : ball.runs))}
                </div>
              );
            })}
            {(!currentInnings.ballLog || currentInnings.ballLog.length === 0) && (
              <div className="text-gray-600 text-[10px] sm:text-xs italic py-0.5 px-2">Over starting...</div>
            )}
          </div>
        </div>
      </div>

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Score: {currentInnings.score} for {currentInnings.wickets}, Overs: {currentInnings.overs}.{currentInnings.balls}
        {runsNeeded && runsNeeded > 0 ? `, Need ${runsNeeded} from ${ballsRemaining} balls` : ''}
      </div>
    </div>
  );
});
