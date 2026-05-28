import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { setSecret, getGameState } from '../../utils/api';
import type { Difficulty, GameState } from '../../utils/api';

interface SecretInputScreenProps {
  gameId: string;
  playerId: string;
  difficulty: Difficulty;
  onSecretSet: (difficulty: Difficulty) => void;
  embedded?: boolean;
}

export function SecretInputScreen({
  gameId,
  playerId,
  difficulty: initialDifficulty,
  onSecretSet,
  embedded = false,
}: SecretInputScreenProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDigits(Array(difficulty).fill(''));
    inputRefs.current = inputRefs.current.slice(0, difficulty);
  }, [difficulty]);

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const result = await getGameState(gameId, playerId);
        const game: GameState = result.game;
        setDifficulty(game.difficulty);
        const player = game.players.find(p => p?.id === playerId);
        if (player?.secretNumber) setWaitingForOpponent(true);
      } catch (err: any) {
        console.log('Error fetching game state:', err);
      }
    };
    fetchGameState();
  }, [gameId, playerId]);

  useEffect(() => {
    if (!waitingForOpponent) return;
    const interval = setInterval(async () => {
      try {
        const result = await getGameState(gameId, playerId);
        const game: GameState = result.game;
        if (game.status === 'playing') onSecretSet(game.difficulty);
      } catch (err: any) {
        console.log('Error polling game state:', err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [waitingForOpponent, gameId, playerId, onSecretSet]);

  const handleDigitInput = (idx: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    setError('');
    if (v && inputRefs.current[idx + 1]) inputRefs.current[idx + 1]!.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !digits[idx] && inputRefs.current[idx - 1]) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      inputRefs.current[idx - 1]!.focus();
    }
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSubmit = async () => {
    const secret = digits.join('');
    if (secret.length !== difficulty) { setError(`Enter all ${difficulty} digits`); return; }
    if (new Set(secret).size !== secret.length) { setError('All digits must be unique!'); return; }
    if (!/^\d+$/.test(secret)) { setError('Digits only (0-9)'); return; }

    setLoading(true);
    setError('');
    try {
      await setSecret(gameId, playerId, secret);
      setWaitingForOpponent(true);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const filledCount = digits.filter(d => d !== '').length;

  if (waitingForOpponent) {
    return (
      <div
        style={{
          minHeight: embedded ? 'auto' : '100vh',
          background: embedded ? 'transparent' : 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'var(--ff-display)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(0,194,168,0.1)',
              border: '2.5px solid var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 1.25rem',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            🔒
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Secret Number Set!
          </h3>
          <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Waiting for opponent to set their secret…
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--orange)',
                  animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: embedded ? 'auto' : '100vh',
        background: embedded ? 'transparent' : 'var(--cream)',
        fontFamily: 'var(--ff-display)',
        color: 'var(--ink)',
      }}
    >
      {!embedded && (
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderBottom: '2.5px solid var(--ink)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            🎯 <span style={{ color: 'var(--orange)' }}>Number</span> Duel
          </div>
        </nav>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: embedded ? '1rem 0' : '3rem 1.5rem',
        }}
      >
        <div className={embedded ? '' : 'nd-card'} style={{ padding: embedded ? 0 : '2rem', maxWidth: 400, width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,107,53,0.1)',
                border: '2.5px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', margin: '0 auto 1rem',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              🔐
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Choose Your Secret
            </h2>
            <p style={{ color: '#666', fontSize: '0.88rem' }}>
              Pick <strong>{difficulty}</strong> unique digits — only you'll see this!
            </p>
          </div>

          {/* Digit inputs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginBottom: '0.6rem',
              }}
            >
              {digits.map((d, idx) => (
                <input
                  key={idx}
                  ref={el => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitInput(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(e, idx)}
                  onFocus={e => e.target.select()}
                  disabled={loading}
                  style={{
                    width: 52, height: 64,
                    borderRadius: 14,
                    border: d ? '2.5px solid var(--ink)' : '2px solid rgba(26,18,7,0.2)',
                    background: d ? 'rgba(255,107,53,0.06)' : 'rgba(255,255,255,0.8)',
                    color: d ? 'var(--orange)' : 'var(--ink)',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    outline: 'none',
                    boxShadow: d ? '2px 2px 0 var(--ink)' : '1px 1px 0 rgba(26,18,7,0.08)',
                    transition: 'all 0.15s',
                    cursor: loading ? 'not-allowed' : 'text',
                    opacity: loading ? 0.5 : 1,
                  }}
                />
              ))}
            </div>
            <div style={{ textAlign: 'center', fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', color: '#aaa' }}>
              {filledCount}/{difficulty} digits entered
            </div>
          </div>

          {/* Rules */}
          <div
            style={{
              background: 'rgba(255,107,53,0.06)',
              border: '1.5px solid rgba(26,18,7,0.12)',
              borderRadius: 12,
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Rules
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[
                `All ${difficulty} digits must be different`,
                'Only use digits 0–9',
                "You won't see it during the game!",
              ].map((r, i) => (
                <li key={i} style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--orange)', fontWeight: 700 }}>·</span> {r}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.65rem 0.85rem',
                background: 'rgba(255,51,51,0.08)',
                border: '1.5px solid var(--red)',
                borderRadius: 10,
                color: 'var(--red)',
                fontFamily: 'var(--ff-mono)',
                fontSize: '0.78rem',
              }}
            >
              ⚠ {error}
            </div>
          )}

          <button
            className="nd-btn nd-btn-orange nd-btn-full"
            onClick={handleSubmit}
            disabled={loading || filledCount !== difficulty}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Setting Secret…
              </>
            ) : (
              '🔒 Set Secret Number'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
