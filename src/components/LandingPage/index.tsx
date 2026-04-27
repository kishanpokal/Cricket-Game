import { useState, useEffect, useRef, useCallback } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onPlay: () => void;
  onGuestPlay: () => void;
}

// Particle data type
interface Particle {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  color: string;
}

const FEATURES = [
  { icon: '🏏', title: 'Real-Time PvP', desc: 'Play live multiplayer cricket matches against friends or global opponents in real-time.', colorClass: 'green' },
  { icon: '🎯', title: 'Smart Bowling', desc: 'Master swing, spin and pace with an intelligent bowling system featuring bouncers and no-balls.', colorClass: 'blue' },
  { icon: '🏆', title: 'Leaderboards', desc: 'Climb the global rankings, earn trophies and showcase your cricket domination.', colorClass: 'gold' },
  { icon: '⚡', title: 'Super Overs', desc: 'Tied match? Battle it out in a thrilling Super Over to decide the ultimate winner.', colorClass: 'purple' },
  { icon: '🎮', title: 'Power Shots', desc: 'Time your power meter perfectly to unleash devastating sixes and boundaries.', colorClass: 'red' },
  { icon: '📊', title: 'Live Stats', desc: 'Track every run, wicket and milestone with beautiful real-time scorecards.', colorClass: 'cyan' },
];

const SHOWCASE_ITEMS = [
  '🏟️ Stunning stadium environments with dynamic weather',
  '🎵 Immersive crowd sounds and commentary effects',
  '🔥 Free Hit mechanics after no-balls',
  '📱 Fully responsive — play on any device',
  '👥 Private rooms with custom over formats',
];

export default function LandingPage({ onPlay, onGuestPlay }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [particles] = useState<Particle[]>(() => generateParticles(30));
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  // Counter animation states
  const [counters, setCounters] = useState({ players: 0, matches: 0, sixes: 0 });
  const counterRef = useRef<HTMLDivElement>(null);
  const counterAnimated = useRef(false);

  const addRevealRef = useCallback((el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  }, []);

  // Scroll handler for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    revealRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !counterAnimated.current) {
          counterAnimated.current = true;
          animateCounters();
        }
      },
      { threshold: 0.5 }
    );

    if (counterRef.current) observer.observe(counterRef.current);
    return () => observer.disconnect();
  }, []);

  const animateCounters = () => {
    const targets = { players: 50000, matches: 200000, sixes: 1500000 };
    const duration = 2000;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCounters({
        players: Math.floor(targets.players * eased),
        matches: Math.floor(targets.matches * eased),
        sixes: Math.floor(targets.sixes * eased),
      });
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return n.toString();
  };

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="landing-bg">
        <div className="landing-grid" />
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              animationDuration: p.duration,
              animationDelay: p.delay,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-logo">
          <div className="logo-icon">🏏</div>
          <span className="logo-text">SUPER CRICKET</span>
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <button className="nav-link" onClick={() => scrollToSection('features')}>Features</button>
          <button className="nav-link" onClick={() => scrollToSection('showcase')}>Gameplay</button>
          <button className="nav-link" onClick={() => scrollToSection('cta')}>Community</button>
          <button className="nav-link nav-cta" onClick={onPlay}>Play Now</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="badge-dot" />
              LIVE MULTIPLAYER
            </div>

            <h1 className="hero-title">
              <span className="title-line">UNLEASH YOUR</span>
              <span className="title-line title-gradient">CRICKET FURY</span>
            </h1>

            <p className="hero-subtitle">
              Experience the most thrilling multiplayer cricket game on the web.
              Real-time PvP battles, stunning visuals, and heart-pounding Super Overs await.
            </p>

            <div className="hero-actions">
              <button className="btn-primary" onClick={onPlay}>
                ⚡ Start Playing
              </button>
              <button className="btn-secondary" onClick={onGuestPlay}>
                👤 Play as Guest
              </button>
            </div>

            <div className="hero-stats" ref={counterRef}>
              <div className="stat-item">
                <div className="stat-number">{formatNumber(counters.players)}+</div>
                <div className="stat-label">Active Players</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{formatNumber(counters.matches)}+</div>
                <div className="stat-label">Matches Played</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{formatNumber(counters.sixes)}+</div>
                <div className="stat-label">Sixes Hit</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-container">
              <img src="/hero-bg.png" alt="Super Cricket Gameplay" />
              <div className="hero-image-overlay" />
            </div>

            <div className="floating-element float-1">
              <span className="float-icon">🏏</span>
              <span>
                <span className="float-value">6!</span>
                <span className="float-label">MAXIMUM</span>
              </span>
            </div>

            <div className="floating-element float-2">
              <span className="float-icon">🔥</span>
              <span>
                <span className="float-value">WICKET!</span>
                <span className="float-label">BOWLED</span>
              </span>
            </div>

            <div className="floating-element float-3">
              <span className="float-icon">⭐</span>
              <span>
                <span className="float-value">MVP</span>
                <span className="float-label">AWARDED</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-header reveal" ref={addRevealRef}>
          <div className="section-tag">WHY PLAY</div>
          <h2 className="section-title">Next-Level Cricket Gaming</h2>
          <p className="section-desc">
            Every feature is crafted to deliver the most realistic and exciting cricket experience ever built for the web.
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="feature-card reveal"
              ref={addRevealRef}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className={`feature-icon ${f.colorClass}`}>{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase Section */}
      <section className="showcase-section" id="showcase">
        <div className="showcase-grid">
          <div className="showcase-image reveal" ref={addRevealRef}>
            <img src="/batsman-action.png" alt="Batsman in action" />
          </div>
          <div className="showcase-content reveal" ref={addRevealRef}>
            <div className="section-tag">THE EXPERIENCE</div>
            <h2 className="section-title">Built for Cricket Fans</h2>
            <p className="section-desc">
              From the roar of the crowd to the precision of every delivery, Super Cricket captures the soul of the sport.
            </p>
            <ul className="showcase-list">
              {SHOWCASE_ITEMS.map((item, i) => (
                <li key={i}>
                  <span className="list-check">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Second Showcase (reversed) */}
      <section className="showcase-section">
        <div className="showcase-grid" style={{ direction: 'rtl' }}>
          <div className="showcase-image reveal" ref={addRevealRef} style={{ direction: 'ltr' }}>
            <img src="/bowler-action.png" alt="Bowler in action" />
          </div>
          <div className="showcase-content reveal" ref={addRevealRef} style={{ direction: 'ltr' }}>
            <div className="section-tag">COMPETITIVE</div>
            <h2 className="section-title">Dominate the Pitch</h2>
            <p className="section-desc">
              Master every format from T20 blitz to ODI marathons. Outsmart your opponent with strategy and skill.
            </p>
            <ul className="showcase-list">
              <li><span className="list-check">✓</span>🎯 Precision bowling with swing and spin mechanics</li>
              <li><span className="list-check">✓</span>⚡ Power meter timing for devastating shot placement</li>
              <li><span className="list-check">✓</span>🏆 T20, ODI, and custom over formats available</li>
              <li><span className="list-check">✓</span>🤝 Challenge friends with private room codes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta">
        <div className="cta-box reveal" ref={addRevealRef}>
          <h2 className="cta-title">
            Ready to Hit a <span className="title-gradient">Six</span>?
          </h2>
          <p className="cta-desc">
            Join thousands of cricket fans in the ultimate online cricket experience. Free to play, no downloads required.
          </p>
          <div className="cta-buttons">
            <button className="btn-primary" onClick={onPlay}>
              🚀 Play with Google
            </button>
            <button className="btn-secondary" onClick={onGuestPlay}>
              👤 Continue as Guest
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span className="footer-text">© 2026 Super Cricket. All rights reserved.</span>
        <div className="footer-links">
          <button className="footer-link" onClick={() => scrollToSection('features')}>Features</button>
          <button className="footer-link" onClick={() => scrollToSection('showcase')}>Gameplay</button>
          <button className="footer-link" onClick={() => scrollToSection('cta')}>Community</button>
        </div>
      </footer>
    </div>
  );
}

function generateParticles(count: number): Particle[] {
  const colors = ['rgba(0, 255, 136, 0.6)', 'rgba(0, 212, 255, 0.5)', 'rgba(255, 215, 0, 0.4)'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 2,
    duration: `${Math.random() * 10 + 8}s`,
    delay: `${Math.random() * 10}s`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}
