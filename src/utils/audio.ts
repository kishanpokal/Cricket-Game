/**
 * AudioManager — Singleton audio system for Super Cricket.
 * Manages all game sounds, crowd noise, commentary, and volume controls.
 */

const STORAGE_KEY_MUTED = 'sc_audio_muted';
const STORAGE_KEY_VOLUME = 'sc_audio_volume';
const STORAGE_KEY_ACCENT = 'sc_audio_accent';
const MAX_CONCURRENT_EFFECTS = 3;

export type CommentaryAccent = 'en-IN' | 'en-GB' | 'en-AU';

export class AudioManager {
  private static instance: AudioManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean;
  private volume: number;
  private accent: CommentaryAccent;
  private activeSounds: number = 0;
  private crowdCtx: AudioContext | null = null;
  private crowdGain: GainNode | null = null;
  private commentaryQueue: string[] = [];
  private isSpeaking: boolean = false;
  private contextResumed: boolean = false;

  private constructor() {
    this.muted = localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
    this.volume = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME) ?? '0.7');
    this.accent = (localStorage.getItem(STORAGE_KEY_ACCENT) as CommentaryAccent) || 'en-IN';
  }

  /** Get the singleton AudioManager instance */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** Resume audio context — call on first user interaction */
  resumeContext(): void {
    if (this.contextResumed) return;
    this.contextResumed = true;

    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.error('AudioManager: Failed to create context', e);
    }
  }

  // ─── Volume Controls ─────────────────────────────────────────────────────

  getMuted(): boolean { return this.muted; }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume;
    }
    if (this.crowdGain) {
      this.crowdGain.gain.value = muted ? 0 : 0.05 * this.volume;
    }
  }

  getVolume(): number { return this.volume; }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem(STORAGE_KEY_VOLUME, String(this.volume));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  getAccent(): CommentaryAccent { return this.accent; }

  setAccent(accent: CommentaryAccent): void {
    this.accent = accent;
    localStorage.setItem(STORAGE_KEY_ACCENT, accent);
  }

  // ─── Sound Effect Queue ──────────────────────────────────────────────────

  private canPlayEffect(): boolean {
    return this.activeSounds < MAX_CONCURRENT_EFFECTS && !this.muted && !!this.ctx;
  }

  private trackEffect(): void { this.activeSounds++; }
  private untrackEffect(): void { this.activeSounds = Math.max(0, this.activeSounds - 1); }

  // ─── Sound Effects ───────────────────────────────────────────────────────

  /** Play bat hitting ball — adjusts tone based on whether it's a mishit */
  playBatHit(isMishit: boolean = false): void {
    if (!this.canPlayEffect() || !this.ctx || !this.masterGain) return;
    this.trackEffect();

    try {
      const baseFreq = isMishit ? 300 : 600;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);

      // Add noise crack
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = isMishit ? 500 : 1000;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.8, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start();

      setTimeout(() => this.untrackEffect(), 150);
    } catch (e) {
      console.error('playBatHit error:', e);
      this.untrackEffect();
    }
  }

  /** Play wicket falling sound — deep tone with reverb-like decay */
  playWicket(): void {
    if (!this.canPlayEffect() || !this.ctx || !this.masterGain) return;
    this.trackEffect();

    try {
      // Deep thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);

      // Stumps rattle noise
      const bufSize = this.ctx.sampleRate * 0.3;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      }
      const ns = this.ctx.createBufferSource();
      ns.buffer = buf;
      const nf = this.ctx.createBiquadFilter();
      nf.type = 'highpass';
      nf.frequency.value = 800;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(this.volume * 0.6, this.ctx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      ns.connect(nf);
      nf.connect(ng);
      ng.connect(this.masterGain);
      ns.start();

      setTimeout(() => this.untrackEffect(), 600);
    } catch (e) {
      console.error('playWicket error:', e);
      this.untrackEffect();
    }
  }

  /** Play SIX sound — ascending chord C4-E4-G4 */
  playSix(): void {
    if (!this.canPlayEffect() || !this.ctx || !this.masterGain) return;
    this.trackEffect();

    try {
      const notes = [261.63, 329.63, 392.0]; // C4, E4, G4
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.07);
        gain.gain.linearRampToValueAtTime(this.volume * 0.5, this.ctx!.currentTime + i * 0.07 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(this.ctx!.currentTime + i * 0.07);
        osc.stop(this.ctx!.currentTime + 0.4);
      });
      setTimeout(() => this.untrackEffect(), 500);
    } catch (e) {
      console.error('playSix error:', e);
      this.untrackEffect();
    }
  }

  /** Play FOUR sound — high ping at 880Hz */
  playFour(): void {
    if (!this.canPlayEffect() || !this.ctx || !this.masterGain) return;
    this.trackEffect();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(this.volume * 0.6, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
      setTimeout(() => this.untrackEffect(), 200);
    } catch (e) {
      console.error('playFour error:', e);
      this.untrackEffect();
    }
  }

  /** Play NO BALL buzzer — descending 300→150Hz */
  playNoBall(): void {
    if (!this.canPlayEffect() || !this.ctx || !this.masterGain) return;
    this.trackEffect();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
      setTimeout(() => this.untrackEffect(), 350);
    } catch (e) {
      console.error('playNoBall error:', e);
      this.untrackEffect();
    }
  }

  /** Play timer warning pulse at 2Hz */
  playTimerWarning(): void {
    if (!this.canPlayEffect() || !this.ctx || !this.masterGain) return;
    this.trackEffect();

    try {
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 440;
        const start = this.ctx.currentTime + i * 0.5;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.15);
      }
      setTimeout(() => this.untrackEffect(), 1100);
    } catch (e) {
      console.error('playTimerWarning error:', e);
      this.untrackEffect();
    }
  }

  // ─── Crowd Noise ─────────────────────────────────────────────────────────

  /** Start ambient crowd noise */
  startCrowdNoise(): void {
    if (this.crowdCtx || this.muted) return;

    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext as typeof AudioContext;
      if (!AC) return;
      this.crowdCtx = new AC();

      const bufferSize = 2 * this.crowdCtx.sampleRate;
      const noiseBuffer = this.crowdCtx.createBuffer(1, bufferSize, this.crowdCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink noise approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }

      const source = this.crowdCtx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.crowdCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      this.crowdGain = this.crowdCtx.createGain();
      this.crowdGain.gain.value = 0.05 * this.volume;

      source.connect(filter);
      filter.connect(this.crowdGain);
      this.crowdGain.connect(this.crowdCtx.destination);
      source.start(0);
    } catch (e) {
      console.error('Crowd noise error:', e);
    }
  }

  /** Crowd cheers louder for boundaries/wickets */
  cheerCrowd(): void {
    if (this.crowdGain && this.crowdCtx && !this.muted) {
      const now = this.crowdCtx.currentTime;
      this.crowdGain.gain.cancelScheduledValues(now);
      this.crowdGain.gain.linearRampToValueAtTime(0.2 * this.volume, now + 0.5);
      this.crowdGain.gain.linearRampToValueAtTime(0.05 * this.volume, now + 4);
    }
  }

  /** Make crowd louder during death overs */
  setDeathOversCrowd(isDeathOvers: boolean): void {
    if (this.crowdGain && this.crowdCtx && !this.muted) {
      const target = isDeathOvers ? 0.1 * this.volume : 0.05 * this.volume;
      this.crowdGain.gain.linearRampToValueAtTime(target, this.crowdCtx.currentTime + 1);
    }
  }

  /** Stop crowd noise */
  stopCrowdNoise(): void {
    if (this.crowdCtx) {
      this.crowdCtx.close();
      this.crowdCtx = null;
      this.crowdGain = null;
    }
  }

  // ─── Commentary ──────────────────────────────────────────────────────────

  /** Queue commentary text — max depth 2, discards older */
  speakCommentary(text: string): void {
    if (this.muted || !('speechSynthesis' in window)) return;

    // Max queue depth of 2
    if (this.commentaryQueue.length >= 2) {
      this.commentaryQueue.shift();
    }
    this.commentaryQueue.push(text);

    if (!this.isSpeaking) {
      this.processCommentaryQueue();
    }
  }

  private processCommentaryQueue(): void {
    if (this.commentaryQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const text = this.commentaryQueue.shift()!;

    try {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(text);
      msg.rate = 1.1;
      msg.pitch = 1.1;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes(this.accent))
        || voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) msg.voice = preferredVoice;

      msg.onend = () => this.processCommentaryQueue();
      msg.onerror = () => this.processCommentaryQueue();

      window.speechSynthesis.speak(msg);
    } catch (e) {
      console.error('Speech error:', e);
      this.processCommentaryQueue();
    }
  }
}

// ─── Legacy exports for backward compatibility ──────────────────────────────

export function playBatHit(): void {
  AudioManager.getInstance().playBatHit(false);
}

export function speakCommentary(text: string): void {
  AudioManager.getInstance().speakCommentary(text);
}

export function startCrowdNoise(): void {
  AudioManager.getInstance().startCrowdNoise();
}

export function cheerCrowd(): void {
  AudioManager.getInstance().cheerCrowd();
}

export function stopCrowdNoise(): void {
  AudioManager.getInstance().stopCrowdNoise();
}
