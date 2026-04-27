import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import Matchmaking from './components/Matchmaking';
import Toss from './components/Toss';
import Game from './components/Game';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">Loading Game...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        {!user ? (
          <Auth />
        ) : (
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/matchmaking" element={<Matchmaking />} />
            <Route path="/toss/:matchId" element={<Toss />} />
            <Route path="/game/:matchId" element={<Game />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
