import { useState, useEffect } from 'react';
import { joinMatchmaking, checkMatchmakingStatus } from '../../utils/api';
import type { Difficulty } from '../../utils/api';

interface MatchmakingScreenProps {
  difficulty: Difficulty;
  playerName: string;
  isGuest: boolean;
  onBack: () => void;
  onMatchFound: (gameId: string, playerId: string, difficulty: Difficulty) => void;
}

export function MatchmakingScreen({
  difficulty,
  playerName,
  isGuest,
  onBack,
  onMatchFound,
}: MatchmakingScreenProps) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const initMatchmaking = async () => {
      try {
        const result = await joinMatchmaking(difficulty, playerName, isGuest);
        if (result.status === 'queued') {
          setPlayerId(result.playerId);
        } else if (result.gameId) {
          onMatchFound(result.gameId, result.playerId, difficulty);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    initMatchmaking();
  }, []);

  useEffect(() => {
    if (!playerId) return;
    const interval = setInterval(async () => {
      try {
        const result = await checkMatchmakingStatus(playerId);
        if (result.status === 'matched') {
          onMatchFound(result.gameId, playerId, difficulty);
        }
      } catch (err: any) {
        console.log('Error checking status:', err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerId, difficulty, onMatchFound]);

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  const difficultyMeta: Record<number, { label: string; color: string; bg: string; badgeBg: string; emoji: string }> = {
    3: { label: 'Easy', color: 'var(--green)', bg: '#E8FFF5', badgeBg: 'var(--green)', emoji: '🟢' },
    4: { label: 'Medium', color: '#d4a600', bg: '#FFF8E1', badgeBg: 'var(--yellow)', emoji: '🟡' },
    5: { label: 'Hard', color: 'var(--red)', bg: '#FFF0F0', badgeBg: 'var(--red)', emoji: '🔴' },
  };
  const meta = difficultyMeta[difficulty];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ff-display)',
        color: 'var(--ink)',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '2.5px solid var(--ink)',
          gap: '1rem',
        }}
      >
        <button className="nd-btn nd-btn-ghost nd-btn-sm" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Cancel
        </button>
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          🎯 <span style={{ color: 'var(--orange)' }}>Number</span> Duel
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        {error ? (
          <div className="nd-card" style={{ padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>😕</div>
            <h2 style={{ marginBottom: '0.75rem' }}>Something went wrong</h2>
            <div
              style={{
                background: 'rgba(255,51,51,0.08)',
                border: '1.5px solid var(--red)',
                borderRadius: 12,
                padding: '0.85rem',
                color: 'var(--red)',
                fontFamily: 'var(--ff-mono)',
                fontSize: '0.8rem',
                marginBottom: '1.25rem',
              }}
            >
              {error}
            </div>
            <button className="nd-btn nd-btn-ink nd-btn-full" onClick={onBack}>← Go Back</button>
          </div>
        ) : (
          <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
            {/* Animated finder */}
            <div
              className="nd-card"
              style={{ padding: '2.5rem 2rem', marginBottom: '1.5rem' }}
            >
              {/* Pulsing rings */}
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 2rem' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      inset: `${i * -20}px`,
                      borderRadius: '50%',
                      border: `2px solid var(--orange)`,
                      opacity: 0.15 + i * 0.1,
                      animation: `pulse-dot 1.8s ease-in-out ${i * 0.3}s infinite`,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: meta.badgeBg,
                    border: '2.5px solid var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  {meta.emoji}
                </div>
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Finding Opponent{'.'.repeat(dots)}
              </h2>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Searching for a <strong>{meta.label}</strong> ({difficulty} digits) match
              </p>

              {/* Difficulty badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: meta.bg,
                  border: '2.5px solid var(--ink)',
                  borderRadius: 12,
                  padding: '0.5rem 1rem',
                  boxShadow: '2px 2px 0 var(--ink)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    background: meta.badgeBg,
                    color: difficulty === 4 ? 'var(--ink)' : '#fff',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '2px solid var(--ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {difficulty}
                </span>
                <span style={{ fontWeight: 600 }}>{meta.label} Mode</span>
              </div>
            </div>

            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.75rem', color: '#aaa' }}>
              You'll be matched shortly. Hang tight! ✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
