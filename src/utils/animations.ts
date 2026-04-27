/**
 * Animation utility functions for Super Cricket.
 * Pure DOM-based animations using CSS classes and requestAnimationFrame.
 */

/**
 * Animate a score change with a counting effect and easing.
 * @param from Starting number
 * @param to Ending number
 * @param element The DOM element to update textContent on
 * @param duration Animation duration in ms (default 400)
 */
export function animateScoreChange(
  from: number,
  to: number,
  element: HTMLElement,
  duration: number = 400
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const diff = to - from;

    function step(timestamp: number) {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * eased);
      element.textContent = String(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = String(to);
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

/**
 * Animate a wicket fall — red flash + shake on the container.
 */
export function animateWicketFall(container: HTMLElement): void {
  // Red flash overlay
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: absolute; inset: 0; z-index: 100;
    background: rgba(239, 68, 68, 0.3);
    pointer-events: none;
    animation: fade-out 0.6s ease-out forwards;
  `;
  container.style.position = 'relative';
  container.appendChild(flash);

  // Shake
  container.style.animation = 'wicket-shake 0.4s ease-out';

  setTimeout(() => {
    flash.remove();
    container.style.animation = '';
  }, 600);
}

/**
 * Animate a SIX hit — purple burst + scale on the container.
 */
export function animateSixHit(container: HTMLElement): void {
  const burst = document.createElement('div');
  burst.style.cssText = `
    position: absolute; inset: 0; z-index: 100;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent 70%);
    pointer-events: none;
    animation: fade-out 0.8s ease-out forwards;
  `;
  container.style.position = 'relative';
  container.appendChild(burst);

  container.style.transition = 'transform 0.3s ease-out';
  container.style.transform = 'scale(1.03)';

  setTimeout(() => {
    container.style.transform = 'scale(1)';
  }, 300);

  setTimeout(() => {
    burst.remove();
  }, 800);
}

/**
 * Animate a FOUR hit — green ripple on the container.
 */
export function animateFourHit(container: HTMLElement): void {
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: absolute; top: 50%; left: 50%; z-index: 100;
    width: 50px; height: 50px;
    border-radius: 50%;
    border: 3px solid rgba(34, 197, 94, 0.5);
    transform: translate(-50%, -50%) scale(0.5);
    pointer-events: none;
    animation: ballRingExpand 0.6s ease-out forwards;
  `;
  container.style.position = 'relative';
  container.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 700);
}

/**
 * Create confetti particles for SIX events.
 * @param container Parent container to attach particles to
 * @param count Number of particles (default 12)
 */
export function createConfettiParticles(container: HTMLElement, count: number = 12): void {
  const colors = ['#8b5cf6', '#a855f7', '#d946ef', '#f59e0b', '#22c55e', '#3b82f6'];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const angle = (Math.PI * 2 * i) / count;
    const distance = 60 + Math.random() * 80;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 40; // Bias upward

    particle.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      background: ${colors[i % colors.length]};
      pointer-events: none;
      z-index: 110;
      --tx: ${tx}px;
      --ty: ${ty}px;
      animation: confetti-burst 1s ease-out forwards;
      animation-delay: ${Math.random() * 0.1}s;
    `;

    container.appendChild(particle);
    setTimeout(() => particle.remove(), 1200);
  }
}

/**
 * Animate a countdown arc on an SVG circle element.
 * Uses stroke-dashoffset animation.
 *
 * @param svgCircle The SVG circle element with stroke-dasharray set
 * @param duration Duration of countdown in seconds
 * @param onComplete Callback when countdown finishes
 * @returns Cancel function
 */
export function animateCountdownArc(
  svgCircle: SVGCircleElement,
  duration: number,
  onComplete: () => void
): () => void {
  const circumference = 2 * Math.PI * parseFloat(svgCircle.getAttribute('r') || '45');
  svgCircle.style.strokeDasharray = String(circumference);
  svgCircle.style.strokeDashoffset = '0';

  const start = performance.now();
  let cancelled = false;

  function step(timestamp: number) {
    if (cancelled) return;
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / (duration * 1000), 1);
    svgCircle.style.strokeDashoffset = String(circumference * progress);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(step);

  return () => { cancelled = true; };
}

/**
 * Draw a ball trajectory arc on a pitch SVG element.
 * Creates a parabolic path from bowler to landing zone.
 *
 * @param pitchEl The SVG element representing the pitch
 * @param landingZone Target coordinates for the ball
 */
export function animateBallTrajectory(
  pitchEl: SVGElement,
  landingZone: { x: number; y: number }
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(ns, 'path');

  // Start from bowler end (center-bottom of pitch)
  const startX = 50;
  const startY = 100;
  // Control point for parabolic arc
  const cpX = (startX + landingZone.x) / 2;
  const cpY = Math.min(startY, landingZone.y) - 30;

  path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${landingZone.x} ${landingZone.y}`);
  path.setAttribute('stroke', '#ef4444');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  path.setAttribute('opacity', '0.8');
  path.setAttribute('stroke-dasharray', '200');
  path.setAttribute('stroke-dashoffset', '200');
  path.style.transition = 'stroke-dashoffset 0.3s ease-in';

  pitchEl.appendChild(path);

  // Animate the path drawing
  requestAnimationFrame(() => {
    path.setAttribute('stroke-dashoffset', '0');
  });

  // Fade out after drawn
  setTimeout(() => {
    path.style.transition = 'opacity 0.3s ease-out';
    path.style.opacity = '0';
    setTimeout(() => path.remove(), 300);
  }, 800);
}
