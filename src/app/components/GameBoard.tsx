import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { makeGuess, getGameState } from '../../utils/api';
import type { GameState, Guess } from '../../utils/api';

interface GameBoardProps {
  gameId: string;
  playerId: string;
  onGameEnd: () => void;
}

export function GameBoard({ gameId, playerId, onGameEnd }: GameBoardProps) {
  const [game, setGame] = useState<GameState | null>(null);
  const [digits, setDigits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  // Fetch game state
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const result = await getGameState(gameId, playerId);
        setGame(result.game);
        if (result.game.status === 'finished') {
          setTimeout(() => onGameEnd(), 500);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchGame();
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [gameId, playerId, onGameEnd]);

  // Init digit array when difficulty known
  useEffect(() => {
    if (game) setDigits(Array(game.difficulty).fill(''));
  }, [game?.difficulty]);

  // Timer
  useEffect(() => {
    if (!game || game.status !== 'playing' || !game.turnStartTime) return;
    const updateTimer = () => {
      const elapsed = Date.now() - game.turnStartTime!;
      const remaining = Math.max(0, 30 - Math.floor(elapsed / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [game]);

  const handleGuessSubmit = async () => {
    if (!game) return;
    const val = digits.join('');
    if (val.length !== game.difficulty) { setError(`Enter all ${game.difficulty} digits`); return; }
    if (new Set(val).size !== val.length) { setError('No repeating digits!'); return; }
    if (!/^\d+$/.test(val)) { setError('Digits only'); return; }

    setLoading(true);
    setError('');
    try {
      const result = await makeGuess(gameId, playerId, val);
      setGame(result.game);
      setDigits(Array(game.difficulty).fill(''));
      if (result.game.status === 'finished') setTimeout(() => onGameEnd(), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitInput = (idx: number, val: string, allInputs: HTMLInputElement[]) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    setError('');
    if (v && allInputs[idx + 1]) allInputs[idx + 1].focus();
  };

  const handleDigitKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, allInputs: HTMLInputElement[]) => {
    if (e.key === 'Backspace' && !digits[idx] && allInputs[idx - 1]) {
      const prev = [...digits];
      prev[idx - 1] = '';
      setDigits(prev);
      allInputs[idx - 1].focus();
    }
    if (e.key === 'Enter') handleGuessSubmit();
  };

  if (!game) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--ff-display)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ width: 48, height: 48, color: 'var(--orange)', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <p style={{ color: '#666' }}>Loading game…</p>
        </div>
      </div>
    );
  }

  const isMyTurn = game.currentTurn === playerId;
  const myGuesses = game.guesses.filter(g => g.playerId === playerId);
  const opponentGuesses = game.guesses.filter(g => g.playerId !== playerId);
  const opponent = game.players.find(p => p?.id !== playerId);
  const me = game.players.find(p => p?.id === playerId);

  // Timer circle
  const circum = 2 * Math.PI * 14;
  const timerOffset = circum * (1 - timeLeft / 30);
  const timerColor = timeLeft <= 5 ? 'var(--red)' : timeLeft <= 10 ? '#d4a600' : 'var(--teal)';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E8',
        backgroundImage: [
          'radial-gradient(ellipse at 20% 10%, rgba(255,107,53,0.08) 0%, transparent 50%)',
          'radial-gradient(ellipse at 80% 90%, rgba(0,194,168,0.08) 0%, transparent 50%)',
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%231A1207' stroke-opacity='0.035' stroke-width='1'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3Ccircle cx='30' cy='30' r='10'/%3E%3Cline x1='0' y1='30' x2='60' y2='30'/%3E%3Cline x1='30' y1='0' x2='30' y2='60'/%3E%3C/g%3E%3C/svg%3E\")",
        ].join(', '),
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ff-display)',
        color: 'var(--ink)',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderBottom: '2px solid rgba(26,18,7,0.12)',
          background: 'rgba(255,252,245,0.9)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          boxShadow: '0 2px 12px rgba(26,18,7,0.06)',
        }}
      >
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--orange)' }}>🎯 Number Duel</div>

        {/* Turn pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: isMyTurn ? 'var(--orange)' : 'var(--teal)',
            color: '#fff',
            borderRadius: 20,
            padding: '0.3rem 0.9rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            border: '2px solid var(--ink)',
            boxShadow: '2px 2px 0 var(--ink)',
            transition: 'background 0.3s',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'blink 1s step-end infinite' }} />
          {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Timer ring */}
          <div style={{ position: 'relative', width: 36, height: 36 }}>
            <svg viewBox="0 0 32 32" width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(26,18,7,0.1)" strokeWidth="3" />
              <circle
                cx="16" cy="16" r="14"
                fill="none"
                stroke={timerColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circum}
                strokeDashoffset={timerOffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--ff-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {timeLeft}
            </div>
          </div>

          <button
            className="nd-btn nd-btn-ghost nd-btn-sm"
            style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem' }}
            onClick={() => { if (confirm('Leave game?')) onGameEnd(); }}
          >
            ✕ Leave
          </button>
        </div>
      </header>

      {/* Body: two panels */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* MY PANEL */}
        <PlayerPanel
          isMe
          name={me?.name || 'You'}
          label="Player 1"
          status="🟢 Online"
          guessCount={myGuesses.length}
          guesses={myGuesses}
          difficulty={game.difficulty}
          secretLabel="Your secret:"
          myTurn={isMyTurn}
          digits={digits}
          onDigitInput={handleDigitInput}
          onDigitKey={handleDigitKey}
          onSubmit={handleGuessSubmit}
          loading={loading}
          error={error}
          inputEnabled={isMyTurn}
        />

        {/* OPPONENT PANEL */}
        <PlayerPanel
          isMe={false}
          name={opponent?.name || 'Opponent'}
          label="Player 2"
          status="🟢 Online"
          guessCount={opponentGuesses.length}
          guesses={opponentGuesses}
          difficulty={game.difficulty}
          secretLabel="Their secret:"
          myTurn={!isMyTurn}
          digits={[]}
          onDigitInput={() => {}}
          onDigitKey={() => {}}
          onSubmit={() => {}}
          loading={false}
          error=""
          inputEnabled={false}
          isOpponent
        />
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.2rem',
          flexWrap: 'wrap',
          padding: '0.5rem 1.1rem',
          borderTop: '2px solid rgba(26,18,7,0.08)',
          background: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--ff-mono)',
          fontSize: '0.6rem',
          color: '#888',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--teal)' }} />
          Correct digits (total count)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: '#d4a600' }} />
          Correct positions (total count)
        </div>
      </div>
    </div>
  );
}

/* ─── Player Panel ──────────────────────────────────── */
interface PlayerPanelProps {
  isMe: boolean;
  name: string;
  label: string;
  status: string;
  guessCount: number;
  guesses: Guess[];
  difficulty: number;
  secretLabel: string;
  myTurn: boolean;
  digits: string[];
  onDigitInput: (idx: number, val: string, inputs: HTMLInputElement[]) => void;
  onDigitKey: (e: React.KeyboardEvent<HTMLInputElement>, idx: number, inputs: HTMLInputElement[]) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  inputEnabled: boolean;
  isOpponent?: boolean;
}

function PlayerPanel({
  isMe, name, label, status, guessCount, guesses, difficulty,
  secretLabel, myTurn, digits, onDigitInput, onDigitKey,
  onSubmit, loading, error, inputEnabled, isOpponent,
}: PlayerPanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRight: isMe ? '2px solid rgba(26,18,7,0.1)' : 'none',
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(4px)',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: '0.9rem 1rem 0.75rem',
          borderBottom: '2px solid rgba(26,18,7,0.08)',
          background: 'rgba(255,255,255,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
              border: '2.5px solid var(--ink)',
              background: isMe ? 'rgba(255,107,53,0.12)' : 'rgba(0,194,168,0.12)',
              flexShrink: 0,
            }}
          >
            {isMe ? '🧠' : '🤖'}
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {name} <span style={{ fontSize: '0.68rem', fontWeight: 400, color: '#aaa' }}>({label})</span>
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.6rem', color: '#888' }}>{status}</div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--ff-mono)',
              fontSize: '0.6rem',
              padding: '0.15rem 0.45rem',
              borderRadius: 5,
              border: '1.5px solid rgba(26,18,7,0.15)',
              color: '#888',
            }}
          >
            {guessCount} guess{guessCount !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Secret display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.6rem', color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {secretLabel}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array(difficulty).fill(0).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 28, height: 32, borderRadius: 7,
                  border: isMe ? '2px solid rgba(26,18,7,0.15)' : '2px dashed rgba(26,18,7,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--ff-mono)', fontSize: '0.88rem', fontWeight: 700,
                  background: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(26,18,7,0.04)',
                  color: isMe ? 'var(--orange)' : 'rgba(26,18,7,0.2)',
                }}
              >
                {isMe ? '•' : '?'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div
        className="nd-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          minHeight: 0,
        }}
      >
        {guesses.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(26,18,7,0.25)',
              fontFamily: 'var(--ff-mono)',
              fontSize: '0.75rem',
              gap: '0.35rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>{isOpponent ? '⏳' : '💭'}</div>
            <div>{isOpponent ? 'Waiting for opponent…' : 'No guesses yet'}</div>
            {!isOpponent && <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Make your first guess below</div>}
          </div>
        ) : (
          guesses.map((g, idx) => (
            <GuessRow key={idx} guess={g} idx={idx} difficulty={difficulty} />
          ))
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: '2px solid rgba(26,18,7,0.08)',
          background: 'rgba(255,255,255,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
          alignItems: 'center',
        }}
      >
        {isOpponent ? (
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: '#bbb', textAlign: 'center' }}>
            Opponent's input is hidden
          </div>
        ) : (
          <>
            {/* Digit inputs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {digits.map((d, idx) => (
                <input
                  key={idx}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  disabled={!inputEnabled || loading}
                  onChange={e => {
                    const row = e.target.parentElement!;
                    const all = Array.from(row.querySelectorAll('input')) as HTMLInputElement[];
                    onDigitInput(idx, e.target.value, all);
                  }}
                  onKeyDown={e => {
                    const row = e.currentTarget.parentElement!;
                    const all = Array.from(row.querySelectorAll('input')) as HTMLInputElement[];
                    onDigitKey(e, idx, all);
                  }}
                  onFocus={e => e.target.select()}
                  style={{
                    width: 44, height: 56,
                    borderRadius: 12,
                    border: d ? '2px solid rgba(26,18,7,0.35)' : '2px solid rgba(26,18,7,0.2)',
                    background: 'rgba(255,255,255,0.8)',
                    color: d ? 'var(--orange)' : 'var(--ink)',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    outline: 'none',
                    boxShadow: '2px 2px 0 rgba(26,18,7,0.08)',
                    opacity: !inputEnabled ? 0.35 : 1,
                    cursor: !inputEnabled ? 'not-allowed' : 'text',
                    transition: 'border-color 0.15s, transform 0.1s',
                  }}
                />
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={onSubmit}
              disabled={!inputEnabled || loading || digits.join('').length !== difficulty}
              className="nd-btn nd-btn-orange nd-btn-full"
              style={{ fontSize: '0.92rem' }}
            >
              {loading ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                'Submit Guess ↵'
              )}
            </button>

            {/* Hint / error */}
            {error ? (
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.72rem', color: 'var(--red)', textAlign: 'center' }}>
                {error}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.6rem', color: '#aaa', textAlign: 'center' }}>
                {inputEnabled
                  ? `Enter a ${difficulty}-digit number · No repeats`
                  : 'Wait for opponent…'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Guess Row ─────────────────────────────────────── */
function GuessRow({ guess, idx, difficulty }: { guess: Guess; idx: number; difficulty: number }) {
  const isWin = guess.correctPositions === difficulty;
  return (
    <div
      style={{
        background: isWin ? 'rgba(255,210,63,0.12)' : 'rgba(255,255,255,0.75)',
        border: isWin ? '1.5px solid var(--yellow)' : '1.5px solid rgba(26,18,7,0.1)',
        borderRadius: 12,
        padding: '0.6rem 0.7rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        boxShadow: isWin ? '2px 2px 0 rgba(255,210,63,0.4)' : '2px 2px 0 rgba(26,18,7,0.06)',
        animation: 'rowIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        animationDelay: `${idx * 0.04}s`,
      }}
    >
      {/* Top: turn# + plain digit chips (NO coloring) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.58rem', color: '#aaa', minWidth: 16 }}>
          #{idx + 1}
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {guess.guess.split('').map((d, i) => (
            <div
              key={i}
              style={{
                width: 26, height: 30,
                borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--ff-mono)', fontSize: '0.82rem', fontWeight: 700,
                border: '1.5px solid rgba(26,18,7,0.12)',
                background: 'rgba(26,18,7,0.04)',
                color: 'var(--ink)',
              }}
            >
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: two clue cards — ONLY totals, no coloring of individual digits */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <div
          style={{
            flex: 1,
            borderRadius: 8,
            padding: '0.35rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(0,194,168,0.08)',
            border: '1.5px solid rgba(0,194,168,0.3)',
          }}
        >
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem', color: '#007a6b' }}>
            Digits
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1, color: '#007a6b' }}>
            {guess.correctNumbers}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#888', marginTop: '0.15rem' }}>correct</div>
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 8,
            padding: '0.35rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255,210,63,0.12)',
            border: '1.5px solid rgba(255,210,63,0.5)',
          }}
        >
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem', color: '#8a6800' }}>
            Positions
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1, color: '#8a6800' }}>
            {guess.correctPositions}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#888', marginTop: '0.15rem' }}>correct</div>
        </div>
      </div>
    </div>
  );
}
