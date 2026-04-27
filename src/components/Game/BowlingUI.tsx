import { useState, useEffect } from 'react';
import type {  BallAction, BowlType, Line, Length  } from '../../types/cricket';

export default function BowlingUI({ onSubmit, ballReady, bouncersBowledInOver }: { onSubmit: (action: BallAction) => void; ballReady: boolean; bouncersBowledInOver: number }) {
  const [bowlType, setBowlType] = useState<BowlType>('Pace');
  const [line, setLine] = useState<Line>('Off Stump');
  const [length, setLength] = useState<Length>('Good Length');
  const [timer, setTimer] = useState(8);
  const [submitted, setSubmitted] = useState(false);

  const lines: Line[] = ['Outside Off', 'Off Stump', 'Middle', 'Leg', 'Wide'];
  const lengths: Length[] = ['Full', 'Good Length', 'Short', 'Yorker', 'Bouncer'];

  // Reset component state when a new ball is ready
  useEffect(() => {
    if (ballReady && submitted) {
      setSubmitted(false);
      setBowlType('Pace');
      setLine('Off Stump');
      setLength('Good Length');
      setTimer(8);
    }
  }, [ballReady]);

  useEffect(() => {
    if (submitted) return;
    
    if (timer <= 0) {
      handleSubmit(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, timer]);

  const getRandomBowl = (): BallAction => {
    const randomBowl = (['Pace', 'Spin', 'Swing'] as BowlType[])[Math.floor(Math.random() * 3)];
    const randomLine = lines[Math.floor(Math.random() * lines.length)];
    const randomLength = lengths[Math.floor(Math.random() * lengths.length)];
    return { bowlType: randomBowl, line: randomLine, length: randomLength };
  };

  const handleSubmit = (isTimeout = false) => {
    if (submitted) return;
    setSubmitted(true);
    if (isTimeout) {
      onSubmit(getRandomBowl());
    } else {
      onSubmit({ bowlType, line, length });
    }
  };

  if (submitted) {
    return <div className="bg-gray-800 p-6 rounded-2xl text-center shadow-2xl border border-gray-700">Waiting for batter...</div>;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-700 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-red-400">Bowling Phase</h3>
        <div className={`font-mono text-xl font-bold ${timer <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          00:0{timer}
        </div>
      </div>
      
      <div className="flex gap-4 mb-4">
         {(['Pace', 'Spin', 'Swing'] as BowlType[]).map(t => (
           <button 
             key={t}
             onClick={() => setBowlType(t)}
             className={`flex-1 py-2 rounded-lg font-semibold ${bowlType === t ? 'bg-red-600 text-white' : 'bg-gray-700'}`}
           >
             {t}
           </button>
         ))}
      </div>

      <div className="mb-4">
         <p className="text-sm text-gray-400 mb-2">Line</p>
         <div className="flex flex-wrap gap-2">
            {lines.map(l => (
              <button 
                key={l}
                onClick={() => setLine(l)}
                className={`px-3 py-1 text-sm rounded-full ${line === l ? 'bg-red-500 text-white' : 'bg-gray-700'}`}
              >
                {l}
              </button>
            ))}
         </div>
      </div>

      <div className="mb-6">
         <p className="text-sm text-gray-400 mb-2">Length</p>
         <div className="flex flex-wrap gap-2">
            {lengths.map(l => {
              const disabled = l === 'Bouncer' && bouncersBowledInOver >= 2;
              return (
              <button 
                key={l}
                onClick={() => !disabled && setLength(l)}
                disabled={disabled}
                className={`px-3 py-1 text-sm rounded-full ${length === l ? 'bg-red-500 text-white' : 'bg-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {l} {disabled && '(Max 2)'}
              </button>
            )})}
         </div>
      </div>

      <button onClick={() => handleSubmit(false)} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-xl font-bold text-lg shadow-lg">
        Bowl Delivery
      </button>
    </div>
  );
}
