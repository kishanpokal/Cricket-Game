import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { createMatch, createBotMatch, joinMatch, checkForActiveMatch, cleanupOldMatches } from '../../services/matchService';
import { cleanupInactiveGuests } from '../../services/statsService';
import type { MatchFormat, PitchType, Weather } from '../../types/cricket';
import { Swords, Trophy, ArrowRight, CheckCircle, Hash, Bot } from 'lucide-react';

const STADIUMS = [
  { name: 'Lords', label: "Lord's, London", tag: 'Seam Paradise' },
  { name: 'MCG', label: 'MCG, Melbourne', tag: 'Steep Bounce' },
  { name: 'Wankhede', label: 'Wankhede, Mumbai', tag: 'High-Scoring' },
  { name: 'Eden Gardens', label: 'Eden Gardens, Kolkata', tag: 'Turn & Grip' },
  { name: 'Gabba', label: 'The Gabba, Brisbane', tag: 'Hard Pitch Pace' },
  { name: 'Oval', label: 'The Oval, London', tag: 'Balanced Deck' }
];

const PITCHES: { type: PitchType; icon: string; desc: string }[] = [
  { type: 'Green', icon: '🌿', desc: 'Lush grass. Dangerous lateral seam movement.' },
  { type: 'Dusty', icon: '🏜️', desc: 'Dry surface. Heavy turn and unpredictable grip.' },
  { type: 'Dead', icon: '🏏', desc: 'Flat deck. True bounce favored for big boundaries.' },
  { type: 'Hard', icon: '🪨', desc: 'Rock solid. Sharp bounce for 145+ km/h bouncers.' }
];

const WEATHERS: { type: Weather; icon: string; desc: string }[] = [
  { type: 'Sunny', icon: '☀️', desc: 'Clear sky. Consistent bounce and ball visibility.' },
  { type: 'Overcast', icon: '☁️', desc: 'Heavy cloud cover. Exaggerated ball swing.' },
  { type: 'Humid', icon: '💧', desc: 'Subtropical moisture. Reverse swing in later overs.' },
  { type: 'Rainy', icon: '🌧️', desc: 'Wet outfield. Skiddy ball off the turf surface.' }
];

const BOT_DIFFICULTIES: {
  level: 'Rookie' | 'Pro' | 'Legend';
  badge: string;
  title: string;
  desc: string;
  tag: string;
}[] = [
  {
    level: 'Rookie',
    badge: '🟢',
    title: 'Rookie AI',
    desc: 'Forgiving lines and standard drives. Perfect for warmup & timing practice.',
    tag: 'Warmup & Training',
  },
  {
    level: 'Pro',
    badge: '🟡',
    title: 'Pro AI',
    desc: 'Tactical bowling changes, smart boundary hunting, and aggressive run chases.',
    tag: 'Balanced Duel',
  },
  {
    level: 'Legend',
    badge: '🔴',
    title: 'Legend AI',
    desc: 'Merciless grandmaster AI. Lethal death-over yorkers and adaptive shot selection.',
    tag: 'Championship Level',
  },
];

export default function Lobby() {
  const navigate = useNavigate();
  const { user } = useGameStore();

  const [activeTab, setActiveTab] = useState<'solo' | 'create' | 'join'>('solo');
  const [botDifficulty, setBotDifficulty] = useState<'Rookie' | 'Pro' | 'Legend'>('Pro');
  const [format, setFormat] = useState<MatchFormat>('T20');
  const [customOvers, setCustomOvers] = useState(5);
  const [stadium, setStadium] = useState('Lords');
  const [pitch, setPitch] = useState<PitchType>('Green');
  const [weather, setWeather] = useState<Weather>('Overcast');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reconnectMatchId, setReconnectMatchId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Auto-cleanup expired matches + inactive guest accounts (runs once on mount)
  useEffect(() => {
    cleanupOldMatches().catch(console.error);
    cleanupInactiveGuests().catch(console.error);
  }, []);

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

  const handleLaunchSolo = async () => {
    setLoading(true);
    setError('');
    try {
      const overs = format === 'T20' ? 20 : format === 'ODI' ? 50 : customOvers;
      const matchId = await createBotMatch(user, format, overs, stadium, pitch, weather, botDifficulty);
      navigate(`/toss/${matchId}`);
    } catch (e) {
      setError('Failed to start solo match. Please check your connection.');
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const overs = format === 'T20' ? 20 : format === 'ODI' ? 50 : customOvers;
      const matchId = await createMatch(user, format, overs, stadium, pitch, weather);
      navigate(`/toss/${matchId}`);
    } catch (e) {
      setError('Failed to create match. Please verify your connection.');
      console.error(e);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode || joinCode.length < 4) {
      setError('Please enter a valid 6-character room code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await joinMatch(joinCode.toUpperCase(), user);
      if (success) {
        navigate(`/toss/${joinCode.toUpperCase()}`);
      } else {
        setError('Match not found or both player slots are filled.');
      }
    } catch (e) {
      setError('Failed to join match. Please try again.');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#070c08] text-[#f5efe6] p-4 sm:p-6 lg:p-8 flex flex-col items-center relative overflow-x-hidden">
      {/* Stadium Atmospheric Backlight */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[1000px] h-[450px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 92, 55, 0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* Main Broadcast Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-6 sm:mb-8 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1b4d2e] to-[#0d1a11] border-2 border-[#ffb800]/40 flex items-center justify-center shadow-[0_0_20px_rgba(27,77,46,0.6)]">
            <span className="text-2xl" aria-hidden="true">🏏</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide font-bold leading-none text-[#f5efe6]">
                SUPER CRICKET
              </h1>
              <span className="bg-[#ffb800]/20 text-[#ffb800] text-[10px] font-extrabold px-2 py-0.5 rounded border border-[#ffb800]/30 uppercase tracking-widest">
                PAVILION
              </span>
            </div>
            <p className="text-[#8c8273] text-[11px] font-semibold uppercase tracking-[0.15em]">
              OFFICIAL MATCH ARENA
            </p>
          </div>
        </div>

        {/* Player & Status Pill */}
        <div className="flex items-center gap-2.5">
          {/* Online Radar */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
            isOnline 
              ? 'text-[#4ade80] border-[#10b981]/30 bg-[#0f2818]/60' 
              : 'text-[#ff2a36] border-[#ff2a36]/30 bg-[#280f12]/60'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#4ade80] animate-pulse' : 'bg-[#ff2a36]'}`} />
            {isOnline ? 'Arena Online' : 'Offline'}
          </div>

          {/* Quick Nav Links */}
          <button
            onClick={() => navigate('/leaderboard')}
            className="flex items-center gap-1.5 bg-[#122417] hover:bg-[#1a3522] text-[#ffb800] px-3.5 py-2 rounded-xl text-xs font-bold transition border border-[#ffb800]/25 cursor-pointer shadow-md"
            title="Global Rankings"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden md:inline font-sports uppercase tracking-wider">Rankings</span>
          </button>

          {/* Player Badge */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 bg-[#122417] hover:bg-[#1a3522] px-3 py-1.5 rounded-xl text-xs font-bold text-[#f5efe6] transition border border-[#f5efe6]/10 cursor-pointer shadow-md"
          >
            <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-[#ffb800]/50" />
            <span className="truncate max-w-[90px]">{user.displayName}</span>
          </button>
        </div>
      </header>

      {/* Reconnect Banner */}
      {reconnectMatchId && (
        <div className="w-full max-w-4xl mb-6 relative z-10 animate-[slide-up_0.3s_ease-out]">
          <button
            onClick={() => navigate(`/game/${reconnectMatchId}`)}
            className="w-full flex items-center justify-between bg-gradient-to-r from-[#2a1e0b] to-[#1a2818] border-2 border-[#ffb800]/60 rounded-2xl p-4 hover:border-[#ffb800] transition-all cursor-pointer shadow-xl group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl animate-spin-slow" aria-hidden="true">🔄</span>
              <div className="text-left">
                <p className="font-display text-xl text-[#ffb800] tracking-wide uppercase leading-none font-bold">
                  ACTIVE MATCH IN PROGRESS
                </p>
                <p className="text-[#c8bead] text-xs font-mono mt-1">
                  Room: <span className="text-white font-bold">{reconnectMatchId}</span> • Tap to resume your innings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#ffb800] text-[#070c08] font-bold text-xs px-3.5 py-1.5 rounded-lg group-hover:scale-105 transition-transform">
              <span>REJOIN</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="w-full max-w-4xl relative z-10 space-y-6">
        
        {/* Navigation Switcher: Solo vs Create vs Join */}
        <div className="flex bg-[#0f1c13] p-1.5 rounded-2xl border border-[#f5efe6]/10 shadow-lg gap-1.5">
          <button
            onClick={() => setActiveTab('solo')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-display text-lg sm:text-2xl uppercase tracking-wide font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'solo'
                ? 'bg-gradient-to-r from-[#d9222a] to-[#a81018] text-white shadow-md border border-white/20'
                : 'text-[#8c8273] hover:text-[#f5efe6]'
            }`}
          >
            <Bot className="w-5 h-5 text-[#ffb800]" />
            <span>Solo vs Bot</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-display text-lg sm:text-2xl uppercase tracking-wide font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-[#1b4d2e] to-[#24623e] text-[#f5efe6] shadow-md border border-[#4ade80]/30'
                : 'text-[#8c8273] hover:text-[#f5efe6]'
            }`}
          >
            <Swords className="w-5 h-5 text-[#ffb800]" />
            <span>Create Room</span>
          </button>

          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-xl font-display text-lg sm:text-2xl uppercase tracking-wide font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'join'
                ? 'bg-gradient-to-r from-[#1b4d2e] to-[#24623e] text-[#f5efe6] shadow-md border border-[#4ade80]/30'
                : 'text-[#8c8273] hover:text-[#f5efe6]'
            }`}
          >
            <Hash className="w-5 h-5 text-[#ffb800]" />
            <span>Join Room</span>
          </button>
        </div>

        {/* Tab 1: Solo vs Bot Mode */}
        {activeTab === 'solo' && (
          <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-5 sm:p-8 border border-[#f5efe6]/10 shadow-2xl space-y-6 animate-[fade-in_0.2s_ease-out]">
            
            {/* Header intro */}
            <div className="flex items-center justify-between pb-4 border-b border-[#f5efe6]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2a1315] border border-[#ff2a36]/40 flex items-center justify-center text-xl text-[#ff2a36]">
                  🤖
                </div>
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#f5efe6] leading-none">
                    SOLO PRACTICE ARENA
                  </h2>
                  <p className="text-[11px] text-[#8c8273] font-mono mt-0.5">
                    NO WAITING • INSTANT MATCH • INTELLIGENT AI OPPONENT
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 bg-[#ffb800]/15 text-[#ffb800] border border-[#ffb800]/30 text-[10px] font-sports font-bold rounded-full uppercase tracking-wider">
                ⚡ Instant Play
              </span>
            </div>

            {/* AI Difficulty Selector */}
            <div>
              <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
                <span className="text-[#ffb800]">01.</span> Select AI Difficulty
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BOT_DIFFICULTIES.map(d => (
                  <button
                    key={d.level}
                    onClick={() => setBotDifficulty(d.level)}
                    className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
                      botDifficulty === d.level
                        ? 'bg-gradient-to-b from-[#1d3d29] to-[#12261a] border-[#ffb800] shadow-[0_0_20px_rgba(255,184,0,0.25)]'
                        : 'bg-[#0e1a12] border-[#f5efe6]/08 hover:bg-[#14261a]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold flex items-center gap-1.5 text-[#f5efe6]">
                        <span>{d.badge}</span>
                        <span className="font-display text-2xl uppercase tracking-wide">{d.title}</span>
                      </span>
                      {botDifficulty === d.level && <CheckCircle className="w-4 h-4 text-[#ffb800]" />}
                    </div>
                    <span className="text-[10px] font-sports font-bold text-[#ffb800] uppercase tracking-wider block mb-1">
                      {d.tag}
                    </span>
                    <p className="text-[11px] text-[#8c8273] leading-relaxed">
                      {d.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selector */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="text-[#ffb800]">02.</span> Match Format
                </label>
                <span className="text-[11px] text-[#8c8273] font-mono">
                  {format === 'T20' ? '20 Overs (120 Balls)' : format === 'ODI' ? '50 Overs (300 Balls)' : `${customOvers} Overs (${customOvers * 6} Balls)`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {(['T20', 'ODI', 'custom'] as MatchFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`py-3 px-4 rounded-xl font-display text-2xl uppercase tracking-wider font-bold transition-all cursor-pointer border ${
                      format === f
                        ? 'bg-gradient-to-r from-[#d9222a] to-[#b3141b] text-white border-white/20 shadow-[0_4px_16px_rgba(217,34,42,0.4)]'
                        : 'bg-[#15271b] text-[#8c8273] border-[#f5efe6]/05 hover:bg-[#1b3323] hover:text-[#f5efe6]'
                    }`}
                  >
                    {f === 'custom' ? 'Custom Overs' : f}
                  </button>
                ))}
              </div>

              {format === 'custom' && (
                <div className="mt-3.5 p-3.5 bg-[#0a140d] rounded-xl border border-[#f5efe6]/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#f5efe6] uppercase tracking-wider">Choose Total Overs:</span>
                    <p className="text-[11px] text-[#8c8273]">Quick shootout from 1 to 50 overs</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={customOvers}
                      onChange={e => setCustomOvers(Number(e.target.value))}
                      className="w-36"
                    />
                    <span className="font-sports font-bold text-xl text-[#ffb800] min-w-[42px] text-right">
                      {customOvers} OVR
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Stadium Selector */}
            <div>
              <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
                <span className="text-[#ffb800]">03.</span> Stadium Venue
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STADIUMS.map(s => (
                  <button
                    key={s.name}
                    onClick={() => setStadium(s.name)}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer border ${
                      stadium === s.name
                        ? 'bg-[#1a3824] border-[#4ade80]/50 shadow-md'
                        : 'bg-[#132419] border-[#f5efe6]/05 hover:bg-[#182e20]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-display text-xl text-[#f5efe6] tracking-wide font-bold leading-none">
                        {s.name}
                      </span>
                      {stadium === s.name && <CheckCircle className="w-4 h-4 text-[#ffb800]" />}
                    </div>
                    <p className="text-[10px] text-[#8c8273] font-semibold mt-1 truncate">{s.tag}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch & Weather Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Pitch */}
              <div>
                <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
                  <span className="text-[#ffb800]">04.</span> Pitch Condition
                </label>
                <div className="space-y-2">
                  {PITCHES.map(p => (
                    <button
                      key={p.type}
                      onClick={() => setPitch(p.type)}
                      className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
                        pitch === p.type
                          ? 'bg-[#1a3824] border-[#4ade80]/50 shadow-md'
                          : 'bg-[#132419] border-[#f5efe6]/05 hover:bg-[#182e20]'
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#f5efe6] uppercase">{p.type} Pitch</div>
                        <p className="text-[10px] text-[#8c8273] truncate">{p.desc}</p>
                      </div>
                      {pitch === p.type && <CheckCircle className="w-4 h-4 text-[#ffb800]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather */}
              <div>
                <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
                  <span className="text-[#ffb800]">05.</span> Weather Atmosphere
                </label>
                <div className="space-y-2">
                  {WEATHERS.map(w => (
                    <button
                      key={w.type}
                      onClick={() => setWeather(w.type)}
                      className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
                        weather === w.type
                          ? 'bg-[#1a3824] border-[#4ade80]/50 shadow-md'
                          : 'bg-[#132419] border-[#f5efe6]/05 hover:bg-[#182e20]'
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">{w.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#f5efe6] uppercase">{w.type} Atmosphere</div>
                        <p className="text-[10px] text-[#8c8273] truncate">{w.desc}</p>
                      </div>
                      {weather === w.type && <CheckCircle className="w-4 h-4 text-[#ffb800]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#ff2a36]/15 border border-[#ff2a36]/40 rounded-xl text-[#ff2a36] text-xs font-bold">
                {error}
              </div>
            )}

            {/* Launch Solo Button */}
            <button
              onClick={handleLaunchSolo}
              disabled={loading}
              className="w-full py-4 rounded-xl font-display text-2xl uppercase tracking-wider font-bold bg-gradient-to-r from-[#d9222a] to-[#a81018] hover:from-[#ff2a36] hover:to-[#c4131b] text-white shadow-[0_8px_24px_rgba(217,34,42,0.5)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span>{loading ? 'LAUNCHING DUEL...' : `🏏 PLAY VS ${botDifficulty.toUpperCase()} BOT`}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tab 2: Create Match (PvP) */}
        {activeTab === 'create' && (
          <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-5 sm:p-8 border border-[#f5efe6]/10 shadow-2xl space-y-6 animate-[fade-in_0.2s_ease-out]">
            
            {/* Header intro */}
            <div className="flex items-center justify-between pb-4 border-b border-[#f5efe6]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1b4d2e]/40 border border-[#4ade80]/30 flex items-center justify-center text-xl text-[#4ade80]">
                  ⚔️
                </div>
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#f5efe6] leading-none">
                    HOST PRIVATE PAVILION
                  </h2>
                  <p className="text-[11px] text-[#8c8273] font-mono mt-0.5">
                    GENERATE ROOM CODE • SHARE WITH FRIEND • 1V1 REAL-TIME DUEL
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 text-[10px] font-sports font-bold rounded-full uppercase tracking-wider">
                Multiplayer
              </span>
            </div>

            {/* Format Selector */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] flex items-center gap-2">
                  <span className="text-[#ffb800]">01.</span> Match Format
                </label>
                <span className="text-[11px] text-[#8c8273] font-mono">
                  {format === 'T20' ? '20 Overs (120 Balls)' : format === 'ODI' ? '50 Overs (300 Balls)' : `${customOvers} Overs (${customOvers * 6} Balls)`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {(['T20', 'ODI', 'custom'] as MatchFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`py-3 px-4 rounded-xl font-display text-2xl uppercase tracking-wider font-bold transition-all cursor-pointer border ${
                      format === f
                        ? 'bg-gradient-to-r from-[#d9222a] to-[#b3141b] text-white border-white/20 shadow-[0_4px_16px_rgba(217,34,42,0.4)]'
                        : 'bg-[#15271b] text-[#8c8273] border-[#f5efe6]/05 hover:bg-[#1b3323] hover:text-[#f5efe6]'
                    }`}
                  >
                    {f === 'custom' ? 'Custom Overs' : f}
                  </button>
                ))}
              </div>

              {format === 'custom' && (
                <div className="mt-3.5 p-3.5 bg-[#0a140d] rounded-xl border border-[#f5efe6]/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#f5efe6] uppercase tracking-wider">Choose Total Overs:</span>
                    <p className="text-[11px] text-[#8c8273]">Quick shootout from 1 to 50 overs</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={customOvers}
                      onChange={e => setCustomOvers(Number(e.target.value))}
                      className="w-36"
                    />
                    <span className="font-sports font-bold text-xl text-[#ffb800] min-w-[42px] text-right">
                      {customOvers} OVR
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Stadium Selector */}
            <div>
              <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
                <span className="text-[#ffb800]">02.</span> Stadium Venue
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STADIUMS.map(s => (
                  <button
                    key={s.name}
                    onClick={() => setStadium(s.name)}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer border ${
                      stadium === s.name
                        ? 'bg-[#1a3824] border-[#4ade80]/50 shadow-md'
                        : 'bg-[#132419] border-[#f5efe6]/05 hover:bg-[#182e20]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-display text-xl text-[#f5efe6] tracking-wide font-bold leading-none">
                        {s.name}
                      </span>
                      {stadium === s.name && <CheckCircle className="w-4 h-4 text-[#ffb800]" />}
                    </div>
                    <p className="text-[10px] text-[#8c8273] font-semibold mt-1 truncate">{s.tag}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch & Weather Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Pitch */}
              <div>
                <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
                  <span className="text-[#ffb800]">03.</span> Pitch Condition
                </label>
                <div className="space-y-2">
                  {PITCHES.map(p => (
                    <button
                      key={p.type}
                      onClick={() => setPitch(p.type)}
                      className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
                        pitch === p.type
                          ? 'bg-[#1a3824] border-[#4ade80]/50 shadow-md'
                          : 'bg-[#132419] border-[#f5efe6]/05 hover:bg-[#182e20]'
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#f5efe6] uppercase">{p.type} Pitch</div>
                        <p className="text-[10px] text-[#8c8273] truncate">{p.desc}</p>
                      </div>
                      {pitch === p.type && <CheckCircle className="w-4 h-4 text-[#ffb800]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather */}
              <div>
                <label className="text-xs font-bold text-[#c8bead] uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
                  <span className="text-[#ffb800]">04.</span> Weather Conditions
                </label>
                <div className="space-y-2">
                  {WEATHERS.map(w => (
                    <button
                      key={w.type}
                      onClick={() => setWeather(w.type)}
                      className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left border ${
                        weather === w.type
                          ? 'bg-[#1a3824] border-[#4ade80]/50 shadow-md'
                          : 'bg-[#132419] border-[#f5efe6]/05 hover:bg-[#182e20]'
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">{w.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#f5efe6] uppercase">{w.type} Atmosphere</div>
                        <p className="text-[10px] text-[#8c8273] truncate">{w.desc}</p>
                      </div>
                      {weather === w.type && <CheckCircle className="w-4 h-4 text-[#ffb800]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#ff2a36]/15 border border-[#ff2a36]/40 rounded-xl text-[#ff2a36] text-xs font-bold">
                {error}
              </div>
            )}

            {/* Launch Room Button */}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-4 rounded-xl font-display text-2xl uppercase tracking-wider font-bold bg-gradient-to-r from-[#1b4d2e] to-[#24623e] hover:from-[#24623e] hover:to-[#2e7d4c] text-white shadow-[0_8px_24px_rgba(27,77,46,0.5)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3 border border-[#4ade80]/30"
            >
              <span>{loading ? 'OPENING PAVILION...' : '🏟️ OPEN MATCH PAVILION'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tab 3: Join Match with Code */}
        {activeTab === 'join' && (
          <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-6 sm:p-10 border border-[#f5efe6]/10 shadow-2xl text-center space-y-6 animate-[fade-in_0.2s_ease-out]">
            <div className="w-16 h-16 rounded-2xl bg-[#1b4d2e]/40 border-2 border-[#ffb800]/40 flex items-center justify-center mx-auto text-3xl shadow-[0_0_20px_rgba(27,77,46,0.5)]">
              🏟️
            </div>

            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase text-[#f5efe6] leading-none">
                ENTER DUEL ROOM CODE
              </h2>
              <p className="text-[#c8bead] text-xs sm:text-sm mt-2 max-w-md mx-auto">
                Got an invite from your opponent? Paste the 6-character pavilion room code below to enter the toss.
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <input
                type="text"
                placeholder="EX: ABC123"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().trim())}
                maxLength={6}
                className="w-full bg-[#070c08] text-[#f5efe6] py-3.5 px-4 rounded-xl border-2 border-[#f5efe6]/20 font-sports text-2xl tracking-[0.25em] text-center focus:border-[#ffb800] focus:outline-none transition uppercase shadow-inner"
              />
            </div>

            {error && (
              <div className="p-3 bg-[#ff2a36]/15 border border-[#ff2a36]/40 rounded-xl text-[#ff2a36] text-xs font-bold max-w-sm mx-auto">
                {error}
              </div>
            )}

            <div className="max-w-xs mx-auto">
              <button
                onClick={handleJoin}
                disabled={loading || joinCode.length < 4}
                className="w-full py-3.5 rounded-xl font-display text-2xl uppercase tracking-wider font-bold bg-gradient-to-r from-[#d9222a] to-[#a81018] hover:from-[#ff2a36] hover:to-[#c4131b] text-white shadow-[0_8px_24px_rgba(217,34,42,0.45)] transition-all cursor-pointer disabled:opacity-40"
              >
                {loading ? 'CONNECTING...' : '⚡ ENTER ARENA'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
