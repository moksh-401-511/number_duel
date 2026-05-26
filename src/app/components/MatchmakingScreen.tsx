import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
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

  const difficultyLabels = {
    3: { name: 'Easy', color: 'green' },
    4: { name: 'Medium', color: 'yellow' },
    5: { name: 'Hard', color: 'red' },
  };

  const { name, color } = difficultyLabels[difficulty];

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-xl p-8">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <div className="text-center">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
          <button
            onClick={onBack}
            className="mt-4 bg-gray-600 text-white rounded-lg py-2 px-6 hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Cancel
      </button>

      <div className="text-center">
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <Users className="w-16 h-16 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Finding Opponent...
          </h2>
          <p className="text-gray-600">
            Searching for a {name} ({difficulty} digits) match
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse delay-100"></div>
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse delay-200"></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-700">
            You'll be matched with another player looking for a {name} game.
            This should only take a few seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
