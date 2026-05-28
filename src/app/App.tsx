import { useState, useEffect } from 'react';
import { supabase } from '../utils/api';
import { HomeScreen } from './components/HomeScreen';
import { RoomScreen } from './components/RoomScreen';
import { MatchmakingScreen } from './components/MatchmakingScreen';
import { SecretInputScreen } from './components/SecretInputScreen';
import { GameBoard } from './components/GameBoard';
import { ResultScreen } from './components/ResultScreen';
import { Loader2 } from 'lucide-react';
import type { GameState, Difficulty } from '../utils/api';

type Screen =
  | { type: 'home' }
  | { type: 'create-room'; difficulty: Difficulty }
  | { type: 'join-room' }
  | { type: 'matchmaking'; difficulty: Difficulty }
  | { type: 'room-waiting'; gameId: string; playerId: string; roomCode: string }
  | { type: 'matchmaking-waiting'; playerId: string; difficulty: Difficulty }
  | { type: 'secret-input'; gameId: string; playerId: string; difficulty: Difficulty }
  | { type: 'game'; gameId: string; playerId: string }
  | { type: 'result'; gameId: string; playerId: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const [user, setUser] = useState<any>(null);
  const [playerName, setPlayerName] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setPlayerName(session.user.user_metadata?.name || session.user.email?.split('@')[0] || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setPlayerName(session.user.user_metadata?.name || session.user.email?.split('@')[0] || '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) console.log('Sign in error:', error);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlayerName('');
    setScreen({ type: 'home' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {screen.type === 'home' && (
        <HomeScreen
          user={user}
          playerName={playerName}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onCreateRoom={(difficulty) => setScreen({ type: 'create-room', difficulty })}
          onJoinRoom={() => setScreen({ type: 'join-room' })}
          onMatchmaking={(difficulty) => setScreen({ type: 'matchmaking', difficulty })}
        />
      )}

      {screen.type === 'create-room' && (
        <RoomScreen
          mode="create"
          difficulty={screen.difficulty}
          playerName={playerName}
          isGuest={!user}
          onBack={() => setScreen({ type: 'home' })}
          onRoomCreated={(gameId, playerId, roomCode) =>
            setScreen({ type: 'room-waiting', gameId, playerId, roomCode })
          }
        />
      )}

      {screen.type === 'join-room' && (
        <RoomScreen
          mode="join"
          playerName={playerName}
          isGuest={!user}
          onBack={() => setScreen({ type: 'home' })}
          onRoomJoined={(gameId, playerId) =>
            setScreen({ type: 'secret-input', gameId, playerId, difficulty: 3 })
          }
        />
      )}

      {screen.type === 'matchmaking' && (
        <MatchmakingScreen
          difficulty={screen.difficulty}
          playerName={playerName}
          isGuest={!user}
          onBack={() => setScreen({ type: 'home' })}
          onMatchFound={(gameId, playerId, difficulty) =>
            setScreen({ type: 'secret-input', gameId, playerId, difficulty })
          }
        />
      )}

      {screen.type === 'room-waiting' && (
        <div
          style={{
            minHeight: '100vh',
            background: 'var(--cream)',
            fontFamily: 'var(--ff-display)',
            color: 'var(--ink)',
          }}
        >
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

          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ maxWidth: 440, width: '100%' }}>
              <div
                className="nd-card"
                style={{ padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏠</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.4rem' }}>Room Created!</h2>
                <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                  Share this code with your friend to start the duel
                </p>

                {/* Room code */}
                <div
                  style={{
                    background: 'rgba(255,107,53,0.06)',
                    border: '2.5px solid var(--ink)',
                    borderRadius: 16,
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Room Code
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: 'var(--orange)',
                      letterSpacing: '0.2em',
                    }}
                  >
                    {screen.roomCode}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#888', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Waiting for opponent to join…
                </div>
              </div>

              <SecretInputScreen
                gameId={screen.gameId}
                playerId={screen.playerId}
                difficulty={3}
                onSecretSet={() =>
                  setScreen({ type: 'game', gameId: screen.gameId, playerId: screen.playerId })
                }
                embedded={true}
              />

              <button
                className="nd-btn nd-btn-ghost nd-btn-full"
                onClick={() => setScreen({ type: 'home' })}
                style={{ marginTop: '0.75rem', justifyContent: 'center' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {screen.type === 'secret-input' && (
        <SecretInputScreen
          gameId={screen.gameId}
          playerId={screen.playerId}
          difficulty={screen.difficulty}
          onSecretSet={(difficulty) =>
            setScreen({ type: 'game', gameId: screen.gameId, playerId: screen.playerId })
          }
        />
      )}

      {screen.type === 'game' && (
        <GameBoard
          gameId={screen.gameId}
          playerId={screen.playerId}
          onGameEnd={() =>
            setScreen({ type: 'result', gameId: screen.gameId, playerId: screen.playerId })
          }
        />
      )}

      {screen.type === 'result' && (
        <ResultScreen
          gameId={screen.gameId}
          playerId={screen.playerId}
          userId={user?.id}
          onPlayAgain={() => setScreen({ type: 'home' })}
        />
      )}
    </div>
  );
}
