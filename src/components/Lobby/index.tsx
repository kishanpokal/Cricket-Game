import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { createMatch, joinMatch, checkForActiveMatch } from '../../services/matchService';
import type { MatchFormat, PitchType, Weather } from '../../types/cricket';
import { Swords, Trophy, User, Wifi, WifiOff, ArrowRight, CheckCircle } from 'lucide-react';

const STADIUMS = ['Lords', 'MCG', 'Wankhede', 'Eden Gardens', 'Gabba', 'Oval'];
const PITCHES: PitchType[] = ['Green', 'Dusty', 'Dead', 'Hard'];
const WEATHERS: Weather[] = ['Sunny', 'Overcast', 'Rainy', 'Humid'];
const PITCH_ICONS: Record<PitchType, string> = { Green: '🌿', Dusty: '🏜️', Dead: '💀', Hard: '🪨' };
const WEATHER_ICONS: Record<Weather, string> = { Sunny: '☀️', Overcast: '☁️', Rainy: '🌧️', Humid: '💧' };

export default function Lobby() {
  const navigate = useNavigate();
  const { user } = useGameStore();

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [format, setFormat] = useState<MatchFormat>('T20');
  const [customOvers, setCustomOvers] = useState(5);
  const [stadium, setStadium] = useState(STADIUMS[0]);
  const [pitch, setPitch] = useState<PitchType>('Green');
  const [weather, setWeather] = useState<Weather>('Sunny');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reconnectMatchId, setReconnectMatchId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check for active match to reconnect to
  useEffect(() => {
    if (!user) return;
    const activeId = localStorage.getItem('activeMatchId');
    if (activeId) {
      checkForActiveMatch(activeId, user.uid).then(isActive => {
        if (isActive) {
          setReconnectMatchId(activeId);
        } else {
          localStorage.removeItem('activeMatchId');
        }
      });
    }
  }, [user]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const overs = format === 'T20' ? 20 : format === 'ODI' ? 50 : customOvers;
      const matchId = await createMatch(user, format, overs, stadium, pitch, weather);
      navigate(`/toss/${matchId}`);
    } catch (e) {
      setError('Failed to create match. Please try again.');
      console.error(e);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode || joinCode.length < 4) {
      setError('Enter a valid room code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await joinMatch(joinCode, user);
      if (success) {
        navigate(`/toss/${joinCode}`);
      } else {
        setError('Match not found or already full.');
      }
    } catch (e) {
      setError('Failed to join match. Please try again.');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-night-sky)] p-4 sm:p-6 flex flex-col items-center overflow-y-auto">
      {/* Header */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-6 sm:mb-10 animate-[slide-up_0.4s_ease-out]">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl" aria-hidden="true">🏏</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Super Cricket
            </h1>
            <p className="text-gray-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Multiplayer Cricket Arena
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online indicator */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${
            isOnline ? 'text-green-400 border-green-700/50 bg-green-900/20' : 'text-red-400 border-red-700/50 bg-red-900/20'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold text-gray-300 hover:text-white transition border border-gray-700/50 cursor-pointer"
          >
            <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
            <span className="hidden sm:inline truncate max-w-[80px]">{user.displayName}</span>
          </button>
        </div>
      </header>

      {/* Reconnect banner */}
      {reconnectMatchId && (
        <div className="w-full max-w-2xl mb-4 animate-[slide-up_0.3s_ease-out]">
          <button
            onClick={() => navigate(`/game/${reconnectMatchId}`)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-yellow-900/40 to-yellow-800/30 border border-yellow-600/50 rounded-xl p-3 sm:p-4 hover:from-yellow-900/60 hover:to-yellow-800/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">🔄</span>
              <div className="text-left">
                <p className="font-bold text-yellow-400 text-sm">Match in progress!</p>
                <p className="text-gray-400 text-[10px] sm:text-xs">Room: {reconnectMatchId} — Tap to rejoin</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-yellow-400" />
          </button>
        </div>
      )}

      {/* Main Menu */}
      {mode === 'menu' && (
        <main className="w-full max-w-2xl space-y-3 sm:space-y-4 animate-[slide-up_0.4s_ease-out]">
          {/* Private Room */}
          <button
            onClick={() => setMode('create')}
            className="w-full group flex items-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-700/50 hover:border-green-500/30 transition-all shadow-lg hover:shadow-green-500/10 cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition">
              <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-green-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white mb-0.5">Private Room</h3>
              <p className="text-xs sm:text-sm text-gray-400">Create or join a friend's match with a code</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition" />
          </button>



          {/* Leaderboard */}
          <button
            onClick={() => navigate('/leaderboard')}
            className="w-full group flex items-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-700/50 hover:border-yellow-500/30 transition-all shadow-lg hover:shadow-yellow-500/10 cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-yellow-600/20 flex items-center justify-center group-hover:bg-yellow-600/30 transition">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white mb-0.5">Leaderboard</h3>
              <p className="text-xs sm:text-sm text-gray-400">View global rankings and top players</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-yellow-400 transition" />
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full group flex items-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-all shadow-lg hover:shadow-purple-500/10 cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition">
              <User className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white mb-0.5">My Profile</h3>
              <p className="text-xs sm:text-sm text-gray-400">View your stats and manage your account</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition" />
          </button>
        </main>
      )}

      {/* Create Match */}
      {mode === 'create' && (
        <main className="w-full max-w-2xl animate-[slide-up_0.3s_ease-out]">
          <button onClick={() => setMode('menu')} className="text-gray-400 hover:text-white text-sm font-bold mb-4 flex items-center gap-1 transition cursor-pointer">
            ← Back to Menu
          </button>

          <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 border border-gray-700/50 space-y-4 sm:space-y-5 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-black">Create Match</h2>

            {/* Format */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Format</label>
              <div className="flex gap-2">
                {(['T20', 'ODI', 'custom'] as MatchFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase transition cursor-pointer ${
                      format === f ? 'bg-green-600 text-white shadow-[0_4px_15px_rgba(34,197,94,0.3)]' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {f === 'custom' ? 'Custom' : f}
                  </button>
                ))}
              </div>
              {format === 'custom' && (
                <div className="mt-2 flex items-center gap-3">
                  <label className="text-xs text-gray-400 font-semibold">Overs:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={customOvers}
                    onChange={e => setCustomOvers(Math.max(1, Math.min(50, Number(e.target.value))))}
                    className="w-20 bg-gray-700 text-white text-center py-1.5 rounded-lg border border-gray-600 font-bold"
                  />
                </div>
              )}
            </div>

            {/* Stadium */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Stadium</label>
              <div className="grid grid-cols-3 gap-1.5">
                {STADIUMS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStadium(s)}
                    className={`py-2 rounded-lg font-semibold text-xs transition cursor-pointer ${
                      stadium === s ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch & Weather */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Pitch</label>
                <div className="space-y-1">
                  {PITCHES.map(p => (
                    <button
                      key={p}
                      onClick={() => setPitch(p)}
                      className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        pitch === p ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      <span aria-hidden="true">{PITCH_ICONS[p]}</span> {p}
                      {pitch === p && <CheckCircle className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Weather</label>
                <div className="space-y-1">
                  {WEATHERS.map(w => (
                    <button
                      key={w}
                      onClick={() => setWeather(w)}
                      className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        weather === w ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      <span aria-hidden="true">{WEATHER_ICONS[w]}</span> {w}
                      {weather === w && <CheckCircle className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 sm:py-4 rounded-xl font-black text-base sm:text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-[0_8px_25px_rgba(34,197,94,0.3)] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : '🏏 Create Room'}
            </button>
          </div>

          {/* Join Room */}
          <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 border border-gray-700/50 mt-4 shadow-xl">
            <h2 className="text-lg sm:text-xl font-black mb-3">Join a Room</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.trim())}
                maxLength={6}
                className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-xl border border-gray-600 font-mono text-lg tracking-widest text-center focus:border-blue-500 focus:outline-none transition"
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
