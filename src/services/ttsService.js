/**
 * Text-to-Speech Service using browser Web Speech API with character-specific voices
 */
class TTSService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.isMuted = false;
    this.currentUtterance = null;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getVoiceForCharacter(characterId = 'mira') {
    if (!this.voices || this.voices.length === 0) return null;

    const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : this.voices;

    if (characterId === 'ren') {
      // Ren: Male Voice (Boy)
      const maleVoice = pool.find(v => 
        (v.name.toLowerCase().includes('david') || 
         v.name.toLowerCase().includes('george') || 
         v.name.toLowerCase().includes('guy') || 
         v.name.toLowerCase().includes('mark') || 
         v.name.toLowerCase().includes('male')) &&
        !v.name.toLowerCase().includes('female')
      ) || pool.find(v => !v.name.toLowerCase().includes('zira') && !v.name.toLowerCase().includes('samantha')) || pool[0];
      
      return maleVoice;
    }

    if (characterId === 'hana') {
      // Hana: High-energy, upbeat female voice
      const hanaVoice = pool.find(v => 
        v.name.toLowerCase().includes('jenny') || 
        v.name.toLowerCase().includes('zira') || 
        v.name.toLowerCase().includes('natural')
      ) || pool.find(v => v.name.toLowerCase().includes('female')) || pool[0];
      
      return hanaVoice;
    }

    if (characterId === 'aoi') {
      // Aoi: Soft, gentle, mindful UK/British or soothing female voice
      const aoiVoice = pool.find(v => 
        v.name.toLowerCase().includes('uk') || 
        v.name.toLowerCase().includes('victoria') || 
        v.name.toLowerCase().includes('karen') || 
        v.name.toLowerCase().includes('moira')
      ) || pool.find(v => v.name.toLowerCase().includes('female')) || pool[0];
      
      return aoiVoice;
    }

    // Mira: Default warm, balanced female voice
    const miraVoice = pool.find(v => 
      v.name.toLowerCase().includes('samantha') || 
      v.name.toLowerCase().includes('google') || 
      v.name.toLowerCase().includes('female')
    ) || pool[0];

    return miraVoice;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
    }
  }

  speak(text, { onStart, onEnd, onError, characterId = 'mira', gender = 'female', pitch = null, rate = null } = {}) {
    if (!text || this.isMuted) {
      const duration = Math.min(6000, Math.max(1500, text.length * 50));
      onStart?.();
      const timer = setTimeout(() => {
        onEnd?.();
      }, duration);
      return () => clearTimeout(timer);
    }

    if (!this.synth) {
      onStart?.();
      const timer = setTimeout(() => onEnd?.(), 2000);
      return () => clearTimeout(timer);
    }

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getVoiceForCharacter(characterId);
    if (voice) {
      utterance.voice = voice;
    }

    // Character-specific pitch and rate modulation
    const voiceSettings = {
      ren:  { pitch: 0.85, rate: 1.00 }, // Boy: deep and steady
      mira: { pitch: 1.05, rate: 0.98 }, // Girl 1 (Mira): warm and balanced
      hana: { pitch: 1.22, rate: 1.08 }, // Girl 2 (Hana): bright and cheerful
      aoi:  { pitch: 0.96, rate: 0.92 }  // Girl 3 (Aoi): soothing and calm
    }[characterId] || { pitch: 1.05, rate: 1.00 };
    
    utterance.pitch = pitch ?? voiceSettings.pitch;
    utterance.rate = rate ?? voiceSettings.rate;

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = (err) => {
      console.warn('TTS playback notice:', err);
      onError?.(err);
      onEnd?.();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);

    return () => {
      if (this.synth) this.synth.cancel();
    };
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const ttsService = new TTSService();
export default ttsService;
