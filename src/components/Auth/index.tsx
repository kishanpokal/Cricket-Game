import { useAuth } from '../../hooks/useAuth';
import { Shield, User, ArrowRight } from 'lucide-react';

export default function Auth() {
  const { signIn, signInAsGuest } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#070c08] p-4 relative overflow-hidden">
      {/* Stadium Floodlight Atmospheric Backlight */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 92, 55, 0.3) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div 
          className="absolute bottom-0 right-10 w-[400px] h-[400px]"
          style={{
            background: 'radial-gradient(circle at center, rgba(217, 34, 42, 0.08) 0%, transparent 60%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* Pavilion Locker Room Access Card */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-[#112217] to-[#0a140d] rounded-2xl p-8 sm:p-10 border border-[#f5efe6]/10 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
        
        {/* Top Club Badge */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1b4d2e] to-[#0d1a11] border-2 border-[#ffb800]/40 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(27,77,46,0.6)]">
            <span className="text-3xl" aria-hidden="true">🏏</span>
            <div className="absolute -top-2 -right-2 bg-[#d9222a] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
              PRO
            </div>
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-[#f5efe6] uppercase font-bold text-center leading-none">
            SUPER CRICKET
          </h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb800] mt-1.5">
            PAVILION ACCESS PASS
          </p>
        </div>

        <p className="text-[#c8bead] text-sm text-center mb-8 leading-relaxed">
          Sign in to preserve your career stats, leaderboard trophies, and duel friends across global stadiums.
        </p>

        {/* Buttons */}
        <div className="space-y-3.5">
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-[#f5efe6] text-[#070c08] font-bold py-3.5 px-6 rounded-xl hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer group"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            <span className="text-sm font-extrabold uppercase tracking-wide">Continue with Google</span>
            <ArrowRight className="w-4 h-4 ml-auto text-gray-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={signInAsGuest}
            className="w-full flex items-center justify-center gap-3 bg-[#162e20] text-[#f5efe6] font-bold py-3.5 px-6 rounded-xl hover:bg-[#1f3f2c] transition-all duration-200 border border-[#f5efe6]/15 hover:border-[#ffb800]/40 cursor-pointer group"
          >
            <User className="w-5 h-5 text-[#ffb800]" />
            <span className="text-sm font-extrabold uppercase tracking-wide">Play as Guest</span>
            <span className="ml-auto text-[11px] text-[#c8bead] font-mono uppercase bg-black/30 px-2 py-0.5 rounded">
              Instant
            </span>
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-8 pt-6 border-t border-[#f5efe6]/10 flex items-center justify-center gap-2 text-[11px] text-[#8c8273]">
          <Shield className="w-3.5 h-3.5 text-[#10b981]" />
          <span>Real-time multiplayer powered by Firebase</span>
        </div>
      </div>
    </div>
  );
}
