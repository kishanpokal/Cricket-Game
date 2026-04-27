export function playBatHit() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Create oscillator for the "tock" sound of wood
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    
    // Add some noise (crack)
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    noise.start();
  } catch (e) {
    console.error("Audio error:", e);
  }
}

export function speakCommentary(text: string) {
  try {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech so it doesn't queue up massively
      window.speechSynthesis.cancel();
      
      const msg = new SpeechSynthesisUtterance(text);
      msg.rate = 1.1; // Slightly faster for excitement
      msg.pitch = 1.1;
      
      // Try to find an English male or female voice that sounds good (like UK/Aussie/Indian English for cricket)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-AU')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        msg.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(msg);
    }
  } catch (e) {
    console.error("Speech error:", e);
  }
}

let crowdAudioCtx: AudioContext | null = null;
let crowdGainNode: GainNode | null = null;

export function startCrowdNoise() {
  try {
    if (crowdAudioCtx) return; // already started
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    crowdAudioCtx = new AudioContext();
    
    const bufferSize = 2 * crowdAudioCtx.sampleRate; // 2 seconds of noise
    const noiseBuffer = crowdAudioCtx.createBuffer(1, bufferSize, crowdAudioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Generate pink noise approximation for a better "crowd rumble"
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

    const whiteNoise = crowdAudioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    
    // Filter to sound like distant roar
    const filter = crowdAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    crowdGainNode = crowdAudioCtx.createGain();
    crowdGainNode.gain.value = 0.05; // Very quiet background hum

    whiteNoise.connect(filter);
    filter.connect(crowdGainNode);
    crowdGainNode.connect(crowdAudioCtx.destination);
    
    whiteNoise.start(0);
  } catch (e) {
    console.error("Crowd audio error:", e);
  }
}

export function cheerCrowd() {
  if (crowdGainNode && crowdAudioCtx) {
    const now = crowdAudioCtx.currentTime;
    // Ramp up volume
    crowdGainNode.gain.cancelScheduledValues(now);
    crowdGainNode.gain.linearRampToValueAtTime(0.2, now + 0.5);
    // Ramp back down
    crowdGainNode.gain.linearRampToValueAtTime(0.05, now + 4);
  }
}

export function stopCrowdNoise() {
  if (crowdAudioCtx) {
    crowdAudioCtx.close();
    crowdAudioCtx = null;
    crowdGainNode = null;
  }
}
