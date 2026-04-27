import { useState, useEffect } from 'react';
import type { BallAction, ShotType } from '../../types/cricket';
import { Zap, Clock, Target, ArrowRight, Activity } from 'lucide-react';

export default function BattingUI({ onSubmit, ballReady }: { onSubmit: (action: BallAction) => void; ballReady: boolean }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [shotType, setShotType] = useState<ShotType>('Defensive');
  const [power, setPower] = useState(50);
  const [timer, setTimer] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const shots: ShotType[] = ['Defensive', 'Drive', 'Cut', 'Pull', 'Sweep', 'Slog', 'Loft'];

  useEffect(() => {
    if (ballReady && submitted) {
      setSubmitted(false);
      setStep(1);
      setShotType('Defensive');
      setPower(50);
      setTimer(5);
    }
  }, [ballReady]);

  useEffect(() => {
    if (submitted) return;
    
    if (timer <= 0) {
      handleTimeout();
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, timer, step]);

  const handleTimeout = () => {
    if (step === 1) {
      // Randomize shot on timeout
      setShotType(shots[Math.floor(Math.random() * shots.length)]);
      setStep(2);
      setTimer(5);
    } else {
      // Submit on final timeout
      handleSubmit(true);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      setStep(2);
      setTimer(5);
    } else {
      handleSubmit(false);
    }
  };

  const handleSubmit = (_isTimeout = false) => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit({ shotType, power });
  };

  if (submitted) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8 rounded-3xl text-center shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-gray-700/50 backdrop-blur-xl animate-pulse">
        <div className="flex justify-center mb-4"><Clock className="text-blue-400 w-12 h-12 animate-spin-slow" /></div>
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">WAITING FOR BOWLER</h3>
        <p className="text-gray-400 mt-2 text-sm">Getting ready for the delivery...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 p-4 sm:p-6 rounded-[2rem] shadow-[0_0_50px_rgba(59,130,246,0.2)] border border-blue-500/20 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_60px_rgba(59,130,246,0.3)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 bg-gray-950/50 p-3 sm:p-4 rounded-2xl border border-gray-800/50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/30">
            <Target className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">Batting</h3>
            <p className="text-[10px] sm:text-xs text-blue-400/80 font-bold tracking-wider">
              {step === 1 ? 'STEP 1: SELECT SHOT' : 'STEP 2: SET POWER'}
            </p>
          </div>
        </div>
        <div className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-inner border ${timer <= 2 ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-gray-800 border-gray-700 text-white'}`}>
          <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-[-2px]">Timer</span>
          <span className="font-mono text-xl sm:text-2xl font-black">{timer}s</span>
        </div>
      </div>

      {/* Step Progress Indicators */}
      <div className="flex gap-2 mb-6">
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-gray-700'}`} />
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-gray-700'}`} />
      </div>
      
      <div className="min-h-[160px] sm:min-h-[180px] flex flex-col justify-center">
        {/* STEP 1: Shot Selection */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {shots.map(s => (
                <button 
                  key={s} 
                  onClick={() => { setShotType(s); setStep(2); setTimer(5); }}
                  className={`relative overflow-hidden py-3 sm:py-5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                    shotType === s 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_4px_20px_rgba(59,130,246,0.5)] border-transparent scale-105' 
                      : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-blue-500/50'
                  }`}
                >
                  {shotType === s && (
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} />
                  )}
                  <span className="relative z-10 block uppercase tracking-wider">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Power Selection */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 bg-gray-900/50 p-5 sm:p-6 rounded-2xl border border-gray-800/50">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Activity className="text-yellow-400 w-5 h-5" />
                <span className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-wider">Power Level</span>
              </div>
              <div className="bg-gray-950 px-4 py-2 rounded-lg border border-gray-800 shadow-inner">
                <span className="text-blue-400 font-black text-xl sm:text-2xl">{power}%</span>
              </div>
            </div>
            
            <div className="relative pt-2 pb-6">
              <input 
                type="range" 
                min="0" max="100" 
                value={power} 
                onChange={(e) => setPower(Number(e.target.value))}
                className="w-full h-4 sm:h-5 bg-gray-800 rounded-full appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                style={{ 
                  touchAction: 'none',
                  background: `linear-gradient(to right, #3b82f6 ${power}%, #1f2937 ${power}%)`
                }}
              />
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-gray-500 mt-3 px-1 uppercase tracking-wider">
                <span>Safe Placement</span>
                <span>Balanced</span>
                <span className="text-yellow-600">Max Slog</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        {step > 1 && (
          <button 
            onClick={() => setStep(1)} 
            className="px-4 py-4 rounded-2xl font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors uppercase text-sm border border-gray-700 cursor-pointer"
          >
            Back
          </button>
        )}
        <button 
          onClick={nextStep} 
          className="flex-1 relative overflow-hidden group bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl text-white uppercase tracking-widest shadow-[0_10px_30px_rgba(59,130,246,0.4)] hover:shadow-[0_10px_40px_rgba(59,130,246,0.6)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            {step === 1 ? 'Confirm Shot' : 'Play Shot'} 
            {step === 1 ? <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" /> : <Zap className="w-5 h-5 sm:w-6 sm:h-6" />}
          </span>
        </button>
      </div>
    </div>
  );
}
