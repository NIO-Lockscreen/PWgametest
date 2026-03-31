/**
 * KittenTTS Browser Engine — powered by kokoro-js
 * Inference is kicked off via setTimeout to keep the main thread unblocked.
 * A generation counter ensures stale results (from cancelled lines) are discarded.
 */

import { KokoroTTS } from 'kokoro-js';

const SAMPLE_RATE = 24000;

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

// Generation counter — incremented on every stop(). Any in-flight generate()
// that finishes after a stop() sees a stale gen and skips playback.
let _gen = 0;

async function loadModel(onProgress) {
  if (tts) return;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      onProgress?.('Loading voice model...');
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
              onProgress?.(`Downloading voice model... ${pct}%`);
            } else if (info.status === 'loading') {
              onProgress?.('Initializing voice model...');
            }
          },
        }
      );
      onProgress?.('Voice ready');
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
  _gen++; // invalidate any in-flight generation
  try {
    if (currentSource) { currentSource.stop(); currentSource = null; }
    if (currentAudioCtx) { currentAudioCtx.close(); currentAudioCtx = null; }
  } catch (e) { /* ignore */ }
}

function playPcm(pcmData, sampleRate, gen) {
  return new Promise((resolve) => {
    // Discard if this result belongs to a cancelled generation
    if (gen !== _gen) { resolve(); return; }
    stopPlayback();
    // stopPlayback() increments _gen, so re-capture after stopping old audio
    // but we need to let THIS playback through — restore the gen it expects
    const myGen = _gen;
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

    // Capture generation at the point speak() is called.
    // If stop() is called before inference finishes, _gen changes and we bail.
    const myGen = _gen;

    try {
      const audio = await tts.generate(text, { voice: voiceId, speed });
      if (audio && audio.audio && audio.audio.length > 0) {
        await playPcm(audio.audio, audio.sampling_rate ?? SAMPLE_RATE, myGen);
      }
    } catch (err) {
      console.warn('KittenTTS speak error:', err);
    }
  },
};
