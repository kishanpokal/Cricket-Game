import type {  MatchState  } from '../../types/cricket';
import { getMaxWickets } from '../../services/aiLogic';

export default function Scoreboard({ matchState }: { matchState: MatchState }) {
  const isInnings2 = !!matchState.innings2;
  const currentInnings = isInnings2 ? matchState.innings2 : matchState.innings1;

  if (!currentInnings) return null;

  const maxOvers = matchState.format === 'T20' ? 20 : matchState.format === 'ODI' ? 50 : matchState.customOvers;
  const maxWickets = getMaxWickets(maxOvers);
  
  // Target only exists in innings 2
  const target = isInnings2 && matchState.innings1 ? matchState.innings1.score + 1 : null;
  
  // Figure out who is batting right now
  const p1BattedFirst = matchState.player1.role === 'bat';
  let batterName: string | undefined;
  let bowlerName: string | undefined;

  if (isInnings2) {
    // Innings 2: roles swap
    batterName = p1BattedFirst ? matchState.player2?.displayName : matchState.player1.displayName;
    bowlerName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
  } else {
    // Innings 1: original roles
    batterName = p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName;
    bowlerName = p1BattedFirst ? matchState.player2?.displayName : matchState.player1.displayName;
  }

  // Chase info
  const runsNeeded = target ? target - currentInnings.score : null;
  const ballsRemaining = (maxOvers * 6) - (currentInnings.overs * 6 + currentInnings.balls);
  const wicketsLeft = maxWickets - currentInnings.wickets;

  return (
    <div className="bg-gray-900 p-4 border-b border-gray-800 shadow-lg z-20">
      {/* Innings 1 score (shown during innings 2 as reference) */}
      {isInnings2 && matchState.innings1 && (
        <div className="flex items-center justify-center gap-2 mb-2 text-sm">
          <span className="text-gray-500">1st Innings:</span>
          <span className="font-bold text-gray-300">
            {p1BattedFirst ? matchState.player1.displayName : matchState.player2?.displayName}
          </span>
          <span className="font-black text-white">
            {matchState.innings1.score}/{matchState.innings1.wickets}
          </span>
          <span className="text-gray-500">
            ({matchState.innings1.overs}.{matchState.innings1.balls} ov)
          </span>
        </div>
      )}

      <div className="flex justify-between items-center px-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
            {isInnings2 ? '2nd Inn' : '1st Inn'} • {batterName}
          </span>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black">{currentInnings.score}</span>
            <span className="text-2xl font-bold text-red-400 mb-1">/ {currentInnings.wickets}</span>
            <span className="text-sm font-semibold text-gray-500 mb-2">({maxWickets} max)</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-3xl font-bold mb-1">
            <span className="text-blue-400">{currentInnings.overs}.{currentInnings.balls}</span>
            <span className="text-gray-500 text-xl"> / {maxOvers} ov</span>
          </div>
          {target && runsNeeded !== null && runsNeeded > 0 && (
            <div className="text-sm font-bold text-yellow-500 bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-700/50">
              Need {runsNeeded} off {ballsRemaining} balls
            </div>
          )}
          {target && runsNeeded !== null && runsNeeded <= 0 && (
            <div className="text-sm font-bold text-green-500 bg-green-900/30 px-3 py-1 rounded-full border border-green-700/50">
              Target achieved! 🎉
            </div>
          )}
          {!target && (
            <div className="text-xs text-gray-500 mt-1">
              {wicketsLeft} wickets remaining
            </div>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Bowling: {bowlerName}</span>
          <div className="flex gap-1">
            {(currentInnings.ballLog || []).slice(-6).map((ball, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                ball.wicket ? 'bg-red-500 text-white' : 
                ball.runs === 6 ? 'bg-purple-500 text-white' : 
                ball.runs === 4 ? 'bg-green-500 text-white' : 
                ball.runs >= 2 ? 'bg-blue-600 text-white' :
                ball.runs === 1 ? 'bg-gray-600 text-white' :
                'bg-gray-700 text-gray-300'
              }`}>
                {ball.wicket ? 'W' : ball.runs}
              </div>
            ))}
            {(!currentInnings.ballLog || currentInnings.ballLog.length === 0) && (
              <div className="text-gray-600 text-sm italic py-1">Over not started</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
