/**
 * Voice Manager — maps game characters to kokoro-js voices with speed settings
 *
 * Available kokoro-js voices (en-us):
 *   Female: af_bella, af_sky, af_sarah, af_nicole, af_heart, af_nova
 *   Male:   am_michael, am_fenrir, am_liam, am_echo, am_eric
 */

import { KittenTTSEngine } from './kitten-engine.js';

// Character → voice mapping with personality-matched speeds
const CHARACTER_VOICES = {
  WRIGHT:                { voice: 'Jasper', speed: 1.05 }, // Confident, slightly brisk
  FALLACIOUS:            { voice: 'Bruno',  speed: 0.88 }, // Deep, dramatic, slower
  JUDGE:                 { voice: 'Hugo',   speed: 0.82 }, // Elderly, deliberate
  LARRY:                 { voice: 'Leo',    speed: 1.2  }, // Fast, panicky
  BRENDA:                { voice: 'Rosie',  speed: 0.95 }, // No-nonsense
  CHAD:                  { voice: 'Leo',    speed: 1.25 }, // Fast bro-talk
  LOOPSWORTH:            { voice: 'Bruno',  speed: 0.85 }, // Pretentious professor
  WILLOW:                { voice: 'Kiki',   speed: 0.9  }, // Calm, airy
  'DR. VON STUFFINGTON': { voice: 'Hugo',   speed: 0.85 }, // Stuffy academic
  '???':                 { voice: 'Hugo',   speed: 0.75 }, // Deep, mysterious
  NARRATOR:              { voice: 'Bella',  speed: 1.0  }, // Neutral narrator
};

let enabled = true;
let currentCancel = null;

function cleanTextForSpeech(text) {
  let clean = text.replace(/\[.*?\]/g, '').trim(); // Remove stage directions
  if (clean.startsWith('(') && clean.endsWith(')')) clean = clean.slice(1, -1); // Unwrap thoughts
  if (clean.startsWith('—') || clean.length < 3) return ''; // Skip titles/dashes
  return clean;
}

export const VoiceManager = {
  get enabled() { return enabled; },
  get isLoaded() { return KittenTTSEngine.loaded; },
  get isLoading() { return KittenTTSEngine.loading; },

  toggle() {
    enabled = !enabled;
    if (!enabled) VoiceManager.stop();
    return enabled;
  },

  async load(onProgress) {
    return KittenTTSEngine.load(onProgress);
  },

  stop() {
    if (currentCancel) currentCancel();
    KittenTTSEngine.stop();
  },

  async speak(text, characterKey) {
    if (!enabled || !KittenTTSEngine.loaded) return;

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const config = CHARACTER_VOICES[characterKey] || CHARACTER_VOICES.NARRATOR;

    // Cancel any in-progress speech
    VoiceManager.stop();

    let cancelled = false;
    currentCancel = () => { cancelled = true; };

    try {
      if (cancelled) return;
      await KittenTTSEngine.speak(clean, config.voice, config.speed);
    } catch (err) {
      console.warn('VoiceManager speak error:', err);
    } finally {
      currentCancel = null;
    }
  },

  getVoiceInfo(characterKey) {
    return CHARACTER_VOICES[characterKey] || CHARACTER_VOICES.NARRATOR;
  },
};
