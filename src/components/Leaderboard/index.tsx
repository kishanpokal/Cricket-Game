import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../../hooks/useFirestore';
import type {  UserProfile  } from '../../types/cricket';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { getLeaderboard } = useFirestore();
  const [filter, setFilter] = useState<'wins' | 'runs' | 'wickets'>('wins');
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
    <div className="min-h-screen bg-gray-900 p-6 flex flex-col items-center">
      <header className="w-full max-w-3xl flex justify-between items-center mb-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-yellow-500" /> Global Leaderboard</h1>
        <div className="w-20" /> {/* Spacer */}
      </header>

      <div className="w-full max-w-3xl flex gap-2 p-1 bg-gray-800 rounded-xl mb-8 border border-gray-700">
         {(['wins', 'runs', 'wickets'] as const).map(f => (
           <button 
             key={f}
             onClick={() => setFilter(f)}
             className={`flex-1 py-3 font-bold rounded-lg capitalize transition ${filter === f ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
           >
             Most {f}
           </button>
         ))}
      </div>

      <main className="w-full max-w-3xl space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : (
          leaders.map((player, index) => (
            <div key={player.uid} className="bg-gray-800 p-4 rounded-2xl flex items-center gap-4 border border-gray-700/50 hover:bg-gray-750 transition">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-yellow-500 text-yellow-900' : 
                index === 1 ? 'bg-gray-300 text-gray-800' : 
                index === 2 ? 'bg-amber-700 text-white' : 
                'bg-gray-700 text-gray-400'
              }`}>
                {index + 1}
              </div>
              <img src={player.photoURL} alt={player.displayName} className="w-12 h-12 rounded-full bg-gray-700" />
              <div className="flex-1">
                <h3 className="font-bold text-lg">{player.displayName}</h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">{player.stats[filter]}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{filter}</p>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
