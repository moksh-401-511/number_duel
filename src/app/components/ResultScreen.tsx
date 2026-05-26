import { useState, useEffect } from 'react';
import { Trophy, Target, Clock, WifiOff, Home, Loader2, TrendingUp } from 'lucide-react';
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
      <div className="bg-white rounded-lg shadow-xl p-8 text-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading results...</p>
      </div>
    );
  }

  const isWinner = game.winner === playerId;
  const opponent = game.players.find(p => p?.id !== playerId);
  const me = game.players.find(p => p?.id === playerId);

  const winReasonText = {
    guessed: isWinner ? 'You guessed their secret number!' : 'They guessed your secret number',
    opponent_timeout: isWinner ? 'Opponent timed out 3 times' : 'You timed out 3 times',
    opponent_disconnected: isWinner ? 'Opponent disconnected' : 'You disconnected',
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="mb-6">
          {isWinner ? (
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-20 h-20 text-yellow-500" />
            </div>
          ) : (
            <div className="flex items-center justify-center mb-4">
              <Target className="w-20 h-20 text-gray-400" />
            </div>
          )}
          <h2 className={`text-4xl font-bold mb-2 ${isWinner ? 'text-green-600' : 'text-gray-700'}`}>
            {isWinner ? 'You Win!' : 'You Lost'}
          </h2>
          <p className="text-gray-600 text-lg">
            {game.winReason && winReasonText[game.winReason]}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${isWinner ? 'bg-green-50 border-2 border-green-600' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-1">You</div>
            <div className="font-bold text-xl">{me?.name}</div>
            {me?.secretNumber && (
              <div className="mt-2 text-sm text-gray-600">
                Your secret: <span className="font-mono font-bold text-lg">{me.secretNumber}</span>
              </div>
            )}
          </div>
          <div className={`p-4 rounded-lg ${!isWinner ? 'bg-red-50 border-2 border-red-600' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600 mb-1">Opponent</div>
            <div className="font-bold text-xl">{opponent?.name}</div>
            {opponent?.secretNumber && (
              <div className="mt-2 text-sm text-gray-600">
                Their secret: <span className="font-mono font-bold text-lg">{opponent.secretNumber}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Game Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Your Guesses</div>
              <div className="text-2xl font-bold text-indigo-600">
                {game.guesses.filter(g => g.playerId === playerId).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Their Guesses</div>
              <div className="text-2xl font-bold text-indigo-600">
                {game.guesses.filter(g => g.playerId !== playerId).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Difficulty</div>
              <div className="text-2xl font-bold text-indigo-600">{game.difficulty}</div>
            </div>
          </div>
        </div>

        {stats && (
          <div className="bg-indigo-50 rounded-lg p-4 mb-6 border-2 border-indigo-600">
            <div className="flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
              <h3 className="font-bold text-indigo-900">Your Stats</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-indigo-700">Games Played</div>
                <div className="text-2xl font-bold text-indigo-900">{stats.gamesPlayed}</div>
              </div>
              <div>
                <div className="text-indigo-700">Wins</div>
                <div className="text-2xl font-bold text-green-600">{stats.wins}</div>
              </div>
              <div>
                <div className="text-indigo-700">Win Rate</div>
                <div className="text-2xl font-bold text-indigo-900">
                  {stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onPlayAgain}
          className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center"
        >
          <Home className="w-5 h-5 mr-2" />
          Play Again
        </button>
      </div>
    </div>
  );
}
