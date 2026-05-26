import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await joinRoom(roomCode.toUpperCase(), playerName, isGuest);
      // Pass the gameId and playerId - difficulty will be fetched from game state
      onRoomJoined?.(result.gameId, result.playerId);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        {mode === 'create' ? 'Create Private Room' : 'Join Private Room'}
      </h2>

      {mode === 'create' ? (
        <div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedDifficulty(3)}
                className={`py-4 px-4 rounded-lg border-2 transition-colors ${
                  selectedDifficulty === 3
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs">Easy</div>
              </button>
              <button
                onClick={() => setSelectedDifficulty(4)}
                className={`py-4 px-4 rounded-lg border-2 transition-colors ${
                  selectedDifficulty === 4
                    ? 'border-yellow-600 bg-yellow-50 text-yellow-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl font-bold">4</div>
                <div className="text-xs">Medium</div>
              </button>
              <button
                onClick={() => setSelectedDifficulty(5)}
                className={`py-4 px-4 rounded-lg border-2 transition-colors ${
                  selectedDifficulty === 5
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl font-bold">5</div>
                <div className="text-xs">Hard</div>
              </button>
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Room'
            )}
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-2xl tracking-widest text-center font-bold uppercase"
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={loading || !roomCode.trim()}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 px-4 hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Room'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
