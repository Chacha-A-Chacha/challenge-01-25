// lib/sounds.ts

/**
 * Sound utility for attendance QR scanner
 * Handles loading and playing notification sounds
 */

type SoundType = 'success' | 'error' | 'wrong-session';

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement>;
  private isInitialized: boolean;
  private isMuted: boolean;

  constructor() {
    this.sounds = new Map();
    this.isInitialized = false;
    this.isMuted = false;
  }

  /**
   * Initialize and preload all sound files
   * Should be called once when the scanner component mounts
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    try {
      // Preload all sound files
      const soundFiles: Record<SoundType, string> = {
        success: '/sounds/success.mp3',
        error: '/sounds/error.mp3',
        'wrong-session': '/sounds/wrong-session.mp3',
      };

      Object.entries(soundFiles).forEach(([type, path]) => {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = 0.7; // Set volume to 70%

        // Handle loading errors
        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load sound: ${path}`, e);
        });

        this.sounds.set(type as SoundType, audio);
      });

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize sound manager:', error);
    }
  }

  /**
   * Play a sound by type
   * Handles browser autoplay policies gracefully
   */
  async play(type: SoundType): Promise<void> {
    if (!this.isInitialized || this.isMuted) {
      return;
    }

    const audio = this.sounds.get(type);
    if (!audio) {
      console.warn(`Sound not found: ${type}`);
      return;
    }

    try {
      // Reset to beginning if already playing
      audio.currentTime = 0;

      // Play the sound
      await audio.play();
    } catch (error) {
      // Handle autoplay policy errors silently
      // This is expected on first interaction before user gesture
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.debug('Sound autoplay prevented by browser policy');
      } else {
        console.warn(`Failed to play sound: ${type}`, error);
      }
    }
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /**
   * Get mute state
   */
  isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Cleanup - stop all sounds and release resources
   */
  cleanup(): void {
    this.sounds.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    this.sounds.clear();
    this.isInitialized = false;
  }

  /**
   * Set volume for all sounds (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((audio) => {
      audio.volume = clampedVolume;
    });
  }
}

// Create singleton instance
const soundManager = new SoundManager();

/**
 * Play attendance notification sound
 * @param type - Type of sound to play
 */
export function playSound(type: SoundType): void {
  soundManager.play(type);
}

/**
 * Initialize sound system
 * Call this when the QR scanner mounts
 */
export function initSounds(): void {
  soundManager.init();
}

/**
 * Cleanup sound system
 * Call this when the QR scanner unmounts
 */
export function cleanupSounds(): void {
  soundManager.cleanup();
}

/**
 * Set mute state for sounds
 */
export function setSoundMuted(muted: boolean): void {
  soundManager.setMuted(muted);
}

/**
 * Get current mute state
 */
export function isSoundMuted(): boolean {
  return soundManager.isSoundMuted();
}

/**
 * Set volume for all sounds
 */
export function setSoundVolume(volume: number): void {
  soundManager.setVolume(volume);
}
