import { useState, useEffect, useRef, useCallback, memo } from 'react';
import type { BallAction, BowlType, Line, Length } from '../../types/cricket';
import { Zap } from 'lucide-react';
import { getBowlingSpeed } from '../../services/aiLogic';
import { AudioManager } from '../../utils/audio';

interface BowlingUIProps {
  onSubmit: (action: BallAction) => void;
  ballReady: boolean;
  bouncersBowledInOver: number;
}

/** Pitch zone maps Line + Length simultaneously */
interface PitchZone {
  line: Line;
  length: Length;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const PITCH_ZONES: PitchZone[] = [
  // Short row (top of pitch)
  { line: 'Outside Off', length: 'Short', label: 'Short Off', x: 0, y: 0, w: 33, h: 25 },
  { line: 'Middle', length: 'Short', label: 'Short Mid', x: 33, y: 0, w: 34, h: 25 },
  { line: 'Leg', length: 'Short', label: 'Short Leg', x: 67, y: 0, w: 33, h: 25 },
  // Good Length row (middle)
  { line: 'Outside Off', length: 'Good Length', label: 'Good Off', x: 0, y: 25, w: 33, h: 30 },
  { line: 'Middle', length: 'Good Length', label: 'Good Mid', x: 33, y: 25, w: 34, h: 30 },
  { line: 'Leg', length: 'Good Length', label: 'Good Leg', x: 67, y: 25, w: 33, h: 30 },
  // Full + Yorker row (bottom)
  { line: 'Outside Off', length: 'Full', label: 'Full Off', x: 0, y: 55, w: 33, h: 20 },
  { line: 'Middle', length: 'Yorker', label: 'Yorker', x: 33, y: 55, w: 34, h: 20 },
  { line: 'Leg', length: 'Full', label: 'Full Leg', x: 67, y: 55, w: 33, h: 20 },
  // Wide zones (sides)
  { line: 'Wide', length: 'Good Length', label: 'Wide', x: -12, y: 25, w: 12, h: 30 },
  { line: 'Off Stump', length: 'Good Length', label: 'Off Stump', x: 16, y: 25, w: 17, h: 30 },
];

// Bouncer is a special zone at top
const BOUNCER_ZONE: PitchZone = {
  line: 'Middle', length: 'Bouncer', label: 'Bouncer', x: 15, y: -15, w: 70, h: 15,
};

export default memo(function BowlingUI({ onSubmit, ballReady, bouncersBowledInOver }: BowlingUIProps) {
  const [bowlType, setBowlType] = useState<BowlType>('Pace');
  const [selectedZone, setSelectedZone] = useState<PitchZone | null>(null);
  const [timer, setTimer] = useState(15);
  const [timeLeft, setTimeLeft] = useState(15);
  const [submitted, setSubmitted] = useState(false);
  const lastTimerWarning = useRef(0);

  // Last 6 balls radar dots
  const [radarDots] = useState<Array<{ x: number; y: number }>>([]);

  const bouncerDisabled = bouncersBowledInOver >= 2;

  // Reset on new ball
  useEffect(() => {
    if (ballReady) {
      setSubmitted(false);
      setBowlType('Pace');
      setSelectedZone(null);
      setTimer(15);
      setTimeLeft(15);
    }
  }, [ballReady]);

  // Timer countdown with requestAnimationFrame
  useEffect(() => {
    if (submitted) return;

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
        handleAutoSubmit();
      }
    };

    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [submitted]);

  const handleFinalSubmit = useCallback((bt: BowlType, ln: Line, len: Length) => {
    if (submitted) return;
    setSubmitted(true);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    onSubmit({ bowlType: bt, line: ln, length: len });
  }, [submitted, onSubmit]);

  const handleAutoSubmit = useCallback(() => {
    // Auto-submit with random defaults if timer runs out and no zone selected
    let finalZone = selectedZone;
    let finalBowlType = bowlType;
    
    if (!finalZone) {
      const validZones = bouncerDisabled 
        ? PITCH_ZONES.filter(z => z.label !== 'Bouncer') 
        : [...PITCH_ZONES, BOUNCER_ZONE];
      finalZone = validZones[Math.floor(Math.random() * validZones.length)];
      
      const types: BowlType[] = ['Pace', 'Spin', 'Swing'];
      finalBowlType = types[Math.floor(Math.random() * types.length)];
    }
    
    handleFinalSubmit(finalBowlType, finalZone.line, finalZone.length);
  }, [selectedZone, bowlType, bouncerDisabled, handleFinalSubmit]);

  const handleZoneSelect = useCallback((zone: PitchZone) => {
    if (zone.length === 'Bouncer' && bouncerDisabled) return;
    setSelectedZone(zone);
  }, [bouncerDisabled]);

  const handleSubmit = useCallback(() => {
    if (!selectedZone) {
      // If no zone selected, use default
      handleFinalSubmit(bowlType, 'Off Stump', 'Good Length');
    } else {
      handleFinalSubmit(bowlType, selectedZone.line, selectedZone.length);
    }
  }, [selectedZone, bowlType, handleFinalSubmit]);

  if (submitted) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-5 rounded-xl text-center shadow-[0_0_40px_rgba(239,68,68,0.3)] border border-gray-700/50 backdrop-blur-xl">
        <div className="flex justify-center mb-2">
          <div className="w-8 h-8 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300 uppercase tracking-wider">
          Waiting for Batter
        </h3>
        <p className="text-gray-500 mt-1 text-[10px] sm:text-xs">
          {bowlType} — {selectedZone?.label ?? 'Randomizing...'}
          <span className="ml-2 text-gray-600">{getBowlingSpeed(bowlType)}</span>
        </p>
      </div>
    );
  }

  // Timer
  const timerProgress = timeLeft / 15;
  const circumference = 2 * Math.PI * 22;
  const strokeOffset = circumference * (1 - timerProgress);

  return (
    <div
      className="w-full bg-gradient-to-br from-gray-900/95 to-gray-800/95 p-3 sm:p-5 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.15)] border border-red-500/20 backdrop-blur-xl"
      role="group"
      aria-label="Bowling controls"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-1.5 sm:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="bg-red-600/20 p-1 rounded-lg border border-red-500/30">
            <span className="text-sm sm:text-base" aria-hidden="true">🎯</span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">Bowling</h3>
            <p className="text-[7px] sm:text-[9px] text-red-400/80 font-bold tracking-wider">
              TAP A ZONE & BOWL
            </p>
          </div>
        </div>

        {/* Circular timer */}
        <div className="relative w-10 h-10 sm:w-12 sm:h-12" aria-label={`${timer} seconds remaining`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="22"
              fill="none"
              stroke={timer <= 2 ? '#ef4444' : '#ef4444'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke 0.3s ease' }}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center font-mono text-sm sm:text-base font-black ${timer <= 2 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timer}
          </div>
        </div>
      </div>

      {/* Bowl type selector */}
      <div className="flex gap-1 mb-2 sm:mb-3" role="radiogroup" aria-label="Bowl type">
        {(['Pace', 'Spin', 'Swing'] as BowlType[]).map(t => (
          <button
            key={t}
            onClick={() => setBowlType(t)}
            role="radio"
            aria-checked={bowlType === t}
            className={`flex-1 py-1.5 sm:py-2.5 rounded-lg font-bold text-[9px] sm:text-xs uppercase tracking-widest transition-all duration-200 cursor-pointer ${
              bowlType === t
                ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_4px_15px_rgba(239,68,68,0.4)] border border-red-400/50'
                : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {t === 'Pace' ? '🔥' : t === 'Spin' ? '🌀' : '💨'} {t}
            <div className="text-[6px] sm:text-[8px] mt-0.5 opacity-60">{getBowlingSpeed(t)}</div>
          </button>
        ))}
      </div>

      {/* Pitch map SVG */}
      <div className="relative bg-[var(--color-soil)] rounded-xl p-1 sm:p-3 border border-[var(--color-soil-light)] mb-2 sm:mb-3">
        <div className="relative w-full max-w-[280px] mx-auto" style={{ paddingBottom: '70%' }}>
          <svg
            viewBox="-15 -20 130 120"
            className="absolute inset-0 w-full h-full"
            role="group"
            aria-label="Pitch map - select bowling zone"
          >
            {/* Pitch background */}
            <rect x="0" y="0" width="100" height="80" rx="4" fill="#c8a96e" opacity="0.3" />

            {/* Stump lines */}
            <line x1="35" y1="78" x2="65" y2="78" stroke="white" strokeWidth="1.5" opacity="0.5" />
            <line x1="35" y1="2" x2="65" y2="2" stroke="white" strokeWidth="1.5" opacity="0.5" />
            {/* Stump markers */}
            {[40, 50, 60].map(x => (
              <line key={`s1-${x}`} x1={x} y1="76" x2={x} y2="80" stroke="white" strokeWidth="2" opacity="0.6" />
            ))}
            {[40, 50, 60].map(x => (
              <line key={`s2-${x}`} x1={x} y1="0" x2={x} y2="4" stroke="white" strokeWidth="2" opacity="0.6" />
            ))}

            {/* Crease lines */}
            <line x1="20" y1="72" x2="80" y2="72" stroke="white" strokeWidth="0.5" opacity="0.3" />
            <line x1="20" y1="8" x2="80" y2="8" stroke="white" strokeWidth="0.5" opacity="0.3" />

            {/* Bouncer zone */}
            <g
              onClick={() => !bouncerDisabled && handleZoneSelect(BOUNCER_ZONE)}
              className={bouncerDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              role="button"
              aria-label={`Bouncer zone${bouncerDisabled ? ' (limit reached)' : ''}`}
              aria-disabled={bouncerDisabled}
            >
              <rect
                x={BOUNCER_ZONE.x}
                y={BOUNCER_ZONE.y}
                width={BOUNCER_ZONE.w}
                height={BOUNCER_ZONE.h}
                rx="3"
                fill={bouncerDisabled ? '#374151' : selectedZone === BOUNCER_ZONE ? '#ef4444' : '#7c3aed'}
                opacity={bouncerDisabled ? 0.3 : selectedZone === BOUNCER_ZONE ? 0.8 : 0.4}
                stroke={selectedZone === BOUNCER_ZONE ? 'white' : 'transparent'}
                strokeWidth="1.5"
              />
              <text
                x={BOUNCER_ZONE.x + BOUNCER_ZONE.w / 2}
                y={BOUNCER_ZONE.y + BOUNCER_ZONE.h / 2 + 3}
                textAnchor="middle"
                fill={bouncerDisabled ? '#4b5563' : 'white'}
                fontSize="6"
                fontWeight="bold"
              >
                {bouncerDisabled ? 'MAX 2' : 'BOUNCER'}
              </text>
            </g>

            {/* Main pitch zones (excluding Wide and Off Stump which are overlaid differently) */}
            {PITCH_ZONES.filter(z => z.line !== 'Wide' && z.line !== 'Off Stump').map((zone, i) => {
              const isSelected = selectedZone?.label === zone.label;
              return (
                <g
                  key={i}
                  onClick={() => handleZoneSelect(zone)}
                  className="cursor-pointer"
                  role="button"
                  aria-label={`${zone.label} zone`}
                  aria-pressed={isSelected}
                >
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    fill={isSelected ? '#ef4444' : '#22c55e'}
                    opacity={isSelected ? 0.7 : 0.15}
                    stroke={isSelected ? 'white' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isSelected ? '1.5' : '0.5'}
                    rx="1"
                  />
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 2.5}
                    textAnchor="middle"
                    fill={isSelected ? 'white' : 'rgba(255,255,255,0.6)'}
                    fontSize="5"
                    fontWeight="bold"
                  >
                    {zone.label.split(' ')[0]}
                  </text>
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 8}
                    textAnchor="middle"
                    fill={isSelected ? 'white' : 'rgba(255,255,255,0.4)'}
                    fontSize="4"
                  >
                    {zone.label.split(' ')[1] || ''}
                  </text>
                </g>
              );
            })}

            {/* Radar dots (last 6 balls) */}
            {radarDots.map((dot, i) => (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r="2.5"
                fill="#ef4444"
                opacity={0.3 + (i / radarDots.length) * 0.5}
                stroke="white"
                strokeWidth="0.5"
              />
            ))}
          </svg>
        </div>

        {/* Zone hint */}
        <div className="text-center mt-1">
          <p className="text-[9px] sm:text-[10px] text-gray-400 font-semibold">
            {selectedZone ? (
              <span className="text-white">{selectedZone.label} — {selectedZone.line}, {selectedZone.length}</span>
            ) : (
              'Tap a zone on the pitch to select line & length'
            )}
          </p>
        </div>
      </div>

      {/* Bowl Delivery button */}
      <button
        onClick={handleSubmit}
        className="w-full relative overflow-hidden group bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 py-2 sm:py-3 rounded-lg font-black text-sm sm:text-base text-white uppercase tracking-widest shadow-[0_8px_25px_rgba(239,68,68,0.4)] hover:shadow-[0_8px_35px_rgba(239,68,68,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
        aria-label={`Bowl ${bowlType} delivery to ${selectedZone?.label ?? 'Good Off'}`}
      >
        <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <span className="relative z-10 flex items-center justify-center gap-2">
          Bowl Delivery
          <Zap className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
});
