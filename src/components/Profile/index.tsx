import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useAuth } from '../../hooks/useAuth';
import { Trophy, ArrowLeft, LogOut } from 'lucide-react';

export default function Profile() {
  const { user } = useGameStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <header className="flex justify-between items-center mb-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="text-2xl font-bold">Player Profile</h1>
        <button onClick={signOut} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition">
          <LogOut size={20} /> Sign Out
        </button>
      </header>

      <main className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-3xl p-8 mb-8 flex items-center gap-8 shadow-xl">
          <img src={user.photoURL} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-green-500 shadow-lg shadow-green-500/20" />
          <div>
            <h2 className="text-4xl font-bold mb-2">{user.displayName}</h2>
            <p className="text-gray-400 mb-4">{user.email}</p>
            <div className="inline-flex items-center gap-2 bg-green-900/50 text-green-400 px-4 py-2 rounded-full font-bold">
              <Trophy size={18} /> Win Rate: {user.stats.matches ? Math.round((user.stats.wins / user.stats.matches) * 100) : 0}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Matches" value={user.stats.matches} />
          <StatCard label="Wins" value={user.stats.wins} color="text-green-400" />
          <StatCard label="Losses" value={user.stats.losses} color="text-red-400" />
          <StatCard label="Total Runs" value={user.stats.runs} />
          <StatCard label="High Score" value={user.stats.highScore} />
          <StatCard label="Total Wickets" value={user.stats.wickets} />
          <StatCard label="Best Bowling" value={user.stats.bestBowling} />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
      <p className="text-gray-400 text-sm font-bold uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}
