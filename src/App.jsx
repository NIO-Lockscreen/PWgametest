import { useState, useCallback } from 'react';
import { VoiceManager } from './tts/voice-manager.js';
import Game from './Game.jsx';

export default function App() {
  const [ttsStatus, setTtsStatus] = useState('idle'); // idle | loading | ready | error | skipped
  const [loadMsg, setLoadMsg] = useState('');

  const startWithTTS = useCallback(async () => {
    setTtsStatus('loading');
    try {
      await VoiceManager.load((msg) => setLoadMsg(msg));
      setTtsStatus('ready');
    } catch (err) {
      console.error(err);
      setTtsStatus('error');
    }
  }, []);

  const skipTTS = useCallback(() => {
    setTtsStatus('skipped');
  }, []);

  // Show loading / choice screen before game
  if (ttsStatus === 'idle' || ttsStatus === 'loading' || ttsStatus === 'error') {
    return (
      <div style={styles.loaderRoot}>
        <div style={styles.gavel}>⚖️</div>
        <h1 style={styles.title}>FALLACY WRIGHT</h1>
        <p style={styles.sub}>ACE LOGICIAN</p>
        <p style={styles.case}>"The Case of the Colossal Duck"</p>

        {ttsStatus === 'idle' && (
          <div style={styles.choiceBox}>
            <p style={styles.choiceText}>This game features AI voice acting powered by KittenTTS (~25MB download, runs in your browser).</p>
            <button style={styles.btnPrimary} onClick={startWithTTS}>
              🎤 Play with Voice Acting
            </button>
            <button style={styles.btnSecondary} onClick={skipTTS}>
              🔇 Play without voices
            </button>
          </div>
        )}

        {ttsStatus === 'loading' && (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadText}>{loadMsg || 'Preparing...'}</p>
            <p style={styles.loadSub}>First load downloads the model. It's cached after that.</p>
          </div>
        )}

        {ttsStatus === 'error' && (
          <div style={styles.choiceBox}>
            <p style={{...styles.choiceText, color: '#e85555'}}>
              Failed to load TTS model. You can still play without voices.
            </p>
            <button style={styles.btnSecondary} onClick={skipTTS}>
              Continue without voices
            </button>
            <button style={{...styles.btnSecondary, marginTop: 8}} onClick={startWithTTS}>
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // Game is ready
  return <Game ttsEnabled={ttsStatus === 'ready'} />;
}

const styles = {
  loaderRoot: {
    fontFamily: "'Crimson Text', Georgia, serif",
    background: 'radial-gradient(ellipse at 50% 60%, #1a1028, #0a0a14 70%)',
    color: '#e0ddd5',
    width: '100%', height: '100vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: 20,
  },
  gavel: { fontSize: 72, marginBottom: 16, animation: 'gb 2s ease-in-out infinite' },
  title: {
    fontFamily: "'Cinzel', serif", fontSize: 'clamp(28px,7vw,52px)',
    fontWeight: 900, color: '#e8b84a',
    textShadow: '0 0 30px rgba(232,184,74,.4), 0 4px 0 #8b6914',
    letterSpacing: 3,
  },
  sub: {
    fontFamily: "'Cinzel', serif", fontSize: 'clamp(12px,2.5vw,18px)',
    color: '#8a8aaa', letterSpacing: 6, marginTop: 8, textTransform: 'uppercase',
  },
  case: { fontSize: 'clamp(14px,2.5vw,20px)', color: '#c0b89a', fontStyle: 'italic', marginTop: 24 },
  choiceBox: {
    marginTop: 40, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12, maxWidth: 420,
  },
  choiceText: { fontSize: 15, color: '#aaa', lineHeight: 1.6, marginBottom: 8 },
  btnPrimary: {
    padding: '14px 36px', fontFamily: "'Cinzel', serif", fontSize: 16,
    fontWeight: 700, letterSpacing: 2, color: '#0a0a14', background: '#e8b84a',
    border: 'none', cursor: 'pointer', textTransform: 'uppercase',
    clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
    transition: 'all .2s',
  },
  btnSecondary: {
    padding: '10px 28px', fontFamily: "'Cinzel', serif", fontSize: 14,
    fontWeight: 700, letterSpacing: 2, color: '#8a8aaa',
    background: 'transparent', border: '1px solid #333',
    cursor: 'pointer', textTransform: 'uppercase', transition: 'all .2s',
  },
  loadingBox: {
    marginTop: 40, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12,
  },
  spinner: {
    width: 40, height: 40, border: '3px solid #333',
    borderTopColor: '#e8b84a', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadText: { fontSize: 16, color: '#e8b84a', fontFamily: "'Cinzel', serif" },
  loadSub: { fontSize: 13, color: '#666' },
};

// Inject global keyframes
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes gb { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(10deg)} }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(styleEl);
}
