// ==========================================
// Web Audio API Procedural Sound Synthesizer
// Zero external files required
// ==========================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.bgmEnabled = true;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmTempo = 104; // BPM
    this.isBgmPlaying = false;
    this.epilogueTimer = null;
    this.epilogueGain = null;
    this.epilogueStep = 0;
    this.isEpiloguePlaying = false;
    this.menuTimer = null;
    this.menuGain = null;
    this.menuFilter = null;
    this.menuStep = 0;
    this.isMenuPlaying = false;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      // Let the browser choose a power-efficient buffer size for background music.
      this.ctx = new AudioCtx({ latencyHint: 'playback' });
    }
    let resumePromise = Promise.resolve();
    if (this.ctx.state === 'suspended') {
      resumePromise = this.ctx.resume();
    }
    if (!this.cachedNoise && this.ctx) {
      this.cachedNoise = this.createNoiseBuffer(1.5);
    }
    return resumePromise;
  }

  // Helper to create noise buffer once
  createNoiseBuffer(duration = 1.0) {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  getNoiseBuffer() {
    if (!this.cachedNoise) {
      this.init();
    }
    return this.cachedNoise;
  }

  // --- Mantis Sound FX ---

  playSlash() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Noise swoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(4500, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);

    // Chitin blade high ping
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.12);
    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playHeavySlash() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Deep blade slice
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);

    this.playSlash();
  }

  playParry() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Resonant metallic ding
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playJump() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playHit() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // --- Creature & Mantis Combat Biting Sound FX ---

  playFrogJump() {
    if (!this.sfxEnabled) return;
    this.playJump();
  }

  playFrogLand() {
    if (!this.sfxEnabled) return;
    this.playHit();
  }

  playMandibleBite() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // 1. Chitinous mandibular crunch (filtered noise burst)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.09);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.42, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // 2. Visceral jaw snap tone (cutting teeth crunch)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playWingFlutter() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Rustling rapid wing flutter (filtered noise bursts mimicking grasshopper flight)
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.05;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + i * 200, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.04);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
    }
  }

  playGrasshopperJump() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playBlueFlash() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.2);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  playLocustCharge() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.3);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playKatydidStridulation() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Short, softer stridulation chirp — avoid a piercing continuous whistle.
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1500 + i * 250, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.06);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  playFrogCroak() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Throaty guttural ribbit
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(85, now + 0.28);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  playTongueWhip() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playHornetBuzz() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.18);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playStingerThrust() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playAntSwarm() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playSnakeHiss() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playSnakeStrike() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Whip snap
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playVictory() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chords.forEach((freq, idx) => {
      const t = now + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }

  playDefeat() {
    if (!this.sfxEnabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [330, 311, 293, 277];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.2;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  // --- Dynamic Procedural BGM Synthesizer ---

  startBGM() {
    if (this.isBgmPlaying || !this.bgmEnabled) return;
    this.init();
    this.stopMenuMusic();
    this.stopEpilogueMusic();
    this.isBgmPlaying = true;
    this.bgmStep = 0;
    const stepIntervalMs = (60 / this.bgmTempo / 2) * 1000; // 8th notes: lighter scheduler load

    const bassScale = [73.42, 82.41, 98.00, 110.00, 123.47]; // D, E, G, A, B bass
    const leadScale = [293.66, 329.63, 392.00, 440.00, 493.88, 587.33];

    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.bgmStep % 16;

      // Kick drum on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        const kick = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(140, now);
        kick.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        kickGain.gain.setValueAtTime(0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        kick.connect(kickGain);
        kickGain.connect(this.ctx.destination);
        kick.start(now);
        kick.stop(now + 0.13);
      }

      // Bassline
      if (step % 4 === 0 || step % 4 === 3) {
        const bassNote = bassScale[(Math.floor(this.bgmStep / 8)) % bassScale.length];
        const bass = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(bassNote, now);
        bGain.gain.setValueAtTime(0.12, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        bass.connect(bGain);
        bGain.connect(this.ctx.destination);
        bass.start(now);
        bass.stop(now + 0.19);
      }

      // Keep the lead sparse so the background track uses fewer voices.
      if (step % 4 === 1 && Math.random() > 0.35) {
        const leadNote = leadScale[(step * 3) % leadScale.length];
        const lead = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadNote, now);
        lGain.gain.setValueAtTime(0.06, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        lead.connect(lGain);
        lGain.connect(this.ctx.destination);
        lead.start(now);
        lead.stop(now + 0.13);
      }

      this.bgmStep++;
    }, stepIntervalMs);
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.isBgmPlaying = false;
  }

  // --- Quiet ambient loop for the main menu ---

  startMenuMusic() {
    if (this.isMenuPlaying || !this.bgmEnabled) return;
    const resumePromise = this.init();
    this.stopBGM();
    this.stopEpilogueMusic();
    this.isMenuPlaying = true;
    this.menuStep = 0;

    const now = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.36, now + 1.8);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(0.35, now);
    master.connect(filter);
    filter.connect(this.ctx.destination);
    this.menuGain = master;
    this.menuFilter = filter;

    const playPhrase = () => {
      if (!this.isMenuPlaying || !this.ctx || !this.menuGain || this.ctx.state !== 'running') return;

      const phraseStart = this.ctx.currentTime + 0.03;
      const chordProgression = [
        [73.42, 146.83, 174.61], // D minor
        [65.41, 130.81, 196.00], // C major colour
        [58.27, 116.54, 174.61], // B-flat atmosphere
        [69.30, 138.59, 207.65]  // A suspended return
      ];
      const chordDuration = 2.1;
      const noteGains = [0.10, 0.06, 0.035];

      // Warm, sustained chord instead of short isolated beeps.
      chordProgression.forEach((chord, chordIndex) => {
        const chordStart = phraseStart + chordIndex * chordDuration;
        chord.forEach((frequency, noteIndex) => {
          const duration = chordDuration + 0.25;
          const oscillator = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          oscillator.type = noteIndex === 0 ? 'sine' : 'triangle';
          oscillator.frequency.setValueAtTime(frequency, chordStart);
          oscillator.detune.setValueAtTime(noteIndex % 2 === 0 ? -4 : 4, chordStart);
          noteGain.gain.setValueAtTime(0.0001, chordStart);
          noteGain.gain.exponentialRampToValueAtTime(noteGains[noteIndex], chordStart + 0.65);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, chordStart + duration - 0.55);
          oscillator.connect(noteGain);
          noteGain.connect(this.menuGain);
          oscillator.start(chordStart);
          oscillator.stop(chordStart + duration + 0.08);
        });
      });

      // Sparse upper notes make the menu sound like a theme instead of a UI alert.
      const melody = [293.66, 261.63, 329.63];
      melody.forEach((frequency, melodyIndex) => {
        const melodyStart = phraseStart + melodyIndex * chordDuration + 0.38;
        const melodyOscillator = this.ctx.createOscillator();
        const melodyGain = this.ctx.createGain();
        melodyOscillator.type = 'sine';
        melodyOscillator.frequency.setValueAtTime(frequency, melodyStart);
        melodyGain.gain.setValueAtTime(0.0001, melodyStart);
        melodyGain.gain.exponentialRampToValueAtTime(0.045, melodyStart + 0.32);
        melodyGain.gain.exponentialRampToValueAtTime(0.0001, melodyStart + 1.35);
        melodyOscillator.connect(melodyGain);
        melodyGain.connect(this.menuGain);
        melodyOscillator.start(melodyStart);
        melodyOscillator.stop(melodyStart + 1.42);
      });

      this.menuStep++;
    };

    this.menuTimer = setInterval(playPhrase, 8400);
    // Wait for the browser's user-gesture audio resume, then play immediately.
    Promise.resolve(resumePromise).then(() => {
      if (this.isMenuPlaying) playPhrase();
    }).catch(() => {
      // Audio can remain blocked until the next user interaction.
    });
  }

  stopMenuMusic() {
    if (this.menuTimer) {
      clearInterval(this.menuTimer);
      this.menuTimer = null;
    }
    this.isMenuPlaying = false;

    const master = this.menuGain;
    this.menuGain = null;
    const filter = this.menuFilter;
    this.menuFilter = null;
    if (!master || !this.ctx) return;

    const now = this.ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => {
      try {
        master.disconnect();
        if (filter) filter.disconnect();
      } catch (error) {
        // The node may already be disconnected after the fade-out.
      }
    }, 500);
  }

  muteAllAudio() {
    this.isMuted = true;
    this.stopBGM();
    this.stopMenuMusic();
    this.stopEpilogueMusic();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  unmuteAllAudio() {
    this.isMuted = false;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Slow cinematic music for the scrolling epilogue credits ---

  startEpilogueMusic() {
    if (this.isEpiloguePlaying || !this.bgmEnabled) return;
    this.init();
    this.stopBGM();
    this.stopMenuMusic();
    this.isEpiloguePlaying = true;
    this.epilogueStep = 0;

    const now = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 1.8);
    master.connect(this.ctx.destination);
    this.epilogueGain = master;

    const playPhrase = () => {
      if (!this.isEpiloguePlaying || !this.ctx || !this.epilogueGain) return;

      const phraseStart = this.ctx.currentTime + 0.03;
      const phrases = [
        [196.00, 0.00, 2.30],
        [246.94, 0.32, 2.00],
        [293.66, 0.64, 1.85],
        [329.63, 1.18, 1.75],
        [293.66, 1.72, 1.65],
        [246.94, 2.22, 1.55],
      ];

      phrases.forEach(([frequency, offset, duration], index) => {
        const start = phraseStart + offset;
        const oscillator = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        oscillator.type = index % 3 === 0 ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        noteGain.gain.setValueAtTime(0.0001, start);
        noteGain.gain.exponentialRampToValueAtTime(index === 0 ? 0.32 : 0.19, start + 0.34);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(noteGain);
        noteGain.connect(this.epilogueGain);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.06);
      });

      this.epilogueStep++;
    };

    playPhrase();
    this.epilogueTimer = setInterval(playPhrase, 3200);
  }

  stopEpilogueMusic() {
    if (this.epilogueTimer) {
      clearInterval(this.epilogueTimer);
      this.epilogueTimer = null;
    }
    this.isEpiloguePlaying = false;

    const master = this.epilogueGain;
    this.epilogueGain = null;
    if (!master || !this.ctx) return;

    const now = this.ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    window.setTimeout(() => {
      try {
        master.disconnect();
      } catch (error) {
        // The node may already be disconnected after the fade-out.
      }
    }, 500);
  }
}

// Global singleton
window.soundEngine = new SoundEngine();
