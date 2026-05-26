import { Brain, Users, Trophy, LogIn, LogOut } from 'lucide-react';
import type { Difficulty } from '../../utils/api';

interface HomeScreenProps {
  user: any;
  playerName: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onCreateRoom: (difficulty: Difficulty) => void;
  onJoinRoom: () => void;
  onMatchmaking: (difficulty: Difficulty) => void;
}

export function HomeScreen({
  user,
  playerName,
  onSignIn,
  onSignOut,
  onCreateRoom,
  onJoinRoom,
  onMatchmaking,
}: HomeScreenProps) {
  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Brain className="w-12 h-12 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Number Guessing Duel
        </h1>
        <p className="text-gray-600">
          Deduce your opponent's secret number before they find yours!
        </p>
      </div>

      <div className="mb-6">
        {user ? (
          <div className="bg-indigo-50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">
                Signed in as {playerName}
              </span>
            </div>
            <button
              onClick={onSignOut}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <LogIn className="w-5 h-5 mr-2" />
            <span className="font-medium">Sign in with Google to track stats</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <Users className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Private Room</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Create a room and share the code with a friend
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onCreateRoom(3)}
              className="bg-indigo-600 text-white rounded-lg py-2 px-4 hover:bg-indigo-700 transition-colors font-medium"
            >
              Create Room
            </button>
            <button
              onClick={onJoinRoom}
              className="bg-gray-600 text-white rounded-lg py-2 px-4 hover:bg-gray-700 transition-colors font-medium"
            >
              Join Room
            </button>
          </div>
        </div>

        <div className="border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <Brain className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Quick Match</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Find a random opponent by difficulty
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onMatchmaking(3)}
              className="bg-green-600 text-white rounded-lg py-3 px-4 hover:bg-green-700 transition-colors font-medium"
            >
              <div className="text-2xl font-bold">3</div>
              <div className="text-xs">Easy</div>
            </button>
            <button
              onClick={() => onMatchmaking(4)}
              className="bg-yellow-600 text-white rounded-lg py-3 px-4 hover:bg-yellow-700 transition-colors font-medium"
            >
              <div className="text-2xl font-bold">4</div>
              <div className="text-xs">Medium</div>
            </button>
            <button
              onClick={() => onMatchmaking(5)}
              className="bg-red-600 text-white rounded-lg py-3 px-4 hover:bg-red-700 transition-colors font-medium"
            >
              <div className="text-2xl font-bold">5</div>
              <div className="text-xs">Hard</div>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold text-gray-900 mb-2 text-sm">How to Play:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Both players select a secret number with unique digits</li>
          <li>• Take turns guessing each other's number</li>
          <li>• Get clues: Correct Numbers & Correct Positions</li>
          <li>• First to guess the exact number wins!</li>
          <li>• Each turn has a 30-second timer</li>
        </ul>
      </div>
    </div>
  );
}
