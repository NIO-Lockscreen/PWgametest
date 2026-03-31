/**
 * KittenTTS Browser Engine — powered by kokoro-js
 * Uses kokoro-js which handles tokenization, style selection, and ONNX inference
 * correctly for the KittenTTS/Kokoro model family.
 */

import { KokoroTTS } from 'kokoro-js';

const SAMPLE_RATE = 24000;

// Map friendly names to kokoro-js voice IDs
const VOICE_IDS = {
  Bella:   'af_bella',
  Jasper:  'am_michael',
  Luna:    'af_sky',
  Bruno:   'am_fenrir',
  Rosie:   'af_sarah',
  Hugo:    'am_liam',
  Kiki:    'af_nicole',
  Leo:     'am_echo',
};

let tts = null;
let _loadPromise = null;

async function loadModel(onProgress) {
  if (tts) return;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      onProgress?.('Loading KittenTTS model (~25MB)...');
      tts = await KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        {
          dtype: 'q8',
          device: 'wasm',
          progress_callback: (info) => {
            if (info.status === 'downloading') {
              const pct = info.total
                ? Math.round((info.loaded / info.total) * 100)
                : '...';
              onProgress?.(`Downloading model... ${pct}%`);
            } else if (info.status === 'loading') {
              onProgress?.('Loading model weights...');
            }
          },
        }
      );
      onProgress?.('Ready!');
    } catch (err) {
      tts = null;
      _loadPromise = null;
      throw err;
    }
  })();

  return _loadPromise;
}

let currentAudioCtx = null;
let currentSource = null;

function stopPlayback() {
  try {
    if (currentSource) { currentSource.stop(); currentSource = null; }
    if (currentAudioCtx) { currentAudioCtx.close(); currentAudioCtx = null; }
  } catch (e) { /* ignore */ }
}

function playPcm(pcmData, sampleRate) {
  return new Promise((resolve) => {
    stopPlayback();
    if (!pcmData || pcmData.length === 0) { resolve(); return; }
    currentAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    const buffer = currentAudioCtx.createBuffer(1, pcmData.length, sampleRate);
    buffer.getChannelData(0).set(pcmData);
    currentSource = currentAudioCtx.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(currentAudioCtx.destination);
    currentSource.onended = () => {
      currentAudioCtx?.close().catch(() => {});
      currentAudioCtx = null;
      currentSource = null;
      resolve();
    };
    currentSource.start();
  });
}

// Public API
export const KittenTTSEngine = {
  loaded: false,
  loading: false,
  error: null,
  VOICE_IDS,

  load: async (onProgress) => {
    KittenTTSEngine.loading = true;
    try {
      await loadModel(onProgress);
      KittenTTSEngine.loaded = true;
    } catch (err) {
      KittenTTSEngine.error = err.message;
      console.error('KittenTTS load error:', err);
      throw err;
    } finally {
      KittenTTSEngine.loading = false;
    }
  },

  stop: stopPlayback,

  speak: async (text, voiceName = 'Bella', speed = 1.0) => {
    if (!KittenTTSEngine.loaded || !tts) return;
    const voiceId = VOICE_IDS[voiceName] || VOICE_IDS.Bella;

    try {
      const audio = await tts.generate(text, { voice: voiceId, speed });
      if (audio && audio.audio && audio.audio.length > 0) {
        await playPcm(audio.audio, audio.sampling_rate ?? SAMPLE_RATE);
      }
    } catch (err) {
      console.warn('KittenTTS speak error:', err);
    }
  },
};
