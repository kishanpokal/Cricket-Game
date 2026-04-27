import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { createMatch, joinMatch } from '../../services/matchService';
import { Play, Users, Trophy, RefreshCw } from 'lucide-react';

const OVER_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 50];

export default function Lobby() {
  const { user } = useGameStore();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [selectedOvers, setSelectedOvers] = useState(20);
  const [creating, setCreating] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  useEffect(() => {
    const savedMatchId = localStorage.getItem('activeMatchId');
    if (savedMatchId) {
      setActiveMatchId(savedMatchId);
    }
  }, []);

  const handleCreatePrivate = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const format = selectedOvers === 20 ? 'T20' : selectedOvers === 50 ? 'ODI' : 'custom';
      const matchId = await createMatch(user, format as any, selectedOvers, 'Wankhede', 'Hard', 'Sunny');
      navigate(`/toss/${matchId}`);
    } catch (err) {
      console.error('Failed to create room:', err);
      setCreating(false);
    }
  };

  const handleJoinPrivate = async () => {
    if (!user || !joinCode) return;
    const success = await joinMatch(joinCode, user);
    if (success) {
      navigate(`/toss/${joinCode}`);
    } else {
      alert('Invalid room code or room is full.');
    }
  };

  const handleReconnect = () => {
    if (activeMatchId) {
      navigate(`/game/${activeMatchId}`);
    }
  };

  const handleClearActiveMatch = () => {
    localStorage.removeItem('activeMatchId');
    setActiveMatchId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 p-6">
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <Trophy className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Super Cricket</h1>
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => navigate('/leaderboard')} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
            <Trophy size={20} />
          </button>
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full hover:bg-gray-700 transition">
            <img src={user?.photoURL || ''} alt="Profile" className="w-6 h-6 rounded-full bg-gray-600" />
            <span className="font-semibold text-sm">{user?.displayName}</span>
          </button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        
        {activeMatchId && (
          <div className="bg-yellow-900/40 border border-yellow-600 p-6 rounded-3xl w-full max-w-2xl text-center shadow-2xl animate-pulse">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">Active Match Found!</h2>
            <p className="text-gray-300 mb-6">You disconnected from an ongoing match.</p>
            <div className="flex gap-4 justify-center">
              <button onClick={handleClearActiveMatch} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition cursor-pointer">
                Abandon Match
              </button>
              <button onClick={handleReconnect} className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition shadow-[0_0_20px_rgba(34,197,94,0.4)] cursor-pointer">
                <RefreshCw size={20} /> Reconnect
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-8 w-full">
          <div className="bg-gradient-to-br from-green-600 to-green-800 p-8 rounded-3xl w-full max-w-sm hover:scale-105 transition-transform cursor-pointer shadow-xl shadow-green-900/50" onClick={() => navigate('/matchmaking')}>
            <Play size={48} className="mb-4" />
            <h2 className="text-3xl font-bold mb-2">Play Online</h2>
            <p className="text-green-100 opacity-80">Find a quick match globally</p>
          </div>

          <div className="bg-gray-800 p-8 rounded-3xl w-full max-w-sm border border-gray-700">
            <Users size={40} className="mb-4 text-blue-400" />
            <h2 className="text-2xl font-bold mb-6">Play with Friends</h2>
            
            {!showCreateRoom ? (
              <button onClick={() => setShowCreateRoom(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl mb-4 transition cursor-pointer">
                Create Room
              </button>
            ) : (
              <div className="mb-4 bg-gray-900 rounded-xl p-4 border border-gray-700">
                <p className="text-sm text-gray-400 font-semibold mb-3">Select Overs</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {OVER_OPTIONS.map(o => (
                    <button
                      key={o}
                      onClick={() => setSelectedOvers(o)}
                      className={`py-2 rounded-lg font-bold text-sm transition cursor-pointer ${
                        selectedOvers === o
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {o} {o === 20 ? '(T20)' : o === 50 ? '(ODI)' : ''}
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 mb-3">
                  Selected: <span className="text-white font-bold">{selectedOvers} overs</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePrivate}
                    disabled={creating}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition cursor-pointer"
                  >
                    {creating ? 'Creating...' : 'Start Room'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Enter 6-digit Code" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
              />
              <button onClick={handleJoinPrivate} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition cursor-pointer">
                Join
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
