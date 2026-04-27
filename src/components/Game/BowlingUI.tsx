import { useState, useEffect } from 'react';
import type { BallAction, BowlType, Line, Length } from '../../types/cricket';
import { Target, Crosshair, Clock, Zap, ArrowRight } from 'lucide-react';

export default function BowlingUI({ onSubmit, ballReady, bouncersBowledInOver }: { onSubmit: (action: BallAction) => void; ballReady: boolean; bouncersBowledInOver: number }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bowlType, setBowlType] = useState<BowlType>('Pace');
  const [line, setLine] = useState<Line>('Off Stump');
  const [length, setLength] = useState<Length>('Good Length');
  const [timer, setTimer] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const lines: Line[] = ['Outside Off', 'Off Stump', 'Middle', 'Leg', 'Wide'];
  const lengths: Length[] = ['Full', 'Good Length', 'Short', 'Yorker', 'Bouncer'];

  useEffect(() => {
    if (ballReady && submitted) {
      setSubmitted(false);
      setStep(1);
      setBowlType('Pace');
      setLine('Off Stump');
      setLength('Good Length');
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
      setBowlType((['Pace', 'Spin', 'Swing'] as BowlType[])[Math.floor(Math.random() * 3)]);
      setStep(2);
      setTimer(5);
    } else if (step === 2) {
      setLine(lines[Math.floor(Math.random() * lines.length)]);
      setStep(3);
      setTimer(5);
    } else {
      handleSubmit(true);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      setStep(2);
      setTimer(5);
    } else if (step === 2) {
      setStep(3);
      setTimer(5);
    } else {
      handleSubmit(false);
    }
  };

  const handleSubmit = (_isTimeout = false) => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit({ bowlType, line, length });
  };

  if (submitted) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 p-6 sm:p-8 rounded-3xl text-center shadow-[0_0_40px_rgba(239,68,68,0.3)] border border-gray-700/50 backdrop-blur-xl animate-pulse">
        <div className="flex justify-center mb-4"><Clock className="text-red-400 w-12 h-12 animate-spin-slow" /></div>
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300">WAITING FOR BATTER</h3>
        <p className="text-gray-400 mt-2 text-sm">Strategizing for your delivery...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 p-4 sm:p-6 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.2)] border border-red-500/20 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_60px_rgba(239,68,68,0.3)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 bg-gray-950/50 p-3 sm:p-4 rounded-2xl border border-gray-800/50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-red-600/20 p-2 rounded-xl border border-red-500/30">
            <Target className="text-red-400 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">Bowling</h3>
            <p className="text-[10px] sm:text-xs text-red-400/80 font-bold tracking-wider">
              {step === 1 ? 'STEP 1: BOWL TYPE' : step === 2 ? 'STEP 2: SET LINE' : 'STEP 3: SET LENGTH'}
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
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gray-700'}`} />
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gray-700'}`} />
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gray-700'}`} />
      </div>

      <div className="min-h-[160px] sm:min-h-[180px] flex flex-col justify-center">
        {/* STEP 1: Bowl Type */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-row gap-2 sm:gap-3">
              {(['Pace', 'Spin', 'Swing'] as BowlType[]).map(t => (
                <button 
                  key={t}
                  onClick={() => { setBowlType(t); setStep(2); setTimer(5); }}
                  className={`relative flex-1 py-3 sm:py-6 rounded-xl font-black text-xs sm:text-base uppercase tracking-widest transition-all duration-200 cursor-pointer overflow-hidden ${
                    bowlType === t 
                      ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_4px_20px_rgba(239,68,68,0.5)] border-transparent scale-[1.02]' 
                      : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-red-500/50'
                  }`}
                >
                  {bowlType === t && <div className="absolute inset-0 bg-white/20 animate-shimmer" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }} />}
                  <span className="relative z-10 block">{t}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Line */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 bg-gray-900/50 p-5 rounded-2xl border border-gray-800/50">
            <div className="flex items-center gap-2 mb-4">
              <Crosshair className="text-orange-400 w-5 h-5" />
              <p className="text-sm font-bold text-gray-300 uppercase tracking-wider">Select Line</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {lines.map(l => (
                <button 
                  key={l}
                  onClick={() => { setLine(l); setStep(3); setTimer(5); }}
                  className={`py-3 sm:py-4 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                    line === l 
                      ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] border-transparent' 
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-orange-500/50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Length */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 bg-gray-900/50 p-5 rounded-2xl border border-gray-800/50">
            <div className="flex items-center gap-2 mb-4">
              <Target className="text-orange-400 w-5 h-5" />
              <p className="text-sm font-bold text-gray-300 uppercase tracking-wider">Select Length</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {lengths.map(l => {
                const disabled = l === 'Bouncer' && bouncersBowledInOver >= 2;
                return (
                  <button 
                    key={l}
                    onClick={() => {
                      if (!disabled) {
                        setLength(l);
                        // We do not auto-submit here, wait for manual confirmation or timeout
                      }
                    }}
                    disabled={disabled}
                    className={`py-3 sm:py-4 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 uppercase tracking-wider flex flex-col items-center justify-center gap-1 ${
                      disabled 
                        ? 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed opacity-50' 
                        : length === l 
                          ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] border-transparent' 
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-white hover:border-orange-500/50 cursor-pointer'
                    }`}
                  >
                    <span>{l}</span>
                    {disabled && <span className="text-[8px] sm:text-[10px] text-red-500/80 tracking-normal">(Max 2 Reached)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        {step > 1 && (
          <button 
            onClick={() => { setStep(s => (s - 1) as 1 | 2); setTimer(5); }} 
            className="px-4 py-4 rounded-2xl font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors uppercase text-sm border border-gray-700 cursor-pointer"
          >
            Back
          </button>
        )}
        <button 
          onClick={nextStep} 
          className="flex-1 relative overflow-hidden group bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl text-white uppercase tracking-widest shadow-[0_10px_30px_rgba(239,68,68,0.4)] hover:shadow-[0_10px_40px_rgba(239,68,68,0.6)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            {step === 3 ? 'Bowl Delivery' : 'Next Step'} 
            {step === 3 ? <Zap className="w-5 h-5 sm:w-6 sm:h-6" /> : <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />}
          </span>
        </button>
      </div>
    </div>
  );
}
