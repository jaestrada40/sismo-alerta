// Web Audio API and Speech Synthesis for Seismic Alarms

class SeismicAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isAlarmPlaying: boolean = false;
  private sirenInterval: any = null;
  private masterGain: GainNode | null = null;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Plays a single realistic dual-tone seismic pulse
   */
  public playSeismicBeep(frequency: number = 880, durationMs: number = 300) {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.7, this.audioCtx.currentTime + durationMs / 1000);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  /**
   * Starts a realistic continuous early-warning siren
   */
  public startSeismicSiren() {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      // Start looping seismic warble siren
      let toggle = false;
      const playTone = () => {
        if (!this.isAlarmPlaying || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const freq = toggle ? 960 : 740;
        toggle = !toggle;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(toggle ? 850 : 620, this.audioCtx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, this.audioCtx.currentTime + 0.38);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.4);
      };

      playTone();
      this.sirenInterval = setInterval(playTone, 420);
    } catch (err) {
      console.warn('Siren start error:', err);
    }
  }

  /**
   * Stops the ongoing siren
   */
  public stopSeismicSiren() {
    this.isAlarmPlaying = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Uses browser speech synthesis to announce the seismic alert in Spanish
   */
  public speakAlert(text: string) {
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-GT';
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      
      // Try to find a Spanish voice
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) => v.lang.startsWith('es') || v.lang.includes('es')
      );
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  public getIsPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const seismicAudio = new SeismicAudioEngine();
