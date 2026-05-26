import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.ts";
import { generateRoomCode, isValidSecret, calculateClues, isWinningGuess, generateGuestName, shouldTimeout, shouldDisconnect } from "./game-logic.ts";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));
// Enable CORS for all routes and methods
app.use("/*", cors({
  origin: "*",
  allowHeaders: [
    "Content-Type",
    "Authorization"
  ],
  allowMethods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],
  exposeHeaders: [
    "Content-Length"
  ],
  maxAge: 600
}));
// Supabase client for auth
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Health check endpoint
app.get("/server/make-server-16400ba4/health", (c)=>{
  return c.json({
    status: "ok"
  });
});
// Create a private room
app.post("/server/make-server-16400ba4/room/create", async (c)=>{
  try {
    const { difficulty, playerName, isGuest } = await c.req.json();
    if (![
      3,
      4,
      5
    ].includes(difficulty)) {
      return c.json({
        error: "Invalid difficulty"
      }, 400);
    }
    const roomCode = generateRoomCode();
    const gameId = `room-${roomCode}`;
    const player = {
      id: crypto.randomUUID(),
      name: playerName || generateGuestName(),
      isGuest,
      timeouts: 0,
      lastSeen: Date.now()
    };
    const game = {
      gameId,
      roomCode,
      difficulty,
      status: 'waiting',
      players: [
        player
      ],
      guesses: [],
      createdAt: Date.now(),
      isMatchmaking: false
    };
    await kv.set(`game:${gameId}`, game);
    return c.json({
      gameId,
      roomCode,
      playerId: player.id,
      game
    });
  } catch (error) {
  console.error("Error creating room:", error);

  return c.json({
    error: "Failed to create room",
    details: String(error)
  }, 500);
}
});
// Join a private room
app.post("/server/make-server-16400ba4/room/join", async (c)=>{
  try {
    const { roomCode, playerName, isGuest } = await c.req.json();
    if (!roomCode) {
      return c.json({
        error: "Room code required"
      }, 400);
    }
    const gameId = `room-${roomCode.toUpperCase()}`;
    const game = await kv.get(`game:${gameId}`);
    if (!game) {
      return c.json({
        error: "Room not found"
      }, 404);
    }
    if (game.players.length === 2) {
      return c.json({
        error: "Room is full"
      }, 400);
    }
    if (game.status !== 'waiting') {
      return c.json({
        error: "Game already started"
      }, 400);
    }
    const player = {
      id: crypto.randomUUID(),
      name: playerName || generateGuestName(),
      isGuest,
      timeouts: 0,
      lastSeen: Date.now()
    };
    game.players.push(player);
    game.status = 'setting_secrets';
    await kv.set(`game:${gameId}`, game);
    return c.json({
      gameId,
      playerId: player.id,
      game
    });
  } catch (error) {
    console.log("Error joining room:", error);
    return c.json({
      error: "Failed to join room"
    }, 500);
  }
});
// Join matchmaking queue
app.post("/server/make-server-16400ba4/matchmaking/join", async (c)=>{
  try {
    const { difficulty, playerName, isGuest } = await c.req.json();
    if (![
      3,
      4,
      5
    ].includes(difficulty)) {
      return c.json({
        error: "Invalid difficulty"
      }, 400);
    }
    const queueKey = `queue:${difficulty}`;
    const queue = await kv.get(queueKey) || [];
    const player = {
      id: crypto.randomUUID(),
      name: playerName || generateGuestName(),
      isGuest,
      timeouts: 0,
      lastSeen: Date.now()
    };
    // Check if there's someone waiting in queue
    if (queue.length > 0) {
      const waitingPlayerId = queue.shift();
      const waitingPlayer = await kv.get(`player:${waitingPlayerId}`);
      if (!waitingPlayer) {
        // Player left queue, try again
        await kv.set(queueKey, queue);
        return c.json({
          status: 'queued',
          playerId: player.id
        });
      }
      // Create game with both players
      const gameId = `match-${crypto.randomUUID()}`;
      const game = {
        gameId,
        difficulty,
        status: 'setting_secrets',
        players: [
          waitingPlayer,
          player
        ],
        guesses: [],
        createdAt: Date.now(),
        isMatchmaking: true
      };
      await kv.set(`game:${gameId}`, game);
      await kv.del(`player:${waitingPlayerId}`);
      await kv.set(queueKey, queue);
      return c.json({
        gameId,
        playerId: player.id,
        game
      });
    } else {
      // Add to queue
      queue.push(player.id);
      await kv.set(queueKey, queue);
      await kv.set(`player:${player.id}`, player);
      return c.json({
        status: 'queued',
        playerId: player.id
      });
    }
  } catch (error) {
    console.log("Error joining matchmaking:", error);
    return c.json({
      error: "Failed to join matchmaking"
    }, 500);
  }
});
// Check matchmaking status (poll for game)
app.get("/server/make-server-16400ba4/matchmaking/status/:playerId", async (c)=>{
  try {
    const playerId = c.req.param('playerId');
    // Check if player was matched
    const games = await kv.getByPrefix('game:match-');
    for (const game of games){
      if (game.players.some((p)=>p?.id === playerId)) {
        await kv.del(`player:${playerId}`);
        return c.json({
          status: 'matched',
          gameId: game.gameId,
          game
        });
      }
    }
    return c.json({
      status: 'queued'
    });
  } catch (error) {
    console.log("Error checking matchmaking status:", error);
    return c.json({
      error: "Failed to check status"
    }, 500);
  }
});
// Set secret number
app.post("/server/make-server-16400ba4/game/:gameId/secret", async (c)=>{
  try {
    const gameId = c.req.param('gameId');
    const { playerId, secret } = await c.req.json();
    const game = await kv.get(`game:${gameId}`);
    if (!game) {
      return c.json({
        error: "Game not found"
      }, 404);
    }
    if (game.status !== 'setting_secrets') {
      return c.json({
        error: "Cannot set secret at this time"
      }, 400);
    }
    const player = game.players.find((p)=>p?.id === playerId);
    if (!player) {
      return c.json({
        error: "Player not in game"
      }, 403);
    }
    if (!isValidSecret(secret, game.difficulty)) {
      return c.json({
        error: "Invalid secret number"
      }, 400);
    }
    player.secretNumber = secret;
    player.lastSeen = Date.now();
    // Check if both players have set secrets
    if (game.players.length === 2 && game.players.every((p)=>p?.secretNumber)) {
      game.status = 'playing';
      // Randomly select first player
      game.currentTurn = game.players[Math.floor(Math.random() * 2)].id;
      game.turnStartTime = Date.now();
    }
    await kv.set(`game:${gameId}`, game);
    return c.json({
      success: true,
      game
    });
  } catch (error) {
    console.log("Error setting secret:", error);
    return c.json({
      error: "Failed to set secret"
    }, 500);
  }
});
// Make a guess
app.post("/server/make-server-16400ba4/game/:gameId/guess", async (c)=>{
  try {
    const gameId = c.req.param('gameId');
    const { playerId, guess } = await c.req.json();
    const game = await kv.get(`game:${gameId}`);
    if (!game) {
      return c.json({
        error: "Game not found"
      }, 404);
    }
    if (game.status !== 'playing') {
      return c.json({
        error: "Game is not in progress"
      }, 400);
    }
    if (game.currentTurn !== playerId) {
      return c.json({
        error: "Not your turn"
      }, 403);
    }
    const player = game.players.find((p)=>p?.id === playerId);
    const opponent = game.players.find((p)=>p?.id !== playerId);
    if (!player || !opponent) {
      return c.json({
        error: "Invalid game state"
      }, 500);
    }
    if (!isValidSecret(guess, game.difficulty)) {
      return c.json({
        error: "Invalid guess"
      }, 400);
    }
    player.lastSeen = Date.now();
    // Calculate clues
    const clues = calculateClues(guess, opponent.secretNumber);
    const guessRecord = {
      playerId,
      guess,
      correctNumbers: clues.correctNumbers,
      correctPositions: clues.correctPositions,
      timestamp: Date.now()
    };
    game.guesses.push(guessRecord);
    // Check for win
    if (isWinningGuess(clues.correctPositions, game.difficulty)) {
      game.status = 'finished';
      game.winner = playerId;
      game.winReason = 'guessed';
      // Update stats for both players
      if (!player.isGuest) {
        await updateStats(playerId, true);
      }
      if (!opponent.isGuest) {
        await updateStats(opponent.id, false);
      }
    } else {
      // Switch turns
      game.currentTurn = opponent.id;
      game.turnStartTime = Date.now();
    }
    await kv.set(`game:${gameId}`, game);
    return c.json({
      success: true,
      game,
      clues
    });
  } catch (error) {
    console.log("Error making guess:", error);
    return c.json({
      error: "Failed to make guess"
    }, 500);
  }
});
// Get game state
app.get("/server/make-server-16400ba4/game/:gameId", async (c)=>{
  try {
    const gameId = c.req.param('gameId');
    const playerId = c.req.query('playerId');
    const game = await kv.get(`game:${gameId}`);
    if (!game) {
      return c.json({
        error: "Game not found"
      }, 404);
    }
    // Update player's last seen
    if (playerId) {
      const player = game.players.find((p)=>p?.id === playerId);
      if (player) {
        player.lastSeen = Date.now();
        await kv.set(`game:${gameId}`, game);
      }
    }
    // Check for timeout
    if (game.status === 'playing' && shouldTimeout(game)) {
      await handleTimeout(game);
      await kv.set(`game:${gameId}`, game);
    }
    // Check for disconnection
    if (game.status === 'playing') {
      for (const player of game.players){
        if (player && shouldDisconnect(player) && player.id !== playerId) {
          game.status = 'finished';
          game.winner = playerId;
          game.winReason = 'opponent_disconnected';
          await kv.set(`game:${gameId}`, game);
          break;
        }
      }
    }
    return c.json({
      game
    });
  } catch (error) {
    console.log("Error getting game:", error);
    return c.json({
      error: "Failed to get game"
    }, 500);
  }
});
// Get user stats
app.get("/server/make-server-16400ba4/stats/:userId", async (c)=>{
  try {
    const userId = c.req.param('userId');
    const stats = await kv.get(`stats:${userId}`);
    if (!stats) {
      return c.json({
        userId,
        gamesPlayed: 0,
        wins: 0,
        losses: 0
      });
    }
    return c.json(stats);
  } catch (error) {
    console.log("Error getting stats:", error);
    return c.json({
      error: "Failed to get stats"
    }, 500);
  }
});
// Helper function to handle timeouts
async function handleTimeout(game) {
  const currentPlayer = game.players.find((p)=>p?.id === game.currentTurn);
  const opponent = game.players.find((p)=>p?.id !== game.currentTurn);
  if (!currentPlayer || !opponent) return;
  currentPlayer.timeouts++;
  if (currentPlayer.timeouts >= 3) {
    // Third timeout - player loses
    game.status = 'finished';
    game.winner = opponent.id;
    game.winReason = 'opponent_timeout';
    // Update stats
    if (!currentPlayer.isGuest) {
      await updateStats(currentPlayer.id, false);
    }
    if (!opponent.isGuest) {
      await updateStats(opponent.id, true);
    }
  } else {
    // Skip turn
    game.currentTurn = opponent.id;
    game.turnStartTime = Date.now();
  }
}
// Helper function to update user stats
async function updateStats(userId, won) {
  const stats = await kv.get(`stats:${userId}`) || {
    userId,
    gamesPlayed: 0,
    wins: 0,
    losses: 0
  };
  stats.gamesPlayed++;
  if (won) {
    stats.wins++;
  } else {
    stats.losses++;
  }
  await kv.set(`stats:${userId}`, stats);
}
Deno.serve(app.fetch);
