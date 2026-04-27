import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { joinPublicQueue, leavePublicQueue } from '../../services/matchService';
import { Search, X } from 'lucide-react';

const TIPS = [
  'Tip: Defensive shots are safer on a Green pitch',
  'Tip: Spinners dominate on Dusty pitches',
  'Tip: Swing bowling is deadly in Overcast conditions',
  'Tip: Yorkers are the most effective death-over delivery',
  'Tip: Power above 85% gives maximum boundary potential but high risk',
  'Tip: Bouncers are limited to 2 per over',
];

export default function Matchmaking() {
  const { user } = useGameStore();
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user) return;

    joinPublicQueue(user);

    // Timer
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Cycle tips every 5 seconds
    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 5000);

    // Mock matching after 5 seconds — redirect back since cloud functions aren't set up
    const mockTimer = setTimeout(() => {
      leavePublicQueue(user.uid);
      alert('Public matchmaking requires a Firebase Cloud Function. Use Private Room for now!');
      navigate('/lobby');
    }, 5000);

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
    <div className="flex flex-col h-screen bg-[var(--color-night-sky)] items-center justify-center p-6 text-center">
      {/* Animated search rings */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-green-900/30 flex items-center justify-center relative">
          <Search className="w-10 h-10 text-green-400" />
          <div className="absolute inset-0 rounded-full border-2 border-green-500/50 animate-[pulse-ring_1.5s_ease-out_infinite]" />
          <div className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-[pulse-ring_1.5s_ease-out_0.3s_infinite]" />
          <div className="absolute inset-0 rounded-full border-2 border-green-500/10 animate-[pulse-ring_1.5s_ease-out_0.6s_infinite]" />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
        Searching for Opponent
      </h2>

      <p className="text-gray-500 mb-1 text-sm">
        Estimated wait: ~15 seconds
      </p>

      <p className="text-2xl font-mono font-bold text-white mb-6">
        {formatTime(elapsedSeconds)}
      </p>

      {/* ELO range indicator */}
      {user && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2 mb-6 text-xs text-gray-400">
          ELO Range: <span className="text-white font-bold">{(user.stats.elo ?? 1000) - 200} - {(user.stats.elo ?? 1000) + 200}</span>
        </div>
      )}

      {/* Rotating tips */}
      <div className="bg-gray-800/30 rounded-xl px-4 py-3 mb-8 w-full max-w-sm border border-gray-700/30 min-h-[60px] flex items-center justify-center">
        <p className="text-gray-400 text-xs sm:text-sm animate-[fade-in_0.3s_ease-out]" key={tipIndex}>
          {TIPS[tipIndex]}
        </p>
      </div>

      <button
        onClick={handleCancel}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full transition cursor-pointer border border-gray-700 hover:border-gray-600"
      >
        <X className="w-4 h-4" /> Cancel Search
      </button>
    </div>
  );
}
