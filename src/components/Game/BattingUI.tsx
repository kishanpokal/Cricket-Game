import { useState, useEffect, useRef, useCallback, memo } from 'react';
import type { BallAction, ShotType } from '../../types/cricket';
import { Zap } from 'lucide-react';
import { AudioManager } from '../../utils/audio';

interface BattingUIProps {
  onSubmit: (action: BallAction) => void;
  ballReady: boolean;
  currentBallInOver?: number;
  currentBowlType?: string;
}

const SHOTS: { type: ShotType; icon: string; label: string; tag: string }[] = [
  { type: 'Defensive', icon: '🛡️', label: 'DEF', tag: 'Safe Block' },
  { type: 'Drive', icon: '🏏', label: 'DRV', tag: 'Cover Drive' },
  { type: 'Cut', icon: '⚔️', label: 'CUT', tag: 'Late Cut' },
  { type: 'Pull', icon: '💪', label: 'PLL', tag: 'Square Pull' },
  { type: 'Sweep', icon: '🧹', label: 'SWP', tag: 'Paddle Sweep' },
  { type: 'Slog', icon: '💥', label: 'SLG', tag: 'Midwicket Slog' },
  { type: 'Loft', icon: '🚀', label: 'LFT', tag: 'Straight Loft' },
];

export default memo(function BattingUI({ onSubmit, ballReady, currentBallInOver = 1, currentBowlType }: BattingUIProps) {
  const [shotType, setShotType] = useState<ShotType>('Defensive');
  const [power, setPower] = useState(50);
  const [timer, setTimer] = useState(15);
  const [timeLeft, setTimeLeft] = useState(15);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<SVGCircleElement>(null);
  const lastTimerWarning = useRef(0);

  // Reset when a new ball is ready — keep power from last ball
  useEffect(() => {
    if (ballReady) {
      setSubmitted(false);
      setShotType('Defensive');
      setTimer(15);
      setTimeLeft(15);
    }
  }, [ballReady]);

  const shotTypeRef = useRef(shotType);
  const powerRef = useRef(power);

  useEffect(() => { shotTypeRef.current = shotType; }, [shotType]);
  useEffect(() => { powerRef.current = power; }, [power]);

  const handleSubmit = useCallback((isTimeout = false) => {
    if (submitted) return;
    setSubmitted(true);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    if (isTimeout) {
      const randomShot = SHOTS[Math.floor(Math.random() * SHOTS.length)].type;
      const randomPower = Math.floor(Math.random() * 61) + 40; // 40-100
      onSubmit({ shotType: randomShot, power: randomPower });
    } else {
      onSubmit({ shotType: shotTypeRef.current, power: powerRef.current });
    }
  }, [submitted, onSubmit]);

  // Smooth timer countdown
  useEffect(() => {
    if (submitted) return;
    if (currentBallInOver === 1 && !currentBowlType) return;

    const startTime = Date.now();
    let animationFrameId: number;

    const updateTimer = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newTimeLeft = Math.max(0, 15 - elapsed);
      setTimeLeft(newTimeLeft);
      setTimer(Math.ceil(newTimeLeft));

      const currentIntTimer = Math.ceil(newTimeLeft);
      if (currentIntTimer <= 2 && currentIntTimer > 0 && currentIntTimer !== lastTimerWarning.current) {
        lastTimerWarning.current = currentIntTimer;
        AudioManager.getInstance().playTimerWarning();
      }

      if (newTimeLeft > 0) {
        animationFrameId = requestAnimationFrame(updateTimer);
      } else {
        handleSubmit(true);
      }
    };

    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [submitted, currentBallInOver, currentBowlType, handleSubmit]);

  const handleShotSelect = useCallback((shot: ShotType) => {
    setShotType(shot);
  }, []);

  if (currentBallInOver === 1 && !currentBowlType) {
    return (
      <div className="w-full bg-[#0b140e] p-5 rounded-2xl text-center border border-[#ffb800]/30 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#ffb800] border-t-transparent animate-spin" />
        </div>
        <h3 className="font-display text-2xl font-bold uppercase text-[#ffb800] tracking-wider leading-none">
          OVER TRANSITION
        </h3>
        <p className="text-[#8c8273] text-xs font-mono mt-1">
          Awaiting bowler style selection...
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="w-full bg-[#0b140e] p-5 rounded-2xl text-center border border-[#1b4d2e] shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#4ade80] border-t-transparent animate-spin" />
        </div>
        <h3 className="font-display text-2xl font-bold uppercase text-[#4ade80] tracking-wider leading-none">
          STRIKE LOCKED
        </h3>
        <p className="text-[#c8bead] text-xs font-mono mt-1">
          {shotType} • {power}% Power gauge • Ready for delivery
        </p>
      </div>
    );
  }

  const timerProgress = timeLeft / 15;
  const circumference = 2 * Math.PI * 22;
  const strokeOffset = circumference * (1 - timerProgress);

  // Dynamic power color calculation
  const getPowerLabel = (p: number) => {
    if (p < 40) return { text: 'DEFENSIVE / GAP', color: '#4ade80' };
    if (p < 75) return { text: 'BALANCED DRIVE', color: '#ffb800' };
    return { text: 'MAXIMUM SIX HAZARD', color: '#ff2a36' };
  };
  const powerInfo = getPowerLabel(power);

  return (
    <div
      className="w-full bg-gradient-to-b from-[#0b140e] to-[#070c08] p-3 sm:p-4 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] border border-[#f5efe6]/10"
      role="group"
      aria-label="Batting tactical controls"
    >
      {/* Header with Circular Shot Clock */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1b4d2e]/40 border border-[#4ade80]/30 flex items-center justify-center text-lg">
            🏏
          </div>
          <div>
            <h3 className="font-display text-xl font-bold uppercase text-[#f5efe6] leading-none">
              BATSMAN'S CREASE
            </h3>
            <p className="text-[10px] text-[#ffb800] font-sports font-semibold uppercase tracking-wider">
              SHOT SELECTION & POWER GAUGE
            </p>
          </div>
        </div>

        {/* Shot Clock Arc */}
        <div className="relative w-11 h-11" aria-label={`${timer} seconds remaining`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(245,239,230,0.1)" strokeWidth="3.5" />
            <circle
              ref={timerRef}
              cx="24" cy="24" r="22"
              fill="none"
              stroke={timer <= 2 ? '#ff2a36' : '#ffb800'}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke 0.25s ease' }}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-sports text-base font-black ${timer <= 2 ? 'text-[#ff2a36] animate-pulse' : 'text-[#f5efe6]'}`}>
            {timer}
          </div>
        </div>
      </div>

      {/* Shot Selector Bar */}
      <div className="mb-3" role="radiogroup" aria-label="Shot type">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {SHOTS.map((shot) => {
            const isSelected = shotType === shot.type;
            return (
              <button
                key={shot.type}
                onClick={() => handleShotSelect(shot.type)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-2 px-3 sm:px-3.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer uppercase tracking-wider border ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#d9222a] to-[#a81018] text-white border-white/30 shadow-[0_4px_16px_rgba(217,34,42,0.5)] scale-105'
                    : 'bg-[#122417] text-[#8c8273] border-[#f5efe6]/08 hover:bg-[#1a3522] hover:text-[#f5efe6]'
                }`}
              >
                <span className="text-base" aria-hidden="true">{shot.icon}</span>
                <span className="font-sports font-bold">{shot.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Power Gauge with Sports Gradient */}
      <div className="bg-[#070c08] p-2.5 sm:p-3 rounded-xl border border-[#f5efe6]/10 mb-3 shadow-inner">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#8c8273] uppercase tracking-wider">STROKE POWER</span>
            <span className="text-[10px] font-extrabold uppercase font-sports" style={{ color: powerInfo.color }}>
              • {powerInfo.text}
            </span>
          </div>
          <span className="font-sports font-black text-xl text-[#f5efe6] tabular-nums">
            {power}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={power}
          onChange={(e) => setPower(Number(e.target.value))}
          className="w-full h-2.5 bg-[#122417] rounded-full cursor-pointer outline-none"
          style={{
            touchAction: 'none',
            background: `linear-gradient(to right, #10b981 0%, #ffb800 60%, #ff2a36 100%)`,
          }}
          aria-label={`Power level: ${power}%`}
        />
        <div className="flex justify-between text-[9px] font-bold text-[#8c8273] mt-1.5 px-1 uppercase tracking-wider font-mono">
          <span>0% Safe</span>
          <span className="text-[#ffb800]">50% Controlled</span>
          <span className="text-[#ff2a36]">100% Boundary</span>
        </div>
      </div>

      {/* Strike Ball Action Button */}
      <button
        onClick={() => handleSubmit(false)}
        className="w-full relative overflow-hidden group bg-gradient-to-r from-[#d9222a] to-[#a81018] hover:from-[#ff2a36] hover:to-[#c4131b] py-3 rounded-xl font-display text-2xl uppercase tracking-widest font-bold text-white shadow-[0_8px_24px_rgba(217,34,42,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2"
        aria-label={`Execute ${shotType} shot`}
      >
        <span>EXECUTE STROKE</span>
        <Zap className="w-5 h-5 text-[#ffb800]" aria-hidden="true" />
      </button>
    </div>
  );
});
