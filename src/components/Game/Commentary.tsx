import { useRef, useEffect, memo } from 'react';
import type { MatchState } from '../../types/cricket';
import { AudioManager } from '../../utils/audio';
import { Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

interface CommentaryProps {
  matchState: MatchState;
}

export default memo(function Commentary({ matchState }: CommentaryProps) {
  const isInnings1 = matchState.status === 'batting' && !matchState.innings2;
  const currentInnings = isInnings1 ? matchState.innings1 : matchState.innings2;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(AudioManager.getInstance().getMuted());

  // Auto-scroll to newest entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentInnings?.ballLog?.length]);

  const toggleMute = () => {
    const am = AudioManager.getInstance();
    const newMuted = !muted;
    am.setMuted(newMuted);
    setMuted(newMuted);
  };

  if (!currentInnings || !currentInnings.ballLog || currentInnings.ballLog.length === 0) {
    return (
      <div
        className="bg-[var(--color-night-sky)] p-3 sm:p-4 border-t border-gray-800 h-20 sm:h-28 overflow-y-auto flex items-center justify-center text-gray-500 italic text-xs sm:text-sm"
        style={{ zIndex: 'var(--z-hud)' as string }}
        role="log"
        aria-label="Live commentary"
      >
        Match is about to begin.
      </div>
    );
  }

  // Last 5 balls, newest first
  const recentLogs = [...(currentInnings.ballLog || [])].reverse().slice(0, 5);

  return (
    <div
      className="bg-[var(--color-night-sky)] border-t border-gray-800 h-24 sm:h-32 overflow-hidden flex flex-col"
      style={{ zIndex: 'var(--z-hud)' as string }}
      role="log"
      aria-label="Live commentary"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/50 flex-shrink-0">
        <h3 className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          Live Commentary
        </h3>
        <button
          onClick={toggleMute}
          className="p-1 rounded-md hover:bg-gray-800 transition text-gray-500 hover:text-gray-300 cursor-pointer"
          aria-label={muted ? 'Unmute commentary' : 'Mute commentary'}
        >
          {muted
            ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          }
        </button>
      </div>

      {/* Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1.5 space-y-1.5 sm:space-y-2">
        {recentLogs.map((log, index) => {
          // Color-coded left border
          const borderColor = log.wicket
            ? 'border-l-[var(--color-wicket)]'
            : log.runs === 6
              ? 'border-l-[var(--color-six)]'
              : log.runs === 4
                ? 'border-l-[var(--color-four)]'
                : log.isNoBall
                  ? 'border-l-[var(--color-noball)]'
                  : log.isWide
                    ? 'border-l-[var(--color-wide)]'
                    : 'border-l-gray-700';

          return (
            <div
              key={index}
              className={`flex gap-2 sm:gap-3 items-start border-l-2 ${borderColor} pl-2 sm:pl-3 ${
                index === 0 ? 'animate-[slide-in-right_0.3s_ease-out]' : ''
              }`}
            >
              <div
                className={`font-bold text-sm sm:text-base min-w-[2rem] sm:min-w-[2.5rem] text-center ${
                  log.wicket
                    ? 'text-[var(--color-wicket)]'
                    : log.runs === 6
                      ? 'text-[var(--color-six)]'
                      : log.runs === 4
                        ? 'text-[var(--color-four)]'
                        : log.isNoBall
                          ? 'text-[var(--color-noball)]'
                          : 'text-gray-400'
                }`}
              >
                {log.isWide ? 'WD' : log.wicket ? 'W' : log.isNoBall ? `NB+${log.runs}` : log.runs}
              </div>
              <div className="min-w-0">
                <p className="text-gray-200 text-[10px] sm:text-xs leading-snug">{log.commentary}</p>
                {/* Pill badges for delivery details */}
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {log.bowlType && (
                    <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 font-semibold uppercase tracking-wider">
                      {log.bowlType}
                    </span>
                  )}
                  {log.length && (
                    <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 font-semibold uppercase tracking-wider">
                      {log.length}
                    </span>
                  )}
                  {log.line && (
                    <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 font-semibold uppercase tracking-wider">
                      {log.line}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
