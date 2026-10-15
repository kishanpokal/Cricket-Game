import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useAuth } from '../../hooks/useAuth';
import { Trophy, ArrowLeft, LogOut, Swords, Target, Activity, Flame } from 'lucide-react';
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
    <div className="min-h-screen bg-[#070c08] text-[#f5efe6] p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
      {/* Stadium Floodlight Ambiance */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 92, 55, 0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      <header className="flex justify-between items-center mb-6 sm:mb-8 max-w-3xl mx-auto relative z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-[#8c8273] hover:text-[#f5efe6] transition cursor-pointer text-sm font-bold uppercase tracking-wider"
        >
          <ArrowLeft size={18} />
          <span>Pavilion</span>
        </button>

        <h1 className="font-display text-3xl font-bold tracking-wide uppercase text-[#f5efe6]">
          PLAYER DOSSIER
        </h1>

        <button 
          onClick={signOut} 
          className="flex items-center gap-1.5 text-[#ff2a36] hover:text-[#ff6b75] transition cursor-pointer text-xs font-bold uppercase tracking-wider"
        >
          <LogOut size={16} />
          <span>Exit</span>
        </button>
      </header>

      <main className="max-w-3xl mx-auto space-y-6 relative z-10">
        
        {/* Official Player Card Header */}
        <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-6 sm:p-8 border border-[#f5efe6]/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="relative">
            <img 
              src={user.photoURL} 
              alt="Avatar" 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-[#ffb800] shadow-[0_0_25px_rgba(255,184,0,0.35)] object-cover bg-[#070c08]" 
            />
            <div className="absolute -bottom-2 -right-2 bg-[#d9222a] text-white text-[10px] font-sports font-black px-2.5 py-0.5 rounded-full border border-white/20 uppercase tracking-widest shadow-md">
              ELO {user.stats.elo ?? 1000}
            </div>
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase text-[#f5efe6] leading-none">
                {user.displayName}
              </h2>
              {user.isGuest && (
                <span className="text-[10px] uppercase font-bold tracking-widest bg-[#ffb800]/20 text-[#ffb800] px-2 py-0.5 rounded border border-[#ffb800]/30">
                  Guest Pass
                </span>
              )}
            </div>
            
            <p className="text-[#8c8273] text-xs font-mono mb-4">{user.email || 'guest@cricketarena.internal'}</p>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <div className="inline-flex items-center gap-1.5 bg-[#1b4d2e]/40 border border-[#4ade80]/30 text-[#4ade80] px-3.5 py-1.5 rounded-xl font-sports font-bold text-xs">
                <Trophy size={14} className="text-[#ffb800]" />
                <span>WIN RATE: {winRate}%</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#2a1e0b] border border-[#ffb800]/30 text-[#ffb800] px-3.5 py-1.5 rounded-xl font-sports font-bold text-xs">
                <Flame size={14} className="text-[#ff2a36]" />
                <span>STREAK: {user.stats.winStreak ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Career Telemetry Statistics Grid */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ffb800] block mb-3">
            CAREER MATCH TELEMETRY
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Matches Played" value={user.stats.matches} icon={<Swords className="w-4 h-4 text-[#ffb800]" />} />
            <StatCard label="Victories" value={user.stats.wins} color="text-[#4ade80]" icon={<Trophy className="w-4 h-4 text-[#4ade80]" />} />
            <StatCard label="Defeats" value={user.stats.losses} color="text-[#ff2a36]" icon={<Target className="w-4 h-4 text-[#ff2a36]" />} />
            <StatCard label="Longest Streak" value={user.stats.longestWinStreak ?? user.stats.winStreak ?? 0} color="text-[#ffb800]" icon={<Flame className="w-4 h-4 text-[#ffb800]" />} />
            <StatCard label="Total Runs" value={user.stats.runs} icon={<Activity className="w-4 h-4 text-[#f5efe6]" />} />
            <StatCard label="Highest Score" value={user.stats.highScore} color="text-[#ffb800]" />
            <StatCard label="Wickets Taken" value={user.stats.wickets} color="text-[#ff2a36]" />
            <StatCard label="Best Bowling" value={user.stats.bestBowling ?? '0-0'} color="text-[#4ade80]" />
          </div>
        </div>

        {/* Audio & Broadcast Atmosphere Settings */}
        <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-6 border border-[#f5efe6]/10 shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🎙️</span>
            <div>
              <h3 className="font-display text-2xl font-bold uppercase text-[#f5efe6] leading-none">
                BROADCAST AUDIO & COMMENTARY
              </h3>
              <p className="text-[10px] text-[#8c8273] font-mono mt-0.5">
                Configure stadium atmosphere and live commentator voice
              </p>
            </div>
          </div>

          {/* Master Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#c8bead] uppercase tracking-wider">Crowd Roar Volume</span>
              <span className="font-sports font-bold text-sm text-[#ffb800]">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={e => handleVolumeChange(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>

          {/* Commentary Accent */}
          <div>
            <label className="text-xs font-bold text-[#c8bead] uppercase tracking-wider mb-2.5 block">
              Commentator Regional Accent
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {([['en-IN', '🇮🇳 Indian Hindi/Eng'], ['en-GB', '🇬🇧 English Lords'], ['en-AU', '🇦🇺 Aussie MCG']] as [CommentaryAccent, string][]).map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => handleAccentChange(code)}
                  className={`py-3 px-3 rounded-xl font-sports text-xs font-bold transition-all cursor-pointer border ${
                    accent === code
                      ? 'bg-gradient-to-r from-[#1b4d2e] to-[#24623e] text-white border-[#4ade80]/50 shadow-md'
                      : 'bg-[#122417] text-[#8c8273] border-[#f5efe6]/05 hover:bg-[#183020] hover:text-[#f5efe6]'
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
  color = 'text-[#f5efe6]',
  icon,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-b from-[#112217] to-[#0a140d] p-4 rounded-xl border border-[#f5efe6]/10 shadow-md hover:border-[#ffb800]/30 transition-all">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[#8c8273] text-[10px] font-bold uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className={`font-sports text-3xl font-black ${color} tabular-nums leading-tight`}>
        {value}
      </p>
    </div>
  );
}
