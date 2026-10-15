import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { joinPublicQueue, leavePublicQueue } from '../../services/matchService';
import { Search, X } from 'lucide-react';

const TIPS = [
  'Tactics: Defensive blocks protect against unpredictable bounce on Green pitches',
  'Tactics: Spinners extract vicious turn on dry, cracked Dusty surfaces',
  'Tactics: Late inswing is most lethal under heavy Overcast skies',
  'Tactics: Precision Yorkers into the blockhole are your highest-value death deliveries',
  'Tactics: Stroke power above 85% unlocks towering sixes but sharpens edge risk',
  'Tactics: Bouncers are strictly regulated to 2 per over by ICC playing conditions',
];

export default function Matchmaking() {
  const { user } = useGameStore();
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    joinPublicQueue(user);

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 5000);

    const mockTimer = setTimeout(() => {
      leavePublicQueue(user.uid);
      alert('Public matchmaking queue is being paired! Use Private Pavilion room code to play immediately with a friend.');
      navigate('/lobby');
    }, 6000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(tipTimer);
      clearTimeout(mockTimer);
      if (user) leavePublicQueue(user.uid);
    };
  }, [user, navigate]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    if (user) leavePublicQueue(user.uid);
    navigate('/lobby');
  };

  return (
    <div className="flex flex-col h-screen bg-[#070c08] text-[#f5efe6] items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Stadium Floodlight Flare */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 92, 55, 0.3) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      <div className="w-full max-w-md bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-8 border border-[#f5efe6]/10 shadow-2xl relative z-10 flex flex-col items-center">
        {/* Animated Radar Pulse */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-[#1b4d2e]/30 flex items-center justify-center relative border border-[#ffb800]/30 shadow-[0_0_25px_rgba(255,184,0,0.2)]">
            <Search className="w-10 h-10 text-[#ffb800]" />
            <div className="absolute inset-0 rounded-full border-2 border-[#ffb800]/40 animate-ping opacity-75" />
          </div>
        </div>

        <span className="text-[10px] text-[#ffb800] uppercase font-bold tracking-[0.2em] mb-1">
          ARENA MATCHMAKING
        </span>
        <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase text-[#f5efe6] leading-none mb-2">
          SCOUTING OPPONENT
        </h2>

        <p className="text-[#8c8273] text-xs font-mono mb-4">
          Locking coordinates in global pavilion
        </p>

        {/* Stopwatch */}
        <p className="font-sports text-4xl font-black text-[#ffb800] mb-6 tabular-nums">
          {formatTime(elapsedSeconds)}
        </p>

        {/* ELO Range */}
        {user && (
          <div className="bg-[#070c08] border border-[#f5efe6]/10 rounded-xl px-4 py-2 mb-6 text-xs text-[#8c8273] font-sports">
            RANK BAND: <span className="text-[#f5efe6] font-bold">{(user.stats.elo ?? 1000) - 200} - {(user.stats.elo ?? 1000) + 200} ELO</span>
          </div>
        )}

        {/* Strategy Tip Box */}
        <div className="bg-[#070c08] rounded-xl p-3.5 mb-8 w-full border border-[#f5efe6]/08 min-h-[64px] flex items-center justify-center">
          <p className="text-[#c8bead] text-xs font-medium leading-relaxed" key={tipIndex}>
            {TIPS[tipIndex]}
          </p>
        </div>

        <button
          onClick={handleCancel}
          className="flex items-center justify-center gap-2 bg-[#1b3323] hover:bg-[#244731] text-[#f5efe6] font-display text-xl uppercase tracking-wider font-bold py-3 px-8 rounded-xl transition cursor-pointer border border-[#f5efe6]/10 shadow-md"
        >
          <X className="w-4 h-4 text-[#ff2a36]" />
          <span>Cancel Search</span>
        </button>
      </div>
    </div>
  );
}
