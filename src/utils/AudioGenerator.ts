/**
 * Audio Generator Module
 * 
 * Generates chess sounds using Web Audio API instead of loading MP3 files.
 * This provides instant sound playback without needing external audio files.
 */

/**
 * Sound types that can be generated
 */
export type GeneratedSoundType = 
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'gameStart'
  | 'gameEnd'
  | 'lowTime'
  | 'illegal';

/**
 * AudioGenerator class
 * 
 * Generates chess sounds programmatically using Web Audio API.
 * Each sound is synthesized in real-time for immediate playback.
 */
export class AudioGenerator {
  private static instance: AudioGenerator | null = null;
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.loadSettings();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AudioGenerator {
    if (!AudioGenerator.instance) {
      AudioGenerator.instance = new AudioGenerator();
    }
    return AudioGenerator.instance;
  }

  /**
   * Get or create the AudioContext
   */
  private getContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Resume audio context if suspended (required after user interaction)
   */
  async resume(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  /**
   * Play a sound by type
   */
  play(sound: GeneratedSoundType): void {
    if (!this.enabled) return;

    // Resume context if needed
    this.resume().then(() => {
      switch (sound) {
        case 'move':
          this.playMove();
          break;
        case 'capture':
          this.playCapture();
          break;
        case 'check':
          this.playCheck();
          break;
        case 'castle':
          this.playCastle();
          break;
        case 'promote':
          this.playPromote();
          break;
        case 'gameStart':
          this.playGameStart();
          break;
        case 'gameEnd':
          this.playGameEnd();
          break;
        case 'lowTime':
          this.playLowTime();
          break;
        case 'illegal':
          this.playIllegal();
          break;
      }
    });
  }

  /**
   * Generate a "click" sound for regular moves
   * A short, soft wooden tap sound
   */
  playMove(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // Create oscillator for the main tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Connect nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configure oscillator - wooden tap sound
    oscillator.frequency.setValueAtTime(800, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, currentTime + 0.05);
    oscillator.type = 'sine';

    // Configure filter for warmth
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, currentTime);
    filter.Q.setValueAtTime(1, currentTime);

    // Configure envelope
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, currentTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.08);

    // Play
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.1);
  }

  /**
   * Generate a "thud" sound for captures
   * A heavier, more impactful sound
   */
  playCapture(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // Main impact sound
    const oscillator1 = ctx.createOscillator();
    const gainNode1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    oscillator1.connect(filter1);
    filter1.connect(gainNode1);
    gainNode1.connect(ctx.destination);

    oscillator1.frequency.setValueAtTime(200, currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(80, currentTime + 0.1);
    oscillator1.type = 'sine';

    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(800, currentTime);

    gainNode1.gain.setValueAtTime(0, currentTime);
    gainNode1.gain.linearRampToValueAtTime(this.volume * 0.5, currentTime + 0.01);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15);

    oscillator1.start(currentTime);
    oscillator1.stop(currentTime + 0.2);

    // Add noise burst for impact
    const bufferSize = ctx.sampleRate * 0.05;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const noiseSource = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1000, currentTime);

    noiseGain.gain.setValueAtTime(this.volume * 0.3, currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.05);

    noiseSource.start(currentTime);
  }

  /**
   * Generate a "ding" sound for check
   * A sharp, alerting tone
   */
  playCheck(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // High-pitched alert tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, currentTime + 0.01);
    gainNode.gain.setValueAtTime(this.volume * 0.4, currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.25);

    // Second harmonic for richness
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();

    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    oscillator2.frequency.setValueAtTime(1760, currentTime);
    oscillator2.type = 'sine';

    gainNode2.gain.setValueAtTime(0, currentTime);
    gainNode2.gain.linearRampToValueAtTime(this.volume * 0.15, currentTime + 0.01);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15);

    oscillator2.start(currentTime);
    oscillator2.stop(currentTime + 0.2);
  }

  /**
   * Generate a castling sound
   * Two quick wooden sounds in succession
   */
  playCastle(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // First piece (king)
    this.playWoodenTap(ctx, currentTime, 600, 0.08);
    
    // Second piece (rook) - slightly delayed
    this.playWoodenTap(ctx, currentTime + 0.1, 500, 0.08);
  }

  /**
   * Helper to play a wooden tap sound
   */
  private playWoodenTap(ctx: AudioContext, time: number, freq: number, duration: number): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(freq, time);
    oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, time + duration);
    oscillator.type = 'triangle';

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.35, time + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  }

  /**
   * Generate a promotion sound
   * An ascending triumphant tone
   */
  playPromote(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // Ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const startTime = currentTime + index * 0.06;
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }

  /**
   * Generate a game start sound
   * A welcoming, ready tone
   */
  playGameStart(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // Two-note fanfare
    const oscillator1 = ctx.createOscillator();
    const gainNode1 = ctx.createGain();

    oscillator1.connect(gainNode1);
    gainNode1.connect(ctx.destination);

    oscillator1.frequency.setValueAtTime(440, currentTime);
    oscillator1.type = 'sine';

    gainNode1.gain.setValueAtTime(0, currentTime);
    gainNode1.gain.linearRampToValueAtTime(this.volume * 0.3, currentTime + 0.02);
    gainNode1.gain.setValueAtTime(this.volume * 0.3, currentTime + 0.1);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2);

    oscillator1.start(currentTime);
    oscillator1.stop(currentTime + 0.25);

    // Second note (fifth above)
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();

    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    oscillator2.frequency.setValueAtTime(659.25, currentTime + 0.15);
    oscillator2.type = 'sine';

    gainNode2.gain.setValueAtTime(0, currentTime + 0.15);
    gainNode2.gain.linearRampToValueAtTime(this.volume * 0.35, currentTime + 0.17);
    gainNode2.gain.setValueAtTime(this.volume * 0.35, currentTime + 0.3);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);

    oscillator2.start(currentTime + 0.15);
    oscillator2.stop(currentTime + 0.55);
  }

  /**
   * Generate a game end sound
   * A conclusive, final tone
   */
  playGameEnd(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // Descending resolution
    const oscillator1 = ctx.createOscillator();
    const gainNode1 = ctx.createGain();

    oscillator1.connect(gainNode1);
    gainNode1.connect(ctx.destination);

    oscillator1.frequency.setValueAtTime(523.25, currentTime);
    oscillator1.type = 'sine';

    gainNode1.gain.setValueAtTime(0, currentTime);
    gainNode1.gain.linearRampToValueAtTime(this.volume * 0.3, currentTime + 0.02);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);

    oscillator1.start(currentTime);
    oscillator1.stop(currentTime + 0.35);

    // Final note
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();

    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    oscillator2.frequency.setValueAtTime(261.63, currentTime + 0.2);
    oscillator2.type = 'sine';

    gainNode2.gain.setValueAtTime(0, currentTime + 0.2);
    gainNode2.gain.linearRampToValueAtTime(this.volume * 0.4, currentTime + 0.22);
    gainNode2.gain.setValueAtTime(this.volume * 0.4, currentTime + 0.5);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + 1.0);

    oscillator2.start(currentTime + 0.2);
    oscillator2.stop(currentTime + 1.1);
  }

  /**
   * Generate a low time warning sound
   * An urgent, repeating beep
   */
  playLowTime(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // Quick warning beep
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(1000, currentTime);
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, currentTime + 0.01);
    gainNode.gain.setValueAtTime(this.volume * 0.2, currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.06);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.1);
  }

  /**
   * Generate an illegal move sound
   * A low, negative buzz
   */
  playIllegal(): void {
    const ctx = this.getContext();
    const currentTime = ctx.currentTime;

    // Low buzz
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(150, currentTime);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.25, currentTime + 0.02);
    gainNode.gain.setValueAtTime(this.volume * 0.25, currentTime + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.15);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.2);
  }

  /**
   * Play the appropriate sound for a move
   */
  playMoveSound(
    isCapture: boolean = false,
    isCastle: boolean = false,
    isPromotion: boolean = false,
    isCheck: boolean = false
  ): void {
    if (isCheck) {
      this.play('check');
    } else if (isCastle) {
      this.play('castle');
    } else if (isPromotion) {
      this.play('promote');
    } else if (isCapture) {
      this.play('capture');
    } else {
      this.play('move');
    }
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveSettings();
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Toggle sound on/off
   */
  toggle(): boolean {
    this.enabled = !this.enabled;
    this.saveSettings();
    return this.enabled;
  }

  /**
   * Set the volume level
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  /**
   * Get the current volume level
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('chess-sound-enabled', JSON.stringify(this.enabled));
      localStorage.setItem('chess-sound-volume', JSON.stringify(this.volume));
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const enabledStr = localStorage.getItem('chess-sound-enabled');
      if (enabledStr !== null) {
        this.enabled = JSON.parse(enabledStr);
      }

      const volumeStr = localStorage.getItem('chess-sound-volume');
      if (volumeStr !== null) {
        this.volume = JSON.parse(volumeStr);
      }
    } catch {
      // Ignore localStorage errors, use defaults
    }
  }

  /**
   * Unlock audio context after user interaction
   */
  async unlockAudio(): Promise<void> {
    await this.resume();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    AudioGenerator.instance = null;
  }
}

/**
 * Get the global AudioGenerator instance
 */
export function getAudioGenerator(): AudioGenerator {
  return AudioGenerator.getInstance();
}