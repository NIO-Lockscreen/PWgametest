/**
 * Voice Manager — Web Speech API implementation
 * Characters are differentiated via pitch + rate on the best available system voice.
 */

// Character personality settings: { pitch, rate }
// pitch: 0.5 (deep) – 2.0 (high). rate: 0.5 (slow) – 2.0 (fast). defaults: 1, 1
const CHARACTER_VOICES = {
  WRIGHT:                { pitch: 1.1,  rate: 1.05 }, // confident, brisk
  FALLACIOUS:            { pitch: 0.8,  rate: 0.88 }, // deep, dramatic
  JUDGE:                 { pitch: 0.75, rate: 0.80 }, // elderly, slow, authoritative
  LARRY:                 { pitch: 1.3,  rate: 1.25 }, // panicky, fast
  BRENDA:                { pitch: 1.15, rate: 0.95 }, // clipped, no-nonsense
  CHAD:                  { pitch: 1.2,  rate: 1.3  }, // hyper bro
  LOOPSWORTH:            { pitch: 0.85, rate: 0.82 }, // pompous, slow
  WILLOW:                { pitch: 1.25, rate: 0.88 }, // airy, serene
  'DR. VON STUFFINGTON': { pitch: 0.8,  rate: 0.85 }, // stuffy
  '???':                 { pitch: 0.6,  rate: 0.75 }, // deep, mysterious
  NARRATOR:              { pitch: 1.0,  rate: 1.0  }, // neutral
};

let enabled = true;
let selectedVoice = null; // best available SpeechSynthesisVoice
let currentUtterance = null;

function cleanTextForSpeech(text) {
  let clean = text.replace(/\[.*?\]/g, '').trim();
  if (clean.startsWith('(') && clean.endsWith(')')) clean = clean.slice(1, -1);
  if (clean.startsWith('—') || clean.length < 3) return '';
  return clean;
}

function pickBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer: en-US > en-GB > any English > first available
  return (
    voices.find(v => v.lang === 'en-US' && v.localService) ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang === 'en-GB') ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0]
  );
}

export const VoiceManager = {
  get enabled() { return enabled; },
  get isLoaded() { return !!window.speechSynthesis; },
  get isLoading() { return false; },

  toggle() {
    enabled = !enabled;
    if (!enabled) VoiceManager.stop();
    return enabled;
  },

  // Web Speech API needs no async loading — just resolve the voice list.
  // The voices may not be available immediately on page load (browser quirk),
  // so we wait for the voiceschanged event if needed.
  load(onProgress) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        onProgress?.('Voice unavailable');
        resolve();
        return;
      }
      const tryPick = () => {
        selectedVoice = pickBestVoice();
        if (selectedVoice) {
          onProgress?.(`Voice ready (${selectedVoice.name})`);
          resolve();
        }
      };
      tryPick();
      if (!selectedVoice) {
        // Voices not loaded yet — wait for the event
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          tryPick();
          resolve();
        }, { once: true });
        // Fallback: resolve after 2s even if no voices found
        setTimeout(resolve, 2000);
      }
    });
  },

  stop() {
    try {
      window.speechSynthesis?.cancel();
    } catch (e) { /* ignore */ }
    currentUtterance = null;
  },

  speak(text, characterKey) {
    if (!enabled || !window.speechSynthesis) return;

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    VoiceManager.stop();

    const config = CHARACTER_VOICES[characterKey] || CHARACTER_VOICES.NARRATOR;
    const utt = new SpeechSynthesisUtterance(clean);
    utt.pitch = config.pitch;
    utt.rate  = config.rate;
    utt.volume = 1;
    if (selectedVoice) utt.voice = selectedVoice;

    currentUtterance = utt;
    window.speechSynthesis.speak(utt);
  },
};
