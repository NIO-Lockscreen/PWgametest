/**
 * KittenTTS Browser Engine
 * Adapted from clowerweb/kitten-tts-web-demo (proven working implementation)
 * Uses ONNX Runtime Web + phonemizer package
 * 8 voices, 24kHz output, ~25MB model
 */

import { cleanTextForTTS, chunkText } from './text-cleaner.js';
import { cachedFetch } from './model-cache.js';

const SAMPLE_RATE = 24000;

// Voice IDs as stored in voices.json
const VOICE_IDS = {
  Bella:  'expr-voice-1-f',
  Jasper: 'expr-voice-1-m',
  Luna:   'expr-voice-2-f',
  Bruno:  'expr-voice-2-m',
  Rosie:  'expr-voice-3-f',
  Hugo:   'expr-voice-3-m',
  Kiki:   'expr-voice-4-f',
  Leo:    'expr-voice-4-m',
};

let ort = null;
let session = null;
let voiceEmbeddings = null;
let vocab = null;
let phonemizerModule = null;
let _loadPromise = null;

async function loadModel(onProgress) {
  if (session) return;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      onProgress?.('Loading ONNX Runtime...');
      ort = await import('onnxruntime-web');
      // Point WASM to jsDelivr CDN (avoids bundling the 22MB .wasm file)
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

      onProgress?.('Downloading KittenTTS model (~25MB)...');
      // Fetch model from HuggingFace (avoids bundling the 23MB .onnx file)
      const modelUrl = 'https://huggingface.co/onnx-community/KittenTTS-Nano-v0.8-ONNX/resolve/main/model_quantized.onnx';
      const modelResponse = await cachedFetch(modelUrl);
      const modelBuffer = await modelResponse.arrayBuffer();

      onProgress?.('Initializing inference...');
      session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: [{ name: 'wasm', simd: true }],
      });

      onProgress?.('Loading tokenizer...');
      const tokResp = await cachedFetch(`${import.meta.env.BASE_URL}tts-model/tokenizer.json`);
      const tokenizerData = await tokResp.json();
      vocab = tokenizerData.model.vocab;

      onProgress?.('Loading voices...');
      const voicesResp = await cachedFetch(`${import.meta.env.BASE_URL}tts-model/voices.json`);
      voiceEmbeddings = await voicesResp.json();

      onProgress?.('Loading phonemizer...');
      phonemizerModule = await import('phonemizer');

      onProgress?.('Ready!');
    } catch (err) {
      session = null;
      _loadPromise = null;
      throw err;
    }
  })();

  return _loadPromise;
}

async function textToPhonemes(text) {
  if (!phonemizerModule) throw new Error('Phonemizer not loaded');
  return await phonemizerModule.phonemize(text, 'en-us');
}

function tokenize(phonemes) {
  if (!vocab) throw new Error('Tokenizer not loaded');
  // KittenTTS wraps phonemes in $ boundaries
  const wrapped = `$${phonemes}$`;
  return wrapped.split('').map(char => {
    const id = vocab[char];
    if (id === undefined) {
      console.warn(`Unknown phoneme char: "${char}"`);
      return 0; // unknown -> $ token
    }
    return id;
  });
}

async function generateAudio(text, voiceId, speed = 1.0) {
  if (!session || !voiceEmbeddings || !vocab) {
    throw new Error('Model not loaded');
  }

  const embedding = voiceEmbeddings[voiceId];
  if (!embedding) throw new Error(`Voice not found: ${voiceId}`);

  // Clean -> phonemize -> tokenize
  const cleaned = cleanTextForTTS(text);
  if (!cleaned) return new Float32Array(0);

  const phonemes = await textToPhonemes(cleaned);
  const tokenIds = tokenize(phonemes);
  if (tokenIds.length === 0) return new Float32Array(0);

  // Create tensors - exact same names as the proven demo
  const inputIds = new ort.Tensor('int64', BigInt64Array.from(tokenIds.map(BigInt)), [1, tokenIds.length]);
  const style = new ort.Tensor('float32', Float32Array.from(embedding[0]), [1, embedding[0].length]);
  const speedTensor = new ort.Tensor('float32', new Float32Array([speed]), [1]);

  const results = await session.run({
    input_ids: inputIds,
    style: style,
    speed: speedTensor,
  });

  // Output tensor is called 'waveform'
  let audioData = new Float32Array(results.waveform.data);

  // Apply speed adjustment via resampling
  if (speed !== 1.0) {
    const newLen = Math.floor(audioData.length / speed);
    const resampled = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      resampled[i] = audioData[Math.min(Math.floor(i * speed), audioData.length - 1)];
    }
    audioData = resampled;
  }

  // Clean NaN and normalize
  let maxAmp = 0;
  for (let i = 0; i < audioData.length; i++) {
    if (isNaN(audioData[i])) audioData[i] = 0;
    else maxAmp = Math.max(maxAmp, Math.abs(audioData[i]));
  }
  if (maxAmp > 0 && maxAmp < 0.1) {
    const norm = 0.5 / maxAmp;
    for (let i = 0; i < audioData.length; i++) audioData[i] *= norm;
  }

  return audioData;
}

let currentAudioCtx = null;
let currentSource = null;

function stopPlayback() {
  try {
    if (currentSource) { currentSource.stop(); currentSource = null; }
    if (currentAudioCtx) { currentAudioCtx.close(); currentAudioCtx = null; }
  } catch (e) { /* ignore */ }
}

function playPcm(pcmData) {
  return new Promise((resolve) => {
    stopPlayback();
    if (!pcmData || pcmData.length === 0) { resolve(); return; }
    currentAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = currentAudioCtx.createBuffer(1, pcmData.length, SAMPLE_RATE);
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
    if (!KittenTTSEngine.loaded) return;
    const voiceId = VOICE_IDS[voiceName] || VOICE_IDS.Bella;
    // Chunk long text into sentences
    const chunks = chunkText(cleanTextForTTS(text));
    for (const chunk of chunks) {
      try {
        const pcm = await generateAudio(chunk, voiceId, speed);
        if (pcm.length > 0) await playPcm(pcm);
      } catch (err) {
        console.warn('KittenTTS speak chunk error:', err);
      }
    }
  },
};
