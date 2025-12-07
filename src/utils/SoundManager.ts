/**
 * Sound Manager Module
 *
 * Provides sound effect management for the chess game.
 * Now uses Web Audio API via AudioGenerator for instant sound playback
 * without needing external audio files.
 */

import { AudioGenerator, GeneratedSoundType, getAudioGenerator } from './AudioGenerator';

/**
 * Available sound effects
 */
export type SoundType = GeneratedSoundType;

/**
 * Sound Manager class
 *
 * Singleton class that manages all game sound effects.
 * Uses AudioGenerator for Web Audio API based sound synthesis.
 */
export class SoundManager {
  private static instance: SoundManager | null = null;
  private audioGenerator: AudioGenerator;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.audioGenerator = getAudioGenerator();
  }

  /**
   * Get the singleton instance
   * @returns The SoundManager instance
   */
  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Load all sounds (no-op with AudioGenerator, kept for API compatibility)
   * @returns Promise that resolves immediately
   */
  async loadSounds(): Promise<void> {
    // AudioGenerator doesn't need to preload - sounds are generated on demand
    return Promise.resolve();
  }

  /**
   * Play a sound effect
   * @param sound The sound to play
   */
  play(sound: SoundType): void {
    this.audioGenerator.play(sound);
  }

  /**
   * Play the appropriate sound for a move
   * @param isCapture Whether the move is a capture
   * @param isCastle Whether the move is castling
   * @param isPromotion Whether the move is a promotion
   * @param isCheck Whether the move gives check
   */
  playMoveSound(
    isCapture: boolean = false,
    isCastle: boolean = false,
    isPromotion: boolean = false,
    isCheck: boolean = false
  ): void {
    this.audioGenerator.playMoveSound(isCapture, isCastle, isPromotion, isCheck);
  }

  /**
   * Enable or disable sounds
   * @param enabled Whether sounds should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.audioGenerator.setEnabled(enabled);
  }

  /**
   * Check if sounds are enabled
   * @returns True if sounds are enabled
   */
  isEnabled(): boolean {
    return this.audioGenerator.isEnabled();
  }

  /**
   * Toggle sound on/off
   * @returns The new enabled state
   */
  toggle(): boolean {
    return this.audioGenerator.toggle();
  }

  /**
   * Set the volume level
   * @param volume Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.audioGenerator.setVolume(volume);
  }

  /**
   * Get the current volume level
   * @returns Volume level (0.0 to 1.0)
   */
  getVolume(): number {
    return this.audioGenerator.getVolume();
  }

  /**
   * Unlock audio after user interaction
   * Call this after a user gesture to enable audio playback
   */
  async unlockAudio(): Promise<void> {
    await this.audioGenerator.unlockAudio();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.audioGenerator.destroy();
    SoundManager.instance = null;
  }
}

/**
 * Get the global SoundManager instance
 * Convenience function for accessing the singleton
 */
export function getSoundManager(): SoundManager {
  return SoundManager.getInstance();
}