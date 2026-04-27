import { useState, useEffect } from 'react';
import type {  BallAction, ShotType  } from '../../types/cricket';

export default function BattingUI({ onSubmit, ballReady }: { onSubmit: (action: BallAction) => void; ballReady: boolean }) {
  const [shotType, setShotType] = useState<ShotType>('Defensive');
  const [power, setPower] = useState(50);
  const [timer, setTimer] = useState(8);
  const [submitted, setSubmitted] = useState(false);

  const shots: ShotType[] = ['Defensive', 'Drive', 'Cut', 'Pull', 'Sweep', 'Slog', 'Loft'];

  // Reset component state when a new ball is ready
  useEffect(() => {
    if (ballReady && submitted) {
      setSubmitted(false);
      setShotType('Defensive');
      setPower(50);
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

  const getRandomShot = (): BallAction => {
    const randomShot = shots[Math.floor(Math.random() * shots.length)];
    const randomPower = Math.floor(Math.random() * 101); // 0-100
    return { shotType: randomShot, power: randomPower };
  };

  const handleSubmit = (isTimeout = false) => {
    if (submitted) return;
    setSubmitted(true);
    if (isTimeout) {
      // Random action when timer expires
      onSubmit(getRandomShot());
    } else {
      onSubmit({ shotType, power });
    }
  };

  if (submitted) {
    return <div className="bg-gray-800 p-6 rounded-2xl text-center shadow-2xl border border-gray-700">Waiting for bowler...</div>;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-700 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-blue-400">Batting Phase</h3>
        <div className={`font-mono text-xl font-bold ${timer <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          00:0{timer}
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 mb-6">
        {shots.map(s => (
          <button 
            key={s} 
            onClick={() => setShotType(s)}
            className={`py-2 px-2 rounded-lg text-sm font-semibold transition ${shotType === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2 text-sm font-semibold">
           <span>Placement (0)</span>
           <span className="text-blue-300">Power: {power}</span>
           <span>Slog (100)</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" 
          value={power} 
          onChange={(e) => setPower(Number(e.target.value))}
          className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <button onClick={() => handleSubmit(false)} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-lg shadow-lg">
        Play Shot
      </button>
    </div>
  );
}
