import { useState, useEffect } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { getGameState, getUserStats } from '../../utils/api';
import type { GameState, UserStats } from '../../utils/api';

interface ResultScreenProps {
  gameId: string;
  playerId: string;
  userId?: string;
  onPlayAgain: () => void;
}

export function ResultScreen({ gameId, playerId, userId, onPlayAgain }: ResultScreenProps) {
  const [game, setGame] = useState<GameState | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gameResult = await getGameState(gameId, playerId);
        setGame(gameResult.game);
        if (userId) {
          const statsResult = await getUserStats(userId);
          setStats(statsResult);
        }
      } catch (err: any) {
        console.log('Error fetching result:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [gameId, playerId, userId]);

  if (loading || !game) {
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
          <p style={{ color: '#666' }}>Loading results…</p>
        </div>
      </div>
    );
  }

  const isWinner = game.winner === playerId;
  const opponent = game.players.find(p => p?.id !== playerId);
  const me = game.players.find(p => p?.id === playerId);
  const myGuessCount = game.guesses.filter(g => g.playerId === playerId).length;
  const oppGuessCount = game.guesses.filter(g => g.playerId !== playerId).length;

  const winReasonText: Record<string, string> = {
    guessed: isWinner ? 'You cracked their secret number! 🎉' : 'They cracked your secret number.',
    opponent_timeout: isWinner ? 'Opponent timed out 3 times.' : 'You timed out 3 times.',
    opponent_disconnected: isWinner ? 'Opponent disconnected.' : 'You disconnected.',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        fontFamily: 'var(--ff-display)',
        color: 'var(--ink)',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '2.5px solid var(--ink)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          🎯 <span style={{ color: 'var(--orange)' }}>Number</span> Duel
        </div>
      </nav>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: 480, width: '100%' }}>

          {/* Winner banner */}
          <div
            className="nd-card"
            style={{
              padding: '2rem',
              textAlign: 'center',
              marginBottom: '1rem',
              background: isWinner
                ? 'linear-gradient(135deg, rgba(255,210,63,0.15) 0%, rgba(46,204,113,0.1) 100%)'
                : 'rgba(255,255,255,0.5)',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem', lineHeight: 1 }}>
              {isWinner ? '🏆' : '💀'}
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 8vw, 3rem)',
                fontWeight: 700,
                color: isWinner ? 'var(--green)' : '#888',
                marginBottom: '0.35rem',
                lineHeight: 1,
              }}
            >
              {isWinner ? 'You Win!' : 'You Lost'}
            </h2>
            <p style={{ color: '#666', fontSize: '0.92rem', marginBottom: 0 }}>
              {game.winReason && winReasonText[game.winReason]}
            </p>
          </div>

          {/* Players */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'You', player: me, highlight: isWinner, emoji: '🧠' },
              { label: 'Opponent', player: opponent, highlight: !isWinner, emoji: '🤖' },
            ].map(({ label, player, highlight, emoji }) => (
              <div
                key={label}
                className="nd-card"
                style={{
                  padding: '1.1rem',
                  background: highlight
                    ? isWinner
                      ? 'rgba(46,204,113,0.08)'
                      : 'rgba(255,51,51,0.06)'
                    : 'rgba(255,255,255,0.5)',
                  borderColor: highlight ? (isWinner ? 'var(--green)' : 'var(--red)') : 'var(--ink)',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{emoji}</div>
                <div style={{ fontSize: '0.72rem', color: '#999', marginBottom: '0.15rem' }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem' }}>
                  {player?.name || '—'}
                </div>
                {player?.secretNumber && (
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', color: '#888' }}>
                    Secret: <span style={{ fontWeight: 700, color: 'var(--orange)', fontSize: '0.85rem' }}>{player.secretNumber}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Game summary */}
          <div className="nd-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>📊 Game Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', textAlign: 'center' }}>
              {[
                { label: 'Your Guesses', value: myGuessCount, color: 'var(--orange)' },
                { label: 'Their Guesses', value: oppGuessCount, color: 'var(--teal)' },
                { label: 'Difficulty', value: game.difficulty, color: 'var(--ink)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '0.75rem 0.5rem', background: 'rgba(26,18,7,0.03)', borderRadius: 10 }}>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.25rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div
              className="nd-card"
              style={{
                padding: '1.25rem',
                marginBottom: '1rem',
                background: 'rgba(255,107,53,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 700, fontSize: '0.95rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--orange)' }} /> Your Stats
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', textAlign: 'center' }}>
                {[
                  { label: 'Games', value: stats.gamesPlayed, color: 'var(--ink)' },
                  { label: 'Wins', value: stats.wins, color: 'var(--green)' },
                  {
                    label: 'Win Rate',
                    value: `${stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%`,
                    color: 'var(--orange)',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: '0.75rem 0.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>
                      {value}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.25rem' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button className="nd-btn nd-btn-orange nd-btn-full nd-btn-lg" onClick={onPlayAgain}>
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
