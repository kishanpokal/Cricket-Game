import { useAuth } from '../../hooks/useAuth';
import { Trophy, Shield } from 'lucide-react';

export default function Auth() {
  const { signIn } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-900 to-gray-900">
      <div className="p-10 bg-gray-800 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full border border-gray-700">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
          <Trophy size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Super Cricket</h1>
        <p className="text-gray-400 mb-8 text-center">The ultimate multiplayer cricket experience. Play with friends around the world.</p>
        
        <button 
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-4 px-6 rounded-xl hover:bg-gray-100 transition duration-200 shadow-xl"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
          Sign in with Google
        </button>
        
        <div className="mt-8 flex items-center gap-2 text-xs text-gray-500">
          <Shield size={14} />
          <span>Secure authentication via Firebase</span>
        </div>
      </div>
    </div>
  );
}
