import { useState, useEffect } from 'react';
import { supabase } from '../utils/api';
import { HomeScreen } from './components/HomeScreen';
import { RoomScreen } from './components/RoomScreen';
import { MatchmakingScreen } from './components/MatchmakingScreen';
import { SecretInputScreen } from './components/SecretInputScreen';
import { GameBoard } from './components/GameBoard';
import { ResultScreen } from './components/ResultScreen';
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

  // Check for existing session
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      console.log('Sign in error:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlayerName('');
    setScreen({ type: 'home' });
  };

  return (
    <div className="size-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Room Created!</h2>
            <p className="text-gray-600 mb-4">Share this code with your friend:</p>
            <div className="bg-indigo-100 rounded-lg p-6 mb-6">
              <div className="text-4xl font-bold text-indigo-600 tracking-widest">
                {screen.roomCode}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">Waiting for opponent to join...</p>
            <SecretInputScreen
              gameId={screen.gameId}
              playerId={screen.playerId}
              difficulty={3}
              onSecretSet={(difficulty) =>
                setScreen({ type: 'game', gameId: screen.gameId, playerId: screen.playerId })
              }
              embedded={true}
            />
            <button
              onClick={() => setScreen({ type: 'home' })}
              className="mt-4 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
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
    </div>
  );
}