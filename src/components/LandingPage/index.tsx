import { useState, useEffect } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onPlay: () => void;
  onGuestPlay: () => void;
}

interface Particle {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  color: string;
}

const TACTICAL_FEATURES = [
  {
    icon: '⚡',
    title: 'Precision Seam & Swing',
    desc: 'Manipulate aerodynamic swing in overcast skies or exploit sharp seam movement on green tops. 145+ km/h pace meets tactical deception.',
    index: '01'
  },
  {
    icon: '🎯',
    title: 'Timing & Sweet Spot',
    desc: 'Dynamic power gauge with millimeter timing. Strike with pure defensive control or unleash maximum power into the second tier.',
    index: '02'
  },
  {
    icon: '🏆',
    title: 'Multiplayer Arena & Super Overs',
    desc: 'Instant real-time PvP synchronization. If scores finish level after 20 overs, battle in an electric, nerve-shredding Super Over.',
    index: '03'
  },
  {
    icon: '🏟️',
    title: 'Global Pitch Physics',
    desc: 'Battle across iconic grounds: Lord’s green grass, Wankhede’s batting paradise, MCG’s extreme bounce, and Eden Gardens turn.',
    index: '04'
  },
  {
    icon: '📊',
    title: 'Broadcast Telemetry',
    desc: 'Live TV-grade scoreboards, wagon wheels, projected run-rates, bowler speed radar, and comprehensive career batting averages.',
    index: '05'
  },
  {
    icon: '🤝',
    title: 'Custom Pavilion Rooms',
    desc: 'Generate private pavilion codes in seconds. Choose match format from lightning 5-over shootouts to full 20-over tactical contests.',
    index: '06'
  },
];

const PITCH_TYPES_SHOWCASE = [
  { icon: '🌿', name: 'Green Top', stadium: "Lord's / Gabba", effect: 'Extra seam movement & bounce' },
  { icon: '🏜️', name: 'Dusty Turn', stadium: 'Eden Gardens / Chepauk', effect: 'Deadly spin & low bounce' },
  { icon: '🪨', name: 'Hard Deck', stadium: 'MCG / Perth', effect: 'True carry & high-speed boundary value' },
  { icon: '🏏', name: 'Batting Paradise', stadium: 'Wankhede / Chinnaswamy', effect: 'Fast outfield & high scores' },
];

export default function LandingPage({ onPlay, onGuestPlay }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [particles] = useState<Particle[]>(() => generateParticles(24));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Stadium Night Atmosphere Background */}
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

      {/* Broadcast Sports Navigation */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="brand-crest">🏏</div>
          <div className="brand-text">
            <span className="brand-title">SUPER CRICKET</span>
            <span className="brand-subtitle">PREMIER ARENA</span>
          </div>
        </div>

        <button 
          className="menu-toggle" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <button className="nav-link" onClick={() => scrollToSection('features')}>Tactics</button>
          <button className="nav-link" onClick={() => scrollToSection('pitches')}>Pitches</button>
          <button className="nav-link" onClick={() => scrollToSection('showcase')}>Atmosphere</button>
          <button className="nav-link" onClick={() => scrollToSection('cta')}>Play Online</button>
          <button className="nav-cta-btn" onClick={onPlay}>
            <span>ENTER ARENA</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-text">
            <div className="broadcast-badge">
              <span className="live-pulse" />
              <span>SOLO VS AI BOT • 1V1 MULTIPLAYER • REAL-TIME CRICKET</span>
            </div>

            <h1 className="hero-headline">
              <span>UNLEASH PURE</span>
              <span className="headline-accent"> CRICKET GLORY</span>
              <span className="headline-sub">SOLO AI BOT • 1V1 PVP • FLOODLIT ARENAS</span>
            </h1>

            <p className="hero-description">
              Step out of the pavilion onto the world’s most competitive browser cricket pitch.
              Play instantly against intelligent AI bots or duel your friends in real-time under stadium lights.
            </p>

            <div className="hero-actions">
              <button className="btn-primary-action" onClick={onPlay}>
                <span>🏏 Enter Match Pavilion</span>
              </button>
              <button className="btn-secondary-action" onClick={onGuestPlay}>
                <span>🤖 Instant Guest Pass</span>
              </button>
            </div>

            <div className="hero-stats-ribbon">
              <div className="stat-item">
                <span className="stat-val">SOLO & PVP</span>
                <span className="stat-lbl">AI BOT OR FRIENDS</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">3 AI LEVELS</span>
                <span className="stat-lbl">ROOKIE • PRO • LEGEND</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">6+ FORMATS</span>
                <span className="stat-lbl">T20 • ODI • SUPER OVER</span>
              </div>
            </div>
          </div>

          {/* Hero Visual: Sports Stage with Live Broadcast Card */}
          <div className="hero-visual">
            <div className="stadium-stage">
              <img 
                src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80" 
                alt="Floodlit cricket stadium at night" 
              />
              <div className="stadium-overlay" />

              {/* Simulated Match Telemetry */}
              <div className="broadcast-hud">
                <div className="hud-team-info">
                  <span className="hud-pill">LIVE INN 2</span>
                  <span className="hud-score">184/3</span>
                  <span className="hud-overs">(18.4 OVERS)</span>
                </div>
                <div className="hud-req">
                  NEED 12 RUNS • 8 BALLS
                </div>
              </div>
            </div>

            {/* Floating Sports Accents */}
            <div className="floating-badge badge-pos-1">
              <div className="badge-icon-box badge-icon-gold">🏆</div>
              <div>
                <div className="badge-val">98.4%</div>
                <div className="badge-sub">BATTING STRIKE RATE</div>
              </div>
            </div>

            <div className="floating-badge badge-pos-2">
              <div className="badge-icon-box badge-icon-red">⚡</div>
              <div>
                <div className="badge-val">148.5 KM/H</div>
                <div className="badge-sub">INSWINGING YORKER</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tactical Playbook Section */}
      <section className="features-section" id="features">
        <div className="section-header">
          <span className="section-tag">TACTICAL PLAYBOOK</span>
          <h2 className="section-title">Engineered for True Cricket Purists</h2>
          <p className="section-desc">
            No robotic arcade randomness. Every delivery, edge, lofted drive, and run-out is calculated
            using pitch physics, bowler angle, and batter release timing.
          </p>
        </div>

        <div className="features-grid">
          {TACTICAL_FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-header">
                <div className="feature-icon-wrapper">{f.icon}</div>
                <span className="feature-index">{f.index}</span>
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pitch Conditions & Stadiums */}
      <section className="showcase-section" id="pitches">
        <div className="section-header">
          <span className="section-tag">STADIUM TELEMETRY</span>
          <h2 className="section-title">Authentic Pitch & Weather Mechanics</h2>
          <p className="section-desc">
            Match conditions drastically reshape tactics. Adapt your shot selection to surface friction and atmospheric moisture.
          </p>
        </div>

        <div className="pitch-conditions-bar">
          {PITCH_TYPES_SHOWCASE.map((p, i) => (
            <div key={i} className="pitch-pill">
              <div className="pitch-pill-icon">{p.icon}</div>
              <div>
                <div className="pitch-pill-title">{p.name}</div>
                <div className="pitch-pill-sub">{p.stadium}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dual Showcase: Batting & Bowling Mastery */}
      <section className="showcase-section" id="showcase">
        <div className="showcase-grid">
          <div className="showcase-image-card">
            <img 
              src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80" 
              alt="Batsman executing a stroke" 
            />
          </div>

          <div className="showcase-content">
            <span className="section-tag">THE BATSMAN'S CREED</span>
            <h2 className="section-title">Dominate the 360° Field</h2>
            <p className="section-desc">
              Whether threading the cover gap off the back foot or dispatching a short ball over deep square leg,
              every shot requires precision footwork and clean timing.
            </p>

            <ul className="showcase-checklist">
              <li className="showcase-item">
                <span className="check-bullet">✓</span>
                <span><strong>7 Distinct Shot Types:</strong> Defensive block, Cover Drive, Cut, Pull, Sweep, Slog, and Straight Loft.</span>
              </li>
              <li className="showcase-item">
                <span className="check-bullet">✓</span>
                <span><strong>Tactical Power Gauge:</strong> Balance safe placement into gaps against all-or-nothing boundary hitting.</span>
              </li>
              <li className="showcase-item">
                <span className="check-bullet">✓</span>
                <span><strong>Free Hit Protection:</strong> Punish no-balls with fearless aggression without danger of being bowled or caught.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Bowling Mastery Showcase */}
      <section className="showcase-section">
        <div className="showcase-grid" style={{ direction: 'rtl' }}>
          <div className="showcase-image-card" style={{ direction: 'ltr' }}>
            <img 
              src="https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=1200&q=80" 
              alt="Cricket ball with seam on grass" 
            />
          </div>

          <div className="showcase-content" style={{ direction: 'ltr' }}>
            <span className="section-tag">THE BOWLER'S ART</span>
            <h2 className="section-title">Outfox Batters with Seam & Spin</h2>
            <p className="section-desc">
              Set batsmen up with consistent fourth-stump line before slipping through an unplayable toe-crusher or a sharp bouncer.
            </p>

            <ul className="showcase-checklist">
              <li className="showcase-item">
                <span className="check-bullet">✓</span>
                <span><strong>12-Zone Pitch Targeter:</strong> Pinpoint Yorker, Good Length, Short, and corridor of uncertainty.</span>
              </li>
              <li className="showcase-item">
                <span className="check-bullet">✓</span>
                <span><strong>Bouncer Limits & Pressure:</strong> 2 bouncers allowed per over — use them strategically to back the batsman up.</span>
              </li>
              <li className="showcase-item">
                <span className="check-bullet">✓</span>
                <span><strong>Smart Radar History:</strong> Track the batsman's weakness over the previous 6 balls to plan the dismissal.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section" id="cta">
        <div className="cta-box">
          <h2 className="cta-title">Ready for Your Match Winning Innings?</h2>
          <p className="cta-desc">
            No downloads. No waiting rooms. Step directly onto the pitch and challenge rivals from across the globe in real-time.
          </p>
          <div className="cta-buttons-wrap">
            <button className="btn-primary-action" onClick={onPlay}>
              🏏 Enter Stadium Now
            </button>
            <button className="btn-secondary-action" onClick={onGuestPlay}>
              👤 Quick Guest Play
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>© 2026 Super Cricket Championship. All rights reserved.</span>
        <div className="footer-links">
          <button className="footer-link" onClick={() => scrollToSection('features')}>Tactics</button>
          <button className="footer-link" onClick={() => scrollToSection('pitches')}>Pitches</button>
          <button className="footer-link" onClick={() => scrollToSection('showcase')}>Showcase</button>
        </div>
      </footer>
    </div>
  );
}

function generateParticles(count: number): Particle[] {
  // Sports lighting particles: turf emerald, warm pavilion gold, leather red spark
  const colors = [
    'rgba(74, 222, 128, 0.4)',
    'rgba(255, 184, 0, 0.35)',
    'rgba(217, 34, 42, 0.3)',
    'rgba(245, 239, 230, 0.25)'
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3.5 + 1.5,
    duration: `${Math.random() * 12 + 10}s`,
    delay: `${Math.random() * 8}s`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}
