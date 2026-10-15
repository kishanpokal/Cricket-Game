import { useState, useEffect, useRef, useCallback, memo } from 'react';
import type { BallAction, BowlType, Line, Length } from '../../types/cricket';
import { Crosshair } from 'lucide-react';
import { getBowlingSpeed } from '../../services/aiLogic';
import { AudioManager } from '../../utils/audio';

interface BowlingUIProps {
  onSubmit: (action: BallAction) => void;
  ballReady: boolean;
  bouncersBowledInOver: number;
  currentBallInOver: number;
  currentBowlType?: string;
  onSelectBowlType?: (type: BowlType) => void;
}

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
  // Short row
  { line: 'Outside Off', length: 'Short', label: 'Short Off', x: 0, y: 0, w: 33, h: 25 },
  { line: 'Middle', length: 'Short', label: 'Short Mid', x: 33, y: 0, w: 34, h: 25 },
  { line: 'Leg', length: 'Short', label: 'Short Leg', x: 67, y: 0, w: 33, h: 25 },
  // Good Length row
  { line: 'Outside Off', length: 'Good Length', label: 'Good Off', x: 0, y: 25, w: 33, h: 30 },
  { line: 'Middle', length: 'Good Length', label: 'Good Mid', x: 33, y: 25, w: 34, h: 30 },
  { line: 'Leg', length: 'Good Length', label: 'Good Leg', x: 67, y: 25, w: 33, h: 30 },
  // Full & Yorker row
  { line: 'Outside Off', length: 'Full', label: 'Full Off', x: 0, y: 55, w: 33, h: 20 },
  { line: 'Middle', length: 'Yorker', label: 'Yorker', x: 33, y: 55, w: 34, h: 20 },
  { line: 'Leg', length: 'Full', label: 'Full Leg', x: 67, y: 55, w: 33, h: 20 },
  // Outliers
  { line: 'Wide', length: 'Good Length', label: 'Wide', x: -12, y: 25, w: 12, h: 30 },
  { line: 'Off Stump', length: 'Good Length', label: 'Off Stump', x: 16, y: 25, w: 17, h: 30 },
];

const BOUNCER_ZONE: PitchZone = {
  line: 'Middle', length: 'Bouncer', label: 'Bouncer', x: 15, y: -15, w: 70, h: 15,
};

export default memo(function BowlingUI({ onSubmit, ballReady, bouncersBowledInOver, currentBallInOver, currentBowlType, onSelectBowlType }: BowlingUIProps) {
  const [bowlType, setBowlType] = useState<BowlType>((currentBowlType as BowlType) || 'Pace');
  const [bowlTypeLockedForOver, setBowlTypeLockedForOver] = useState(false);
  const [selectedZone, setSelectedZone] = useState<PitchZone | null>(null);
  const [timer, setTimer] = useState(15);
  const [timeLeft, setTimeLeft] = useState(15);
  const [submitted, setSubmitted] = useState(false);
  const lastTimerWarning = useRef(0);

  const bouncerDisabled = bouncersBowledInOver >= 2;

  useEffect(() => {
    if (currentBowlType) {
      setBowlTypeLockedForOver(true);
      setBowlType(currentBowlType as BowlType);
    } else if (currentBallInOver === 0) {
      setBowlTypeLockedForOver(false);
    }
  }, [currentBowlType, currentBallInOver]);

  useEffect(() => {
    if (ballReady) {
      setSubmitted(false);
      setSelectedZone(null);
      setTimer(15);
      setTimeLeft(15);
      if (currentBallInOver === 0 && !currentBowlType) {
        setBowlTypeLockedForOver(false);
      }
    }
  }, [ballReady, currentBallInOver, currentBowlType]);

  useEffect(() => {
    if (submitted) return;
    if (!bowlTypeLockedForOver) return;

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
        handleAutoSubmitRef.current();
      }
    };

    animationFrameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(animationFrameId);
  }, [submitted, bowlTypeLockedForOver]);

  const selectedZoneRef = useRef(selectedZone);
  const bowlTypeRef = useRef(bowlType);

  useEffect(() => { selectedZoneRef.current = selectedZone; }, [selectedZone]);
  useEffect(() => { bowlTypeRef.current = bowlType; }, [bowlType]);

  const handleFinalSubmit = useCallback((bt: BowlType, ln: Line, len: Length) => {
    if (submitted) return;
    setSubmitted(true);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    onSubmit({ bowlType: bt, line: ln, length: len });
  }, [submitted, onSubmit]);

  const handleAutoSubmitRef = useRef(() => {});
  handleAutoSubmitRef.current = () => {
    let finalZone = selectedZoneRef.current;
    const finalBowlType = bowlTypeRef.current;
    
    if (!finalZone) {
      const validZones = bouncerDisabled 
        ? PITCH_ZONES.filter(z => z.label !== 'Bouncer') 
        : [...PITCH_ZONES, BOUNCER_ZONE];
      finalZone = validZones[Math.floor(Math.random() * validZones.length)];
    }
    
    handleFinalSubmit(finalBowlType, finalZone.line, finalZone.length);
  };

  const handleZoneSelect = useCallback((zone: PitchZone) => {
    if (zone.length === 'Bouncer' && bouncerDisabled) return;
    setSelectedZone(zone);
  }, [bouncerDisabled]);

  const handleSubmit = useCallback(() => {
    if (!selectedZone) {
      handleFinalSubmit(bowlType, 'Off Stump', 'Good Length');
    } else {
      handleFinalSubmit(bowlType, selectedZone.line, selectedZone.length);
    }
  }, [selectedZone, bowlType, handleFinalSubmit]);

  const handleBowlTypeSelect = useCallback((type: BowlType) => {
    setBowlType(type);
    setBowlTypeLockedForOver(true);
    if (onSelectBowlType) {
      onSelectBowlType(type);
    }
  }, [onSelectBowlType]);

  // Screen 1: New Over Style Selector
  if (!bowlTypeLockedForOver && !submitted) {
    return (
      <div
        className="w-full bg-[#0b140e] p-5 sm:p-6 rounded-2xl shadow-2xl border border-[#ffb800]/30 backdrop-blur-xl"
        role="group"
        aria-label="Select bowling discipline"
      >
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#1b4d2e]/40 border border-[#ffb800]/40 flex items-center justify-center mx-auto mb-2 text-2xl shadow-md">
            🎯
          </div>
          <h3 className="font-display text-3xl font-bold uppercase text-[#f5efe6] leading-none">
            NEW OVER • CHOOSE DISCIPLINE
          </h3>
          <p className="text-[11px] text-[#ffb800] font-sports font-semibold uppercase tracking-wider mt-1">
            LOCKED FOR ALL 6 BALLS OF THIS OVER
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['Pace', 'Spin', 'Swing'] as BowlType[]).map(t => (
            <button
              key={t}
              onClick={() => handleBowlTypeSelect(t)}
              className="py-4 px-3 rounded-xl font-display text-xl sm:text-2xl uppercase tracking-wider font-bold transition-all cursor-pointer bg-[#122417] text-[#f5efe6] border border-[#f5efe6]/10 hover:border-[#ffb800]/50 hover:bg-[#1a3824] hover:shadow-[0_4px_20px_rgba(255,184,0,0.25)] flex flex-col items-center justify-center gap-1 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {t === 'Pace' ? '🔥' : t === 'Spin' ? '🌀' : '💨'}
              </span>
              <span>{t}</span>
              <span className="text-[10px] text-[#8c8273] font-mono font-normal">
                {getBowlingSpeed(t)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Screen 2: Waiting for Batter to React
  if (submitted) {
    return (
      <div className="w-full bg-[#0b140e] p-5 rounded-2xl text-center border border-[#1b4d2e] shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff2a36] border-t-transparent animate-spin" />
        </div>
        <h3 className="font-display text-2xl font-bold uppercase text-[#ff2a36] tracking-wider leading-none">
          DELIVERY RELEASED
        </h3>
        <p className="text-[#c8bead] text-xs font-mono mt-1">
          {bowlType} • {selectedZone?.label ?? 'Target Locked'} • {getBowlingSpeed(bowlType)}
        </p>
      </div>
    );
  }

  const timerProgress = timeLeft / 15;
  const circumference = 2 * Math.PI * 22;
  const strokeOffset = circumference * (1 - timerProgress);

  return (
    <div
      className="w-full bg-gradient-to-b from-[#0b140e] to-[#070c08] p-3 sm:p-4 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] border border-[#f5efe6]/10"
      role="group"
      aria-label="Bowling targeter"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#d9222a]/20 border border-[#ff2a36]/30 flex items-center justify-center text-lg">
            🎯
          </div>
          <div>
            <h3 className="font-display text-xl font-bold uppercase text-[#f5efe6] leading-none">
              BOWLER'S RUN-UP
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#ffb800] font-sports font-semibold uppercase tracking-wider">
                {bowlType} ({getBowlingSpeed(bowlType)})
              </span>
              <span className="text-[9px] text-[#8c8273] uppercase font-mono">
                • Bouncers Left: {Math.max(0, 2 - bouncersBowledInOver)}
              </span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="relative w-11 h-11" aria-label={`${timer} seconds remaining`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(245,239,230,0.1)" strokeWidth="3.5" />
            <circle
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

      {/* High-Precision Pitch Radar Targeter SVG */}
      <div className="relative bg-[#070c08] rounded-xl p-2 sm:p-3 border border-[#f5efe6]/10 mb-3 shadow-inner">
        <div className="relative w-full max-w-[280px] mx-auto" style={{ paddingBottom: '68%' }}>
          <svg
            viewBox="-15 -20 130 120"
            className="absolute inset-0 w-full h-full"
            role="group"
            aria-label="Pitch radar map"
          >
            {/* Clay Turf Ground */}
            <rect x="0" y="0" width="100" height="80" rx="3" fill="#2d2217" opacity="0.6" />
            <rect x="0" y="0" width="100" height="80" rx="3" fill="none" stroke="#f5efe6" strokeWidth="0.4" opacity="0.2" />

            {/* Creases (Popping & Bowling) in Crisp White */}
            <line x1="20" y1="72" x2="80" y2="72" stroke="#f5efe6" strokeWidth="0.75" opacity="0.8" />
            <line x1="20" y1="8" x2="80" y2="8" stroke="#f5efe6" strokeWidth="0.75" opacity="0.8" />

            {/* Stumps */}
            {[40, 50, 60].map(x => (
              <line key={`s1-${x}`} x1={x} y1="76" x2={x} y2="80" stroke="#ffb800" strokeWidth="1.8" />
            ))}
            {[40, 50, 60].map(x => (
              <line key={`s2-${x}`} x1={x} y1="0" x2={x} y2="4" stroke="#ffb800" strokeWidth="1.8" />
            ))}

            {/* Bouncer Zone */}
            <g
              onClick={() => !bouncerDisabled && handleZoneSelect(BOUNCER_ZONE)}
              className={bouncerDisabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}
              role="button"
            >
              <rect
                x={BOUNCER_ZONE.x}
                y={BOUNCER_ZONE.y}
                width={BOUNCER_ZONE.w}
                height={BOUNCER_ZONE.h}
                rx="3"
                fill={selectedZone === BOUNCER_ZONE ? '#d9222a' : '#1b4d2e'}
                opacity={selectedZone === BOUNCER_ZONE ? 0.9 : 0.5}
                stroke={selectedZone === BOUNCER_ZONE ? '#ffb800' : 'rgba(245,239,230,0.2)'}
                strokeWidth={selectedZone === BOUNCER_ZONE ? 1.5 : 0.5}
              />
              <text
                x={BOUNCER_ZONE.x + BOUNCER_ZONE.w / 2}
                y={BOUNCER_ZONE.y + BOUNCER_ZONE.h / 2 + 2.5}
                textAnchor="middle"
                fill="#f5efe6"
                fontSize="5"
                fontFamily="Chakra Petch"
                fontWeight="bold"
              >
                {bouncerDisabled ? 'BOUNCER (LIMIT MET)' : 'BOUNCER CORRIDOR'}
              </text>
            </g>

            {/* Pitch Zones */}
            {PITCH_ZONES.filter(z => z.line !== 'Wide' && z.line !== 'Off Stump').map((zone, i) => {
              const isSelected = selectedZone?.label === zone.label;
              return (
                <g
                  key={i}
                  onClick={() => handleZoneSelect(zone)}
                  className="cursor-pointer"
                  role="button"
                >
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    fill={isSelected ? '#d9222a' : '#122417'}
                    opacity={isSelected ? 0.85 : 0.35}
                    stroke={isSelected ? '#ffb800' : 'rgba(245,239,230,0.15)'}
                    strokeWidth={isSelected ? 1.5 : 0.4}
                    rx="1.5"
                  />
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 1}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#c8bead'}
                    fontSize="5"
                    fontFamily="Chakra Petch"
                    fontWeight="bold"
                  >
                    {zone.label.split(' ')[0]}
                  </text>
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 6.5}
                    textAnchor="middle"
                    fill={isSelected ? '#ffb800' : '#8c8273'}
                    fontSize="4"
                    fontFamily="Chakra Petch"
                  >
                    {zone.label.split(' ')[1] || ''}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected zone readout */}
        <div className="text-center mt-1.5">
          <p className="text-[10px] text-[#c8bead] font-sports font-semibold">
            {selectedZone ? (
              <span className="text-[#ffb800] uppercase">
                TARGET: {selectedZone.label} ({selectedZone.line} • {selectedZone.length})
              </span>
            ) : (
              'TAP PITCH TO DESIGNATE LINE & LENGTH TARGET'
            )}
          </p>
        </div>
      </div>

      {/* Bowl Action Button */}
      <button
        onClick={handleSubmit}
        className="w-full relative overflow-hidden group bg-gradient-to-r from-[#d9222a] to-[#a81018] hover:from-[#ff2a36] hover:to-[#c4131b] py-3 rounded-xl font-display text-2xl uppercase tracking-widest font-bold text-white shadow-[0_8px_24px_rgba(217,34,42,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2"
        aria-label="Release delivery"
      >
        <span>RELEASE DELIVERY</span>
        <Crosshair className="w-5 h-5 text-[#ffb800]" aria-hidden="true" />
      </button>
    </div>
  );
});
