import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════
   AUDIO ENGINE — Web Audio API synth SFX + music
   ═══════════════════════════════════════════ */
const AudioEngine = (() => {
  let ctx = null;
  const getCtx = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };

  const playNote = (freq, dur, type = "square", vol = 0.08, delay = 0) => {
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
    textBlip: () => playNote(600 + Math.random() * 200, 0.04, "square", 0.03),
    objection: () => {
      // Dramatic rising chord
      [440,554,659,880].forEach((f,i) => playNote(f, 0.5, "sawtooth", 0.12, i*0.05));
      // Impact hit
      playNote(120, 0.3, "square", 0.15, 0.15);
      playNote(80, 0.2, "sawtooth", 0.1, 0.2);
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
    // Background music loop using oscillators
    _musicNodes: null,
    _musicPlaying: false,
    startMusic: function() {
      if (this._musicPlaying) return;
      try {
        const c = getCtx();
        const master = c.createGain();
        master.gain.value = 0.025;
        master.connect(c.destination);
        // Simple arpeggiated ambient loop
        const playLoop = () => {
          if (!this._musicPlaying) return;
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
   TTS — import from KittenTTS voice manager
   ═══════════════════════════════════════════ */
import { VoiceManager } from './tts/voice-manager.js';

/* ═══════════════════════════════════════════
   PORTRAITS — larger viewBox, more detail
   ═══════════════════════════════════════════ */
const P = {
  WRIGHT: (ex="normal") => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      {/* Body - blue suit */}
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#2d5a9e" />
      <rect x="60" y="170" width="80" height="25" rx="6" fill="#e8c89e" />
      {/* White collar */}
      <polygon points="70,190 100,215 130,190" fill="#fff" />
      {/* Red tie */}
      <polygon points="94,195 106,195 104,255 96,255" fill="#c0392b" />
      {/* Head */}
      <ellipse cx="100" cy="110" rx="46" ry="55" fill="#f0c8a0" />
      {/* Spiky hair */}
      <path d="M54,95 L62,30 L78,82 L90,22 L100,75 L112,25 L122,82 L135,32 L142,85 L148,95" fill="#2c1810" />
      <ellipse cx="100" cy="68" rx="46" ry="30" fill="#2c1810" />
      {/* Eyes */}
      {ex === "objection" ? (<>
        <ellipse cx="80" cy="108" rx="10" ry="9" fill="#fff" /><ellipse cx="120" cy="108" rx="10" ry="9" fill="#fff" />
        <circle cx="80" cy="108" r="5" fill="#1a1a1a" /><circle cx="120" cy="108" r="5" fill="#1a1a1a" />
        <line x1="66" y1="92" x2="90" y2="96" stroke="#2c1810" strokeWidth="4" strokeLinecap="round" />
        <line x1="110" y1="96" x2="134" y2="92" stroke="#2c1810" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="100" cy="138" rx="14" ry="9" fill="#c0392b" />
      </>) : ex === "thinking" ? (<>
        <ellipse cx="80" cy="110" rx="8" ry="7" fill="#fff" /><ellipse cx="120" cy="110" rx="8" ry="7" fill="#fff" />
        <circle cx="83" cy="110" r="4" fill="#1a1a1a" /><circle cx="123" cy="110" r="4" fill="#1a1a1a" />
        <line x1="68" y1="96" x2="90" y2="100" stroke="#2c1810" strokeWidth="3.5" />
        <line x1="110" y1="100" x2="132" y2="96" stroke="#2c1810" strokeWidth="3.5" />
        <path d="M85,135 Q100,142 115,135" stroke="#8b5e3c" strokeWidth="3" fill="none" />
      </>) : (<>
        <ellipse cx="80" cy="110" rx="8" ry="7" fill="#fff" /><ellipse cx="120" cy="110" rx="8" ry="7" fill="#fff" />
        <circle cx="80" cy="110" r="4" fill="#1a1a1a" /><circle cx="120" cy="110" r="4" fill="#1a1a1a" />
        <path d="M85,135 Q100,145 115,135" stroke="#8b5e3c" strokeWidth="3" fill="none" />
      </>)}
      {/* Badge */}
      <circle cx="50" cy="210" r="9" fill="#f1c40f" stroke="#c9a80e" strokeWidth="1.5" />
      <text x="50" y="214" textAnchor="middle" fontSize="9" fill="#8b6914" fontWeight="bold">A</text>
      {/* Pointing hand for objection */}
      {ex === "objection" && <path d="M170,160 L195,120 L200,125 L178,162" fill="#f0c8a0" />}
    </svg>
  ),
  FALLACIOUS: (ex="normal") => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#6e1444" />
      <rect x="60" y="170" width="80" height="25" rx="6" fill="#e8c89e" />
      {/* Cravat */}
      <path d="M75,190 L100,220 L125,190" fill="#ddd" stroke="#bbb" strokeWidth="1.5" />
      <path d="M80,195 L100,215 L120,195" fill="#eee" />
      {/* Head */}
      <ellipse cx="100" cy="110" rx="44" ry="53" fill="#f0c8a0" />
      {/* Silver hair */}
      <path d="M56,88 Q65,30 100,38 Q135,30 144,88" fill="#c0c0c0" />
      <path d="M56,88 Q60,55 82,45 Q100,40 118,45 Q140,55 144,88" fill="#d8d8d8" />
      {ex === "sweating" ? (<>
        <ellipse cx="80" cy="110" rx="8" ry="5" fill="#fff" /><ellipse cx="120" cy="110" rx="8" ry="5" fill="#fff" />
        <circle cx="80" cy="110" r="3" fill="#1a1a1a" /><circle cx="120" cy="110" r="3" fill="#1a1a1a" />
        {/* Sweat */}
        <path d="M150,92 Q153,102 150,112" stroke="#5dade2" strokeWidth="3" fill="none" />
        <ellipse cx="150" cy="116" rx="3" ry="4" fill="#5dade2" />
        <path d="M156,98 Q158,105 156,110" stroke="#5dade2" strokeWidth="2" fill="none" />
        <path d="M82,138 Q100,130 118,138" stroke="#8b5e3c" strokeWidth="3" fill="none" />
      </>) : (<>
        <ellipse cx="80" cy="110" rx="8" ry="7" fill="#fff" /><ellipse cx="120" cy="110" rx="8" ry="7" fill="#fff" />
        <circle cx="80" cy="110" r="4" fill="#1a1a1a" /><circle cx="120" cy="110" r="4" fill="#1a1a1a" />
        <line x1="66" y1="95" x2="90" y2="98" stroke="#888" strokeWidth="3" />
        <line x1="110" y1="98" x2="134" y2="95" stroke="#888" strokeWidth="3" />
        <path d="M85,135 Q100,148 115,135" stroke="#8b5e3c" strokeWidth="3" fill="none" />
      </>)}
      {/* Dramatic finger wag */}
      {ex !== "sweating" && <path d="M175,155 L190,130 L193,133 L180,158" fill="#f0c8a0" />}
    </svg>
  ),
  JUDGE: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="170" width="180" height="130" rx="12" fill="#1a1a1a" />
      <rect x="60" y="162" width="80" height="22" rx="6" fill="#e8c89e" />
      <ellipse cx="100" cy="100" rx="48" ry="55" fill="#f0c8a0" />
      <ellipse cx="100" cy="65" rx="42" ry="26" fill="#f0c8a0" />
      <path d="M56,82 Q50,65 58,55" stroke="#ddd" strokeWidth="5" fill="none" />
      <path d="M144,82 Q150,65 142,55" stroke="#ddd" strokeWidth="5" fill="none" />
      {/* Glasses */}
      <circle cx="80" cy="105" r="16" stroke="#333" strokeWidth="4" fill="none" />
      <circle cx="120" cy="105" r="16" stroke="#333" strokeWidth="4" fill="none" />
      <line x1="96" y1="105" x2="104" y2="105" stroke="#333" strokeWidth="4" />
      <circle cx="80" cy="106" r="3.5" fill="#1a1a1a" /><circle cx="120" cy="106" r="3.5" fill="#1a1a1a" />
      <path d="M85,135 Q100,145 115,135" stroke="#8b5e3c" strokeWidth="3" fill="none" />
      {/* Gavel */}
      <rect x="150" y="195" width="35" height="14" rx="4" fill="#8b6914" />
      <rect x="162" y="182" width="10" height="28" rx="3" fill="#a0783c" />
    </svg>
  ),
  LARRY: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#e67e22" />
      <rect x="60" y="170" width="80" height="22" rx="6" fill="#e8c89e" />
      <path d="M40,190 Q40,168 65,165" fill="#d35400" /><path d="M160,190 Q160,168 135,165" fill="#d35400" />
      <ellipse cx="100" cy="108" rx="45" ry="52" fill="#f0c8a0" />
      <path d="M55,92 Q60,42 78,38 Q92,33 100,48 Q108,33 122,38 Q140,42 145,92" fill="#8B4513" />
      <path d="M68,45 L64,32" stroke="#8B4513" strokeWidth="6" /><path d="M118,40 L126,28" stroke="#8B4513" strokeWidth="6" />
      <ellipse cx="78" cy="110" rx="12" ry="10" fill="#fff" /><ellipse cx="122" cy="110" rx="12" ry="10" fill="#fff" />
      <circle cx="78" cy="112" r="6" fill="#5a3510" /><circle cx="122" cy="112" r="6" fill="#5a3510" />
      <circle cx="80" cy="108" r="2.5" fill="#fff" /><circle cx="124" cy="108" r="2.5" fill="#fff" />
      <path d="M80,138 Q100,158 120,138" stroke="#8b5e3c" strokeWidth="3" fill="#fff" />
    </svg>
  ),
  BRENDA: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#2c3e50" />
      <rect x="60" y="170" width="80" height="20" rx="5" fill="#e8c89e" />
      <ellipse cx="100" cy="108" rx="43" ry="52" fill="#f0c8a0" />
      <ellipse cx="100" cy="65" rx="46" ry="30" fill="#4a2810" />
      <path d="M54,72 Q52,110 62,128" stroke="#4a2810" strokeWidth="10" fill="none" />
      <path d="M146,72 Q148,110 138,128" stroke="#4a2810" strokeWidth="10" fill="none" />
      <ellipse cx="80" cy="110" rx="7" ry="7" fill="#fff" /><ellipse cx="120" cy="110" rx="7" ry="7" fill="#fff" />
      <circle cx="80" cy="110" r="3.5" fill="#1a1a1a" /><circle cx="120" cy="110" r="3.5" fill="#1a1a1a" />
      <path d="M85,138 Q100,145 115,138" stroke="#8b5e3c" strokeWidth="3" fill="none" />
      <rect x="125" y="192" width="30" height="20" rx="4" fill="#f1c40f" stroke="#c9a80e" strokeWidth="1.5" />
      <text x="140" y="206" textAnchor="middle" fontSize="9" fill="#333" fontWeight="bold">SEC</text>
    </svg>
  ),
  CHAD: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#1a1a1a" />
      <rect x="60" y="170" width="80" height="20" rx="5" fill="#dbb590" />
      <path d="M62,190 Q100,210 138,190" stroke="#f1c40f" strokeWidth="3" fill="none" />
      <ellipse cx="100" cy="108" rx="43" ry="52" fill="#dbb590" />
      <path d="M57,78 Q66,32 100,28 Q134,32 143,78" fill="#1a1a1a" />
      {/* Sunglasses */}
      <rect x="58" y="96" width="34" height="24" rx="5" fill="#111" stroke="#444" strokeWidth="2.5" />
      <rect x="108" y="96" width="34" height="24" rx="5" fill="#111" stroke="#444" strokeWidth="2.5" />
      <line x1="92" y1="107" x2="108" y2="107" stroke="#444" strokeWidth="3" />
      <path d="M82,140 Q100,148 118,136" stroke="#8b5e3c" strokeWidth="3" fill="none" />
    </svg>
  ),
  LOOPSWORTH: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#2c4a2c" />
      <rect x="60" y="170" width="80" height="20" rx="5" fill="#e8c89e" />
      <polygon points="82,190 100,200 118,190 100,180" fill="#8e1600" />
      <ellipse cx="100" cy="108" rx="43" ry="52" fill="#e8c89e" />
      <path d="M57,82 Q52,45 78,40 Q100,52 122,40 Q148,45 143,82" fill="#ccc" />
      {/* Monocle */}
      <circle cx="120" cy="106" r="15" stroke="#c9a80e" strokeWidth="3.5" fill="none" />
      <line x1="135" y1="108" x2="155" y2="135" stroke="#c9a80e" strokeWidth="2" />
      <ellipse cx="80" cy="110" rx="8" ry="7" fill="#fff" /><ellipse cx="120" cy="110" rx="8" ry="7" fill="#fff" />
      <circle cx="80" cy="110" r="4" fill="#1a1a1a" /><circle cx="120" cy="110" r="4" fill="#1a1a1a" />
      <path d="M85,138 Q100,145 115,138" stroke="#8b5e3c" strokeWidth="3" fill="none" />
    </svg>
  ),
  WILLOW: () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#5d4e8c" />
      <rect x="60" y="170" width="80" height="20" rx="5" fill="#e8c89e" />
      <polygon points="90,195 100,215 110,195" fill="#9b59b6" stroke="#7d3c98" strokeWidth="1.5" />
      <ellipse cx="100" cy="108" rx="43" ry="52" fill="#f0c8a0" />
      <path d="M57,72 Q48,35 82,30 Q100,26 118,30 Q152,35 143,72" fill="#c0392b" />
      <path d="M57,72 Q50,115 45,165" stroke="#c0392b" strokeWidth="14" fill="none" />
      <path d="M143,72 Q150,115 155,165" stroke="#c0392b" strokeWidth="14" fill="none" />
      <ellipse cx="80" cy="110" rx="8" ry="7" fill="#fff" /><ellipse cx="120" cy="110" rx="8" ry="7" fill="#fff" />
      <circle cx="80" cy="110" r="4" fill="#2ecc71" /><circle cx="120" cy="110" r="4" fill="#2ecc71" />
      <path d="M85,138 Q100,145 115,138" stroke="#8b5e3c" strokeWidth="3" fill="none" />
      <circle cx="138" cy="52" r="8" fill="#f39c12" /><circle cx="138" cy="52" r="3.5" fill="#e74c3c" />
    </svg>
  ),
  "DR. VON STUFFINGTON": () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="180" width="160" height="120" rx="12" fill="#ecf0f1" stroke="#bdc3c7" strokeWidth="2" />
      <rect x="60" y="170" width="80" height="20" rx="5" fill="#e8c89e" />
      <text x="45" y="225" fontSize="18">🐟</text><text x="130" y="215" fontSize="14">🐠</text><text x="80" y="260" fontSize="12">🐡</text>
      <ellipse cx="100" cy="108" rx="43" ry="52" fill="#e8c89e" />
      <ellipse cx="100" cy="68" rx="40" ry="24" fill="#e8c89e" />
      <path d="M57,82 Q52,65 60,55" stroke="#8b6914" strokeWidth="8" fill="none" />
      <path d="M143,82 Q148,65 140,55" stroke="#8b6914" strokeWidth="8" fill="none" />
      <rect x="62" y="98" width="26" height="20" rx="5" stroke="#333" strokeWidth="3.5" fill="none" />
      <rect x="112" y="98" width="26" height="20" rx="5" stroke="#333" strokeWidth="3.5" fill="none" />
      <line x1="88" y1="107" x2="112" y2="107" stroke="#333" strokeWidth="3" />
      <circle cx="75" cy="108" r="3.5" fill="#1a1a1a" /><circle cx="125" cy="108" r="3.5" fill="#1a1a1a" />
      <path d="M78,130 Q88,136 100,130 Q112,136 122,130" stroke="#8b6914" strokeWidth="3.5" fill="none" />
    </svg>
  ),
  "???": () => (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="165" width="180" height="135" rx="12" fill="#111" />
      <ellipse cx="100" cy="100" rx="48" ry="55" fill="#1a1a1a" />
      <text x="100" y="120" textAnchor="middle" fontSize="60" fill="#444" fontWeight="bold">?</text>
    </svg>
  ),
};
const portrait = (s, e) => (P[s] || P["???"])(e);

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
.fw-ch.obj{animation:portraitSlam .4s ease-out}
@keyframes portraitSlam{0%{transform:translateX(-50%) scale(1.15)}40%{transform:translateX(-50%) scale(.97)}100%{transform:translateX(-50%) scale(1)}}
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
.fw-ob{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:50;pointer-events:none;background:rgba(200,40,40,.15)}
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

const useTypewriter = (text, speed = 18, active = true, onTick, onStart) => {
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
      if(i<text.length)tm.current=setTimeout(tick,speed);else setDone(true);
    };
    tm.current = setTimeout(tick, speed);
    return () => clearTimeout(tm.current);
  }, [text, active, speed]);
  return { displayed, done, skipToEnd: () => { skip.current=true; setDisplayed(text||""); setDone(true); } };
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function FallacyWright({ ttsEnabled = false }) {
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

  const sc = D[si];
  const cl = phase==="text"&&sc?.type==="text"?sc.lines[li]:phase==="correct-scene"?cLines[cli]:null;
  const isThought = cl?.t?.startsWith("(")&&cl?.t?.endsWith(")");
  const isNarrator = cl?.s==="NARRATOR";
  const speaker = cl?.s||"";

  const blipRef = useRef(() => {});
  blipRef.current = () => { if(!isNarrator) AudioEngine.textBlip(); };

  const ttsRef = useRef(() => {});
  ttsRef.current = () => { if(cl?.t && cl?.s) VoiceManager.speak(cl.t, cl.s); };

  const {displayed,done,skipToEnd} = useTypewriter(cl?.t||"",18,!!cl,()=>blipRef.current(),()=>ttsRef.current());
  const tq = D.filter(s=>s.type==="question").length;
  const pct = (ans/tq)*100;

  const shake = () => { setShaking(true); setTimeout(()=>setShaking(false),400); };
  const doObj = (cb) => {
    setObjection(true); shake(); AudioEngine.objection();
    setTimeout(()=>{setObjection(false);AudioEngine.correct();cb?.();},1400);
  };

  const next = useCallback(() => {
    VoiceManager.stop();
    const n=si+1; if(n>=D.length){setOver(true);AudioEngine.victory();return;}
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
    if (musicOn) { AudioEngine.stopMusic(); setMusicOn(false); }
    else { AudioEngine.startMusic(); setMusicOn(true); }
  };
  const toggleVoice = () => {
    const now = VoiceManager.toggle();
    setVoiceOn(now);
  };

  const restart = () => {setSi(0);setLi(0);setPhase("text");setSel(null);setFb(null);setScore(0);setAns(0);setOver(false);setCLines([]);setCli(0);};

  // Title screen
  if(!started) return(<><style>{css}</style><div className="fw"><div className="fw-ts">
    <button className="fw-mt" onClick={toggleMusic}>{musicOn?"🔊":"🔇"} Music</button>
    <button className="fw-mt" style={{top:8,right:100}} onClick={toggleVoice}>{voiceOn?"🗣":"🤐"} Voice</button>
    <div className="fw-gv">⚖️</div><div className="fw-tl">FALLACY WRIGHT</div>
    <div className="fw-tsub">Ace Logician</div><div className="fw-tc">"The Case of the Colossal Duck"</div>
    <button className="fw-sb" onClick={()=>{setStarted(true);AudioEngine.titleStart();if(!musicOn){AudioEngine.startMusic();setMusicOn(true);}}}>Begin Trial</button>
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
          <button className="fw-mt" style={{position:"static",fontSize:13,padding:"2px 6px"}} onClick={toggleMusic} title="Music">{musicOn?"🔊":"🔇"}</button>
          <button className="fw-mt" style={{position:"static",fontSize:13,padding:"2px 6px"}} onClick={toggleVoice} title="Voice">{voiceOn?"🗣":"🤐"}</button>
          <span className="fw-hs">⚖️ {score}/{ans}</span>
        </span>
      </div>
      <div className="fw-pb"><div className="fw-pbr" style={{width:`${pct}%`}} /></div>
      <div className="fw-sc">
        <div className="fw-bg">{bg}</div>

        {/* OBJECTION overlay */}
        {objection&&<div className="fw-ob"><div className="fw-ot">OBJECTION!</div></div>}

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
          <div className={`fw-ch ${objection?"obj":""}`}>{portrait(activeSpeaker,charEx)}</div>
        )}

        {/* DIALOGUE BOX */}
        {(phase==="text"||phase==="correct-scene")&&cl&&!objection&&(
          <div className="fw-dl" onClick={clickDlg}><div className="fw-di">
            {!isNarrator&&<div className="fw-np"><div className="fw-sn" style={{color:CC[speaker]||"#aaa",borderColor:(CC[speaker]||"#aaa")+"88"}}>{CN[speaker]||speaker}</div></div>}
            <div className={`fw-dt ${isNarrator?"n":""} ${isThought?"th":""}`}>{displayed}</div>
          </div>{done&&<div className="fw-ah">▼</div>}</div>)}
      </div>
    </div></>);
}
