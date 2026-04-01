import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════
   AUDIO ENGINE — Web Audio API synth SFX + music
   ═══════════════════════════════════════════ */
const AudioEngine = (() => {
  let ctx = null;
  let _muted = false;
  const getCtx = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };

  const playNote = (freq, dur, type = "square", vol = 0.08, delay = 0) => {
    if (_muted) return;
    try {
      const c = getCtx(), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.01);
      g.gain.linearRampToValueAtTime(0, c.currentTime + delay + dur);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur);
    } catch(e) {}
  };

  return {
    get muted() { return _muted; },
    mute: () => { _muted = true; },
    unmute: () => { _muted = false; },
    textBlip: () => playNote(600 + Math.random() * 200, 0.04, "square", 0.03),
    // Preloaded objection MP3 buffer
    _objBuffer: null,
    _loadingObj: false,
    _preloadObjection: async function() {
      if (this._objBuffer || this._loadingObj) return;
      this._loadingObj = true;
      try {
        const c = getCtx();
        const resp = await fetch('/objection.mp3');
        const arr = await resp.arrayBuffer();
        this._objBuffer = await c.decodeAudioData(arr);
      } catch(e) { console.warn('Objection MP3 load failed:', e); }
      this._loadingObj = false;
    },
    objection: function() {
      if (_muted) return;
      const c = getCtx();
      if (c.state === 'suspended') c.resume();
      if (this._objBuffer) {
        const src = c.createBufferSource();
        src.buffer = this._objBuffer;
        const g = c.createGain();
        g.gain.value = 0.8;
        src.connect(g); g.connect(c.destination);
        src.start(0);
      } else {
        // Fallback: try HTML Audio while buffer loads
        try { const a = new Audio('/objection.mp3'); a.volume = 0.8; a.play(); } catch(e) {}
      }
    },
    correct: () => {
      [523,659,784,1047].forEach((f,i) => playNote(f, 0.2, "square", 0.06, i*0.1));
    },
    wrong: () => {
      playNote(200, 0.15, "sawtooth", 0.1);
      playNote(150, 0.3, "sawtooth", 0.08, 0.15);
    },
    gavel: () => {
      playNote(100, 0.1, "square", 0.15);
      playNote(80, 0.15, "square", 0.1, 0.08);
    },
    transition: () => {
      [330,440,523].forEach((f,i) => playNote(f, 0.15, "triangle", 0.05, i*0.08));
    },
    titleStart: () => {
      [262,330,392,523].forEach((f,i) => playNote(f, 0.3, "triangle", 0.07, i*0.15));
      playNote(523, 0.6, "square", 0.05, 0.6);
    },
    victory: () => {
      const notes = [523,659,784,1047,784,1047,1319];
      notes.forEach((f,i) => playNote(f, 0.25, "square", 0.06, i*0.12));
    },
    // Stage-direction SFX
    phoneRing: () => {
      const ring = (t) => { playNote(480, 0.15, "sine", 0.12, t); playNote(440, 0.15, "sine", 0.10, t); };
      ring(0); ring(0.2); ring(0.7); ring(0.9);
    },
    witnessEntry: () => {
      playNote(392, 0.12, "triangle", 0.07);
      playNote(523, 0.25, "triangle", 0.09, 0.1);
    },
    crowdReact: () => {
      [220,277,330,370].forEach((f,i) => playNote(f, 0.6, "sine", 0.04, i*0.04));
    },
    dramaticPause: () => {
      playNote(110, 0.8, "triangle", 0.06);
      playNote(116, 0.8, "sine", 0.04);
    },
    violin: () => {
      [392,349,330,294].forEach((f,i) => playNote(f, 0.3, "sawtooth", 0.05, i*0.25));
    },
    stageDirection: (text) => {
      const t = text.toLowerCase();
      if (t.includes("phone ring"))                    return AudioEngine.phoneRing();
      if (t.includes("new witness") || t.includes("takes the stand")) return AudioEngine.witnessEntry();
      if (t.includes("crowd erupts") || t.includes("crowd")) return AudioEngine.crowdReact();
      if (t.includes("long pause") || t.includes("tense") || t.includes("adjusts")) return AudioEngine.dramaticPause();
      if (t.includes("violin") || t.includes("tear") || t.includes("wipes")) return AudioEngine.violin();
      if (t.includes("gavel") || t.includes("court is now")) return AudioEngine.gavel();
      if (t.includes("screen goes black") || t.includes("winks at camera")) return AudioEngine.transition();
    },
    // Background music loop using oscillators
    _musicNodes: null,
    _musicPlaying: false,
    startMusic: function() {
      if (this._musicPlaying) return;
      if (_muted) return;
      try {
        const c = getCtx();
        const master = c.createGain();
        master.gain.value = 0.025;
        master.connect(c.destination);
        // Simple arpeggiated ambient loop
        const playLoop = () => {
          if (!this._musicPlaying || _muted) return;
          const chords = [
            [220,277,330],[196,247,294],[185,233,277],[220,277,330]
          ];
          chords.forEach((chord, ci) => {
            chord.forEach((f, ni) => {
              const o = c.createOscillator(), g = c.createGain();
              o.type = "triangle"; o.frequency.value = f;
              const t = c.currentTime + ci * 2 + ni * 0.3;
              g.gain.setValueAtTime(0, t);
              g.gain.linearRampToValueAtTime(0.4, t + 0.1);
              g.gain.linearRampToValueAtTime(0, t + 1.5);
              o.connect(g); g.connect(master);
              o.start(t); o.stop(t + 1.8);
            });
          });
          setTimeout(playLoop, 8000);
        };
        this._musicPlaying = true;
        playLoop();
        this._masterGain = master;
      } catch(e) {}
    },
    stopMusic: function() { this._musicPlaying = false; },
  };
})();

/* ═══════════════════════════════════════════
   TTS — Web Speech API voice manager
   ═══════════════════════════════════════════ */
import { VoiceManager } from './tts/voice-manager.js';

/* ═══════════════════════════════════════════
   PORTRAITS — larger viewBox, more detail
   ═══════════════════════════════════════════ */
const P = {
  WRIGHT: (ex="normal") => {
    const isSuit = true;
    return (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wr-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3568b2"/><stop offset="100%" stopColor="#1e3a6e"/></linearGradient>
        <linearGradient id="wr-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a2418"/><stop offset="100%" stopColor="#1a0e08"/></linearGradient>
        <linearGradient id="wr-sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5d4b0"/><stop offset="100%" stopColor="#e0b48a"/></linearGradient>
      </defs>
      {/* Suit body */}
      <path d="M28,195 Q30,182 60,176 L88,174 L112,174 L140,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#wr-s)"/>
      <path d="M80,176 L100,195 L120,176" fill="#1a3260" opacity="0.6"/>
      <path d="M60,195 Q65,240 62,300" stroke="#1a3260" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <path d="M140,195 Q135,240 138,300" stroke="#1a3260" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <path d="M80,176 L72,195 L82,210 L100,200Z" fill="#294f8a"/>
      <path d="M120,176 L128,195 L118,210 L100,200Z" fill="#294f8a"/>
      <path d="M88,176 L100,200 L112,176Z" fill="#f0ece6"/>
      <path d="M96,186 L104,186 L103,192 L100,194 L97,192Z" fill="#d4352e"/>
      <path d="M97,192 L103,192 L101,240 L100,244 L99,240Z" fill="#c0392b"/>
      <path d="M98,192 L102,192 L100,200Z" fill="#a52f25"/>
      <circle cx="100" cy="220" r="2.5" fill="#4a7ac7" opacity="0.6"/>
      <circle cx="68" cy="200" r="9" fill="#f1c40f"/><circle cx="68" cy="200" r="7" fill="#e8b84a"/>
      <text x="68" y="204" textAnchor="middle" fontSize="9" fill="#8b6914" fontWeight="bold">A</text>
      <circle cx="68" cy="200" r="9" fill="none" stroke="#c9a80e" strokeWidth="1.5"/>
      {/* Pointing arm for objection */}
      {ex==="objection" && <>
        <path d="M145,180 Q155,170 162,155 L170,136 L180,118" stroke="#e0b48a" strokeWidth="14" fill="none" strokeLinecap="round"/>
        <path d="M180,118 L196,104" stroke="#f0c8a0" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M178,122 L182,128" stroke="#f0c8a0" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <path d="M175,124 L176,132" stroke="#f0c8a0" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      </>}
      {ex==="thinking" && <>
        <path d="M140,200 Q142,185 138,170 L130,156 L120,148" stroke="#e0b48a" strokeWidth="12" fill="none" strokeLinecap="round"/>
        <ellipse cx="118" cy="146" rx="8" ry="6" fill="#f0c8a0" transform="rotate(-20 118 146)"/>
      </>}
      {/* Neck */}
      <path d="M86,152 Q86,174 88,176 L112,176 Q114,174 114,152Z" fill="url(#wr-sk)"/>
      <path d="M92,168 Q100,172 108,168" stroke="#d4a070" strokeWidth="0.8" fill="none" opacity="0.4"/>
      {/* Head */}
      <path d="M56,108 Q54,78 66,58 Q78,42 100,40 Q122,42 134,58 Q146,78 144,108 L142,130 Q138,148 128,156 Q116,164 100,166 Q84,164 72,156 Q62,148 58,130Z" fill="url(#wr-sk)"/>
      <path d="M62,140 Q72,155 100,162 Q128,155 138,140 L142,130 Q138,148 128,156 Q116,164 100,166 Q84,164 72,156 Q62,148 58,130Z" fill="#d4a070" opacity="0.25"/>
      {/* Ears */}
      <ellipse cx="55" cy="104" rx="7" ry="12" fill="#ecc8a2"/>
      <path d="M53,98 Q50,104 53,110" stroke="#d4a070" strokeWidth="1.2" fill="none"/>
      <ellipse cx="145" cy="104" rx="7" ry="12" fill="#ecc8a2"/>
      <path d="M147,98 Q150,104 147,110" stroke="#d4a070" strokeWidth="1.2" fill="none"/>
      {/* Spiky hair */}
      <path d="M52,98 L46,48 L64,82 L54,22 L78,68 L72,10 L96,58 L90,6 L108,52 L106,8 L124,62 L120,16 L136,70 L138,28 L148,82 L152,46 L150,100" fill="url(#wr-h)"/>
      <ellipse cx="100" cy="64" rx="48" ry="30" fill="#2c1810"/>
      <path d="M66,55 Q82,44 100,48 Q118,44 134,55" stroke="#4a3020" strokeWidth="2.5" fill="none" opacity="0.5"/>
      {/* Nose */}
      <path d="M97,112 Q99,122 96,125" stroke="#d4a070" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M103,112 Q101,122 104,125" stroke="#d4a070" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Expression */}
      {ex==="objection" ? (<>
        <path d="M66,88 L90,96" stroke="#2c1810" strokeWidth="4" strokeLinecap="round"/>
        <path d="M110,96 L134,88" stroke="#2c1810" strokeWidth="4" strokeLinecap="round"/>
        <ellipse cx="80" cy="106" rx="13" ry="11" fill="#fff"/><ellipse cx="120" cy="106" rx="13" ry="11" fill="#fff"/>
        <circle cx="80" cy="106" r="6" fill="#3a2010"/><circle cx="120" cy="106" r="6" fill="#3a2010"/>
        <circle cx="80" cy="106" r="3.5" fill="#0a0604"/><circle cx="120" cy="106" r="3.5" fill="#0a0604"/>
        <circle cx="83" cy="103" r="2.5" fill="#fff" opacity="0.9"/><circle cx="123" cy="103" r="2.5" fill="#fff" opacity="0.9"/>
        <ellipse cx="100" cy="142" rx="16" ry="11" fill="#5a1a10"/>
        <path d="M86,138 Q100,134 114,138" fill="#fff"/>
        <path d="M88,146 Q100,150 112,146" fill="#c44040" opacity="0.6"/>
        {[88,93.5,99,104.5].map((x,i)=><rect key={i} x={x} y="135" width="5" height="5" rx="1" fill="#f5f0ea"/>)}
      </>) : ex==="thinking" ? (<>
        <path d="M67,90 Q77,88 90,94" stroke="#2c1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M110,92 Q123,88 133,94" stroke="#2c1810" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <ellipse cx="80" cy="106" rx="10" ry="8" fill="#fff"/><ellipse cx="120" cy="106" rx="10" ry="8" fill="#fff"/>
        <circle cx="84" cy="107" r="5" fill="#3a2010"/><circle cx="124" cy="107" r="5" fill="#3a2010"/>
        <circle cx="84" cy="107" r="2.8" fill="#0a0604"/><circle cx="124" cy="107" r="2.8" fill="#0a0604"/>
        <circle cx="86" cy="105" r="1.8" fill="#fff" opacity="0.9"/><circle cx="126" cy="105" r="1.8" fill="#fff" opacity="0.9"/>
        <path d="M69,100 Q80,96 91,100" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M109,100 Q120,96 131,100" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M90,140 Q100,144 110,140" stroke="#9b6040" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>) : (<>
        <path d="M67,92 Q77,86 90,92" stroke="#2c1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M110,92 Q123,86 133,92" stroke="#2c1810" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <ellipse cx="80" cy="106" rx="11" ry="9" fill="#fff"/><ellipse cx="120" cy="106" rx="11" ry="9" fill="#fff"/>
        <circle cx="80" cy="107" r="5.5" fill="#3a2010"/><circle cx="120" cy="107" r="5.5" fill="#3a2010"/>
        <circle cx="80" cy="107" r="3" fill="#0a0604"/><circle cx="120" cy="107" r="3" fill="#0a0604"/>
        <circle cx="83" cy="104" r="2.2" fill="#fff" opacity="0.9"/><circle cx="123" cy="104" r="2.2" fill="#fff" opacity="0.9"/>
        <circle cx="77" cy="109" r="1" fill="#fff" opacity="0.4"/><circle cx="117" cy="109" r="1" fill="#fff" opacity="0.4"/>
        <path d="M69,100 Q80,96 91,100" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M109,100 Q120,96 131,100" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M85,138 Q92,146 100,147 Q108,146 115,138" stroke="#9b6040" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      </>)}
    </svg>
    );
  },
  FALLACIOUS: (ex="normal") => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fa-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8a1850"/><stop offset="100%" stopColor="#4a0e2e"/></linearGradient>
        <linearGradient id="fa-h" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stopColor="#e8e8e8"/><stop offset="100%" stopColor="#b0b0b0"/></linearGradient>
        <linearGradient id="fa-sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5d4b0"/><stop offset="100%" stopColor="#e0b48a"/></linearGradient>
        <linearGradient id="sw-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8ecae6"/><stop offset="100%" stopColor="#5dade2"/></linearGradient>
      </defs>
      {/* Suit */}
      <path d="M28,195 Q30,182 58,176 L86,174 L114,174 L142,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#fa-s)"/>
      <path d="M65,195 Q68,240 65,300" stroke="#3a0a1e" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <path d="M135,195 Q132,240 135,300" stroke="#3a0a1e" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <path d="M82,174 L68,198 L80,218 L100,202Z" fill="#6a1240"/>
      <path d="M118,174 L132,198 L120,218 L100,202Z" fill="#6a1240"/>
      <path d="M80,202 L120,202 L118,260 L82,260Z" fill="#3e0c26"/>
      {/* Cravat */}
      <path d="M82,174 L100,196 L118,174" fill="#f0ece4"/>
      <path d="M85,178 L100,194 L115,178" fill="#faf8f4"/>
      <path d="M88,180 Q94,186 100,192 Q106,186 112,180" stroke="#ddd8d0" strokeWidth="0.8" fill="none"/>
      <circle cx="100" cy="186" r="3.5" fill="#c9a80e"/><circle cx="100" cy="186" r="2" fill="#f1c40f"/>
      <circle cx="100" cy="214" r="2" fill="#c9a80e" opacity="0.7"/>
      <circle cx="100" cy="228" r="2" fill="#c9a80e" opacity="0.7"/>
      {/* Finger wag (normal only) */}
      {ex!=="sweating" && <>
        <path d="M160,168 Q165,155 170,138 L175,124" stroke="#e8c0a0" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M175,124 L178,110" stroke="#f0c8a0" strokeWidth="5" fill="none" strokeLinecap="round"/>
        <path d="M172,128 L172,118" stroke="#f0c8a0" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </>}
      {/* Neck */}
      <path d="M86,150 Q86,172 88,176 L112,176 Q114,172 114,150Z" fill="url(#fa-sk)"/>
      {/* Head */}
      <path d="M58,106 Q56,76 68,58 Q80,44 100,42 Q120,44 132,58 Q144,76 142,106 L140,128 Q136,145 126,153 Q114,162 100,164 Q86,162 74,153 Q64,145 60,128Z" fill="url(#fa-sk)"/>
      <path d="M64,138 Q74,152 100,160 Q126,152 136,138 L140,128 Q136,145 126,153 Q114,162 100,164 Q86,162 74,153 Q64,145 60,128Z" fill="#d4a070" opacity="0.2"/>
      <ellipse cx="57" cy="102" rx="6" ry="11" fill="#ecc8a2"/>
      <ellipse cx="143" cy="102" rx="6" ry="11" fill="#ecc8a2"/>
      {/* Silver hair */}
      <path d="M56,92 Q56,46 76,36 Q100,28 124,36 Q144,46 144,92" fill="url(#fa-h)"/>
      <path d="M58,88 Q62,50 84,40 Q100,34 116,40 Q138,50 142,88" fill="#d8d8d8"/>
      <path d="M68,58 Q86,42 100,40 Q114,42 132,58" stroke="#c4c4c4" strokeWidth="1.5" fill="none"/>
      <path d="M72,52 Q88,40 100,38 Q112,40 128,52" stroke="#bbb" strokeWidth="1" fill="none" opacity="0.6"/>
      {/* Nose */}
      <path d="M98,108 L99,122 L96,124" stroke="#d4a070" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Expression */}
      {ex==="sweating" ? (<>
        <path d="M68,84 Q78,90 90,92" stroke="#999" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M110,92 Q122,90 132,84" stroke="#999" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <ellipse cx="80" cy="102" rx="9" ry="6" fill="#fff"/><ellipse cx="120" cy="102" rx="9" ry="6" fill="#fff"/>
        <circle cx="80" cy="103" r="3.5" fill="#444"/><circle cx="120" cy="103" r="3.5" fill="#444"/>
        <circle cx="80" cy="103" r="2" fill="#111"/><circle cx="120" cy="103" r="2" fill="#111"/>
        <circle cx="81" cy="101" r="1.2" fill="#fff" opacity="0.85"/><circle cx="121" cy="101" r="1.2" fill="#fff" opacity="0.85"/>
        {/* Sweat drops on forehead */}
        <ellipse cx="130" cy="72" rx="2.5" ry="4" fill="url(#sw-d)" opacity="0.8"/>
        <ellipse cx="138" cy="82" rx="2" ry="3" fill="url(#sw-d)" opacity="0.65"/>
        <ellipse cx="134" cy="92" rx="1.8" ry="2.8" fill="url(#sw-d)" opacity="0.5"/>
        <ellipse cx="66" cy="78" rx="2" ry="3" fill="url(#sw-d)" opacity="0.6"/>
        <ellipse cx="126" cy="60" rx="1.5" ry="2.5" fill="url(#sw-d)" opacity="0.45"/>
        <line x1="130" y1="66" x2="130" y2="68" stroke="#8ecae6" strokeWidth="0.6" opacity="0.5"/>
        <path d="M84,138 Q94,132 100,132 Q106,132 116,138" stroke="#9b6040" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>) : (<>
        <path d="M66,88 Q76,80 92,88" stroke="#999" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M108,88 Q124,80 134,88" stroke="#999" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <ellipse cx="80" cy="102" rx="10" ry="7.5" fill="#fff"/><ellipse cx="120" cy="102" rx="10" ry="7.5" fill="#fff"/>
        <circle cx="80" cy="103" r="4.5" fill="#444"/><circle cx="120" cy="103" r="4.5" fill="#444"/>
        <circle cx="80" cy="103" r="2.5" fill="#111"/><circle cx="120" cy="103" r="2.5" fill="#111"/>
        <circle cx="82" cy="101" r="1.8" fill="#fff" opacity="0.85"/><circle cx="122" cy="101" r="1.8" fill="#fff" opacity="0.85"/>
        <path d="M70,97 Q80,94 90,97" stroke="#999" strokeWidth="1.2" fill="none"/>
        <path d="M110,97 Q120,94 130,97" stroke="#999" strokeWidth="1.2" fill="none"/>
        <path d="M84,136 Q94,142 100,142 Q112,140 120,134" stroke="#9b6040" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>)}
    </svg>
  ),
  JUDGE: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="j-rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#222"/><stop offset="100%" stopColor="#0e0e0e"/></linearGradient>
        <linearGradient id="j-sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5d4b0"/><stop offset="100%" stopColor="#ddb08a"/></linearGradient>
      </defs>
      {/* Robe */}
      <path d="M18,190 Q20,178 55,172 L85,170 L115,170 L145,172 Q180,178 182,190 L182,300 L18,300Z" fill="url(#j-rb)"/>
      <path d="M55,190 Q58,240 55,300" stroke="#2a2a2a" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <path d="M100,200 L100,300" stroke="#2a2a2a" strokeWidth="1" fill="none" opacity="0.3"/>
      <path d="M145,190 Q142,240 145,300" stroke="#2a2a2a" strokeWidth="1.5" fill="none" opacity="0.6"/>
      {/* Collar */}
      <path d="M80,170 L100,198 L120,170" fill="#f0ece6"/>
      <path d="M84,173 L100,194 L116,173" fill="#faf8f4"/>
      {/* Neck */}
      <rect x="88" y="155" width="24" height="22" rx="8" fill="url(#j-sk)"/>
      {/* Head */}
      <ellipse cx="100" cy="96" rx="50" ry="56" fill="url(#j-sk)"/>
      <ellipse cx="100" cy="62" rx="35" ry="18" fill="#f8dcc0" opacity="0.4"/>
      {/* Ears */}
      <ellipse cx="50" cy="100" rx="9" ry="15" fill="#ecc8a2"/>
      <path d="M48,90 Q44,100 48,110" stroke="#d4a070" strokeWidth="1.5" fill="none"/>
      <ellipse cx="150" cy="100" rx="9" ry="15" fill="#ecc8a2"/>
      <path d="M152,90 Q156,100 152,110" stroke="#d4a070" strokeWidth="1.5" fill="none"/>
      {/* Sideburns */}
      <path d="M54,82 Q46,66 56,50" stroke="#e8e8e8" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d="M146,82 Q154,66 144,50" stroke="#e8e8e8" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d="M56,90 Q50,80 54,68" stroke="#ddd" strokeWidth="4" fill="none"/>
      <path d="M144,90 Q150,80 146,68" stroke="#ddd" strokeWidth="4" fill="none"/>
      {/* Bushy eyebrows */}
      <path d="M64,84 Q74,76 90,84" stroke="#d8d8d8" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
      <path d="M110,84 Q126,76 136,84" stroke="#d8d8d8" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
      {/* Glasses */}
      <circle cx="80" cy="98" r="18" stroke="#2a2a2a" strokeWidth="4.5" fill="rgba(200,210,220,0.08)"/>
      <circle cx="120" cy="98" r="18" stroke="#2a2a2a" strokeWidth="4.5" fill="rgba(200,210,220,0.08)"/>
      <line x1="98" y1="98" x2="102" y2="98" stroke="#2a2a2a" strokeWidth="4"/>
      <line x1="62" y1="94" x2="50" y2="90" stroke="#2a2a2a" strokeWidth="3"/>
      <line x1="138" y1="94" x2="150" y2="90" stroke="#2a2a2a" strokeWidth="3"/>
      <ellipse cx="73" cy="91" rx="5" ry="3.5" fill="#fff" opacity="0.12" transform="rotate(-15 73 91)"/>
      <ellipse cx="113" cy="91" rx="5" ry="3.5" fill="#fff" opacity="0.12" transform="rotate(-15 113 91)"/>
      {/* Eyes */}
      <circle cx="80" cy="100" r="4" fill="#1a1a1a"/><circle cx="120" cy="100" r="4" fill="#1a1a1a"/>
      <circle cx="81" cy="98" r="1.5" fill="#fff" opacity="0.7"/><circle cx="121" cy="98" r="1.5" fill="#fff" opacity="0.7"/>
      {/* Nose */}
      <ellipse cx="100" cy="118" rx="8" ry="6" fill="#e8c0a0"/>
      <path d="M94,119 Q96,122 94,124" stroke="#d0a070" strokeWidth="1" fill="none" opacity="0.6"/>
      <path d="M106,119 Q104,122 106,124" stroke="#d0a070" strokeWidth="1" fill="none" opacity="0.6"/>
      {/* Smile */}
      <path d="M84,134 Q92,142 100,143 Q108,142 116,134" stroke="#9b6040" strokeWidth="2.2" fill="none"/>
      {/* Wrinkles */}
      <path d="M60,125 Q64,121 68,125" stroke="#d4a070" strokeWidth="1" fill="none" opacity="0.4"/>
      <path d="M132,125 Q136,121 140,125" stroke="#d4a070" strokeWidth="1" fill="none" opacity="0.4"/>
      {/* Gavel */}
      <rect x="154" y="200" width="36" height="14" rx="4" fill="#8b6914" stroke="#6d5210" strokeWidth="1.2"/>
      <rect x="167" y="190" width="10" height="28" rx="3" fill="#a07830"/>
      <rect x="165" y="188" width="14" height="5" rx="2" fill="#8b6914"/>
      <line x1="158" y1="205" x2="186" y2="205" stroke="#7a5c10" strokeWidth="0.5" opacity="0.4"/>
    </svg>
  ),
  LARRY: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0922e"/><stop offset="100%" stopColor="#c86a10"/></linearGradient>
        <linearGradient id="l-sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f8dcc0"/><stop offset="100%" stopColor="#e8c0a0"/></linearGradient>
        <linearGradient id="l-hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a05a22"/><stop offset="100%" stopColor="#6e3c12"/></linearGradient>
      </defs>
      {/* Hoodie */}
      <path d="M28,195 Q30,182 58,176 L86,174 L114,174 L142,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#l-hd)"/>
      <path d="M58,176 Q65,166 80,170 L120,170 Q135,166 142,176" fill="#d47018" stroke="#c06010" strokeWidth="1"/>
      <line x1="88" y1="180" x2="86" y2="210" stroke="#ddd" strokeWidth="1.5"/>
      <line x1="112" y1="180" x2="114" y2="210" stroke="#ddd" strokeWidth="1.5"/>
      <circle cx="86" cy="212" r="2" fill="#ddd"/><circle cx="114" cy="212" r="2" fill="#ddd"/>
      <line x1="100" y1="178" x2="100" y2="300" stroke="#c9a00e" strokeWidth="2.5"/>
      <rect x="96" y="200" width="8" height="10" rx="2" fill="#ddd" stroke="#bbb" strokeWidth="0.8"/>
      <path d="M88,174 L100,174 L112,174 L108,186 L92,186Z" fill="#f8f8f8"/>
      {/* Neck */}
      <rect x="88" y="158" width="24" height="20" rx="8" fill="url(#l-sk)"/>
      {/* Head */}
      <ellipse cx="100" cy="100" rx="48" ry="54" fill="url(#l-sk)"/>
      {/* Ears */}
      <ellipse cx="52" cy="104" rx="10" ry="14" fill="#ecc8a2"/>
      <path d="M50,96 Q46,104 50,112" stroke="#d4a070" strokeWidth="1.5" fill="none"/>
      <ellipse cx="148" cy="104" rx="10" ry="14" fill="#ecc8a2"/>
      <path d="M150,96 Q154,104 150,112" stroke="#d4a070" strokeWidth="1.5" fill="none"/>
      {/* Hair */}
      <path d="M52,86 Q54,44 72,34 Q86,24 100,36 Q114,24 128,34 Q146,44 148,86" fill="url(#l-hr)"/>
      <path d="M60,48 L52,26 L68,44" fill="#8B4513"/><path d="M78,34 L72,10 L86,30" fill="#8B4513"/>
      <path d="M96,30 L92,6 L104,28" fill="#8B4513"/><path d="M116,32 L120,8 L126,34" fill="#8B4513"/>
      <path d="M136,42 L144,22 L142,46" fill="#8B4513"/>
      <path d="M58,68 Q68,54 80,60 Q90,50 100,58 Q110,48 120,58 Q130,50 142,66" fill="url(#l-hr)"/>
      <path d="M72,40 Q88,30 100,32 Q112,30 128,40" stroke="#b8742e" strokeWidth="1.5" fill="none" opacity="0.5"/>
      {/* Eyebrows */}
      <path d="M60,84 Q72,78 88,86" stroke="#5a3510" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M112,86 Q128,78 140,84" stroke="#5a3510" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Big eyes */}
      <ellipse cx="78" cy="102" rx="14" ry="13" fill="#fff"/><ellipse cx="122" cy="102" rx="14" ry="13" fill="#fff"/>
      <circle cx="78" cy="104" r="7.5" fill="#6a4420"/><circle cx="122" cy="104" r="7.5" fill="#6a4420"/>
      <circle cx="78" cy="104" r="4" fill="#2a1208"/><circle cx="122" cy="104" r="4" fill="#2a1208"/>
      <circle cx="82" cy="100" r="3.5" fill="#fff" opacity="0.9"/><circle cx="126" cy="100" r="3.5" fill="#fff" opacity="0.9"/>
      <circle cx="76" cy="107" r="1.5" fill="#fff" opacity="0.4"/><circle cx="120" cy="107" r="1.5" fill="#fff" opacity="0.4"/>
      {/* Nose */}
      <ellipse cx="100" cy="118" rx="5" ry="3.5" fill="#e8c0a0"/>
      {/* Grin */}
      <path d="M78,134 Q88,150 100,152 Q112,150 122,134" stroke="#8b5e3c" strokeWidth="2" fill="#fff"/>
      <line x1="88" y1="138" x2="88" y2="144" stroke="#e8e0d8" strokeWidth="1" opacity="0.5"/>
      <line x1="96" y1="139" x2="96" y2="148" stroke="#e8e0d8" strokeWidth="1" opacity="0.5"/>
      <line x1="104" y1="139" x2="104" y2="148" stroke="#e8e0d8" strokeWidth="1" opacity="0.5"/>
      <line x1="112" y1="138" x2="112" y2="144" stroke="#e8e0d8" strokeWidth="1" opacity="0.5"/>
    </svg>
  ),
  BRENDA: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="br-u" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a5068"/><stop offset="100%" stopColor="#1e3040"/></linearGradient>
      </defs>
      <path d="M28,195 Q30,182 58,176 L142,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#br-u)"/>
      <rect x="30" y="180" width="28" height="7" rx="2" fill="#4a6480"/>
      <rect x="142" y="180" width="28" height="7" rx="2" fill="#4a6480"/>
      <path d="M80,176 L100,196 L120,176" fill="#162430"/>
      <rect x="86" y="174" width="28" height="14" rx="2" fill="#e8e4dc"/>
      <polygon points="96,182 104,182 102,214 100,218 98,214" fill="#1a1a2e"/>
      <rect x="32" y="198" width="10" height="24" rx="3" fill="#111"/>
      <rect x="34" y="194" width="6" height="6" rx="1.5" fill="#2a2a2a"/>
      <circle cx="37" cy="197" r="1" fill="#e85555" opacity="0.8"/>
      <rect x="128" y="198" width="34" height="24" rx="4" fill="#f1c40f" stroke="#c9a80e" strokeWidth="1.5"/>
      <text x="145" y="214" textAnchor="middle" fontSize="9" fill="#333" fontWeight="bold">SEC</text>
      <rect x="88" y="160" width="24" height="20" rx="8" fill="#f0c8a0"/>
      <ellipse cx="100" cy="100" rx="44" ry="52" fill="#f0c8a0"/>
      <ellipse cx="56" cy="104" rx="6" ry="10" fill="#e8b890"/>
      <ellipse cx="144" cy="104" rx="6" ry="10" fill="#e8b890"/>
      {/* Hair */}
      <ellipse cx="100" cy="64" rx="46" ry="28" fill="#3e2210"/>
      <path d="M54,66 Q52,105 58,132" stroke="#3e2210" strokeWidth="13" fill="none" strokeLinecap="round"/>
      <path d="M146,66 Q148,105 142,132" stroke="#3e2210" strokeWidth="13" fill="none" strokeLinecap="round"/>
      <path d="M60,66 Q72,52 82,58 Q92,48 100,56 Q108,50 114,60" fill="#3e2210"/>
      {/* Stern eyes */}
      <line x1="64" y1="86" x2="90" y2="92" stroke="#2a1808" strokeWidth="3" strokeLinecap="round"/>
      <line x1="110" y1="92" x2="136" y2="86" stroke="#2a1808" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="80" cy="102" rx="9" ry="6.5" fill="#fff"/><ellipse cx="120" cy="102" rx="9" ry="6.5" fill="#fff"/>
      <circle cx="80" cy="103" r="4" fill="#1a1a1a"/><circle cx="120" cy="103" r="4" fill="#1a1a1a"/>
      <circle cx="82" cy="101" r="1.5" fill="#fff" opacity="0.8"/><circle cx="122" cy="101" r="1.5" fill="#fff" opacity="0.8"/>
      <path d="M98,112 Q100,120 102,112" stroke="#d4a070" strokeWidth="1.3" fill="none"/>
      <path d="M88,132 Q100,138 112,132" stroke="#9b6040" strokeWidth="2" fill="none"/>
    </svg>
  ),
  CHAD: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ch-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#222"/><stop offset="100%" stopColor="#0a0a0a"/></linearGradient>
      </defs>
      <path d="M28,195 Q30,182 58,176 L142,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#ch-f)"/>
      <path d="M58,176 L66,162 L78,176" fill="#2a2a2a"/>
      <path d="M142,176 L134,162 L122,176" fill="#2a2a2a"/>
      <path d="M78,176 L100,208 L122,176" fill="#111"/>
      <path d="M74,176 Q80,190 88,200 Q94,206 100,208 Q106,206 112,200 Q120,190 126,176" stroke="#f1c40f" strokeWidth="2.5" fill="none"/>
      <circle cx="100" cy="210" r="6" fill="#f1c40f" stroke="#c9a80e" strokeWidth="1.2"/>
      <text x="100" y="214" textAnchor="middle" fontSize="8" fill="#8b6914" fontWeight="bold">$</text>
      <rect x="88" y="160" width="24" height="20" rx="8" fill="#dbb590"/>
      <ellipse cx="100" cy="100" rx="44" ry="52" fill="#dbb590"/>
      <ellipse cx="56" cy="104" rx="6" ry="11" fill="#c9a070"/>
      <ellipse cx="144" cy="104" rx="6" ry="11" fill="#c9a070"/>
      {/* AirPod */}
      <path d="M54,98 Q52,102 53,108" stroke="#f0f0f0" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="53" cy="109" rx="2.5" ry="4" fill="#eee"/>
      {/* Hair */}
      <path d="M56,80 Q58,34 80,26 Q100,20 120,26 Q142,34 144,80" fill="#111"/>
      <path d="M72,40 Q90,28 110,28 Q130,32 140,46" stroke="#2a2a2a" strokeWidth="1.5" fill="none"/>
      {/* Brows */}
      <path d="M64,84 Q76,76 88,84" stroke="#111" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <line x1="112" y1="86" x2="136" y2="80" stroke="#111" strokeWidth="3" strokeLinecap="round"/>
      {/* Sunglasses */}
      <rect x="58" y="92" width="34" height="24" rx="7" fill="#0a0a0a" stroke="#444" strokeWidth="2.5"/>
      <rect x="108" y="92" width="34" height="24" rx="7" fill="#0a0a0a" stroke="#444" strokeWidth="2.5"/>
      <line x1="92" y1="104" x2="108" y2="104" stroke="#444" strokeWidth="3.5"/>
      <path d="M64,96 L74,96 L66,104" fill="#222" opacity="0.4"/>
      <path d="M114,96 L124,96 L116,104" fill="#222" opacity="0.4"/>
      <path d="M98,112 Q100,120 102,112" stroke="#b89070" strokeWidth="1.3" fill="none"/>
      <path d="M84,134 Q96,142 100,142 Q110,140 122,132" stroke="#8b5e3c" strokeWidth="2.2" fill="none"/>
      {/* Stubble */}
      <circle cx="84" cy="140" r="0.6" fill="#888" opacity="0.25"/>
      <circle cx="90" cy="144" r="0.6" fill="#888" opacity="0.2"/>
      <circle cx="110" cy="142" r="0.6" fill="#888" opacity="0.25"/>
      <circle cx="116" cy="138" r="0.6" fill="#888" opacity="0.2"/>
    </svg>
  ),
  LOOPSWORTH: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lp-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a5e3a"/><stop offset="100%" stopColor="#1e361e"/></linearGradient>
      </defs>
      <path d="M28,195 Q30,182 58,176 L142,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#lp-s)"/>
      <path d="M80,176 L68,196 L80,212 L100,200Z" fill="#2a4a2a"/>
      <path d="M120,176 L132,196 L120,212 L100,200Z" fill="#2a4a2a"/>
      <path d="M80,200 L120,200 L118,260 L82,260Z" fill="#2a502a"/>
      <polygon points="86,178 100,190 114,178 100,168" fill="#8e1600"/>
      <circle cx="100" cy="180" r="3" fill="#b02000"/>
      <circle cx="100" cy="210" r="1.8" fill="#c9a80e"/><circle cx="100" cy="222" r="1.8" fill="#c9a80e"/>
      <path d="M132,200 L142,195 L144,206 L134,208Z" fill="#e8e4dc" opacity="0.7"/>
      <rect x="88" y="160" width="24" height="20" rx="8" fill="#e8c89e"/>
      <ellipse cx="100" cy="100" rx="44" ry="52" fill="#e8c89e"/>
      <ellipse cx="56" cy="104" rx="7" ry="12" fill="#d8b88a"/>
      <ellipse cx="144" cy="104" rx="7" ry="12" fill="#d8b88a"/>
      {/* Wild grey hair */}
      <path d="M54,80 Q46,40 70,30 Q88,22 100,40 Q112,22 130,30 Q154,40 146,80" fill="#c4c4c4"/>
      <path d="M46,66 Q36,50 48,34" stroke="#ccc" strokeWidth="10" fill="none" strokeLinecap="round"/>
      <path d="M154,66 Q164,50 152,34" stroke="#ccc" strokeWidth="10" fill="none" strokeLinecap="round"/>
      <path d="M50,48 Q40,34 48,22" stroke="#bbb" strokeWidth="4" fill="none"/>
      <path d="M150,48 Q160,34 152,22" stroke="#bbb" strokeWidth="4" fill="none"/>
      <path d="M64,38 Q82,26 100,30 Q118,26 136,38" stroke="#b8b8b8" strokeWidth="1.5" fill="none"/>
      {/* Brows */}
      <path d="M64,84 Q76,76 90,84" stroke="#888" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M110,84 Q124,76 136,84" stroke="#888" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Eyes */}
      <ellipse cx="80" cy="100" rx="9" ry="8" fill="#fff"/>
      <circle cx="80" cy="101" r="4.5" fill="#2a2a2a"/><circle cx="80" cy="101" r="2.5" fill="#0a0a0a"/>
      <circle cx="82" cy="99" r="1.5" fill="#fff" opacity="0.8"/>
      <ellipse cx="120" cy="100" rx="9" ry="8" fill="#fff"/>
      <circle cx="120" cy="101" r="4.5" fill="#2a2a2a"/><circle cx="120" cy="101" r="2.5" fill="#0a0a0a"/>
      <circle cx="122" cy="99" r="1.5" fill="#fff" opacity="0.8"/>
      {/* Monocle */}
      <circle cx="120" cy="100" r="16" stroke="#c9a80e" strokeWidth="3" fill="none"/>
      <line x1="136" y1="104" x2="154" y2="138" stroke="#c9a80e" strokeWidth="1.8"/>
      {/* Mustache + nose */}
      <path d="M97,114 L100,126 L103,114" stroke="#c4a070" strokeWidth="1.3" fill="none"/>
      <path d="M88,128 Q94,124 100,126 Q106,124 112,128" stroke="#a0a0a0" strokeWidth="2.5" fill="none"/>
      <path d="M86,136 Q100,144 114,136" stroke="#8b5e3c" strokeWidth="2" fill="none"/>
    </svg>
  ),
  WILLOW: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wi-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7a6aaa"/><stop offset="100%" stopColor="#4a3a6e"/></linearGradient>
        <linearGradient id="wi-hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4402e"/><stop offset="100%" stopColor="#8e2218"/></linearGradient>
        <linearGradient id="crys" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#c9b5e8"/><stop offset="50%" stopColor="#9b7cc8"/><stop offset="100%" stopColor="#7a5aaa"/></linearGradient>
      </defs>
      <path d="M28,195 Q30,182 58,176 L142,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#wi-t)"/>
      <path d="M60,178 Q80,172 100,186 Q120,172 140,178 L140,200 Q120,190 100,200 Q80,190 60,200Z" fill="#8a7aba"/>
      <path d="M80,174 Q90,184 100,188 Q110,184 120,174" stroke="#9b59b6" strokeWidth="1.5" fill="none"/>
      <polygon points="96,192 100,206 104,192" fill="#9b59b6" stroke="#7d3c98" strokeWidth="1"/>
      <circle cx="100" cy="198" r="2.5" fill="#e8d5f5"/><circle cx="100" cy="198" r="1" fill="#fff" opacity="0.6"/>
      {/* Crystal */}
      <polygon points="28,238 38,212 48,238 38,250" fill="url(#crys)" stroke="#7b6ba8" strokeWidth="1"/>
      <polygon points="32,230 38,216 44,230" fill="#d4c0f0" opacity="0.5"/>
      <line x1="38" y1="218" x2="38" y2="244" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
      <rect x="88" y="160" width="24" height="20" rx="8" fill="#f0c8a0"/>
      <ellipse cx="100" cy="100" rx="44" ry="52" fill="#f0c8a0"/>
      <ellipse cx="56" cy="104" rx="6" ry="10" fill="#e8b890"/>
      <ellipse cx="144" cy="104" rx="6" ry="10" fill="#e8b890"/>
      {/* Long red hair */}
      <path d="M54,68 Q46,26 76,18 Q100,12 124,18 Q154,26 146,68" fill="url(#wi-hr)"/>
      <path d="M54,68 Q48,96 44,128 Q40,158 46,186 Q48,200 44,224" stroke="#c0392b" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <path d="M146,68 Q152,96 156,128 Q160,158 154,186 Q152,200 156,224" stroke="#c0392b" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <path d="M46,116 Q42,136 48,158" stroke="#a02e22" strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M154,116 Q158,136 152,158" stroke="#a02e22" strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M60,66 Q72,52 82,58 Q92,46 100,56 Q108,46 118,58 Q128,52 140,66" fill="url(#wi-hr)"/>
      {/* Flower ornament */}
      <circle cx="142" cy="50" r="10" fill="#f39c12"/>
      <ellipse cx="135" cy="44" rx="4" ry="5" fill="#f1c40f" opacity="0.7" transform="rotate(-30 135 44)"/>
      <ellipse cx="149" cy="44" rx="4" ry="5" fill="#f1c40f" opacity="0.7" transform="rotate(30 149 44)"/>
      <ellipse cx="142" cy="40" rx="3.5" ry="5" fill="#f1c40f" opacity="0.7"/>
      <circle cx="142" cy="50" r="5.5" fill="#e74c3c"/><circle cx="142" cy="50" r="3" fill="#f9e547"/>
      {/* Eyes */}
      <path d="M66,86 Q78,80 90,86" stroke="#7a3018" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M110,86 Q122,80 134,86" stroke="#7a3018" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <ellipse cx="80" cy="102" rx="10" ry="9" fill="#fff"/><ellipse cx="120" cy="102" rx="10" ry="9" fill="#fff"/>
      <circle cx="80" cy="103" r="5.5" fill="#2ecc71"/><circle cx="120" cy="103" r="5.5" fill="#2ecc71"/>
      <circle cx="80" cy="103" r="3" fill="#1a6a38"/><circle cx="120" cy="103" r="3" fill="#1a6a38"/>
      <circle cx="82" cy="100" r="2.2" fill="#fff" opacity="0.9"/><circle cx="122" cy="100" r="2.2" fill="#fff" opacity="0.9"/>
      <path d="M98,112 Q100,120 102,112" stroke="#d4a070" strokeWidth="1.3" fill="none"/>
      <path d="M86,132 Q100,142 114,132" stroke="#9b6040" strokeWidth="2" fill="none"/>
    </svg>
  ),
  "DR. VON STUFFINGTON": () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0ece6"/><stop offset="100%" stopColor="#d8d4cc"/></linearGradient>
      </defs>
      <path d="M28,195 Q30,182 58,176 L142,176 Q170,182 172,195 L172,300 L28,300Z" fill="url(#lc)" stroke="#c0bdb5" strokeWidth="1"/>
      <path d="M80,176 L68,196 L80,216 L100,204Z" fill="#e0dcd4"/>
      <path d="M120,176 L132,196 L120,216 L100,204Z" fill="#e0dcd4"/>
      <rect x="84" y="178" width="32" height="24" rx="2" fill="#e8e4da"/>
      <polygon points="96,184 104,184 102,216 100,220 98,216" fill="#2c3e50"/>
      <rect x="122" y="212" width="28" height="24" rx="3" fill="#e4e0d8" stroke="#c8c4bc" strokeWidth="0.8"/>
      <rect x="128" y="207" width="3" height="14" rx="1" fill="#2980b9"/>
      <rect x="133" y="209" width="3" height="12" rx="1" fill="#c0392b"/>
      <rect x="138" y="208" width="3" height="13" rx="1" fill="#27ae60"/>
      {/* Fish stickers */}
      <text x="46" y="230" fontSize="16" transform="rotate(-12 46 230)">🐟</text>
      <text x="132" y="260" fontSize="11" transform="rotate(8 132 260)">🐠</text>
      <text x="58" y="270" fontSize="9" transform="rotate(-6 58 270)">🐡</text>
      <text x="82" y="252" fontSize="8" transform="rotate(4 82 252)">🦀</text>
      <rect x="88" y="160" width="24" height="20" rx="8" fill="#e8c89e"/>
      <ellipse cx="100" cy="100" rx="44" ry="52" fill="#e8c89e"/>
      <ellipse cx="56" cy="104" rx="7" ry="12" fill="#d8b88a"/>
      <ellipse cx="144" cy="104" rx="7" ry="12" fill="#d8b88a"/>
      {/* Thinning hair */}
      <ellipse cx="100" cy="64" rx="40" ry="22" fill="#e4d8c4"/>
      <path d="M58,78 Q50,58 62,44" stroke="#9b7a24" strokeWidth="9" fill="none" strokeLinecap="round"/>
      <path d="M142,78 Q150,58 138,44" stroke="#9b7a24" strokeWidth="9" fill="none" strokeLinecap="round"/>
      <path d="M68,48 Q84,38 100,40 Q116,38 132,48" stroke="#a88830" strokeWidth="2" fill="none"/>
      {/* Brows */}
      <path d="M62,84 Q74,76 90,84" stroke="#8b6914" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M110,84 Q126,76 138,84" stroke="#8b6914" strokeWidth="4" strokeLinecap="round" fill="none"/>
      {/* Glasses */}
      <rect x="62" y="92" width="28" height="22" rx="5" stroke="#2a2a2a" strokeWidth="3.5" fill="rgba(200,210,220,0.06)"/>
      <rect x="110" y="92" width="28" height="22" rx="5" stroke="#2a2a2a" strokeWidth="3.5" fill="rgba(200,210,220,0.06)"/>
      <line x1="90" y1="103" x2="110" y2="103" stroke="#2a2a2a" strokeWidth="3"/>
      <line x1="62" y1="100" x2="56" y2="96" stroke="#2a2a2a" strokeWidth="2.5"/>
      <line x1="138" y1="100" x2="144" y2="96" stroke="#2a2a2a" strokeWidth="2.5"/>
      <circle cx="76" cy="104" r="4" fill="#1a1a1a"/><circle cx="124" cy="104" r="4" fill="#1a1a1a"/>
      <circle cx="77" cy="102" r="1.5" fill="#fff" opacity="0.7"/><circle cx="125" cy="102" r="1.5" fill="#fff" opacity="0.7"/>
      {/* Nose + mustache */}
      <ellipse cx="100" cy="120" rx="7" ry="5" fill="#dcc0a0"/>
      <path d="M78,126 Q86,134 94,130 Q100,128 106,130 Q114,134 122,126" stroke="#8b6914" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M82,128 Q88,132 94,130" stroke="#a88830" strokeWidth="2" fill="none"/>
      <path d="M106,130 Q112,132 118,128" stroke="#a88830" strokeWidth="2" fill="none"/>
      <path d="M90,138 Q100,142 110,138" stroke="#8b5e3c" strokeWidth="1.5" fill="none" opacity="0.4"/>
    </svg>
  ),
  "???": () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mg" cx="50%" cy="40%" r="50%"><stop offset="0%" stopColor="#222"/><stop offset="100%" stopColor="#0a0a0a"/></radialGradient>
      </defs>
      <rect x="15" y="170" width="170" height="130" rx="12" fill="#0e0e0e"/>
      <path d="M55,170 Q50,162 50,152 L150,152 Q150,162 145,170" fill="#0a0a0a"/>
      <ellipse cx="100" cy="96" rx="48" ry="55" fill="url(#mg)"/>
      {/* Glasses glint hint */}
      <ellipse cx="80" cy="90" rx="6" ry="3" fill="#444" opacity="0.2" transform="rotate(-10 80 90)"/>
      <ellipse cx="120" cy="90" rx="6" ry="3" fill="#444" opacity="0.2" transform="rotate(10 120 90)"/>
      <line x1="96" y1="90" x2="104" y2="90" stroke="#444" opacity="0.15" strokeWidth="2"/>
      <text x="100" y="116" textAnchor="middle" fontSize="52" fill="#3a3a3a" fontWeight="bold">?</text>
    </svg>
  ),
};
const portrait = (s, e) => (P[s] || P["???"])(e);

/* ═══════════════════════════════════════════
   CUSTOM CHARACTER SYSTEM
   ═══════════════════════════════════════════ */
const CUSTOM_PREFIX = 'fw-char-';
const CHARACTER_SLOTS = [
  { key:"WRIGHT", expr:"normal", label:"Phoenix Wright", pose:"Normal" },
  { key:"WRIGHT", expr:"thinking", label:"Phoenix Wright", pose:"Thinking" },
  { key:"WRIGHT", expr:"objection", label:"Phoenix Wright", pose:"Objection (big sprite)" },
  { key:"FALLACIOUS", expr:"normal", label:"Prosecutor Fallacious", pose:"Normal" },
  { key:"FALLACIOUS", expr:"sweating", label:"Prosecutor Fallacious", pose:"Sweating" },
  { key:"JUDGE", expr:"normal", label:"Judge Gullible III", pose:"Normal" },
  { key:"LARRY", expr:"normal", label:"Larry Butts", pose:"Normal" },
  { key:"BRENDA", expr:"normal", label:"Brenda Nosybody", pose:"Normal" },
  { key:"CHAD", expr:"normal", label:"Chad Mainstream", pose:"Normal" },
  { key:"LOOPSWORTH", expr:"normal", label:"Prof. Loopsworth", pose:"Normal" },
  { key:"WILLOW", expr:"normal", label:"Willow Earthchild", pose:"Normal" },
  { key:"DR. VON STUFFINGTON", expr:"normal", label:"Dr. Von Stuffington", pose:"Normal" },
  { key:"???", expr:"normal", label:"???", pose:"Mystery" },
];
const slotId = (key, expr) => `${key}:${expr}`;
const loadCustom = (key, expr) => { try { return localStorage.getItem(CUSTOM_PREFIX + slotId(key,expr)); } catch(e) { return null; } };
const saveCustom = (key, expr, dataUrl) => { try { localStorage.setItem(CUSTOM_PREFIX + slotId(key,expr), dataUrl); } catch(e) {} };
const removeCustom = (key, expr) => { try { localStorage.removeItem(CUSTOM_PREFIX + slotId(key,expr)); } catch(e) {} };
const CustomImg = ({src}) => <img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"contain",objectPosition:"center bottom"}} />;

const CharacterImportModal = ({ onClose, customPortraits, setCustomPortraits }) => {
  const fileRef = useRef(null);
  const [activeSlot, setActiveSlot] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlot) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      saveCustom(activeSlot.key, activeSlot.expr, dataUrl);
      setCustomPortraits(prev => ({...prev, [slotId(activeSlot.key, activeSlot.expr)]: dataUrl}));
      setActiveSlot(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemove = (slot) => {
    removeCustom(slot.key, slot.expr);
    setCustomPortraits(prev => {
      const n = {...prev};
      delete n[slotId(slot.key, slot.expr)];
      return n;
    });
  };

  return (
    <div style={{position:"absolute",inset:0,zIndex:200,background:"rgba(4,4,12,0.95)",display:"flex",flexDirection:"column",alignItems:"center",overflow:"auto",padding:"30px 16px"}}>
      <input ref={fileRef} type="file" accept="image/png,image/webp,image/gif" style={{display:"none"}} onChange={handleFile} />
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"clamp(18px,4vw,26px)",fontWeight:900,color:"#e8b84a",letterSpacing:3,marginBottom:6}}>IMPORT CHARACTERS</div>
      <div style={{fontSize:13,color:"#8a8aaa",marginBottom:24,textAlign:"center",maxWidth:500}}>Upload transparent PNGs to replace any character portrait. Images are scaled to fit automatically and saved to your browser.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,width:"100%",maxWidth:900}}>
        {CHARACTER_SLOTS.map(slot => {
          const id = slotId(slot.key, slot.expr);
          const custom = customPortraits[id];
          return (
            <div key={id} style={{background:"#12122a",border:"1.5px solid "+(custom?"#5be87a44":"#333355"),borderRadius:6,padding:12,display:"flex",gap:12,alignItems:"center"}}>
              {/* Preview */}
              <div style={{width:60,height:80,background:"#0a0a18",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:"1px solid #222"}}>
                {custom
                  ? <img src={custom} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} />
                  : <div style={{width:50,height:70}}>{(P[slot.key]||P["???"])(slot.expr)}</div>
                }
              </div>
              {/* Info + buttons */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:700,color:CC[slot.key]||"#aaa",letterSpacing:1}}>{slot.label}</div>
                <div style={{fontSize:11,color:"#666",marginBottom:6}}>{slot.pose}</div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setActiveSlot(slot);fileRef.current?.click();}} style={{fontSize:11,padding:"4px 10px",background:custom?"#1a3a1a":"#1a1a3a",color:custom?"#5be87a":"#8a8aaa",border:"1px solid "+(custom?"#5be87a44":"#33335544"),borderRadius:3,cursor:"pointer",fontFamily:"'Cinzel',serif",letterSpacing:1}}>
                    {custom?"Replace":"Upload PNG"}
                  </button>
                  {custom && <button onClick={()=>handleRemove(slot)} style={{fontSize:11,padding:"4px 10px",background:"#3a1a1a",color:"#e85555",border:"1px solid #e8555544",borderRadius:3,cursor:"pointer",fontFamily:"'Cinzel',serif",letterSpacing:1}}>Remove</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onClose} style={{marginTop:24,padding:"12px 40px",fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,letterSpacing:2,color:"#0a0a14",background:"#e8b84a",border:"none",cursor:"pointer",textTransform:"uppercase",clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)"}}>Done</button>
    </div>
  );
};

/* ═══════════════════════════════════════════
   BACKGROUNDS
   ═══════════════════════════════════════════ */
const BG = {
  office: (
    <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{width:"100%",height:"100%",position:"absolute",top:0,left:0}}>
      <rect width="800" height="400" fill="#3a2a1a" />
      <rect x="50" y="30" width="200" height="280" fill="#5c3a1e" stroke="#4a2a10" strokeWidth="3" />
      {[35,110,185,260].map(y=><rect key={y} x="55" y={y} width="190" height="65" fill="#6b4226" />)}
      <rect x="60" y="40" width="14" height="56" fill="#c0392b" /><rect x="78" y="46" width="12" height="50" fill="#2980b9" />
      <rect x="94" y="40" width="16" height="56" fill="#27ae60" /><rect x="114" y="44" width="12" height="52" fill="#f39c12" />
      <rect x="300" y="200" width="380" height="25" fill="#6b4226" />
      <rect x="310" y="225" width="18" height="90" fill="#5c3a1e" /><rect x="650" y="225" width="18" height="90" fill="#5c3a1e" />
      <rect x="440" y="110" width="140" height="90" rx="4" fill="#2c3e50" stroke="#1a252f" strokeWidth="4" />
      <rect x="446" y="116" width="128" height="74" fill="#4a6785" />
      <rect x="600" y="20" width="170" height="150" fill="#5dade2" stroke="#4a2a10" strokeWidth="6" />
      <line x1="685" y1="20" x2="685" y2="170" stroke="#4a2a10" strokeWidth="4" />
      <line x1="600" y1="95" x2="770" y2="95" stroke="#4a2a10" strokeWidth="4" />
    </svg>
  ),
  courtroom: (
    <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{width:"100%",height:"100%",position:"absolute",top:0,left:0}}>
      <rect width="800" height="400" fill="#5c4033" />
      <rect x="0" y="0" width="800" height="220" fill="#704830" />
      <rect x="0" y="220" width="800" height="180" fill="#8b6b4a" />
      <rect x="250" y="60" width="300" height="130" rx="6" fill="#3e2a1a" stroke="#2a1a0a" strokeWidth="4" />
      <rect x="255" y="48" width="290" height="18" rx="4" fill="#4a3020" />
      <circle cx="400" cy="115" r="32" fill="#c9a80e" opacity="0.5" />
      <text x="400" y="122" textAnchor="middle" fontSize="22" fill="#3e2a1a">⚖</text>
      <rect x="25" y="0" width="50" height="400" fill="#6b5040" /><rect x="20" y="0" width="60" height="24" fill="#5a4030" />
      <rect x="725" y="0" width="50" height="400" fill="#6b5040" /><rect x="720" y="0" width="60" height="24" fill="#5a4030" />
      <rect x="0" y="250" width="800" height="10" fill="#4a3020" />
      <rect x="0" y="320" width="800" height="80" fill="#a08060" />
    </svg>
  ),
  exterior: (
    <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{width:"100%",height:"100%",position:"absolute",top:0,left:0}}>
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a0533" /><stop offset="35%" stopColor="#c0392b" />
        <stop offset="65%" stopColor="#e67e22" /><stop offset="100%" stopColor="#f9e547" />
      </linearGradient></defs>
      <rect width="800" height="400" fill="url(#sky)" />
      <rect x="180" y="90" width="440" height="310" fill="#1a1a2e" />
      <polygon points="180,90 400,20 620,90" fill="#1a1a2e" />
      {[215,290,490,565].map(x=><rect key={x} x={x} y="90" width="30" height="310" fill="#252540" />)}
      <rect x="160" y="340" width="480" height="20" fill="#252540" />
      <rect x="140" y="360" width="520" height="20" fill="#2a2a45" />
      <rect x="120" y="380" width="560" height="20" fill="#2f2f50" />
      <circle cx="400" cy="220" r="48" fill="#f9e547" opacity="0.6" />
    </svg>
  ),
  museum: (
    <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{width:"100%",height:"100%",position:"absolute",top:0,left:0}}>
      <rect width="800" height="400" fill="#060610" />
      <rect x="40" y="40" width="720" height="320" fill="#0a0a1a" stroke="#1a1a33" strokeWidth="2" />
      <rect x="80" y="120" width="100" height="160" fill="#111122" stroke="#222244" strokeWidth="1.5" />
      <rect x="240" y="120" width="100" height="160" fill="#111122" stroke="#222244" strokeWidth="1.5" />
      <rect x="480" y="200" width="130" height="80" fill="#1a1a33" stroke="#333355" strokeWidth="2" />
      <text x="545" y="248" textAnchor="middle" fontSize="14" fill="#444">EMPTY</text>
      <circle cx="400" cy="30" r="100" fill="#f9e547" opacity="0.03" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════
   CHARACTER CONFIG
   ═══════════════════════════════════════════ */
const CN = {WRIGHT:"Phoenix Wright",FALLACIOUS:"Prosecutor Fallacious",JUDGE:"Judge Gullible III",LARRY:"Larry Butts",NARRATOR:"",
  BRENDA:"Brenda Nosybody",CHAD:"Chad Mainstream",LOOPSWORTH:"Prof. Loopsworth",WILLOW:"Willow Earthchild",
  "DR. VON STUFFINGTON":"Dr. Von Stuffington","???":"???"};
const CC = {WRIGHT:"#5ba4e6",FALLACIOUS:"#e85555",JUDGE:"#e8b84a",LARRY:"#5be87a",
  BRENDA:"#c48ae8",CHAD:"#e88aab",LOOPSWORTH:"#8ac4e8",WILLOW:"#8ae88a",
  "DR. VON STUFFINGTON":"#e8c48a","???":"#666"};


/* ═══════════════════════════════════════════
   GAME DATA — all 20 questions
   ═══════════════════════════════════════════ */
const D = [
  {type:"text",bg:"office",lines:[
    {s:"NARRATOR",t:"— FALLACY WRIGHT: ACE LOGICIAN —"},{s:"NARRATOR",t:"\"The Case of the Colossal Duck\""},
    {s:"NARRATOR",t:"[Interior: Wright's Law Office. Papers everywhere. A philosophy textbook is being used as a monitor stand.]"},
    {s:"WRIGHT",t:"(Another quiet day at the office. No cases. No clients. Just me and my dog-eared copy of \"Aristotle's Greatest Hits.\")"},
    {s:"NARRATOR",t:"[PHONE RINGS]"},
    {s:"WRIGHT",t:"Wright & Associates, Attorneys at— yes, it's just me. The \"Associates\" is aspirational."},
    {s:"LARRY",t:"NICK! NICK, YOU GOTTA HELP ME! THEY'RE SAYING I STOLE A RUBBER DUCK!"},
    {s:"WRIGHT",t:"Larry, how big of a rubber duck are we talking?"},
    {s:"LARRY",t:"...Fourteen feet tall. But NICK, I DIDN'T DO IT! I was at the aquarium trying to teach a sea otter to high-five!"},
    {s:"WRIGHT",t:"...That checks out. I'll take the case."},
  ]},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— ACT 1: TRIAL BEGINS —"},
    {s:"NARRATOR",t:"[Interior: Courtroom 4. The gallery is packed. Someone holds a \"FREE LARY\" sign.]"},
    {s:"JUDGE",t:"Court is now in session for the trial of Larry Butts, accused of the theft of \"Sir Quacks-a-Lot,\" the 14-foot rubber duck. Is the prosecution ready?"},
    {s:"FALLACIOUS",t:"The prosecution was BORN ready, Your Honor. We will prove that Larry Butts is a thief, a scoundrel, and a man who once returned a library book three weeks late."},
    {s:"WRIGHT",t:"Objection! What does a library book have to do with duck theft?!"},
    {s:"FALLACIOUS",t:"Everything, Wright. A man who disrespects the library clearly disrespects ALL institutions. Including museums."},
    {s:"JUDGE",t:"Hmm, that does sound logical..."},
    {s:"WRIGHT",t:"(It absolutely does NOT sound logical. Time to call it out!)"},
  ]},
  {type:"question",id:1,bg:"courtroom",prompt:"The prosecutor is attacking Larry's character (late library book) instead of addressing whether he stole the duck. What fallacy is this?",options:["Straw Man","Ad Hominem","Red Herring","Appeal to Authority"],correct:1,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's an Ad Hominem fallacy! You're attacking my client's character instead of providing evidence! A late library book doesn't make someone a duck thief!"},{s:"FALLACIOUS",t:"Tch... lucky guess, Wright."},{s:"JUDGE",t:"Sustained! The prosecution will stick to the matter at hand."}],
    wrong:{0:"A Straw Man misrepresents your argument. Here, Fallacious attacks Larry's character. That's Ad Hominem.",2:"A Red Herring distracts from the issue. The specific move here is attacking Larry's character. That's Ad Hominem.",3:"An Appeal to Authority cites an authority figure. This is Ad Hominem — personal attack instead of evidence."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— The First Witness —"},
    {s:"NARRATOR",t:"[A woman in an oversized security uniform takes the stand. Her badge says \"HEAD OF SECURTIY.\"]"},
    {s:"FALLACIOUS",t:"Ms. Nosybody, what did you see on the night of the theft?"},
    {s:"BRENDA",t:"I saw a man-shaped shadow near the duck exhibit. And then the duck was gone! So obviously, that shadow was the thief!"},
    {s:"WRIGHT",t:"Objection! Just because the shadow appeared before the duck disappeared doesn't mean the shadow CAUSED it!"},
    {s:"BRENDA",t:"But the shadow was there, and THEN the duck was gone! First one thing, then the other!"},
    {s:"WRIGHT",t:"(Hold on... something about that logic doesn't add up.)"},
  ]},
  {type:"question",id:2,bg:"courtroom",prompt:"Brenda assumes the shadow caused the theft because one event followed the other. What fallacy is this?",options:["Hasty Generalization","Slippery Slope","False Cause (Post Hoc)","Circular Reasoning"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's the Post Hoc fallacy — \"after this, therefore because of this!\" By that logic, the sunset caused the theft too!"},{s:"BRENDA",t:"Well... I never thought about the sunset..."},{s:"JUDGE",t:"The witness will refrain from accusing celestial events."}],
    wrong:{0:"Hasty Generalization draws broad conclusions from few examples. Brenda assumes sequence = causation. That's False Cause (Post Hoc).",1:"Slippery Slope chains events into extreme consequences. Brenda's error is assuming sequence = causation. That's False Cause.",3:"Circular Reasoning restates the conclusion as premise. Brenda assumes one event caused another because it came first. That's False Cause."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— Fallacious Doubles Down —"},
    {s:"FALLACIOUS",t:"Your Honor, EVERYONE in this city believes Larry is guilty. I polled my mother's book club. Twelve out of twelve agreed!"},
    {s:"WRIGHT",t:"You polled twelve elderly women at a book club and you're calling that \"everyone\"?"},
    {s:"FALLACIOUS",t:"Twelve is a very robust sample size, Wright. That's practically a census."},
    {s:"WRIGHT",t:"(A book club is not a census. Something's seriously wrong with that reasoning...)"},
  ]},
  {type:"question",id:3,bg:"courtroom",prompt:"Fallacious draws a massive conclusion (\"everyone agrees\") from 12 book club members. What fallacy?",options:["Appeal to Popularity","Hasty Generalization","False Dilemma","Appeal to Authority"],correct:1,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's a Hasty Generalization! Twelve people at a book club is NOT the entire city!"},{s:"FALLACIOUS",t:"They also had scones. Very persuasive scones."},{s:"JUDGE",t:"The court does not recognize scones as evidence. Sustained!"}],
    wrong:{0:"Appeal to Popularity argues something is TRUE because many believe it. Fallacious isn't citing real consensus — he's generalizing from 12 people. That's Hasty Generalization.",2:"False Dilemma presents only two options. The error is generalizing from 12 people. That's Hasty Generalization.",3:"Appeal to Authority cites an expert. His mother's book club isn't the Supreme Court. That's Hasty Generalization."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— ACT 2: DEEPER INTO THE MUCK —"},
    {s:"NARRATOR",t:"[Fallacious dims the lights. A spotlight falls on him. Violin music plays from somewhere.]"},
    {s:"FALLACIOUS",t:"Imagine a child. A small child. She walks to where Sir Quacks-a-Lot used to be... nothing. Her eyes fill with tears. She whispers... \"Where's the ducky?\""},
    {s:"NARRATOR",t:"[Fallacious wipes away a single tear]"},
    {s:"FALLACIOUS",t:"Can you let the man who made that child cry go free?"},
    {s:"JUDGE",t:"[Openly sobbing] That poor child...!"},
    {s:"WRIGHT",t:"(Oh come ON. There's no actual evidence here — just theatrics! I need to call this out.)"},
  ]},
  {type:"question",id:4,bg:"courtroom",prompt:"Fallacious uses an emotional story about a fictional crying child instead of evidence. What fallacy?",options:["Ad Hominem","Straw Man","Appeal to Emotion","Loaded Question"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's an Appeal to Emotion! You're trying to make the court FEEL instead of THINK!"},{s:"FALLACIOUS",t:"She has a name, Wright. It's... Tearesa. Tearesa Saddington."},{s:"JUDGE",t:"The prosecution will present evidence, not screenplays."}],
    wrong:{0:"Ad Hominem attacks the person. Fallacious is tugging heartstrings. That's Appeal to Emotion.",1:"Straw Man distorts an argument. Fallacious bypasses arguments with a sob story. That's Appeal to Emotion.",3:"Loaded Question bakes in a false assumption. Fallacious is using emotional manipulation. That's Appeal to Emotion."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— The Expert Witness —"},
    {s:"NARRATOR",t:"[A man in a lab coat covered in fish stickers takes the stand.]"},
    {s:"FALLACIOUS",t:"The prosecution calls Dr. Von Stuffington III, world-renowned... marine biologist!"},
    {s:"WRIGHT",t:"Objection! What does a marine biologist have to do with a rubber duck theft?"},
    {s:"FALLACIOUS",t:"He has a PhD, Wright. A PhD! Are you saying you know more than a man with a DOCTORATE?"},
    {s:"DR. VON STUFFINGTON",t:"In my professional opinion, ducks — rubber or otherwise — fall within my expertise. The defendant is guilty."},
    {s:"WRIGHT",t:"(Wait a minute... since when does studying fish qualify you to judge criminal cases?)"},
  ]},
  {type:"question",id:5,bg:"courtroom",prompt:"Fallacious cites a marine biologist as an authority on criminal guilt. What fallacy?",options:["False Cause","Bandwagon","Circular Reasoning","Appeal to Authority"],correct:3,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's an Appeal to Authority! Having a PhD in fish doesn't make you an expert on crime!"},{s:"DR. VON STUFFINGTON",t:"To be fair, I mostly study barnacles."},{s:"JUDGE",t:"The barnacle expert's opinion on criminal guilt is stricken from the record."}],
    wrong:{0:"False Cause confuses correlation with causation. Fallacious cites credentials from an irrelevant field. That's Appeal to Authority.",1:"Bandwagon argues something is true because many believe it. Only one person is cited — the wrong kind of expert. That's Appeal to Authority.",2:"Circular Reasoning restates the conclusion as premise. Fallacious cites an expert from the wrong field. That's Appeal to Authority."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— The Security Footage —"},
    {s:"FALLACIOUS",t:"We have security footage showing a van leaving at midnight."},
    {s:"WRIGHT",t:"And? What does that prove?"},
    {s:"FALLACIOUS",t:"Since we can't prove it WASN'T Larry's van, it obviously WAS Larry's van!"},
    {s:"WRIGHT",t:"(That's not how proof works! There's a serious logical problem with that argument...)"},
  ]},
  {type:"question",id:6,bg:"courtroom",prompt:"Fallacious claims the van must be Larry's because they can't prove it ISN'T. What fallacy?",options:["False Dilemma","Appeal to Ignorance","Equivocation","Straw Man"],correct:1,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's an Appeal to Ignorance! You can't claim something is true just because it hasn't been proven false! By that logic, the van could belong to Bigfoot!"},{s:"JUDGE",t:"Is... is Bigfoot a suspect now?"},{s:"WRIGHT",t:"NO, Your Honor. That's the point."}],
    wrong:{0:"While Fallacious sets up a binary, the core error is absence of disproof = proof. That's Appeal to Ignorance.",2:"Equivocation switches word meanings. Fallacious treats \"not disproven\" as \"proven.\" That's Appeal to Ignorance.",3:"Straw Man misrepresents an argument. Fallacious claims inability to disprove = proof. That's Appeal to Ignorance."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— Doomsday Prophecy —"},
    {s:"FALLACIOUS",t:"If we let Larry walk free, people will steal ducks. Then exhibits. Then ENTIRE MUSEUMS. Society will collapse. We'll be in caves fighting over beans!"},
    {s:"WRIGHT",t:"(We've gone from duck theft to cave-dwelling bean wars. What a journey.)"},
  ]},
  {type:"question",id:7,bg:"courtroom",prompt:"Fallacious argues acquitting Larry will lead to total societal collapse through absurd escalation. What fallacy?",options:["False Cause","Appeal to Emotion","Slippery Slope","Hasty Generalization"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's a Slippery Slope! Acquitting one man will NOT lead to cave-dwelling bean wars!"},{s:"FALLACIOUS",t:"When you're in a cave fighting me for beans, you'll remember this moment."},{s:"JUDGE",t:"The prosecution will stop predicting the apocalypse."}],
    wrong:{0:"False Cause mistakes correlation for causation. Fallacious creates an escalating chain without justification. That's Slippery Slope.",1:"While bean wars IS emotionally charged, the core structure is escalating consequences. That's Slippery Slope.",3:"Hasty Generalization draws conclusions from small samples. Fallacious constructs a chain of doom. That's Slippery Slope."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— ACT 3: THE PLOT THICKENS —"},
    {s:"WRIGHT",t:"My client has an alibi. He was at the aquarium teaching a sea otter to high-five."},
    {s:"FALLACIOUS",t:"An alibi at an aquarium? For a man accused of stealing a WATER-RELATED object? That PROVES he's obsessed with water things!"},
    {s:"WRIGHT",t:"(He just took my alibi and turned it into something completely different! That's not what I argued!)"},
  ]},
  {type:"question",id:8,bg:"courtroom",prompt:"Fallacious takes Wright's alibi (aquarium) and twists it into \"proof\" of a water obsession. What fallacy?",options:["Straw Man","Red Herring","Tu Quoque","False Dilemma"],correct:0,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's a Straw Man! I presented the aquarium as an ALIBI. You twisted it into \"evidence of a water obsession\"!"},{s:"FALLACIOUS",t:"So you ADMIT he was near water!"},{s:"WRIGHT",t:"We're ALL near water. We're 60% water. That's not an argument."},{s:"JUDGE",t:"The prosecution will stop prosecuting the concept of water."}],
    wrong:{1:"Red Herring introduces a new topic. Fallacious is DISTORTING Wright's argument. That's Straw Man.",2:"Tu Quoque deflects with hypocrisy. Fallacious isn't saying \"you do it too.\" He's distorting the alibi. That's Straw Man.",3:"False Dilemma limits choices. Fallacious is warping Wright's argument. That's Straw Man."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— Wright's Objection Gets Redirected —"},
    {s:"WRIGHT",t:"The prosecution has presented no physical evidence linking Larry to the crime!"},
    {s:"FALLACIOUS",t:"Speaking of physical, did you know the museum renovated its gift shop? Italian marble. Postcards are two for one!"},
    {s:"JUDGE",t:"Oh, really? My wife loves postcards..."},
    {s:"WRIGHT",t:"(Wait — what does ANY of this have to do with the case?!)"},
  ]},
  {type:"question",id:9,bg:"courtroom",prompt:"Fallacious responds to Wright's demand for evidence by talking about postcards. What fallacy?",options:["Appeal to Emotion","Equivocation","Red Herring","Circular Reasoning"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's a Red Herring! I asked about evidence, and you started talking about postcards!"},{s:"FALLACIOUS",t:"The postcards ARE two for one, though."},{s:"JUDGE",t:"Do you have any physical evidence?"},{s:"FALLACIOUS",t:"...I have a postcard of evidence."},{s:"JUDGE",t:"That's not a thing."}],
    wrong:{0:"Appeal to Emotion uses feelings. The real problem is it's completely irrelevant. That's Red Herring.",1:"Equivocation exploits word meanings. Fallacious is completely changing the subject. That's Red Herring.",3:"Circular Reasoning restates conclusion as premise. Fallacious is bolting from the topic. That's Red Herring."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— The Napkin Incident —"},
    {s:"WRIGHT",t:"The prosecution has been making baseless claims! You've presented no real evidence!"},
    {s:"FALLACIOUS",t:"RICH coming from YOU! Didn't you argue a case last month with nothing but a napkin sketch and a \"gut feeling\"?!"},
    {s:"WRIGHT",t:"(He's deflecting my criticism by pointing out something I did in a different case. Even if I DID argue with a napkin... that doesn't make his lack of evidence okay!)"},
  ]},
  {type:"question",id:10,bg:"courtroom",prompt:"Fallacious deflects Wright's criticism by pointing out Wright also once lacked evidence. What fallacy?",options:["Ad Hominem","Tu Quoque (Appeal to Hypocrisy)","False Cause","Straw Man"],correct:1,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's Tu Quoque — the \"you too\" fallacy! Even if I DID argue with a napkin, that doesn't make YOUR lack of evidence acceptable!"},{s:"FALLACIOUS",t:"It was a very detailed napkin, from what I heard."},{s:"WRIGHT",t:"That's... not the point!"}],
    wrong:{0:"Close! Ad Hominem attacks character generally. This is more specific — \"well YOU do it too!\" That's Tu Quoque.",2:"False Cause confuses correlation with causation. Fallacious says Wright's past excuses his own. That's Tu Quoque.",3:"Straw Man distorts an argument. Fallacious dodges by saying \"you're a hypocrite!\" That's Tu Quoque."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— Two Options, Take It or Leave It —"},
    {s:"FALLACIOUS",t:"Either Larry stole that duck, or the duck evaporated into thin air. Those are the only two options!"},
    {s:"WRIGHT",t:"(Evaporated? A fourteen-foot rubber duck? He's pretending there are only two possibilities!)"},
  ]},
  {type:"question",id:11,bg:"courtroom",prompt:"Fallacious presents only two options (Larry did it OR the duck evaporated). What fallacy?",options:["Appeal to Ignorance","Slippery Slope","False Dilemma","Hasty Generalization"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! False Dilemma! Someone ELSE could have stolen it! It could have been moved for maintenance!"},{s:"FALLACIOUS",t:"Can you PROVE it didn't evaporate?"},{s:"WRIGHT",t:"It's a fourteen-foot duck made of industrial vinyl!"},{s:"JUDGE",t:"The court accepts that ducks do not evaporate. Sustained."}],
    wrong:{0:"Appeal to Ignorance says \"not disproven = true.\" Fallacious limits options to just two. That's False Dilemma.",1:"Slippery Slope chains events into extremes. Fallacious forces a binary choice. That's False Dilemma.",3:"Hasty Generalization draws broad conclusions from few examples. Fallacious forces a binary. That's False Dilemma."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— ACT 4: THE WITNESSES RETURN —"},
    {s:"NARRATOR",t:"[New witness: CHAD MAINSTREAM. 2.3 million followers. Sunglasses indoors.]"},
    {s:"FALLACIOUS",t:"Mr. Mainstream, what is the public's view?"},
    {s:"CHAD",t:"Bro, EVERYONE on social media thinks Larry did it. 47,000 likes. #DuckThief has its own emoji. If everyone thinks he's guilty, he's guilty. That's just math."},
    {s:"WRIGHT",t:"(47,000 likes is not a legal verdict!)"},
  ]},
  {type:"question",id:12,bg:"courtroom",prompt:"Chad argues Larry must be guilty because the opinion is popular on social media. What fallacy?",options:["Hasty Generalization","Appeal to Authority","Bandwagon (Ad Populum)","Appeal to Emotion"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's the Bandwagon fallacy! Something isn't true just because it's popular!"},{s:"CHAD",t:"Bro, are you saying likes don't matter?"},{s:"WRIGHT",t:"In a court of law? CORRECT."},{s:"CHAD",t:"[Existential crisis]"}],
    wrong:{0:"Hasty Generalization is about small samples. Chad cites LARGE popular opinion. That's Bandwagon.",1:"Appeal to Authority cites an expert. Chad cites the masses. That's Bandwagon.",3:"Appeal to Emotion plays on feelings. Chad says it's true because it's popular. That's Bandwagon."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— The Trustworthy Witness —"},
    {s:"NARRATOR",t:"[New witness: PROFESSOR LOOPSWORTH, professor of Logic at... somewhere.]"},
    {s:"FALLACIOUS",t:"Professor, why should we trust your testimony?"},
    {s:"LOOPSWORTH",t:"Because I am a trustworthy witness."},
    {s:"WRIGHT",t:"And how do we know you're trustworthy?"},
    {s:"LOOPSWORTH",t:"Because everything I say is true."},
    {s:"WRIGHT",t:"And how do we know everything you say is true?"},
    {s:"LOOPSWORTH",t:"Because I am a trustworthy witness."},
    {s:"WRIGHT",t:"(Wait... did he just... I feel like I'm on a merry-go-round.)"},
  ]},
  {type:"question",id:13,bg:"courtroom",prompt:"Loopsworth: \"I'm trustworthy because I tell the truth, and I tell the truth because I'm trustworthy.\" What fallacy?",options:["Appeal to Authority","Red Herring","Equivocation","Circular Reasoning"],correct:3,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's Circular Reasoning! Your conclusion IS your premise! It's a logical carousel!"},{s:"LOOPSWORTH",t:"My circular reasoning is the most reliable form of reasoning."},{s:"WRIGHT",t:"That's... also circular."},{s:"LOOPSWORTH",t:"And therefore reliable!"},{s:"JUDGE",t:"The witness is excused before the court gets dizzy."}],
    wrong:{0:"Appeal to Authority cites credentials. Loopsworth's argument feeds back into itself. That's Circular Reasoning.",1:"Red Herring introduces an unrelated topic. Loopsworth IS addressing the question — by restating his conclusion. That's Circular Reasoning.",2:"Equivocation switches word meanings. Loopsworth is stuck in a logical loop. That's Circular Reasoning."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— The Crystal Lady —"},
    {s:"NARRATOR",t:"[New witness: WILLOW EARTHCHILD. She is holding a crystal.]"},
    {s:"WILLOW",t:"In nature, ducks roam free. A rubber duck locked in a museum is against the natural order. If it's natural for ducks to be free, then freeing even a rubber duck can't be wrong!"},
    {s:"WRIGHT",t:"(That reasoning is deeply flawed... but what exactly is she doing wrong here?)"},
  ]},
  {type:"question",id:14,bg:"courtroom",prompt:"Willow argues freeing the duck is acceptable because ducks are \"naturally\" free. What fallacy?",options:["False Cause","Straw Man","Appeal to Nature","Slippery Slope"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's an Appeal to Nature! Just because something is natural doesn't make it morally right! Vaccines are artificial! Sewage systems are artificial!"},{s:"WILLOW",t:"But my crystals say—"},{s:"WRIGHT",t:"The crystals are not admissible."},{s:"JUDGE",t:"The crystals are indeed not admissible. Sustained."}],
    wrong:{0:"False Cause confuses correlation with causation. Willow equates natural = morally good. That's Appeal to Nature.",1:"Straw Man misrepresents an argument. Willow is making her own bad argument. That's Appeal to Nature.",3:"Slippery Slope predicts extreme consequences. Willow equates \"natural\" with \"good.\" That's Appeal to Nature."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— One Last Question —"},
    {s:"FALLACIOUS",t:"Mr. Butts, just one question. When did you STOP planning to steal the duck?"},
    {s:"LARRY",t:"Wha— I never STARTED planning to steal it!"},
    {s:"FALLACIOUS",t:"So you admit there was a TIME when you hadn't stopped yet!"},
    {s:"LARRY",t:"WHAT?! NO! Nick, HELP!"},
    {s:"WRIGHT",t:"(Wait — that question is rigged! No matter how Larry answers, he sounds guilty!)"},
  ]},
  {type:"question",id:15,bg:"courtroom",prompt:"\"When did you STOP planning to steal the duck?\" — assumes Larry WAS planning. What fallacy?",options:["False Dilemma","Loaded Question","Appeal to Ignorance","Circular Reasoning"],correct:1,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's a Loaded Question! It presupposes my client was planning the theft!"},{s:"JUDGE",t:"Sustained! Ask questions that don't contain their own verdicts."},{s:"FALLACIOUS",t:"Fine. Did the defendant steal the duck yes or absolutely?"},{s:"WRIGHT",t:"THAT'S ALSO A LOADED QUESTION!"}],
    wrong:{0:"False Dilemma presents only two options. The trick is it presupposes planning. That's Loaded Question.",2:"Appeal to Ignorance says \"can't disprove = true.\" The question hides a false assumption. That's Loaded Question.",3:"Circular Reasoning uses conclusion as premise. The technique is embedding a false premise in a question. That's Loaded Question."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— ACT 5: THE FINAL STRETCH —"},
    {s:"NARRATOR",t:"— The Moving Goalposts —"},
    {s:"FALLACIOUS",t:"No REAL security expert believes the museum's system could be breached."},
    {s:"WRIGHT",t:"I have testimony from three experts who say the locks were laughably easy to pick."},
    {s:"FALLACIOUS",t:"Well, no TRUE security expert would say that."},
    {s:"WRIGHT",t:"They have thirty years of combined experience."},
    {s:"FALLACIOUS",t:"They're clearly not REAL experts then."},
    {s:"WRIGHT",t:"(Every time I present a qualified expert, he just... changes the rules! There's a name for this...)"},
  ]},
  {type:"question",id:16,bg:"courtroom",prompt:"\"No real expert would disagree\" — then when experts DO disagree, he says they're not real experts. What fallacy?",options:["Ad Hominem","Appeal to Authority","Hasty Generalization","No True Scotsman"],correct:3,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's the No True Scotsman fallacy! You redefined \"real expert\" to exclude anyone who disagrees!"},{s:"FALLACIOUS",t:"No true prosecutor would accept that objection."},{s:"WRIGHT",t:"You're DOING IT AGAIN!"},{s:"JUDGE",t:"Sustained, and the prosecution is warned against recursive fallacies."}],
    wrong:{0:"Ad Hominem attacks the person. Fallacious is redefining the category. That's No True Scotsman.",1:"Appeal to Authority uses a wrong-field expert. Fallacious DISMISSES valid experts by moving goalposts. That's No True Scotsman.",2:"Hasty Generalization draws broad conclusions from few examples. Fallacious retroactively changes the definition. That's No True Scotsman."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— No Reservations —"},
    {s:"FALLACIOUS",t:"The defendant had no RESERVATIONS about visiting the museum that night."},
    {s:"WRIGHT",t:"Larry couldn't visit — he never made a reservation, and it was a private event."},
    {s:"FALLACIOUS",t:"AH HA! No RESERVATIONS! No hesitations! He went in with full confidence and criminal intent!"},
    {s:"WRIGHT",t:"(Hold on — did he just pull a linguistic magic trick?! Something fishy happened with that word...)"},
  ]},
  {type:"question",id:17,bg:"courtroom",prompt:"Fallacious uses \"no reservations\" to mean \"no booking\" first, then \"no hesitation.\" What fallacy?",options:["Straw Man","Red Herring","Equivocation","Loaded Question"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! That's Equivocation! You used \"reservations\" with two different meanings!"},{s:"FALLACIOUS",t:"I have no reservations about my use of the word \"reservations.\""},{s:"WRIGHT",t:"STOP THAT."},{s:"JUDGE",t:"Sustained. The English language thanks you, Mr. Wright."}],
    wrong:{0:"Straw Man distorts an argument. Fallacious plays a word game with double meanings. That's Equivocation.",1:"Red Herring introduces irrelevant topic. Fallacious IS on topic — cheating with word meanings. That's Equivocation.",3:"Loaded Question smuggles in an assumption. Fallacious uses one word with two meanings. That's Equivocation."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— The Molecular Defense —"},
    {s:"FALLACIOUS",t:"Every molecule in the rubber duck weighs almost nothing. Therefore, the duck itself weighs almost nothing! A crime involving a weightless object is minor!"},
    {s:"WRIGHT",t:"(Did he seriously just argue a 14-foot duck is weightless?! That logic is broken in a very specific way...)"},
  ]},
  {type:"question",id:18,bg:"courtroom",prompt:"Because each molecule weighs almost nothing, the whole duck weighs almost nothing. What fallacy?",options:["False Cause","Appeal to Nature","Fallacy of Composition","Hasty Generalization"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! Fallacy of Composition! You can't assume what's true of parts is true of the whole! The duck weighs over 200 pounds!"},{s:"FALLACIOUS",t:"But each molecule—"},{s:"WRIGHT",t:"THERE ARE TRILLIONS OF MOLECULES!"},{s:"JUDGE",t:"Sustained. Weight is cumulative. The court thanks physics."}],
    wrong:{0:"False Cause confuses correlation with causation. Fallacious says parts' properties = whole. That's Fallacy of Composition.",1:"Appeal to Nature equates natural with good. Fallacious makes a structural error — parts ≠ whole. That's Fallacy of Composition.",3:"Hasty Generalization draws broad conclusions. This is parts ≠ whole. That's Fallacy of Composition."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— Prove It Yourself —"},
    {s:"WRIGHT",t:"The prosecution has no fingerprints, no DNA, no video, no motive. I move for dismissal."},
    {s:"FALLACIOUS",t:"Oh no, Wright. The DEFENSE has to prove Larry DIDN'T steal the duck!"},
    {s:"WRIGHT",t:"(Wait — since when is it MY job to prove he DIDN'T do it?! That's completely backwards!)"},
  ]},
  {type:"question",id:19,bg:"courtroom",prompt:"Fallacious demands Wright prove Larry's innocence rather than proving guilt himself. What fallacy?",options:["Appeal to Ignorance","False Dilemma","Shifting the Burden of Proof","Tu Quoque"],correct:2,
    correctScene:[{s:"WRIGHT",t:"OBJECTION! You're Shifting the Burden of Proof! YOU claim Larry is guilty, so YOU need the evidence!"},{s:"FALLACIOUS",t:"Can you prove I'm shifting the burden of proof?"},{s:"WRIGHT",t:"Yes! You literally just demonstrated it in real-time!"},{s:"JUDGE",t:"Sustained. That's... how trials work."}],
    wrong:{0:"Appeal to Ignorance says \"can't disprove = true.\" Burden of Proof is about demanding the OTHER side prove YOUR claim.",1:"False Dilemma limits options. Fallacious demands Wright prove innocence instead of proving guilt. That's Shifting the Burden of Proof.",3:"Tu Quoque deflects with \"you do it too.\" Fallacious is making Wright do HIS job. That's Shifting the Burden of Proof."}},
  {type:"text",bg:"courtroom",lines:[
    {s:"NARRATOR",t:"— THE FINAL ARGUMENT —"},
    {s:"NARRATOR",t:"[The courtroom is tense. Fallacious adjusts his cravat.]"},
    {s:"FALLACIOUS",t:"My entire case proves Larry is guilty. How do I know? Because it proves Larry is guilty. And we know Larry is guilty... because my case proves it!"},
    {s:"NARRATOR",t:"[Long pause]"},
    {s:"WRIGHT",t:"(His closing argument is... wait. Is there actually an argument IN there? It just goes around and around...)"},
  ]},
  {type:"question",id:20,bg:"courtroom",prompt:"FINAL QUESTION: \"My case proves guilt because it proves guilt.\" His conclusion IS his premise. What fallacy?",options:["Appeal to Authority","Red Herring","False Cause","Circular Reasoning"],correct:3,
    correctScene:[{s:"WRIGHT",t:"OBJECTION!! That's Circular Reasoning — AGAIN! It's turtles all the way down!"},{s:"FALLACIOUS",t:"I... that... the evidence clearly..."},{s:"WRIGHT",t:"You have NO evidence, NO credible witnesses, and your entire case is built on logical fallacies! I move for full dismissal!"},{s:"JUDGE",t:"The defense's motion is GRANTED. All charges are DISMISSED!"},{s:"NARRATOR",t:"[Crowd erupts. Larry jumps up and down. Confetti falls from somewhere.]"}],
    wrong:{0:"Appeal to Authority cites an expert. Fallacious is going in circles. That's Circular Reasoning.",1:"Red Herring is a distracting topic. Fallacious's argument eats its own tail. That's Circular Reasoning.",2:"False Cause confuses correlation with causation. Fallacious restates his conclusion as evidence. That's Circular Reasoning."}},
  {type:"text",bg:"exterior",lines:[
    {s:"NARRATOR",t:"— EPILOGUE —"},
    {s:"NARRATOR",t:"[Exterior: Courthouse steps. Sunset.]"},
    {s:"LARRY",t:"NICK! You did it! I'm free!"},
    {s:"WRIGHT",t:"The truth matters because of evidence and valid reasoning. Not because it FEELS right or because everyone SAYS so."},
    {s:"LARRY",t:"...That's beautiful, Nick."},
    {s:"WRIGHT",t:"Thanks, Larry."},
    {s:"LARRY",t:"Wanna go to the aquarium? I almost had that otter high-five down."},
    {s:"WRIGHT",t:"...Sure, Larry. Sure."},
    {s:"NARRATOR",t:"[They walk off into the sunset]"},
  ]},
  {type:"text",bg:"museum",lines:[
    {s:"NARRATOR",t:"— POST-CREDITS SCENE —"},
    {s:"NARRATOR",t:"[Interior: Museum. Night. A shadowy figure loads a massive rubber duck onto a truck.]"},
    {s:"???",t:"[Into walkie-talkie] This is Agent Quack. The duck is in transit. Proceeding to Phase Two."},
    {s:"NARRATOR",t:"[The figure steps into the light. It's JUDGE GULLIBLE.]"},
    {s:"JUDGE",t:"They'll never suspect the judge. After all... no TRUE judge would steal a duck."},
    {s:"NARRATOR",t:"[Winks at camera. Screen goes black.]"},
    {s:"NARRATOR",t:"FALLACY WRIGHT WILL RETURN IN: \"THE STRAW MAN COMETH\""},
  ]},
];


/* ═══════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════ */
const css = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
.fw{font-family:'Crimson Text',Georgia,serif;background:#0a0a14;color:#e0ddd5;width:100%;height:100vh;display:flex;flex-direction:column;overflow:hidden;position:relative;user-select:none}
.fw-ts{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 60%,#1a1028,#0a0a14 70%);z-index:100}
.fw-tl{font-family:'Cinzel',serif;font-size:clamp(28px,7vw,52px);font-weight:900;color:#e8b84a;text-shadow:0 0 30px rgba(232,184,74,.4),0 4px 0 #8b6914;letter-spacing:3px;text-align:center;animation:tp 3s ease-in-out infinite}
.fw-tsub{font-family:'Cinzel',serif;font-size:clamp(12px,2.5vw,18px);color:#8a8aaa;letter-spacing:6px;margin-top:8px;text-transform:uppercase}
.fw-tc{font-size:clamp(14px,2.5vw,20px);color:#c0b89a;font-style:italic;margin-top:24px}
.fw-sb{margin-top:48px;padding:14px 48px;font-family:'Cinzel',serif;font-size:16px;font-weight:700;letter-spacing:3px;color:#0a0a14;background:#e8b84a;border:none;cursor:pointer;text-transform:uppercase;transition:all .2s;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
.fw-sb:hover{background:#f0cc6a;transform:scale(1.05)}
.fw-sb2{margin-top:0;padding:10px 36px;font-family:'Cinzel',serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#8a8aaa;background:transparent;border:1px solid #8a8aaa44;cursor:pointer;text-transform:uppercase;transition:all .2s;clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)}
.fw-sb2:hover{color:#e8b84a;border-color:#e8b84a44;transform:scale(1.05)}
.fw-gv{font-size:72px;margin-bottom:16px;animation:gb 2s ease-in-out infinite}
@keyframes tp{0%,100%{text-shadow:0 0 30px rgba(232,184,74,.4),0 4px 0 #8b6914}50%{text-shadow:0 0 50px rgba(232,184,74,.7),0 4px 0 #8b6914}}
@keyframes gb{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}}
.fw-hd{height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#0d0d1a;border-bottom:2px solid #e8b84a33;z-index:20;flex-shrink:0}
.fw-ht{font-family:'Cinzel',serif;font-size:clamp(10px,1.6vw,12px);font-weight:700;color:#e8b84a;letter-spacing:2px}
.fw-hs{font-size:13px;font-weight:600;color:#e8b84a}
.fw-pb{position:absolute;top:36px;left:0;right:0;height:3px;background:#1a1a2e;z-index:21}
.fw-pbr{height:100%;background:linear-gradient(90deg,#e8b84a,#5ba4e6);transition:width .5s ease}
.fw-sc{flex:1;position:relative;overflow:hidden;display:flex;flex-direction:column}
.fw-bg{position:absolute;inset:0;opacity:.45}
/* SINGLE LARGE PORTRAIT — PW style */
.fw-ch{position:absolute;bottom:140px;left:50%;transform:translateX(-50%);z-index:5;width:clamp(180px,40vw,280px);transition:all .3s ease;filter:drop-shadow(0 8px 24px rgba(0,0,0,.6))}
.fw-ch.obj{animation:portraitSlam .4s ease-out;z-index:8;bottom:-10px;left:5%;transform:translateX(0);width:clamp(280px,60vw,720px);filter:drop-shadow(0 12px 40px rgba(0,0,0,.8))}
@keyframes portraitSlam{0%{transform:scale(1.15);opacity:0.7}40%{transform:scale(.97);opacity:1}100%{transform:scale(1)}}
/* DIALOGUE BOX — PW style bottom panel */
.fw-dl{position:absolute;bottom:0;left:0;right:0;z-index:10;background:linear-gradient(180deg,rgba(10,10,20,.95),rgba(5,5,12,.98));border-top:3px solid #e8b84a;min-height:130px;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-start}
.fw-di{padding:12px 24px 18px;max-width:700px;margin:0 auto;width:100%}
.fw-np{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.fw-sn{font-family:'Cinzel',serif;font-size:clamp(11px,1.6vw,14px);font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:2px 10px;border:1px solid;border-radius:2px}
.fw-dt{font-size:clamp(15px,2.4vw,19px);line-height:1.65;min-height:52px}
.fw-dt.n{font-style:italic;color:#8a8aaa;font-size:clamp(14px,2vw,16px)}
.fw-dt.th{color:#7a9ec4;font-style:italic}
.fw-ah{position:absolute;bottom:8px;right:20px;font-size:12px;color:#555;animation:bl 1.2s step-end infinite}
@keyframes bl{0%,100%{opacity:1}50%{opacity:0}}
/* OBJECTION */
.fw-ob{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:flex-end;padding-top:10%;padding-right:8%;z-index:50;pointer-events:none;background:radial-gradient(ellipse at 70% 25%,rgba(200,40,40,.25),transparent 60%)}
.fw-ot{font-family:'Cinzel',serif;font-size:clamp(36px,10vw,72px);font-weight:900;color:#e85555;text-shadow:0 0 50px rgba(232,85,85,.9),4px 4px 0 #8b1a1a,-2px -2px 0 #ff8888;letter-spacing:8px;animation:os .5s ease-out forwards}
@keyframes os{0%{transform:scale(4) rotate(-8deg);opacity:0}15%{transform:scale(1.15) rotate(2deg);opacity:1}35%{transform:scale(.93) rotate(-1deg)}55%{transform:scale(1.04)}100%{transform:scale(1) rotate(0);opacity:1}}
.fw-sk{animation:sk .4s ease-out}
@keyframes sk{0%{transform:translateX(0)}10%{transform:translateX(-10px) translateY(3px)}25%{transform:translateX(8px) translateY(-2px)}40%{transform:translateX(-6px)}55%{transform:translateX(4px)}70%{transform:translateX(-2px)}100%{transform:translateX(0)}}
/* QUESTION OVERLAY */
.fw-qp{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(6,6,16,.94);padding:16px;animation:fi .3s ease;overflow-y:auto}
@keyframes fi{from{opacity:0}to{opacity:1}}
.fw-qb{max-width:580px;width:100%;background:linear-gradient(135deg,#12122a,#181840);border:2px solid #e8b84a;padding:clamp(16px,3vw,28px);box-shadow:0 0 40px rgba(232,184,74,.1)}
.fw-ql{font-family:'Cinzel',serif;font-size:11px;font-weight:700;color:#e8b84a;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}
.fw-qt{font-size:clamp(15px,2.2vw,18px);line-height:1.65;color:#e0ddd5;margin-bottom:22px}
.fw-op{display:block;width:100%;padding:13px 18px;margin-bottom:8px;background:#0a0a18;color:#c0bdb5;border:1.5px solid #333355;cursor:pointer;font-family:'Crimson Text',serif;font-size:clamp(14px,2vw,17px);text-align:left;transition:all .15s}
.fw-op:hover:not(:disabled){border-color:#e8b84a;color:#e8b84a;background:#15153a;transform:translateX(4px)}
.fw-op.c{border-color:#5be87a;color:#5be87a;background:#0a200a}.fw-op.w{border-color:#e85555;color:#e85555;background:#200a0a}
.fw-op.r{border-color:#5be87a;color:#5be87a}.fw-op.d{opacity:.25;pointer-events:none}
.fw-fb{margin-top:18px;padding:16px;border-left:3px solid #e85555;font-size:clamp(13px,1.8vw,16px);line-height:1.6;animation:fi .3s ease;background:rgba(0,0,0,.3)}
.fw-fl{font-family:'Cinzel',serif;font-size:13px;font-weight:700;margin-bottom:8px;color:#e85555}
.fw-cb{margin-top:16px;padding:11px 36px;font-family:'Cinzel',serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#0a0a14;background:#e8b84a;border:none;cursor:pointer;text-transform:uppercase;transition:all .15s}
.fw-cb:hover{background:#f0cc6a;transform:translateY(-1px)}
.fw-gow{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#1a1028,#0a0a14 70%);animation:fi .8s ease;text-align:center;padding:20px}
.fw-gow h2{font-family:'Cinzel',serif;font-size:clamp(28px,6vw,44px);font-weight:900;color:#e8b84a;margin:0 0 12px;text-shadow:0 0 40px rgba(232,184,74,.4)}
.fw-go{font-size:clamp(16px,2.5vw,22px);margin-bottom:4px}.fw-gm{font-size:clamp(14px,2vw,17px);color:#8a8aaa;font-style:italic;margin-bottom:28px}
.fw-cf{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:55}
.fw-cp{position:absolute;animation:confFall linear forwards}
@keyframes confFall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
/* Music toggle */
.fw-mt{position:absolute;top:8px;right:8px;z-index:101;background:none;border:1px solid #e8b84a55;color:#e8b84a88;font-size:16px;padding:4px 8px;cursor:pointer;border-radius:4px;transition:all .2s}
.fw-mt:hover{background:#e8b84a22;color:#e8b84a}
`;

/* ═══════════════════════════════════════════
   CONFETTI + TYPEWRITER
   ═══════════════════════════════════════════ */
const Confetti = () => {
  const c = ["#e8b84a","#5ba4e6","#e85555","#5be87a","#d48ae8","#e88aab"];
  return <div className="fw-cf">{Array.from({length:60},(_,i)=><div key={i} className="fw-cp" style={{left:`${Math.random()*100}%`,background:c[i%6],width:6+Math.random()*12,height:(6+Math.random()*12)*.5,borderRadius:Math.random()>.5?"50%":"2px",animationDuration:`${2+Math.random()*3}s`,animationDelay:`${Math.random()*2.5}s`}} />)}</div>;
};

const useTypewriter = (text, speed = 18, active = true, onTick, onStart, onDone) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const skip = useRef(false);
  const tm = useRef(null);
  const tickCount = useRef(0);
  useEffect(() => {
    if (!active || !text) { setDisplayed(text || ""); setDone(true); return; }
    setDisplayed(""); setDone(false); skip.current = false; tickCount.current = 0;
    if (onStart) onStart();
    let i = 0;
    const tick = () => {
      if (skip.current){setDisplayed(text);setDone(true);return;}
      i++; setDisplayed(text.slice(0,i));
      tickCount.current++;
      if (tickCount.current % 3 === 0 && onTick) onTick();
      if(i<text.length)tm.current=setTimeout(tick,speed);else{setDone(true);if(onDone)onDone();}
    };
    tm.current = setTimeout(tick, speed);
    return () => clearTimeout(tm.current);
  }, [text, active, speed]);
  return { displayed, done, skipToEnd: () => { skip.current=true; setDisplayed(text||""); setDone(true); /* intentionally no onDone — user skipped */ } };
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function FallacyWright({ ttsEnabled = false }) {
  // ── Save/Load helpers ──
  const SAVE_KEY = 'fallacy-wright-save';
  const loadSave = () => { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch(e) { return null; } };
  const writeSave = (data) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e) {} };
  const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch(e) {} };

  const saved = loadSave();

  const [started, setStarted] = useState(false);
  const [si, setSi] = useState(0);
  const [li, setLi] = useState(0);
  const [phase, setPhase] = useState("text");
  const [sel, setSel] = useState(null);
  const [fb, setFb] = useState(null);
  const [score, setScore] = useState(0);
  const [ans, setAns] = useState(0);
  const [over, setOver] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [objection, setObjection] = useState(false);
  const [cLines, setCLines] = useState([]);
  const [cli, setCli] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [ttsStatus, setTtsStatus] = useState("");

  // ── Auto-save on progress ──
  useEffect(() => {
    if (started && !over) {
      writeSave({ si, li, score, ans });
    }
  }, [si, li, score, ans, started, over]);

  const hasSave = !!saved && saved.si > 0;

  // ── Custom character portraits ──
  const [customPortraits, setCustomPortraits] = useState(() => {
    const loaded = {};
    CHARACTER_SLOTS.forEach(slot => {
      const d = loadCustom(slot.key, slot.expr);
      if (d) loaded[slotId(slot.key, slot.expr)] = d;
    });
    return loaded;
  });
  const [showImport, setShowImport] = useState(false);

  // Custom-aware portrait renderer
  const renderPortrait = (charKey, expr) => {
    const custom = customPortraits[slotId(charKey, expr)];
    if (custom) return <CustomImg src={custom} />;
    return portrait(charKey, expr);
  };

  // Load TTS engine once on mount
  useEffect(() => {
    VoiceManager.load((msg) => setTtsStatus(msg)).catch((err) => {
      console.warn("TTS load failed:", err);
      setTtsStatus("Voice unavailable");
    });
  }, []);

  const sc = D[si];
  const cl = phase==="text"&&sc?.type==="text"?sc.lines[li]:phase==="correct-scene"?cLines[cli]:null;
  const isThought = cl?.t?.startsWith("(")&&cl?.t?.endsWith(")");
  const isNarrator = cl?.s==="NARRATOR";
  const speaker = cl?.s||"";

  const blipRef = useRef(() => {});
  blipRef.current = () => { if(!isNarrator) AudioEngine.textBlip(); };

  const ttsRef = useRef(() => {});
  ttsRef.current = () => {
    // Stage-direction SFX fires immediately when line starts (instant sound)
    if(cl?.s === "NARRATOR" && cl?.t?.startsWith("[") && cl?.t?.endsWith("]")) {
      AudioEngine.stageDirection(cl.t);
    }
  };

  // TTS fires only AFTER typewriter finishes — prevents inference from blocking clicks
  const ttsDoneRef = useRef(() => {});
  ttsDoneRef.current = () => {
    if(cl?.t && cl?.s) VoiceManager.speak(cl.t, cl.s);
  };

  const {displayed,done,skipToEnd} = useTypewriter(cl?.t||"",18,!!cl,()=>blipRef.current(),()=>ttsRef.current(),()=>ttsDoneRef.current());
  const tq = D.filter(s=>s.type==="question").length;
  const pct = (ans/tq)*100;

  const shake = () => { setShaking(true); setTimeout(()=>setShaking(false),400); };
  const doObj = (cb) => {
    setObjection(true); shake(); AudioEngine.objection();
    setTimeout(()=>{setObjection(false);AudioEngine.correct();cb?.();},2000);
  };

  const next = useCallback(() => {
    VoiceManager.stop();
    const n=si+1; if(n>=D.length){setOver(true);clearSave();AudioEngine.victory();return;}
    setSi(n);setLi(0);setSel(null);setFb(null);setCLines([]);setCli(0);
    const nxt=D[n];
    if(nxt.type==="question") setPhase("question");
    else { setPhase("text"); AudioEngine.transition(); }
  },[si]);

  const clickDlg = () => {
    if(phase==="text"&&sc?.type==="text"){
      if(!done){skipToEnd();VoiceManager.stop();return;}
      if(li<sc.lines.length-1){setLi(i=>i+1);}
      else next();
    } else if(phase==="correct-scene"){
      if(!done){skipToEnd();VoiceManager.stop();return;}
      if(cli<cLines.length-1)setCli(i=>i+1); else next();
    }
  };

  const answer = (idx) => {
    if(fb)return;setSel(idx);
    if(idx===sc.correct){
      setScore(s=>s+1);setAns(t=>t+1);
      doObj(()=>{setCLines(sc.correctScene);setCli(0);setPhase("correct-scene");setFb(null);setSel(null);});
    } else {
      setAns(t=>t+1);shake();AudioEngine.wrong();
      setFb({text:sc.wrong[idx],correctAnswer:sc.options[sc.correct]});
    }
  };

  const afterWrong = () => { setCLines(sc.correctScene);setCli(0);setPhase("correct-scene");setFb(null);setSel(null); };

  // Determine which single character to show large
  const activeSpeaker = (speaker && speaker !== "NARRATOR") ? speaker : null;

  const wEx = objection?"objection":isThought?"thinking":"normal";
  const fEx = (phase==="correct-scene"||fb)?"sweating":"normal";
  const charEx = activeSpeaker==="WRIGHT"?wEx:activeSpeaker==="FALLACIOUS"?fEx:"normal";
  const bg = BG[sc?.bg]||BG.courtroom;

  const toggleMusic = () => {
    if (musicOn) { AudioEngine.stopMusic(); AudioEngine.mute(); setMusicOn(false); }
    else { AudioEngine.unmute(); AudioEngine.startMusic(); setMusicOn(true); }
  };
  const toggleVoice = () => {
    const now = VoiceManager.toggle();
    setVoiceOn(now);
  };

  const restart = () => {clearSave();setSi(0);setLi(0);setPhase("text");setSel(null);setFb(null);setScore(0);setAns(0);setOver(false);setCLines([]);setCli(0);};

  const startGame = (resume) => {
    AudioEngine._preloadObjection();
    if (resume && saved) {
      setSi(saved.si); setLi(saved.li||0); setScore(saved.score||0); setAns(saved.ans||0);
      const sc = D[saved.si];
      setPhase(sc?.type==="question"?"question":"text");
    } else {
      clearSave(); setSi(0); setLi(0); setScore(0); setAns(0); setPhase("text");
    }
    setSel(null); setFb(null); setCLines([]); setCli(0); setOver(false); setStarted(true);
    if(!AudioEngine.muted){AudioEngine.titleStart();if(!musicOn){AudioEngine.startMusic();setMusicOn(true);}}
  };

  // Title screen
  if(!started) return(<><style>{css}</style><div className="fw"><div className="fw-ts">
    <button className="fw-mt" onClick={toggleMusic}>{musicOn?"🔊":"🔇"} Sound</button>
    <button className="fw-mt" style={{top:8,right:100}} onClick={toggleVoice}>{voiceOn?"🗣":"🤐"} Voice</button>
    <div className="fw-gv">⚖️</div><div className="fw-tl">FALLACY WRIGHT</div>
    <div className="fw-tsub">Ace Logician</div><div className="fw-tc">"The Case of the Colossal Duck"</div>
    <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:48,alignItems:"center"}}>
      {hasSave && <button className="fw-sb" onClick={()=>startGame(true)}>Continue Trial</button>}
      {hasSave && <div style={{fontSize:12,color:"#8a8aaa",marginTop:-4}}>Progress: {saved.ans||0} questions answered, {saved.score||0} correct</div>}
      <button className={hasSave?"fw-sb2":"fw-sb"} onClick={()=>startGame(false)}>{hasSave?"Start Over":"Begin Trial"}</button>
      <button className="fw-sb2" style={{marginTop:8}} onClick={()=>setShowImport(true)}>
        🎨 Import Custom Characters{Object.keys(customPortraits).length>0?` (${Object.keys(customPortraits).length})`:""}</button>
    </div>
    {showImport && <CharacterImportModal onClose={()=>setShowImport(false)} customPortraits={customPortraits} setCustomPortraits={setCustomPortraits} />}
    {ttsStatus&&<div style={{position:"absolute",bottom:16,left:0,right:0,textAlign:"center",fontSize:11,color:"#aaa",opacity:0.7}}>{ttsStatus}</div>}
  </div></div></>);

  // Game over
  if(over) return(<><style>{css}</style><div className="fw"><Confetti /><div className="fw-gow">
    <button className="fw-mt" onClick={toggleMusic}>{musicOn?"🔊":"🔇"}</button>
    <h2>CASE CLOSED!</h2><div className="fw-go">Fallacies Objected: <strong style={{color:"#e8b84a"}}>{score}</strong> / {tq}</div>
    <div className="fw-gm">{score===20?"PERFECT! You are the Ace Logician!":score>=15?"Excellent work, counselor!":score>=10?"Not bad, but Fallacious almost had you.":"You might want to revisit your logic textbooks..."}</div>
    <button className="fw-sb" onClick={restart}>Play Again</button></div></div></>);

  // Main game
  return(<><style>{css}</style>
    <div className={`fw ${shaking?"fw-sk":""}`}>
      <div className="fw-hd">
        <span className="fw-ht">Fallacy Wright</span>
        <span style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="fw-mt" style={{position:"static",fontSize:13,padding:"2px 6px"}} onClick={toggleMusic} title="Sound">{musicOn?"🔊":"🔇"}</button>
          <button className="fw-mt" style={{position:"static",fontSize:13,padding:"2px 6px"}} onClick={toggleVoice} title="Voice">{voiceOn?"🗣":"🤐"}</button>
          <span className="fw-hs">⚖️ {score}/{ans}</span>
        </span>
      </div>
      <div className="fw-pb"><div className="fw-pbr" style={{width:`${pct}%`}} /></div>
      <div className="fw-sc">
        <div className="fw-bg">{bg}</div>

        {/* OBJECTION overlay */}
        {objection&&<div className="fw-ob"><div className="fw-ot">OBJECTION!</div></div>}

        {/* WRIGHT OBJECTION PORTRAIT — actual sprite */}
        {objection&&(
          <div className="fw-ch obj">
            {customPortraits[slotId("WRIGHT","objection")]
              ? <CustomImg src={customPortraits[slotId("WRIGHT","objection")]} />
              : <img src="/wright-objection.png" alt="OBJECTION!" style={{width:"100%",height:"auto"}} />}
          </div>
        )}

        {/* QUESTION overlay */}
        {phase==="question"&&sc?.type==="question"&&!objection&&(
          <div className="fw-qp"><div className="fw-qb">
            <div className="fw-ql">⚖️ Question {sc.id} of {tq}</div>
            <div className="fw-qt">{sc.prompt}</div>
            {sc.options.map((o,i)=>{let c="fw-op";if(fb){if(i===sel)c+=" w";if(i===sc.correct)c+=" r";if(i!==sel&&i!==sc.correct)c+=" d";}
              return <button key={i} className={c} disabled={!!fb} onClick={()=>answer(i)}>{String.fromCharCode(65+i)}) {o}</button>;})}
            {fb&&<div className="fw-fb"><div className="fw-fl">✗ Not quite!</div><div>{fb.text}</div>
              <div style={{marginTop:10,color:"#5be87a"}}>Correct: <strong>{fb.correctAnswer}</strong></div>
              <button className="fw-cb" onClick={afterWrong}>Continue</button></div>}
          </div></div>)}

        {/* SINGLE LARGE CHARACTER PORTRAIT */}
        {(phase==="text"||phase==="correct-scene")&&!objection&&activeSpeaker&&(
          <div className={`fw-ch ${objection?"obj":""}`}>{renderPortrait(activeSpeaker,charEx)}</div>
        )}

        {/* DIALOGUE BOX — during objection, show Wright's objection text */}
        {objection&&(
          <div className="fw-dl"><div className="fw-di">
            <div className="fw-np"><div className="fw-sn" style={{color:CC.WRIGHT,borderColor:CC.WRIGHT+"88"}}>{CN.WRIGHT}</div></div>
            <div className="fw-dt" style={{color:"#e85555",fontWeight:600}}>OBJECTION!</div>
          </div></div>)}

        {/* DIALOGUE BOX — normal */}
        {(phase==="text"||phase==="correct-scene")&&cl&&!objection&&(
          <div className="fw-dl" onClick={clickDlg}><div className="fw-di">
            {!isNarrator&&<div className="fw-np"><div className="fw-sn" style={{color:CC[speaker]||"#aaa",borderColor:(CC[speaker]||"#aaa")+"88"}}>{CN[speaker]||speaker}</div></div>}
            <div className={`fw-dt ${isNarrator?"n":""} ${isThought?"th":""}`}>{displayed}</div>
          </div>{done&&<div className="fw-ah">▼</div>}</div>)}
      </div>
    </div></>);
}
