// API client for Number Guessing Duel backend
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/server/make-server-16400ba4`;

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// Types
export type Difficulty = 3 | 4 | 5;

export interface Player {
  id: string;
  name: string;
  isGuest: boolean;
  secretNumber?: string;
  timeouts: number;
  lastSeen: number;
}

export interface Guess {
  playerId: string;
  guess: string;
  correctNumbers: number;
  correctPositions: number;
  timestamp: number;
}

export interface GameState {
  gameId: string;
  roomCode?: string;
  difficulty: Difficulty;
  status: 'waiting' | 'setting_secrets' | 'playing' | 'finished';
  players: [Player, Player?];
  currentTurn?: string;
  turnStartTime?: number;
  guesses: Guess[];
  winner?: string;
  winReason?: 'guessed' | 'opponent_timeout' | 'opponent_disconnected';
  createdAt: number;
  isMatchmaking: boolean;
}

export interface UserStats {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
}

// API functions
export async function createRoom(difficulty: Difficulty, playerName?: string, isGuest = true) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/room/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ difficulty, playerName, isGuest }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room');
  }

  return await response.json();
}

export async function joinRoom(roomCode: string, playerName?: string, isGuest = true) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/room/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ roomCode, playerName, isGuest }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join room');
  }

  return await response.json();
}

export async function joinMatchmaking(difficulty: Difficulty, playerName?: string, isGuest = true) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/matchmaking/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ difficulty, playerName, isGuest }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join matchmaking');
  }

  return await response.json();
}

export async function checkMatchmakingStatus(playerId: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/matchmaking/status/${playerId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check status');
  }

  return await response.json();
}

export async function setSecret(gameId: string, playerId: string, secret: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/game/${gameId}/secret`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ playerId, secret }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set secret');
  }

  return await response.json();
}

export async function makeGuess(gameId: string, playerId: string, guess: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/game/${gameId}/guess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ playerId, guess }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to make guess');
  }

  return await response.json();
}

export async function getGameState(gameId: string, playerId: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/game/${gameId}?playerId=${playerId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get game state');
  }

  return await response.json();
}

export async function getUserStats(userId: string) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/stats/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get stats');
  }

  return await response.json();
}
