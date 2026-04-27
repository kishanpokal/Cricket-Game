import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../../hooks/useFirestore';
import type { UserProfile } from '../../types/cricket';
import { ArrowLeft, Trophy, Medal, Zap } from 'lucide-react';

type FilterType = 'wins' | 'runs' | 'wickets';

const FILTER_CONFIG: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: 'wins', label: 'Most Wins', icon: <Trophy className="w-3.5 h-3.5" /> },
  { key: 'runs', label: 'Top Runs', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'wickets', label: 'Top Wickets', icon: <Medal className="w-3.5 h-3.5" /> },
];

const RANK_STYLES = [
  'bg-gradient-to-br from-yellow-500 to-yellow-600 text-yellow-900 shadow-[0_0_15px_rgba(234,179,8,0.4)]',
  'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800',
  'bg-gradient-to-br from-amber-700 to-amber-800 text-white',
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const { getLeaderboard } = useFirestore();
  const [filter, setFilter] = useState<FilterType>('wins');
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(filter).then((data) => {
      setLeaders(data as UserProfile[]);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div className="min-h-screen bg-[var(--color-night-sky)] p-4 sm:p-6 flex flex-col items-center overflow-y-auto">
      <header className="w-full max-w-3xl flex justify-between items-center mb-6 sm:mb-10 animate-[slide-up_0.3s_ease-out]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition cursor-pointer">
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Trophy className="text-yellow-500" /> Leaderboard
        </h1>
        <div className="w-20" />
      </header>

      {/* Filter tabs */}
      <div className="w-full max-w-3xl flex gap-1.5 p-1 bg-gray-800/50 rounded-xl mb-6 border border-gray-700/50 animate-[slide-up_0.4s_ease-out]">
        {FILTER_CONFIG.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 font-bold rounded-lg text-xs sm:text-sm transition cursor-pointer ${
              filter === f.key
                ? 'bg-gradient-to-br from-gray-700 to-gray-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      <main className="w-full max-w-3xl space-y-2 sm:space-y-3 animate-[slide-up_0.5s_ease-out]">
        {loading ? (
          <div className="text-center text-gray-500 py-10">
            <div className="w-10 h-10 rounded-full border-2 border-gray-600 border-t-transparent animate-spin mx-auto mb-3" />
            Loading...
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No players found yet. Be the first!</div>
        ) : (
          leaders.map((player, index) => (
            <div
              key={player.uid}
              className="bg-gray-800/50 p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 border border-gray-700/30 hover:bg-gray-700/50 transition group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Rank badge */}
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm ${
                index < 3 ? RANK_STYLES[index] : 'bg-gray-700 text-gray-400'
              }`}>
                {index + 1}
              </div>

              {/* Avatar */}
              <img
                src={player.photoURL}
                alt={player.displayName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 border-2 border-gray-600 group-hover:border-green-500/50 transition"
              />

              {/* Name + secondary stats */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">{player.displayName}</h3>
                <div className="flex gap-2 text-[9px] sm:text-[10px] text-gray-500 font-semibold">
                  <span>Matches: {player.stats.matches}</span>
                  <span>WR: {player.stats.matches ? Math.round((player.stats.wins / player.stats.matches) * 100) : 0}%</span>
                </div>
              </div>

              {/* Primary stat */}
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-black text-white">{player.stats[filter]}</p>
                <p className="text-[9px] sm:text-xs text-gray-500 uppercase tracking-wide font-bold">{filter}</p>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
