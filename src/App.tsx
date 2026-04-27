import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';

// Lazy-loaded routes for better initial load performance
const Lobby = lazy(() => import('./components/Lobby'));
const Matchmaking = lazy(() => import('./components/Matchmaking'));
const Toss = lazy(() => import('./components/Toss'));
const Game = lazy(() => import('./components/Game'));
const Profile = lazy(() => import('./components/Profile'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));

function LoadingFallback() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--color-night-sky)] text-white">
      <div className="w-12 h-12 rounded-full border-2 border-green-400 border-t-transparent animate-spin mb-4" />
      <p className="text-gray-400 font-semibold text-sm">Loading...</p>
    </div>
  );
}

function App() {
  const { user, loading, signIn, signInAsGuest } = useAuth();
  const [showLanding, setShowLanding] = useState(true);

  if (loading) {
    return <LoadingFallback />;
  }

  // Show landing page for non-authenticated users who haven't clicked play
  if (!user && showLanding) {
    return (
      <LandingPage
        onPlay={() => {
          setShowLanding(false);
          signIn();
        }}
        onGuestPlay={() => {
          setShowLanding(false);
          signInAsGuest();
        }}
      />
    );
  }

  // Show auth screen if not logged in (after dismissing landing)
  if (!user) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-[var(--color-night-sky)] text-white font-sans">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/matchmaking" element={<Matchmaking />} />
            <Route path="/toss/:matchId" element={<Toss />} />
            <Route path="/game/:matchId" element={<Game />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
