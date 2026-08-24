export const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Use a mix of sine and triangle for a slightly richer, "bell-like" premium sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Ascending major chord (C5, E5, G5, C6) for a premium "success" chime
    playNote(523.25, now, 0.4);       // C5
    playNote(659.25, now + 0.12, 0.4); // E5
    playNote(783.99, now + 0.24, 0.4); // G5
    playNote(1046.50, now + 0.36, 0.8); // C6
  } catch (e) {
    console.error('Audio playback failed:', e);
  }
};
