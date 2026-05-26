import { useState, useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';
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
  const [secret, setSecretValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const result = await getGameState(gameId, playerId);
        const game: GameState = result.game;
        setDifficulty(game.difficulty);

        const player = game.players.find(p => p?.id === playerId);
        if (player?.secretNumber) {
          setWaitingForOpponent(true);
        }
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

        if (game.status === 'playing') {
          onSecretSet(game.difficulty);
        }
      } catch (err: any) {
        console.log('Error polling game state:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [waitingForOpponent, gameId, playerId, onSecretSet]);

  const handleSubmit = async () => {
    if (secret.length !== difficulty) {
      setError(`Secret must be exactly ${difficulty} digits`);
      return;
    }

    const digits = secret.split('');
    const uniqueDigits = new Set(digits);
    if (uniqueDigits.size !== digits.length) {
      setError('All digits must be unique');
      return;
    }

    if (!/^\d+$/.test(secret)) {
      setError('Secret must contain only digits');
      return;
    }

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

  const handleInputChange = (value: string) => {
    const filtered = value.replace(/\D/g, '').slice(0, difficulty);
    setSecretValue(filtered);
    setError('');
  };

  if (waitingForOpponent) {
    return (
      <div className={embedded ? '' : 'bg-white rounded-lg shadow-xl p-8'}>
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Secret Number Set!
          </h3>
          <p className="text-gray-600">Waiting for opponent to set their secret...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'bg-white rounded-lg shadow-xl p-8'}>
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Lock className="w-12 h-12 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Secret Number
        </h2>
        <p className="text-gray-600">
          Select {difficulty} unique digits (0-9) for your secret number
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={secret}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={'0'.repeat(difficulty)}
          maxLength={difficulty}
          className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-4xl tracking-widest text-center font-bold"
          disabled={loading}
        />
        <div className="mt-2 text-sm text-gray-600 text-center">
          {secret.length}/{difficulty} digits
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-gray-900 mb-2 text-sm">Rules:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• All {difficulty} digits must be different</li>
          <li>• Only use digits 0-9</li>
          <li>• Remember your number - you won't see it during the game!</li>
        </ul>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || secret.length !== difficulty}
        className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Setting Secret...
          </>
        ) : (
          'Set Secret Number'
        )}
      </button>
    </div>
  );
}
