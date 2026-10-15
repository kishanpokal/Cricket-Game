import { useState, useEffect, useRef } from 'react';
import type { MatchState, ShotType, Length, Line, BowlType } from '../../types/cricket';
import { AudioManager } from '../../utils/audio';
import { Video, Eye, Compass, Volume2, VolumeX, Clapperboard } from 'lucide-react';

export type CameraViewMode = 'director' | 'pavilion' | 'helmet_pov' | 'hawkeye';

type DeliveryPhase = 'idle' | 'runup' | 'delivery' | 'impact' | 'outfield' | 'completed';

interface PitchArenaProps {
  matchState: MatchState;
}

export default function PitchArena({ matchState }: PitchArenaProps) {
  const [camMode, setCamMode] = useState<CameraViewMode>('director');
  const [phase, setPhase] = useState<DeliveryPhase>('idle');
  const [soundMuted, setSoundMuted] = useState(AudioManager.getInstance().getMuted());
  const [ballSpeedDisplay, setBallSpeedDisplay] = useState('142.4 KM/H');
  const [stumpsBroken, setStumpsBroken] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  const prevBallCountRef = useRef(-1);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioManager = useRef(AudioManager.getInstance());

  const isInnings2 = !!matchState.innings2;
  const currentInnings = isInnings2 ? matchState.innings2 : matchState.innings1;
  const ballLog = currentInnings?.ballLog ?? [];
  const totalBalls = ballLog.length;
  const lastBall = ballLog.length > 0 ? ballLog[ballLog.length - 1] : null;

  // Toggle mute
  const toggleMute = () => {
    const next = !soundMuted;
    audioManager.current.setMuted(next);
    setSoundMuted(next);
  };

  // Watch for new balls arriving
  useEffect(() => {
    if (prevBallCountRef.current === -1) {
      prevBallCountRef.current = totalBalls;
      return;
    }

    if (totalBalls > prevBallCountRef.current && lastBall) {
      prevBallCountRef.current = totalBalls;
      runCinematicDelivery();
    }
  }, [totalBalls, lastBall]);

  const runCinematicDelivery = () => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    const am = audioManager.current;

    setStumpsBroken(false);
    setShowFireworks(false);

    // Compute speed
    const bowlType: BowlType = lastBall?.bowlType || 'Pace';
    let baseSpeed = 142;
    if (bowlType === 'Spin') baseSpeed = 88;
    else if (bowlType === 'Swing') baseSpeed = 133;
    const speed = (baseSpeed + (Math.random() * 8 - 4)).toFixed(1);
    setBallSpeedDisplay(`${speed} ${bowlType === 'Spin' ? 'RPM' : 'KM/H'}`);

    // PHASE 1: BOWLER RUNUP (0ms - 900ms)
    setPhase('runup');
    am.resumeContext();
    am.playBowlerRunup();

    // PHASE 2: BALL FLIGHT DOWN 22 YARDS (900ms - 1750ms)
    animTimerRef.current = setTimeout(() => {
      setPhase('delivery');

      // Turf bounce impact sound halfway
      setTimeout(() => {
        am.playBallPitch();
      }, 420);

      // PHASE 3: BAT STRIKE & IMPACT (1750ms - 2350ms)
      animTimerRef.current = setTimeout(() => {
        setPhase('impact');

        const isWicket = !!lastBall?.wicket;
        const isSix = lastBall?.special === 'SIX';
        const isFour = lastBall?.special === 'FOUR';
        const isDot = lastBall?.special === 'DOT';

        if (isWicket && lastBall?.dismissalType === 'Bowled') {
          setStumpsBroken(true);
          am.playTimber();
          am.playWicket();
        } else if (isWicket) {
          am.playWicket();
        } else if (isSix || isFour) {
          am.playBatHit(false);
          if (isSix) {
            am.playSix();
            setShowFireworks(true);
          } else {
            am.playFour();
          }
        } else if (isDot) {
          am.playBatHit(true);
        } else {
          am.playBatHit(false);
        }

        // PHASE 4: OUTFIELD TRAVEL & CELEBRATION (2350ms - 3550ms)
        animTimerRef.current = setTimeout(() => {
          setPhase('outfield');
          if (isSix || isFour) {
            am.cheerCrowd();
            if (isFour) am.playBoundarySiren();
          }

          // Return to idle
          animTimerRef.current = setTimeout(() => {
            setPhase('idle');
            setStumpsBroken(false);
            setShowFireworks(false);
          }, 1150);
        }, 600);
      }, 850);
    }, 900);
  };

  // Trajectory details
  const shot: ShotType = lastBall?.shotType || 'Drive';
  const line: Line = lastBall?.line || 'Middle';
  const length: Length = lastBall?.length || 'Good Length';
  const runs = lastBall?.runs || 0;
  const isSix = lastBall?.special === 'SIX';
  const isFour = lastBall?.special === 'FOUR';
  const isWicket = !!lastBall?.wicket;

  // Ball lateral deviation (Line)
  let ballOffsetX = 0;
  if (line === 'Outside Off' || line === 'Wide') ballOffsetX = 26;
  else if (line === 'Off Stump') ballOffsetX = 13;
  else if (line === 'Leg') ballOffsetX = -16;

  // Pitch landing point (Length)
  let pitchBouncePercent = 54;
  if (length === 'Yorker') pitchBouncePercent = 88;
  else if (length === 'Full') pitchBouncePercent = 70;
  else if (length === 'Good Length') pitchBouncePercent = 54;
  else if (length === 'Short') pitchBouncePercent = 38;
  else if (length === 'Bouncer') pitchBouncePercent = 25;

  // Active camera view for Director Mode
  // Director auto-switches:
  // - runup: focus on bowler
  // - delivery: track pitch
  // - outfield (Six): tilt up to sky!
  // - outfield (Four): follow turf to boundary rope!
  const isDirector = camMode === 'director';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden select-none bg-[#070c08]">
      
      {/* ─── Top Studio Broadcast Bar ─── */}
      <div className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2 bg-gradient-to-b from-[#070c08]/95 to-transparent border-b border-[#f5efe6]/05">
        
        {/* Live Broadcast Telemetry */}
        <div className="flex items-center gap-2">
          {/* Tally Light */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#112217]/90 border border-[#f5efe6]/10 text-[10px] font-sports font-bold tracking-wider text-[#ffb800] shadow-sm">
            <span className={`w-2 h-2 rounded-full ${phase !== 'idle' ? 'bg-[#ff2a36] animate-ping' : 'bg-[#4ade80]'}`} />
            <span>{isDirector ? 'AUTO-DIRECTOR CAM' : camMode.toUpperCase().replace('_', ' ')}</span>
          </div>

          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-[#0b140e] border border-[#f5efe6]/10 text-[10px] font-mono text-[#c8bead]">
            RADAR: {ballSpeedDisplay}
          </span>
        </div>

        {/* Camera Selector Switcher */}
        <div className="flex items-center gap-1.5">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-[#112217]/90 hover:bg-[#1a3522] border border-[#f5efe6]/15 text-[#c8bead] hover:text-[#ffb800] transition cursor-pointer shadow-md"
            title={soundMuted ? 'Unmute Stadium Audio' : 'Mute Stadium Audio'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-[#ff2a36]" /> : <Volume2 className="w-4 h-4 text-[#4ade80]" />}
          </button>

          {/* 4 Professional Camera Modes */}
          <div className="flex bg-[#0b140e]/95 p-0.5 rounded-xl border border-[#f5efe6]/15 shadow-md">
            
            {/* 1. Director Auto Cam */}
            <button
              onClick={() => setCamMode('director')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-sports font-bold uppercase tracking-wider transition cursor-pointer ${
                camMode === 'director'
                  ? 'bg-gradient-to-r from-[#d9222a] to-[#a81018] text-white shadow-sm border border-white/20'
                  : 'text-[#8c8273] hover:text-[#f5efe6]'
              }`}
              title="Dynamic TV Director (Auto-cuts between bowler, ball flight, and boundary)"
            >
              <Clapperboard className="w-3 h-3 text-[#ffb800]" />
              <span className="hidden md:inline">Director TV</span>
            </button>

            {/* 2. High Pavilion Cam */}
            <button
              onClick={() => setCamMode('pavilion')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-sports font-bold uppercase tracking-wider transition cursor-pointer ${
                camMode === 'pavilion'
                  ? 'bg-gradient-to-r from-[#1b4d2e] to-[#24623e] text-[#f5efe6] border border-[#4ade80]/30 shadow-sm'
                  : 'text-[#8c8273] hover:text-[#f5efe6]'
              }`}
              title="Wide Elevated Ground View with Fielders"
            >
              <Video className="w-3 h-3 text-[#ffb800]" />
              <span className="hidden md:inline">Pavilion</span>
            </button>

            {/* 3. Helmet POV */}
            <button
              onClick={() => setCamMode('helmet_pov')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-sports font-bold uppercase tracking-wider transition cursor-pointer ${
                camMode === 'helmet_pov'
                  ? 'bg-gradient-to-r from-[#1b4d2e] to-[#24623e] text-[#f5efe6] border border-[#4ade80]/30 shadow-sm'
                  : 'text-[#8c8273] hover:text-[#f5efe6]'
              }`}
              title="First-Person Striker POV through Helmet Visor"
            >
              <Eye className="w-3 h-3 text-[#ffb800]" />
              <span className="hidden md:inline">Helmet POV</span>
            </button>

            {/* 4. Hawk-Eye */}
            <button
              onClick={() => setCamMode('hawkeye')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-sports font-bold uppercase tracking-wider transition cursor-pointer ${
                camMode === 'hawkeye'
                  ? 'bg-gradient-to-r from-[#1b4d2e] to-[#24623e] text-[#f5efe6] border border-[#4ade80]/30 shadow-sm'
                  : 'text-[#8c8273] hover:text-[#f5efe6]'
              }`}
              title="3D Hawk-Eye Pitch Telemetry Radar"
            >
              <Compass className="w-3 h-3 text-[#ffb800]" />
              <span className="hidden md:inline">Hawk-Eye</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Stadium Stage ─── */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        
        {/* Floodlight Beam Towers (Corners) */}
        <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top_left,rgba(255,184,0,0.3)_0%,transparent_70%)] blur-xl" />
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_top_right,rgba(255,184,0,0.3)_0%,transparent_70%)] blur-xl" />

        {/* Stadium Outfield Mowing Stripes */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'repeating-radial-gradient(circle at 50% 50%, #0d2516 0px, #0d2516 35px, #0a1f12 35px, #0a1f12 70px)',
            opacity: 0.9,
          }}
        />

        {/* Stadium Boundary Rope Ring with Sponsor Pillows */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] sm:w-[860px] sm:h-[860px] rounded-full border-4 border-dashed border-[#f5efe6]/15 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9), 0 0 60px rgba(34,92,55,0.4)',
          }}
        />

        {/* Flashing Boundary LED Cushions on Four/Six */}
        {(isFour || isSix) && phase === 'outfield' && (
          <div 
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{
              boxShadow: isSix 
                ? 'inset 0 0 140px rgba(255, 184, 0, 0.55)' 
                : 'inset 0 0 110px rgba(74, 222, 128, 0.5)',
            }}
          />
        )}

        {/* Fireworks Bursts for Massive Six */}
        {showFireworks && phase === 'outfield' && (
          <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🎆</div>
            <div className="text-5xl animate-ping ml-20 -mt-20">✨</div>
            <div className="text-5xl animate-bounce -ml-28 -mt-16">🎇</div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODE 1 & 2: DIRECTOR AUTO CAM & PAVILION HIGH CAM
           ══════════════════════════════════════════════════════════════ */}
        {(camMode === 'director' || camMode === 'pavilion') && (
          <div 
            className="relative w-full h-full flex items-center justify-center transition-all duration-700 ease-out"
            style={{
              perspective: '1000px',
              transform: isDirector && phase === 'outfield' && isSix
                ? 'scale(0.85) translateY(40px) rotateX(12deg)' // Tilt camera up into the night sky for Six!
                : isDirector && phase === 'runup'
                ? 'scale(1.08) translateY(-10px)' // Zoom into bowler runup!
                : isDirector && phase === 'impact'
                ? 'scale(1.12) translateY(20px)' // Close-up on batsman strike!
                : camMode === 'pavilion'
                ? 'scale(0.92) rotateX(20deg)' // Wide high ground view
                : 'rotateX(24deg)',
            }}
          >
            {/* Fielders in Position (Cover, Point, Mid-Wicket, Long-on) */}
            <div className="absolute top-[28%] left-[18%] z-10 flex flex-col items-center pointer-events-none transition-transform duration-500" style={{
              transform: phase === 'outfield' && (shot === 'Cut' || shot === 'Drive') ? 'translate(20px, 15px) scale(1.1)' : 'scale(1)'
            }}>
              <div className="w-6 h-6 rounded-full bg-[#1b4d2e] border border-white/30 flex items-center justify-center text-[10px]">
                🏃
              </div>
              <span className="text-[7px] font-sports text-[#c8bead] uppercase">COVER</span>
            </div>

            <div className="absolute top-[28%] right-[18%] z-10 flex flex-col items-center pointer-events-none transition-transform duration-500" style={{
              transform: phase === 'outfield' && (shot === 'Pull' || shot === 'Slog') ? 'translate(-20px, 15px) scale(1.1)' : 'scale(1)'
            }}>
              <div className="w-6 h-6 rounded-full bg-[#1b4d2e] border border-white/30 flex items-center justify-center text-[10px]">
                🏃
              </div>
              <span className="text-[7px] font-sports text-[#c8bead] uppercase">MID-WICKET</span>
            </div>

            <div className="absolute bottom-[20%] left-[22%] z-10 flex flex-col items-center pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-[#1b4d2e] border border-white/30 flex items-center justify-center text-[10px]">
                🏃
              </div>
              <span className="text-[7px] font-sports text-[#c8bead] uppercase">POINT</span>
            </div>

            {/* 3D Perspective Pitch Strip */}
            <div 
              className="relative w-40 sm:w-52 lg:w-60 h-[360px] sm:h-[420px] rounded-2xl shadow-[0_35px_80px_rgba(0,0,0,0.95)] border-2 border-[#f5efe6]/25 transition-transform duration-500"
              style={{
                background: matchState.pitch === 'Dusty'
                  ? 'linear-gradient(to bottom, #42311f 0%, #543f29 50%, #42311f 100%)'
                  : matchState.pitch === 'Green'
                  ? 'linear-gradient(to bottom, #244222 0%, #355432 50%, #244222 100%)'
                  : 'linear-gradient(to bottom, #382617 0%, #4a3421 50%, #382617 100%)',
              }}
            >
              {/* Pitch White Crease Markings */}
              <div className="absolute top-10 inset-x-3 h-[1.5px] bg-[#f5efe6]/80" />
              <div className="absolute top-14 inset-x-6 h-[2px] bg-[#f5efe6] shadow-sm" />

              <div className="absolute bottom-14 inset-x-6 h-[2px] bg-[#f5efe6] shadow-sm" />
              <div className="absolute bottom-10 inset-x-3 h-[1.5px] bg-[#f5efe6]/80" />

              {/* Bowler End Stumps (Top) */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-4 bg-[#ffb800] rounded-xs shadow-md border border-white/20" />
                ))}
              </div>

              {/* Striker End Stumps (Zing LED Stumps) */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {[0, 1, 2].map(i => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-4.5 rounded-xs shadow-md border border-white/20 transition-all duration-300 ${
                      stumpsBroken && i === 1 
                        ? 'translate-y-8 rotate-45 bg-[#ff2a36] shadow-[0_0_15px_#ff2a36]' 
                        : stumpsBroken && i === 0 
                        ? '-translate-x-4 -rotate-35 bg-[#ff2a36] shadow-[0_0_15px_#ff2a36]' 
                        : 'bg-[#ffb800]'
                    }`} 
                  />
                ))}

                {/* Zing Bails */}
                {!stumpsBroken ? (
                  <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#f5efe6] rounded-full" />
                ) : (
                  <div 
                    className="absolute -top-6 left-1 w-4 h-1 bg-[#ff2a36] rounded-full shadow-[0_0_12px_#ff2a36]" 
                    style={{ animation: 'zing-bail-fly 0.8s ease-out forwards' }} 
                  />
                )}
              </div>

              {/* Wicketkeeper crouched behind striker stumps */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
                <div className={`w-8 h-8 rounded-full bg-[#1b4d2e] border-2 border-white/30 flex items-center justify-center text-xs shadow-md ${phase === 'delivery' ? 'scale-110' : ''}`}>
                  🧤
                </div>
                <span className="text-[7px] font-sports text-[#c8bead] uppercase font-bold">KEEPER</span>
              </div>

              {/* ─── Animated Bowler ─── */}
              <div 
                className="absolute z-20 transition-all"
                style={{
                  top: phase === 'runup' ? '5%' : phase === 'delivery' ? '12%' : '0%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  transitionDuration: phase === 'runup' ? '850ms' : '280ms',
                }}
              >
                <div className="flex flex-col items-center">
                  {/* Bowler Body Articulation */}
                  <div 
                    className={`w-11 h-11 rounded-full bg-gradient-to-tr from-[#d9222a] to-[#ff2a36] p-0.5 shadow-xl border-2 border-white/40 flex items-center justify-center ${
                      phase === 'runup' ? 'animate-[bowler-runup_0.25s_infinite]' : ''
                    }`}
                  >
                    <span className="text-sm">🏃</span>
                  </div>

                  {/* Bowling Arm Whip Indicator during delivery */}
                  {phase === 'delivery' && (
                    <div className="absolute -top-2 right-0 text-sm animate-ping">
                      ⚡
                    </div>
                  )}

                  <span className="text-[8px] font-sports font-black text-white uppercase tracking-wider bg-[#d9222a] px-2 rounded-full mt-0.5 shadow-sm">
                    {phase === 'runup' ? 'RUN-UP' : 'BOWLER'}
                  </span>
                </div>
              </div>

              {/* ─── 3D Cricket Ball with Trajectory Seam ─── */}
              {(phase === 'delivery' || phase === 'impact') && (
                <div
                  className="absolute z-30 transition-all"
                  style={{
                    top: phase === 'impact' ? '86%' : `${pitchBouncePercent}%`,
                    left: `calc(50% + ${ballOffsetX}px)`,
                    transform: 'translate(-50%, -50%)',
                    transitionDuration: phase === 'impact' ? '420ms' : '480ms',
                    transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                >
                  <div className="relative">
                    {/* Glowing Red Seam Ball */}
                    <div 
                      className="w-4 h-4 rounded-full bg-gradient-to-br from-[#ff2a36] via-[#d9222a] to-[#70080e] shadow-[0_0_18px_rgba(255,42,54,0.95)] border border-white/50 flex items-center justify-center"
                      style={{ animation: 'ball-seam-spin 0.2s linear infinite' }}
                    >
                      <div className="w-full h-0.5 bg-white/70" />
                    </div>

                    {/* Turf bounce impact shockwave */}
                    {phase === 'delivery' && (
                      <div className="absolute inset-0 rounded-full border-2 border-white/60 animate-ping pointer-events-none" />
                    )}
                  </div>
                </div>
              )}

              {/* ─── Animated Batter ─── */}
              <div 
                className="absolute z-20 transition-all"
                style={{
                  bottom: '5%',
                  left: '50%',
                  transform: `translate(-50%, 50%) ${
                    phase === 'impact' 
                      ? shot === 'Drive' ? 'scale(1.2) translateY(-8px)' 
                      : shot === 'Cut' ? 'scale(1.15) translateX(14px)' 
                      : shot === 'Pull' ? 'scale(1.2) translateX(-16px) rotate(-18deg)'
                      : shot === 'Slog' || shot === 'Loft' ? 'scale(1.25) translateY(-14px) rotate(15deg)'
                      : 'scale(1.08)'
                      : 'scale(1)'
                  }`,
                  transitionDuration: '220ms',
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {/* Batter Avatar with Protective Helmet */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#ffb800] to-[#e69d00] p-0.5 shadow-2xl border-2 border-white/40 flex items-center justify-center">
                      <span className="text-base">🏏</span>
                    </div>

                    {/* Contact Flash */}
                    {phase === 'impact' && (runs > 0 || isWicket) && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl animate-ping pointer-events-none">
                        💥
                      </div>
                    )}
                  </div>

                  <span className="text-[8px] font-sports font-black text-[#070c08] uppercase tracking-wider bg-[#ffb800] px-2 rounded-full mt-0.5 shadow-sm">
                    {phase === 'impact' ? shot.toUpperCase() : 'BATTER'}
                  </span>
                </div>
              </div>

              {/* ─── Ball Flight Trajectory Outfield ─── */}
              {phase === 'outfield' && isSix && (
                <div 
                  className="absolute z-40 transition-all duration-700 ease-out pointer-events-none"
                  style={{
                    top: '-120px',
                    left: '80%',
                    transform: 'translate(-50%, -50%) scale(2.2)',
                  }}
                >
                  <div className="flex flex-col items-center animate-bounce">
                    <span className="text-4xl">🚀</span>
                    <span className="font-sports font-black text-xs text-[#ffb800] uppercase tracking-widest bg-black/90 px-3 py-1 rounded-full border border-[#ffb800] shadow-[0_0_20px_rgba(255,184,0,0.6)]">
                      MAXIMUM 6 • INTO ORBIT!
                    </span>
                  </div>
                </div>
              )}

              {phase === 'outfield' && isFour && (
                <div 
                  className="absolute z-40 transition-all duration-600 ease-out pointer-events-none"
                  style={{
                    bottom: '20px',
                    left: '105%',
                    transform: 'translate(-50%, -50%) scale(1.5)',
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl">⚡</span>
                    <span className="font-sports font-black text-[10px] text-[#4ade80] uppercase tracking-widest bg-black/90 px-2.5 py-0.5 rounded-full border border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.6)]">
                      CRACKING 4!
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODE 3: PRO HELMET CAM (First-Person Batter POV)
           ══════════════════════════════════════════════════════════════ */}
        {camMode === 'helmet_pov' && (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            
            {/* 3D 22-Yard Corridor Perspective */}
            <div 
              className="relative w-full max-w-lg h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border-2 border-[#ffb800]/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col justify-between p-4"
              style={{
                background: 'linear-gradient(to top, #3a2818 0%, #17331f 45%, #08170e 100%)',
              }}
            >
              {/* Helmet Grill Visor Overlay Frame */}
              <div className="absolute inset-0 pointer-events-none border-[12px] sm:border-[18px] border-black/80 rounded-3xl z-40">
                <div className="absolute inset-x-8 top-12 h-1 bg-black/50" />
                <div className="absolute inset-x-8 top-28 h-1 bg-black/50" />
              </div>

              {/* Distant Bowler Charging In directly at YOU */}
              <div 
                className="flex flex-col items-center mt-6 transition-all duration-700"
                style={{
                  transform: phase === 'runup' 
                    ? 'scale(1.4) translateY(24px)' 
                    : phase === 'delivery' 
                    ? 'scale(1.8) translateY(60px)' 
                    : 'scale(1)',
                }}
              >
                <div className="w-12 h-12 rounded-full bg-[#d9222a] border-2 border-[#ff2a36] flex items-center justify-center shadow-xl text-xl animate-pulse">
                  🏃
                </div>
                <span className="text-[10px] font-sports font-black text-[#ff2a36] uppercase tracking-widest mt-1 bg-black/80 px-2.5 py-0.5 rounded-full border border-[#ff2a36]/40">
                  {phase === 'runup' ? 'CHARGING TOWARDS YOU!' : phase === 'delivery' ? 'RELEASING LEATHER!' : 'BOWLER AT TOP OF MARK'}
                </span>
              </div>

              {/* Fast Oncoming Ball traveling right at your face / pads */}
              {(phase === 'delivery' || phase === 'impact') && (
                <div 
                  className="absolute left-1/2 transition-all pointer-events-none z-30"
                  style={{
                    top: phase === 'impact' ? '68%' : '38%',
                    transform: `translate(calc(-50% + ${ballOffsetX}px), -50%) ${
                      phase === 'impact' ? 'scale(3.2)' : 'scale(1.3)'
                    }`,
                    transitionDuration: '460ms',
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff2a36] via-[#d9222a] to-[#70080e] shadow-[0_0_30px_rgba(255,42,54,1)] border-2 border-white flex items-center justify-center animate-spin">
                    <div className="w-full h-1 bg-white" />
                  </div>
                </div>
              )}

              {/* Batter POV Hands & Cricket Bat Handle */}
              <div className="flex justify-between items-end px-6 pb-2 relative z-30">
                <div className="flex flex-col items-center">
                  <div 
                    className="w-20 h-40 bg-gradient-to-t from-[#c48d48] to-[#deb887] border-4 border-[#5c3e1b] rounded-t-xl shadow-2xl flex items-center justify-center"
                    style={{
                      transform: phase === 'impact' ? 'rotate(-30deg) translateY(-30px)' : 'rotate(-12deg)',
                      transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <span className="font-sports font-black text-sm text-[#5c3e1b] -rotate-90 tracking-widest">
                      KOOKABURRA
                    </span>
                  </div>
                </div>

                {/* Stumps behind batter */}
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div 
                      key={i} 
                      className={`w-2.5 h-20 rounded-xs border border-white/20 shadow-md ${
                        stumpsBroken && i === 1 
                          ? 'bg-[#ff2a36] translate-y-6 rotate-45 shadow-[0_0_15px_#ff2a36]' 
                          : 'bg-[#ffb800]'
                      }`} 
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODE 4: HAWK-EYE 3D PITCH RADAR
           ══════════════════════════════════════════════════════════════ */}
        {camMode === 'hawkeye' && (
          <div className="relative w-full h-full flex items-center justify-center p-3">
            <div className="relative w-64 sm:w-72 h-[340px] sm:h-[400px] bg-[#070c08] border-2 border-[#10b981]/50 rounded-2xl p-4 shadow-2xl flex flex-col justify-between">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#f5efe6]/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#10b981]" />
                  <span className="font-sports font-black text-xs text-[#10b981] tracking-[0.2em] uppercase">
                    HAWK-EYE 3D TELEMETRY
                  </span>
                </div>
                <span className="text-[10px] text-[#ffb800] font-mono">
                  {line.toUpperCase()} • {length.toUpperCase()}
                </span>
              </div>

              {/* Pitch Grid */}
              <div className="relative flex-1 my-3 bg-[#0d1f14] rounded-xl border border-[#10b981]/30 flex flex-col justify-between p-2 overflow-hidden shadow-inner">
                
                {/* Zone 1: Bouncer */}
                <div className="border-b border-[#f5efe6]/10 py-1.5 text-center bg-[#3b82f6]/10">
                  <span className="text-[9px] font-mono text-[#3b82f6] uppercase font-bold">Short Deck / Bouncer</span>
                </div>

                {/* Zone 2: Good Length */}
                <div className="border-b border-[#f5efe6]/10 py-2.5 text-center bg-[#10b981]/15">
                  <span className="text-[9px] font-mono text-[#10b981] uppercase font-black">Good Length Corridor</span>
                </div>

                {/* Zone 3: Full Length */}
                <div className="border-b border-[#f5efe6]/10 py-2 text-center bg-[#ffb800]/10">
                  <span className="text-[9px] font-mono text-[#ffb800] uppercase font-bold">Full Driving Slot</span>
                </div>

                {/* Zone 4: Yorker Blockhole */}
                <div className="py-1.5 text-center bg-[#ff2a36]/20">
                  <span className="text-[9px] font-mono text-[#ff2a36] uppercase font-bold">Yorker Blockhole</span>
                </div>

                {/* Target Bullseye Marker */}
                <div 
                  className="absolute w-7 h-7 rounded-full border-2 border-[#ffb800] flex items-center justify-center animate-ping pointer-events-none shadow-[0_0_15px_#ffb800]"
                  style={{
                    top: `${pitchBouncePercent}%`,
                    left: `calc(50% + ${ballOffsetX}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff2a36]" />
                </div>

                {/* Crease Stumps Marker */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-2.5 bg-[#ffb800] rounded-xs" />
                  ))}
                </div>
              </div>

              {/* Telemetry Summary */}
              <div className="flex justify-between items-center text-[10px] font-mono text-[#8c8273]">
                <span>STYLE: {lastBall?.bowlType || 'PACE'}</span>
                <span className="text-[#4ade80] font-black text-xs">RESULT: {runs} RUNS</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ─── Bottom TV Broadcast Phase Ticker ─── */}
      <div className="relative z-30 px-4 py-2 bg-gradient-to-t from-[#070c08]/95 to-transparent flex items-center justify-center border-t border-[#f5efe6]/05">
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-sports font-bold uppercase tracking-wider text-[#8c8273]">
          
          <span className={`flex items-center gap-1 ${phase === 'runup' ? 'text-[#ff2a36] font-black scale-105' : ''}`}>
            <span>01</span>
            <span>Run-up</span>
          </span>
          <span className="text-white/20">──▶</span>

          <span className={`flex items-center gap-1 ${phase === 'delivery' ? 'text-[#ffb800] font-black scale-105' : ''}`}>
            <span>02</span>
            <span>Delivery</span>
          </span>
          <span className="text-white/20">──▶</span>

          <span className={`flex items-center gap-1 ${phase === 'impact' ? 'text-[#4ade80] font-black scale-105' : ''}`}>
            <span>03</span>
            <span>Strike</span>
          </span>
          <span className="text-white/20">──▶</span>

          <span className={`flex items-center gap-1 ${phase === 'outfield' ? 'text-[#38bdf8] font-black scale-105' : ''}`}>
            <span>04</span>
            <span>Outcome</span>
          </span>
        </div>
      </div>

    </div>
  );
}
