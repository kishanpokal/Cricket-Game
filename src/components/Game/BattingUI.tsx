import { useState, useEffect, useRef, useCallback, memo } from 'react';
import type { BallAction, ShotType } from '../../types/cricket';
import { Zap } from 'lucide-react';
import { AudioManager } from '../../utils/audio';

interface BattingUIProps {
  onSubmit: (action: BallAction) => void;
  ballReady: boolean;
}

const SHOTS: { type: ShotType; icon: string; label: string }[] = [
  { type: 'Defensive', icon: '🛡️', label: 'DEF' },
  { type: 'Drive', icon: '🏏', label: 'DRV' },
  { type: 'Cut', icon: '⚔️', label: 'CUT' },
  { type: 'Pull', icon: '💪', label: 'PLL' },
  { type: 'Sweep', icon: '🧹', label: 'SWP' },
  { type: 'Slog', icon: '💥', label: 'SLG' },
  { type: 'Loft', icon: '🚀', label: 'LFT' },
];

export default memo(function BattingUI({ onSubmit, ballReady }: BattingUIProps) {
  const [shotType, setShotType] = useState<ShotType>('Defensive');
  const [power, setPower] = useState(50);
  const [timer, setTimer] = useState(8);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<SVGCircleElement>(null);
  const lastTimerWarning = useRef(0);

  // Reset when a new ball is ready
  useEffect(() => {
    if (ballReady) {
      setSubmitted(false);
      setShotType('Defensive');
      setPower(50);
      setTimer(8);
    }
  }, [ballReady]);

  // Timer countdown
  useEffect(() => {
    if (submitted) return;

    if (timer <= 0) {
      handleSubmit();
      return;
    }

    // Play warning sound when timer <= 2
    if (timer <= 2 && timer !== lastTimerWarning.current) {
      lastTimerWarning.current = timer;
      AudioManager.getInstance().playTimerWarning();
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, timer]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    onSubmit({ shotType, power });
  }, [submitted, shotType, power, onSubmit]);

  const handleShotSelect = useCallback((shot: ShotType) => {
    setShotType(shot);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = SHOTS.findIndex(s => s.type === shotType);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (currentIndex + 1) % SHOTS.length;
      setShotType(SHOTS[next].type);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (currentIndex - 1 + SHOTS.length) % SHOTS.length;
      setShotType(SHOTS[prev].type);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [shotType, handleSubmit]);

  if (submitted) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 p-5 sm:p-6 rounded-2xl text-center shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-gray-700/50 backdrop-blur-xl">
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 uppercase tracking-wider">
          Waiting for Bowler
        </h3>
        <p className="text-gray-500 mt-1 text-xs sm:text-sm">
          {shotType} at {power}% power
        </p>
      </div>
    );
  }

  // Timer progress (0 to 1)
  const timerProgress = timer / 8;
  const circumference = 2 * Math.PI * 22;
  const strokeOffset = circumference * (1 - timerProgress);

  return (
    <div
      className="w-full bg-gradient-to-br from-gray-900/95 to-gray-800/95 p-3 sm:p-5 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)] border border-blue-500/20 backdrop-blur-xl"
      role="group"
      aria-label="Batting controls"
    >
      {/* Header with timer arc */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600/20 p-1.5 rounded-lg border border-blue-500/30">
            <span className="text-base" aria-hidden="true">🏏</span>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">Batting</h3>
            <p className="text-[8px] sm:text-[10px] text-blue-400/80 font-bold tracking-wider">
              SELECT SHOT & POWER
            </p>
          </div>
        </div>

        {/* Circular timer */}
        <div className="relative w-12 h-12 sm:w-14 sm:h-14" aria-label={`${timer} seconds remaining`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              ref={timerRef}
              cx="24" cy="24" r="22"
              fill="none"
              stroke={timer <= 2 ? '#ef4444' : '#3b82f6'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-mono text-base sm:text-lg font-black ${timer <= 2 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timer}
          </div>
        </div>
      </div>

      {/* Shot type selector — horizontal scrollable strip */}
      <div className="mb-3" role="radiogroup" aria-label="Shot type" onKeyDown={handleKeyDown}>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {SHOTS.map((shot) => (
            <button
              key={shot.type}
              onClick={() => handleShotSelect(shot.type)}
              role="radio"
              aria-checked={shotType === shot.type}
              aria-label={`${shot.type} shot`}
              tabIndex={shotType === shot.type ? 0 : -1}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-2 px-3 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                shotType === shot.type
                  ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_4px_15px_rgba(59,130,246,0.5)] scale-105 border border-blue-400/50'
                  : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-blue-500/50'
              }`}
            >
              <span className="text-base sm:text-lg" aria-hidden="true">{shot.icon}</span>
              <span>{shot.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Power slider */}
      <div className="bg-gray-900/50 p-3 sm:p-4 rounded-xl border border-gray-800/50 mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Power</span>
          <div className="bg-gray-950 px-3 py-1 rounded-md border border-gray-800 shadow-inner">
            <span className="text-blue-400 font-black text-lg sm:text-xl">{power}%</span>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={power}
          onChange={(e) => setPower(Number(e.target.value))}
          className="w-full h-3 sm:h-4 bg-gray-800 rounded-full cursor-pointer outline-none shadow-inner"
          style={{
            touchAction: 'none',
            background: `linear-gradient(to right, #3b82f6 ${power}%, #1f2937 ${power}%)`,
          }}
          aria-label={`Power level: ${power}%`}
        />
        <div className="flex justify-between text-[8px] sm:text-[10px] font-bold text-gray-600 mt-1 px-0.5 uppercase tracking-wider">
          <span>Safe</span>
          <span>Balanced</span>
          <span className="text-yellow-700">Max Power</span>
        </div>
      </div>

      {/* Play Shot button */}
      <button
        onClick={handleSubmit}
        className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 py-3 sm:py-4 rounded-xl font-black text-base sm:text-lg text-white uppercase tracking-widest shadow-[0_8px_25px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_35px_rgba(59,130,246,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
        aria-label={`Play ${shotType} shot at ${power}% power`}
      >
        <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <span className="relative z-10 flex items-center justify-center gap-2">
          Play Shot
          <Zap className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
});
