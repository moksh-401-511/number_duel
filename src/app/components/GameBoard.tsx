import { useState, useEffect } from 'react';
import { Timer, Target, CheckCircle, Loader2 } from 'lucide-react';
import { makeGuess, getGameState } from '../../utils/api';
import type { GameState, Guess } from '../../utils/api';

interface GameBoardProps {
  gameId: string;
  playerId: string;
  onGameEnd: () => void;
}

export function GameBoard({ gameId, playerId, onGameEnd }: GameBoardProps) {
  const [game, setGame] = useState<GameState | null>(null);
  const [guess, setGuess] = useState('');
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

  // Timer countdown
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

    if (guess.length !== game.difficulty) {
      setError(`Guess must be exactly ${game.difficulty} digits`);
      return;
    }

    const digits = guess.split('');
    const uniqueDigits = new Set(digits);
    if (uniqueDigits.size !== digits.length) {
      setError('All digits must be unique');
      return;
    }

    if (!/^\d+$/.test(guess)) {
      setError('Guess must contain only digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await makeGuess(gameId, playerId, guess);
      setGame(result.game);
      setGuess('');

      if (result.game.status === 'finished') {
        setTimeout(() => onGameEnd(), 1000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    if (!game) return;
    const filtered = value.replace(/\D/g, '').slice(0, game.difficulty);
    setGuess(filtered);
    setError('');
  };

  if (!game) {
    return (
      <div className="bg-white rounded-lg shadow-xl p-8 text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading game...</p>
      </div>
    );
  }

  const isMyTurn = game.currentTurn === playerId;
  const myGuesses = game.guesses.filter(g => g.playerId === playerId);
  const opponentGuesses = game.guesses.filter(g => g.playerId !== playerId);
  const opponent = game.players.find(p => p?.id !== playerId);
  const me = game.players.find(p => p?.id === playerId);

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">
              {game.difficulty} Digits Game
            </h2>
          </div>
          {isMyTurn && (
            <div className="flex items-center bg-indigo-100 rounded-lg px-4 py-2">
              <Timer className="w-5 h-5 text-indigo-600 mr-2" />
              <span className={`font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-indigo-600'}`}>
                {timeLeft}s
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-4 rounded-lg ${isMyTurn ? 'bg-indigo-50 border-2 border-indigo-600' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-1">You</div>
            <div className="font-bold text-lg">{me?.name}</div>
            <div className="text-sm text-gray-500 mt-1">
              Timeouts: {me?.timeouts || 0}/3
            </div>
          </div>
          <div className={`p-4 rounded-lg ${!isMyTurn ? 'bg-indigo-50 border-2 border-indigo-600' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-1">Opponent</div>
            <div className="font-bold text-lg">{opponent?.name || 'Waiting...'}</div>
            <div className="text-sm text-gray-500 mt-1">
              Timeouts: {opponent?.timeouts || 0}/3
            </div>
          </div>
        </div>
      </div>

      {isMyTurn ? (
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-600">
          <h3 className="font-bold text-indigo-900 mb-3">Your Turn - Make a Guess!</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={'0'.repeat(game.difficulty)}
              maxLength={game.difficulty}
              className="flex-1 px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-600 text-2xl tracking-widest text-center font-bold"
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && guess.length === game.difficulty && !loading) {
                  handleGuessSubmit();
                }
              }}
            />
            <button
              onClick={handleGuessSubmit}
              disabled={loading || guess.length !== game.difficulty}
              className="bg-indigo-600 text-white rounded-lg px-6 hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Submit'
              )}
            </button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600">{error}</div>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
          <h3 className="font-bold text-gray-700 text-center">
            Waiting for {opponent?.name}'s turn...
          </h3>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Your Guesses ({myGuesses.length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {myGuesses.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                No guesses yet
              </div>
            ) : (
              myGuesses.map((g, i) => (
                <GuessRow key={i} guess={g} difficulty={game.difficulty} />
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center">
            <Target className="w-5 h-5 mr-2 text-red-600" />
            Opponent's Guesses ({opponentGuesses.length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {opponentGuesses.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                No guesses yet
              </div>
            ) : (
              opponentGuesses.map((g, i) => (
                <GuessRow key={i} guess={g} difficulty={game.difficulty} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuessRow({ guess, difficulty }: { guess: Guess; difficulty: number }) {
  const isWin = guess.correctPositions === difficulty;

  return (
    <div className={`p-3 rounded-lg border-2 ${isWin ? 'bg-green-50 border-green-600' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold tracking-widest">{guess.guess}</div>
        <div className="flex gap-3">
          <div className="text-center">
            <div className="text-xs text-gray-600">Numbers</div>
            <div className="text-lg font-bold text-blue-600">{guess.correctNumbers}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600">Positions</div>
            <div className="text-lg font-bold text-green-600">{guess.correctPositions}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
