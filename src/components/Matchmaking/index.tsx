import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { joinPublicQueue, leavePublicQueue } from '../../services/matchService';
import { Loader2 } from 'lucide-react';

// Simplistic matchmaking: wait 3 seconds and create a fake match if no one is found (for dev fallback)
// In a real app, a cloud function pairs people in the publicQueue.
export default function Matchmaking() {
  const { user } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    joinPublicQueue(user);

    // Mock matching after 3 seconds for demonstration
    const timer = setTimeout(() => {
      leavePublicQueue(user.uid);
      // For now, redirect back to lobby with an alert since Cloud Functions aren't set up
      alert('Public matchmaking requires a Firebase Cloud Function to pair players. Use Private Room for now!');
      navigate('/');
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (user) leavePublicQueue(user.uid);
    };
  }, [user, navigate]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 p-6 items-center justify-center">
      <Loader2 size={64} className="text-green-500 animate-spin mb-8" />
      <h2 className="text-3xl font-bold mb-2">Searching for Opponent...</h2>
      <p className="text-gray-400">Estimated wait time: 0:15</p>
      
      <button onClick={() => navigate('/')} className="mt-12 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full transition">
        Cancel
      </button>
    </div>
  );
}
