import type { MatchState } from '../../types/cricket';
import { getMaxWickets } from '../../services/aiLogic';
import { Target, Activity } from 'lucide-react';

export default function Scoreboard({ matchState }: { matchState: MatchState }) {
  const isInnings2 = !!matchState.innings2;
  const currentInnings = isInnings2 ? matchState.innings2 : matchState.innings1;

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

  return (
    <div className="relative bg-gradient-to-b from-gray-950 to-gray-900 border-b-2 border-gray-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-20 pb-2 sm:pb-4 pt-1 sm:pt-2 px-2 sm:px-4">
      {/* Target/1st Innings Banner (Innings 2 only) */}
      {isInnings2 && matchState.innings1 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-500 text-gray-900 px-4 sm:px-6 py-0.5 sm:py-1 rounded-b-xl font-bold text-[10px] sm:text-xs tracking-widest uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.3)] border-b-2 border-x-2 border-yellow-400 z-30">
          <Target className="w-3 h-3 sm:w-4 sm:h-4" /> Target: {target}
        </div>
      )}

      {isInnings2 && matchState.innings1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4 sm:mt-5 mb-2 text-[10px] sm:text-xs bg-gray-800/50 w-fit mx-auto px-3 sm:px-4 py-1 rounded-full border border-gray-700/50">
          <span className="text-gray-400 uppercase tracking-wider font-semibold">1st Inn:</span>
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

      <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mt-2 sm:mt-4 ${!isInnings2 ? 'mt-4 sm:mt-6' : ''}`}>
        
        {/* Score & Batter */}
        <div className="flex flex-col items-center sm:items-start w-full sm:w-1/3">
          <div className="flex items-center gap-2 mb-1 bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase tracking-wider truncate max-w-[150px]">
              {batterName}
            </span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              {currentInnings.score}
            </span>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-black text-red-500 leading-none">-{currentInnings.wickets}</span>
            </div>
          </div>
        </div>

        {/* Overs & Match Situation */}
        <div className="flex flex-col items-center justify-center w-full sm:w-1/3 border-y border-gray-800 sm:border-y-0 sm:border-x py-2 sm:py-0 relative">
          {matchState.isSuperOver && (
            <div className="absolute -top-3 sm:-top-5 text-[10px] font-black text-red-100 bg-red-600 px-3 py-0.5 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.6)] uppercase tracking-widest border border-red-400 z-10 animate-pulse">
              Super Over
            </div>
          )}

          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tighter flex items-baseline mb-1">
            <span className="text-blue-400">{currentInnings.overs}.{currentInnings.balls}</span>
            <span className="text-gray-600 text-sm sm:text-lg ml-1 sm:ml-2 tracking-normal uppercase font-bold">/ {maxOvers} ov</span>
          </div>
          
          <div className="min-h-[24px]">
            {currentInnings.isFreeHitNextBall ? (
              <div className="text-[10px] sm:text-xs font-black text-white bg-blue-600 px-3 sm:px-4 py-1 rounded-full border border-blue-400 uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                🔥 FREE HIT 🔥
              </div>
            ) : target && runsNeeded !== null && runsNeeded > 0 ? (
              <div className="text-[10px] sm:text-xs font-black text-yellow-400 bg-yellow-900/40 px-3 sm:px-4 py-1 rounded-full border border-yellow-600/50 uppercase tracking-widest animate-pulse">
                Need {runsNeeded} from {ballsRemaining}
              </div>
            ) : target && runsNeeded !== null && runsNeeded <= 0 ? (
              <div className="text-[10px] sm:text-xs font-black text-green-400 bg-green-900/40 px-3 sm:px-4 py-1 rounded-full border border-green-600/50 uppercase tracking-widest">
                Target Achieved 🎉
              </div>
            ) : (
              <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Activity className="w-3 h-3 text-red-400" /> {wicketsLeft} Wickets Left
              </div>
            )}
          </div>
        </div>

        {/* Bowler & Over Timeline */}
        <div className="flex flex-col items-center sm:items-end w-full sm:w-1/3">
          <div className="flex items-center gap-2 mb-2 bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700">
            <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase tracking-wider truncate max-w-[150px]">
              {bowlerName}
            </span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          
          <div className="flex gap-1.5 p-1.5 bg-gray-900 rounded-xl border border-gray-800 shadow-inner">
            {(currentInnings.ballLog || []).slice(-6).map((ball, i) => {
              const isWicket = ball.wicket && !ball.isFreeHit; // Actual wicket

              const isDot = ball.runs === 0 && !isWicket;
              
              return (
                <div key={i} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex flex-col items-center justify-center font-black text-xs sm:text-sm shadow-sm transition-transform hover:scale-110 ${
                  ball.isNoBall ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' :
                  isWicket ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
                  ball.runs === 6 ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 
                  ball.runs === 4 ? 'bg-gradient-to-br from-green-500 to-green-700 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 
                  isDot ? 'bg-gray-800 text-gray-500 border border-gray-700' :
                  'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
                }`}>
                  {ball.isNoBall ? <span className="text-[10px] leading-tight">NB</span> : null}
                  {isWicket ? 'W' : (ball.isNoBall && ball.runs === 0 ? '' : ball.runs)}
                </div>
              );
            })}
            {(!currentInnings.ballLog || currentInnings.ballLog.length === 0) && (
              <div className="text-gray-600 text-xs sm:text-sm italic py-1 px-3">Over starting...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
