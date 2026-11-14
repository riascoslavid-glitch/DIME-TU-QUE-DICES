class SoundManager {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + delay + durationSec
    );

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + durationSec + 0.02);
  }

  playTick() {
    this.playTone(880, 0.06, 'triangle', 0.04);
  }

  playLock() {
    this.playTone(523.25, 0.1, 'sine', 0.07, 0);
    this.playTone(659.25, 0.12, 'sine', 0.07, 0.07);
  }

  playCorrect() {
    this.playTone(523.25, 0.15, 'triangle', 0.09, 0);
    this.playTone(659.25, 0.15, 'triangle', 0.09, 0.1);
    this.playTone(783.99, 0.28, 'triangle', 0.1, 0.2);
  }

  playWrong() {
    this.playTone(260, 0.18, 'sawtooth', 0.05, 0);
    this.playTone(196, 0.28, 'sawtooth', 0.05, 0.14);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.25, 'triangle', 0.09, idx * 0.12);
    });
  }
}

export const soundFX = new SoundManager();
