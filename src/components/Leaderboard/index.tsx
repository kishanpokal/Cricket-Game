import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../../hooks/useFirestore';
import type { UserProfile } from '../../types/cricket';
import { ArrowLeft, Trophy, Medal, Zap, Target } from 'lucide-react';

type FilterType = 'wins' | 'runs' | 'wickets' | 'highScore';

const FILTER_CONFIG: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: 'wins', label: 'Most Wins', icon: <Trophy className="w-4 h-4 text-[#ffb800]" /> },
  { key: 'highScore', label: 'Highest Score', icon: <Target className="w-4 h-4 text-[#ff2a36]" /> },
  { key: 'runs', label: 'Total Runs', icon: <Zap className="w-4 h-4 text-[#ffb800]" /> },
  { key: 'wickets', label: 'Wickets Taken', icon: <Medal className="w-4 h-4 text-[#4ade80]" /> },
];

const RANK_BADGES = [
  'bg-gradient-to-br from-[#ffd000] to-[#ffb800] text-[#070c08] border-2 border-white/40 shadow-[0_0_20px_rgba(255,184,0,0.5)]',
  'bg-gradient-to-br from-[#e2e8f0] to-[#94a3b8] text-[#070c08] border-2 border-white/30',
  'bg-gradient-to-br from-[#d97706] to-[#92400e] text-white border-2 border-amber-300/30',
];

const STAT_LABELS: Record<FilterType, string> = {
  wins: 'WINS',
  highScore: 'HIGH SCORE',
  runs: 'RUNS',
  wickets: 'WICKETS',
};

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

  const getStatValue = (player: UserProfile, key: FilterType): number | string => {
    if (key === 'highScore') return player.stats.highScore ?? 0;
    return player.stats[key];
  };

  return (
    <div className="min-h-screen bg-[#070c08] text-[#f5efe6] p-4 sm:p-6 lg:p-8 flex flex-col items-center overflow-y-auto relative">
      {/* Stadium Backlight */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 92, 55, 0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      <header className="w-full max-w-3xl flex justify-between items-center mb-6 relative z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-[#8c8273] hover:text-[#f5efe6] transition cursor-pointer text-sm font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={18} />
          <span>Pavilion</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] text-[#ffb800] uppercase font-bold tracking-[0.2em] block">
            OFFICIAL RANKINGS
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wide text-[#f5efe6] leading-none">
            GLOBAL LEADERBOARD
          </h1>
        </div>

        <div className="w-16" />
      </header>

      {/* Filter Tabs */}
      <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0f1c13] p-1.5 rounded-2xl mb-6 border border-[#f5efe6]/10 relative z-10 shadow-lg">
        {FILTER_CONFIG.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-sports text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              filter === f.key
                ? 'bg-gradient-to-r from-[#1b4d2e] to-[#24623e] text-white border-[#4ade80]/40 shadow-md'
                : 'bg-transparent text-[#8c8273] border-transparent hover:text-[#f5efe6]'
            }`}
          >
            {f.icon}
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard Table / Cards */}
      <main className="w-full max-w-3xl space-y-3 relative z-10">
        {loading ? (
          <div className="text-center text-[#8c8273] py-16">
            <div className="w-10 h-10 rounded-full border-2 border-[#ffb800] border-t-transparent animate-spin mx-auto mb-3" />
            <p className="font-sports uppercase tracking-wider text-xs">Querying Firestore Hall of Fame...</p>
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center text-[#8c8273] py-16 bg-[#112217] rounded-2xl border border-[#f5efe6]/10">
            <p className="font-display text-2xl uppercase">No registered matches recorded yet.</p>
            <p className="text-xs text-[#c8bead] mt-1">Play a match to etch your name into the records!</p>
          </div>
        ) : (
          leaders.map((player, index) => (
            <div
              key={player.uid}
              className={`bg-gradient-to-b from-[#112217] to-[#0a140d] p-4 sm:p-5 rounded-2xl flex items-center gap-4 sm:gap-5 border transition-all ${
                index === 0
                  ? 'border-[#ffb800]/50 shadow-[0_0_30px_rgba(255,184,0,0.15)] bg-gradient-to-r from-[#1a2d1e] to-[#112217]'
                  : 'border-[#f5efe6]/10 hover:border-[#f5efe6]/25'
              }`}
            >
              {/* Rank Position */}
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-sports font-black text-lg ${
                index < 3 ? RANK_BADGES[index] : 'bg-[#183020] text-[#8c8273] border border-[#f5efe6]/08'
              }`}>
                {index === 0 ? '👑' : index + 1}
              </div>

              {/* Avatar */}
              <img
                src={player.photoURL}
                alt={player.displayName}
                className="w-12 h-12 rounded-xl bg-[#070c08] border-2 border-[#f5efe6]/20 object-cover"
              />

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg truncate text-[#f5efe6]">{player.displayName}</h3>
                  {player.isGuest && (
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[#8c8273] bg-[#070c08] px-1.5 py-0.5 rounded">
                      Guest
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-[10px] text-[#8c8273] font-mono mt-0.5">
                  <span>MATCHES: <strong className="text-[#c8bead]">{player.stats.matches}</strong></span>
                  <span>WIN RATE: <strong className="text-[#4ade80]">{player.stats.matches ? Math.round((player.stats.wins / player.stats.matches) * 100) : 0}%</strong></span>
                </div>
              </div>

              {/* Primary Stat Display */}
              <div className="text-right">
                <p className={`font-sports text-3xl sm:text-4xl font-black leading-none tabular-nums ${
                  index === 0 ? 'text-[#ffb800]' : 'text-[#f5efe6]'
                }`}>
                  {getStatValue(player, filter)}
                </p>
                <p className="text-[9px] text-[#8c8273] font-bold uppercase tracking-wider font-sports">
                  {STAT_LABELS[filter]}
                </p>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
