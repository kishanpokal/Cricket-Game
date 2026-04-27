import type {  MatchState  } from '../../types/cricket';

export default function Commentary({ matchState }: { matchState: MatchState }) {
  const isInnings1 = matchState.status === 'batting' && !matchState.innings2;
  const currentInnings = isInnings1 ? matchState.innings1 : matchState.innings2;

  if (!currentInnings || !currentInnings.ballLog || currentInnings.ballLog.length === 0) {
    return (
      <div className="bg-gray-800 p-4 border-t border-gray-700 h-48 overflow-y-auto flex items-center justify-center text-gray-500 italic">
        Match is about to begin.
      </div>
    );
  }

  // Get last 5 balls reversed
  const recentLogs = [...(currentInnings.ballLog || [])].reverse().slice(0, 5);

  return (
    <div className="bg-gray-800 p-4 border-t border-gray-700 h-48 overflow-y-auto z-20">
      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Live Commentary</h3>
      <div className="space-y-3">
        {recentLogs.map((log, index) => (
          <div key={index} className="flex gap-4 items-start border-b border-gray-700/50 pb-2 last:border-0">
            <div className={`font-bold text-lg min-w-[3rem] text-center ${log.wicket ? 'text-red-500' : log.runs === 6 ? 'text-blue-400' : log.runs === 4 ? 'text-green-400' : 'text-gray-400'}`}>
               {log.wicket ? 'W' : log.runs}
            </div>
            <div>
               <p className="text-gray-200 text-sm">{log.commentary}</p>
               <p className="text-gray-500 text-xs mt-1">
                 {log.bowlType} ({log.length}, {log.line}) to {log.shotType}
               </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
