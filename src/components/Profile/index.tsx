import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useAuth } from '../../hooks/useAuth';
import { Trophy, ArrowLeft, LogOut, Swords, Target, Activity, TrendingUp } from 'lucide-react';
import { AudioManager } from '../../utils/audio';
import { useState } from 'react';
import type { CommentaryAccent } from '../../utils/audio';

export default function Profile() {
  const { user } = useGameStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const am = AudioManager.getInstance();
  const [accent, setAccent] = useState<CommentaryAccent>(am.getAccent());
  const [volume, setVolume] = useState(am.getVolume());

  if (!user) return null;

  const winRate = user.stats.matches ? Math.round((user.stats.wins / user.stats.matches) * 100) : 0;

  const handleAccentChange = (a: CommentaryAccent) => {
    setAccent(a);
    am.setAccent(a);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    am.setVolume(v);
  };

  return (
    <div className="min-h-screen bg-[var(--color-night-sky)] p-4 sm:p-6 overflow-y-auto">
      <header className="flex justify-between items-center mb-6 sm:mb-10 max-w-2xl mx-auto animate-[slide-up_0.3s_ease-out]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition cursor-pointer">
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="text-xl sm:text-2xl font-bold">Player Profile</h1>
        <button onClick={signOut} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition cursor-pointer text-sm">
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      <main className="max-w-2xl mx-auto animate-[slide-up_0.4s_ease-out]">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-8 shadow-xl border border-gray-700/50">
          <div className="relative">
            <img src={user.photoURL} alt="Avatar" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-green-500 shadow-lg shadow-green-500/20" />
            <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-gray-800">
              ELO {user.stats.elo ?? 1000}
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-3xl sm:text-4xl font-black mb-1">{user.displayName}</h2>
            <p className="text-gray-400 mb-3 text-sm">{user.email}</p>
            <div className="inline-flex items-center gap-2 bg-green-900/50 text-green-400 px-4 py-2 rounded-full font-bold text-sm">
              <Trophy size={16} /> Win Rate: {winRate}%
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Matches" value={user.stats.matches} icon={<Swords className="w-4 h-4 text-blue-400" />} />
          <StatCard label="Wins" value={user.stats.wins} icon={<Trophy className="w-4 h-4 text-green-400" />} color="text-green-400" />
          <StatCard label="Losses" value={user.stats.losses} icon={<Target className="w-4 h-4 text-red-400" />} color="text-red-400" />
          <StatCard label="Win Streak" value={user.stats.winStreak ?? 0} icon={<TrendingUp className="w-4 h-4 text-yellow-400" />} color="text-yellow-400" />
          <StatCard label="Total Runs" value={user.stats.runs} icon={<Activity className="w-4 h-4 text-blue-400" />} />
          <StatCard label="High Score" value={user.stats.highScore} />
          <StatCard label="Wickets" value={user.stats.wickets} />
          <StatCard label="Best Bowl" value={user.stats.bestBowling} />
        </div>

        {/* Audio Settings */}
        <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 border border-gray-700/50 mb-6">
          <h3 className="text-base sm:text-lg font-black mb-4">Audio Settings</h3>

          {/* Volume */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Master Volume</span>
              <span className="text-sm font-bold text-white">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={e => handleVolumeChange(Number(e.target.value) / 100)}
              className="w-full h-2 bg-gray-700 rounded-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, #22c55e ${volume * 100}%, #374151 ${volume * 100}%)`,
              }}
            />
          </div>

          {/* Commentary Accent */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Commentary Accent</label>
            <div className="flex gap-2">
              {([['en-IN', '🇮🇳 Indian'], ['en-GB', '🇬🇧 British'], ['en-AU', '🇦🇺 Aussie']] as [CommentaryAccent, string][]).map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => handleAccentChange(code)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    accent === code ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'text-white',
  icon,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 p-4 sm:p-5 rounded-2xl border border-gray-700/50 hover:border-gray-600 transition">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}
