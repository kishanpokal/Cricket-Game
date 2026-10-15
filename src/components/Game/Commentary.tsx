import { useRef, useEffect, memo } from 'react';
import type { MatchState } from '../../types/cricket';
import { AudioManager } from '../../utils/audio';
import { Volume2, VolumeX, Radio } from 'lucide-react';
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
        className="bg-[#070c08] p-3 sm:p-4 border-t border-[#f5efe6]/10 h-20 sm:h-28 overflow-y-auto flex items-center justify-center text-[#8c8273] font-sports uppercase tracking-wider text-xs sm:text-sm"
        style={{ zIndex: 'var(--z-hud)' as string }}
        role="log"
        aria-label="Live commentary"
      >
        <Radio className="w-4 h-4 mr-2 text-[#ffb800] animate-pulse" />
        Broadcast feed standing by for first ball...
      </div>
    );
  }

  // Last 5 balls, newest first
  const recentLogs = [...(currentInnings.ballLog || [])].reverse().slice(0, 5);

  return (
    <div
      className="bg-[#070c08] border-t border-[#f5efe6]/10 h-24 sm:h-32 overflow-hidden flex flex-col"
      style={{ zIndex: 'var(--z-hud)' as string }}
      role="log"
      aria-label="Live commentary"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#f5efe6]/08 flex-shrink-0 bg-[#09120c]">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#ff2a36] animate-pulse" />
          <h3 className="text-[#c8bead] text-[10px] sm:text-xs font-sports font-bold uppercase tracking-[0.15em]">
            BALL-BY-BALL COMMENTARY
          </h3>
        </div>
        <button
          onClick={toggleMute}
          className="p-1 rounded-md hover:bg-[#122417] transition text-[#8c8273] hover:text-[#f5efe6] cursor-pointer"
          aria-label={muted ? 'Unmute commentary' : 'Mute commentary'}
        >
          {muted
            ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ff2a36]" />
            : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffb800]" />
          }
        </button>
      </div>

      {/* Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1.5 space-y-1.5 sm:space-y-2">
        {recentLogs.map((log, index) => {
          const borderColor = log.wicket
            ? 'border-l-[#ff2a36]'
            : log.runs === 6
              ? 'border-l-[#ffb800]'
              : log.runs === 4
                ? 'border-l-[#10b981]'
                : log.isNoBall
                  ? 'border-l-[#f97316]'
                  : log.isWide
                    ? 'border-l-[#eab308]'
                    : 'border-l-[#1b4d2e]';

          return (
            <div
              key={index}
              className={`flex gap-2 sm:gap-3 items-start border-l-2 ${borderColor} pl-2 sm:pl-3 ${
                index === 0 ? 'animate-[slide-in-right_0.3s_ease-out]' : ''
              }`}
            >
              <div
                className={`font-sports font-black text-sm sm:text-base min-w-[2rem] sm:min-w-[2.5rem] text-center tabular-nums ${
                  log.wicket
                    ? 'text-[#ff2a36]'
                    : log.runs === 6
                      ? 'text-[#ffb800]'
                      : log.runs === 4
                        ? 'text-[#10b981]'
                        : log.isNoBall
                          ? 'text-[#f97316]'
                          : 'text-[#f5efe6]'
                }`}
              >
                {log.isWide ? 'WD' : log.wicket ? 'W' : log.isNoBall ? `NB+${log.runs}` : log.runs}
              </div>
              <div className="min-w-0">
                <p className="text-[#f5efe6] text-[10px] sm:text-xs leading-snug">{log.commentary}</p>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {log.bowlType && (
                    <span className="text-[8px] px-1.5 py-0.2 bg-[#122417] text-[#ffb800] rounded font-sports uppercase tracking-wider border border-[#ffb800]/20">
                      {log.bowlType}
                    </span>
                  )}
                  {log.length && (
                    <span className="text-[8px] px-1.5 py-0.2 bg-[#09120c] text-[#8c8273] rounded font-mono uppercase">
                      {log.length}
                    </span>
                  )}
                  {log.line && (
                    <span className="text-[8px] px-1.5 py-0.2 bg-[#09120c] text-[#8c8273] rounded font-mono uppercase">
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
