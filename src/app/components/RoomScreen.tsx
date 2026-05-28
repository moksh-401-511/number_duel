import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createRoom, joinRoom } from '../../utils/api';
import type { Difficulty } from '../../utils/api';

interface RoomScreenProps {
  mode: 'create' | 'join';
  difficulty?: Difficulty;
  playerName: string;
  isGuest: boolean;
  onBack: () => void;
  onRoomCreated?: (gameId: string, playerId: string, roomCode: string) => void;
  onRoomJoined?: (gameId: string, playerId: string) => void;
}

export function RoomScreen({
  mode,
  difficulty = 3,
  playerName,
  isGuest,
  onBack,
  onRoomCreated,
  onRoomJoined,
}: RoomScreenProps) {
  const [roomCode, setRoomCode] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(difficulty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await createRoom(selectedDifficulty, playerName, isGuest);
      onRoomCreated?.(result.gameId, result.playerId, result.roomCode);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) { setError('Please enter a room code'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await joinRoom(roomCode.toUpperCase(), playerName, isGuest);
      onRoomJoined?.(result.gameId, result.playerId);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const difficulties: Array<{ d: Difficulty; label: string; bg: string; activeBg: string; activeColor: string; badgeBg: string; badgeColor: string }> = [
    { d: 3, label: 'Easy',   bg: '#f7f7f7', activeBg: '#E8FFF5', activeColor: '#1a7a4a', badgeBg: 'var(--green)', badgeColor: '#fff' },
    { d: 4, label: 'Medium', bg: '#f7f7f7', activeBg: '#FFF8E1', activeColor: '#8a6800', badgeBg: 'var(--yellow)', badgeColor: 'var(--ink)' },
    { d: 5, label: 'Hard',   bg: '#f7f7f7', activeBg: '#FFF0F0', activeColor: '#b52020', badgeBg: 'var(--red)', badgeColor: '#fff' },
  ];

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
          padding: '1rem 1.5rem',
          borderBottom: '2.5px solid var(--ink)',
          gap: '1rem',
        }}
      >
        <button className="nd-btn nd-btn-ghost nd-btn-sm" onClick={onBack}>
          ← Back
        </button>
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          🎯 <span style={{ color: 'var(--orange)' }}>Number</span> Duel
        </div>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div className="nd-card" style={{ padding: '2rem', maxWidth: 440, width: '100%' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            {mode === 'create' ? '🏠' : '🔑'}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            {mode === 'create' ? 'Create Private Room' : 'Join Private Room'}
          </h2>
          <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            {mode === 'create'
              ? 'Choose a difficulty and share the room code with your friend.'
              : 'Enter the code your friend shared with you.'}
          </p>

          {mode === 'create' ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Select Difficulty
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.65rem' }}>
                  {difficulties.map(({ d, label, activeBg, activeColor, badgeBg, badgeColor }) => {
                    const active = selectedDifficulty === d;
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDifficulty(d)}
                        style={{
                          padding: '1rem 0.5rem',
                          borderRadius: 14,
                          border: active ? '2.5px solid var(--ink)' : '2px solid rgba(26,18,7,0.15)',
                          background: active ? activeBg : 'rgba(255,255,255,0.6)',
                          color: active ? activeColor : '#666',
                          cursor: 'pointer',
                          fontFamily: 'var(--ff-display)',
                          boxShadow: active ? '3px 3px 0 var(--ink)' : 'none',
                          transition: 'all 0.12s',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: active ? badgeBg : 'rgba(26,18,7,0.08)',
                            color: active ? badgeColor : '#999',
                            border: '2px solid var(--ink)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--ff-mono)', fontWeight: 700, fontSize: '1.3rem',
                            margin: '0 auto 0.4rem',
                          }}
                        >
                          {d}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                className="nd-btn nd-btn-orange nd-btn-full"
                onClick={handleCreateRoom}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  '🏠 Create Room'
                )}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', fontWeight: 700, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Room Code
                </div>
                <input
                  type="text"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                  placeholder="ABCDEF"
                  maxLength={6}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '2rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textAlign: 'center',
                    padding: '0.75rem 1rem',
                    border: '2.5px solid var(--ink)',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.8)',
                    outline: 'none',
                    textTransform: 'uppercase',
                    boxSizing: 'border-box',
                    transition: 'box-shadow 0.15s',
                  }}
                  onFocus={e => { e.target.style.boxShadow = '3px 3px 0 var(--ink)'; }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                className="nd-btn nd-btn-orange nd-btn-full"
                onClick={handleJoinRoom}
                disabled={loading || !roomCode.trim()}
              >
                {loading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  '🔑 Join Room →'
                )}
              </button>
            </>
          )}

          {error && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
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
        </div>
      </div>
    </div>
  );
}
