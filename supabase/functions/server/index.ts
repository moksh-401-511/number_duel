import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.ts";
import {
  generateRoomCode,
  isValidSecret,
  calculateClues,
  isWinningGuess,
  generateGuestName,
  shouldTimeout,
  shouldDisconnect,
} from "./game-logic.ts";

// ─── Supabase DB client (service role — bypasses RLS) ──────────────────────
const db = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

// ─── IP helper ─────────────────────────────────────────────────────────────
function getClientIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||   // Cloudflare
    "unknown"
  );
}

// ─── User-Agent helper ──────────────────────────────────────────────────────
function getUA(c: any): string {
  return c.req.header("user-agent") || "unknown";
}

// ─── Analytics writers ──────────────────────────────────────────────────────

/** Insert / upsert a player record. */
async function upsertPlayer(p: {
  id: string; name: string; isGuest: boolean;
  ipAddress: string; userAgent: string;
}) {
  const { error } = await db().from("nd_players").upsert({
    id:           p.id,
    display_name: p.name,
    is_guest:     p.isGuest,
    ip_address:   p.ipAddress,
    user_agent:   p.userAgent,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) console.error("[upsertPlayer]", error.message);
}

/** Create a game record in nd_games. */
async function insertGame(g: {
  gameId: string; roomCode?: string; difficulty: number;
  isMatchmaking: boolean; createdByIp: string;
}) {
  const { error } = await db().from("nd_games").insert({
    id:             g.gameId,
    room_code:      g.roomCode ?? null,
    difficulty:     g.difficulty,
    is_matchmaking: g.isMatchmaking,
    status:         "waiting",
    created_by_ip:  g.createdByIp,
    created_at:     new Date().toISOString(),
  });
  if (error) console.error("[insertGame]", error.message);
}

/** Add a player → game participation row. */
async function insertParticipant(gameId: string, playerId: string, slot: 1 | 2) {
  const { error } = await db().from("nd_participants").insert({
    game_id:   gameId,
    player_id: playerId,
    slot,
    joined_at: new Date().toISOString(),
  });
  if (error) console.error("[insertParticipant]", error.message);
}

/** Record the secret a player chose. */
async function recordSecret(gameId: string, playerId: string, secret: string) {
  const { error } = await db()
    .from("nd_participants")
    .update({ secret_number: secret, secret_set_at: new Date().toISOString() })
    .eq("game_id", gameId)
    .eq("player_id", playerId);
  if (error) console.error("[recordSecret]", error.message);
}

/** Insert a guess row and return the inserted id. */
async function insertGuess(g: {
  gameId: string; playerId: string; turnNumber: number;
  guess: string; correctNumbers: number; correctPositions: number;
  timeTakenMs: number;
}): Promise<string | null> {
  const { data, error } = await db()
    .from("nd_guesses")
    .insert({
      game_id:           g.gameId,
      player_id:         g.playerId,
      turn_number:       g.turnNumber,
      guess_value:       g.guess,
      correct_numbers:   g.correctNumbers,
      correct_positions: g.correctPositions,
      time_taken_ms:     g.timeTakenMs,
      guessed_at:        new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) { console.error("[insertGuess]", error.message); return null; }
  return data?.id ?? null;
}

/** Finalise game row when it ends. */
async function finaliseGame(g: {
  gameId: string; winnerId: string | null; loserId: string | null;
  endReason: string; totalTurns: number; durationMs: number;
}) {
  const { error } = await db().from("nd_games").update({
    status:       "finished",
    winner_id:    g.winnerId,
    loser_id:     g.loserId,
    end_reason:   g.endReason,
    total_turns:  g.totalTurns,
    duration_ms:  g.durationMs,
    finished_at:  new Date().toISOString(),
  }).eq("id", g.gameId);
  if (error) console.error("[finaliseGame]", error.message);

  // Update participant outcomes
  if (g.winnerId) {
    await db().from("nd_participants")
      .update({ outcome: "win" })
      .eq("game_id", g.gameId)
      .eq("player_id", g.winnerId);
  }
  if (g.loserId) {
    await db().from("nd_participants")
      .update({ outcome: "loss" })
      .eq("game_id", g.gameId)
      .eq("player_id", g.loserId);
  }

  // Update player lifetime stats
  for (const [pid, won] of [[g.winnerId, true], [g.loserId, false]] as [string|null, boolean][]) {
    if (!pid) continue;
    const { error: se } = await db().rpc("nd_increment_stats", {
      p_player_id: pid,
      p_won:       won,
    });
    if (se) console.error("[nd_increment_stats]", se.message);
  }
}

// ─── Hono app ───────────────────────────────────────────────────────────────
const app = new Hono();

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ── Health ──────────────────────────────────────────────────────────────────
app.get("/server/make-server-16400ba4/health", (c) => c.json({ status: "ok" }));

// ── Create private room ─────────────────────────────────────────────────────
app.post("/server/make-server-16400ba4/room/create", async (c) => {
  try {
    const { difficulty, playerName, isGuest } = await c.req.json();
    if (![3, 4, 5].includes(difficulty))
      return c.json({ error: "Invalid difficulty" }, 400);

    const ip       = getClientIp(c);
    const ua       = getUA(c);
    const roomCode = generateRoomCode();
    const gameId   = `room-${roomCode}`;

    const player = {
      id: crypto.randomUUID(),
      name: playerName || generateGuestName(),
      isGuest: !!isGuest,
      timeouts: 0,
      lastSeen: Date.now(),
      joinedAt: Date.now(),
      ipAddress: ip,
    };

    const game = {
      gameId, roomCode, difficulty,
      status: "waiting",
      players: [player],
      guesses: [],
      createdAt: Date.now(),
      isMatchmaking: false,
      createdByIp: ip,
    };

    await kv.set(`game:${gameId}`, game);

    // ── Analytics writes (fire-and-forget, non-blocking) ──
    Promise.all([
      upsertPlayer({ id: player.id, name: player.name, isGuest: player.isGuest, ipAddress: ip, userAgent: ua }),
      insertGame({ gameId, roomCode, difficulty, isMatchmaking: false, createdByIp: ip }),
      insertParticipant(gameId, player.id, 1),
    ]).catch((e) => console.error("[analytics/create]", e));

    return c.json({ gameId, roomCode, playerId: player.id, game });
  } catch (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "Failed to create room", details: String(error) }, 500);
  }
});

// ── Join private room ───────────────────────────────────────────────────────
app.post("/server/make-server-16400ba4/room/join", async (c) => {
  try {
    const { roomCode, playerName, isGuest } = await c.req.json();
    if (!roomCode) return c.json({ error: "Room code required" }, 400);

    const ip     = getClientIp(c);
    const ua     = getUA(c);
    const gameId = `room-${roomCode.toUpperCase()}`;
    const game   = await kv.get(`game:${gameId}`);

    if (!game)                          return c.json({ error: "Room not found" }, 404);
    if (game.players.length === 2)      return c.json({ error: "Room is full" }, 400);
    if (game.status !== "waiting")      return c.json({ error: "Game already started" }, 400);

    const player = {
      id: crypto.randomUUID(),
      name: playerName || generateGuestName(),
      isGuest: !!isGuest,
      timeouts: 0,
      lastSeen: Date.now(),
      joinedAt: Date.now(),
      ipAddress: ip,
    };

    game.players.push(player);
    game.status = "setting_secrets";
    game.joinedAt = Date.now();

    await kv.set(`game:${gameId}`, game);

    // Update nd_games status + record joining player
    Promise.all([
      upsertPlayer({ id: player.id, name: player.name, isGuest: player.isGuest, ipAddress: ip, userAgent: ua }),
      insertParticipant(gameId, player.id, 2),
      db().from("nd_games").update({ status: "setting_secrets", joined_at: new Date().toISOString() }).eq("id", gameId),
    ]).catch((e) => console.error("[analytics/join]", e));

    return c.json({ gameId, playerId: player.id, game });
  } catch (error) {
    console.error("Error joining room:", error);
    return c.json({ error: "Failed to join room" }, 500);
  }
});

// ── Join matchmaking ────────────────────────────────────────────────────────
app.post("/server/make-server-16400ba4/matchmaking/join", async (c) => {
  try {
    const { difficulty, playerName, isGuest } = await c.req.json();
    if (![3, 4, 5].includes(difficulty))
      return c.json({ error: "Invalid difficulty" }, 400);

    const ip       = getClientIp(c);
    const ua       = getUA(c);
    const queueKey = `queue:${difficulty}`;
    const queue    = await kv.get(queueKey) || [];

    const player = {
      id: crypto.randomUUID(),
      name: playerName || generateGuestName(),
      isGuest: !!isGuest,
      timeouts: 0,
      lastSeen: Date.now(),
      joinedAt: Date.now(),
      ipAddress: ip,
    };

    // Always upsert the player record
    upsertPlayer({ id: player.id, name: player.name, isGuest: player.isGuest, ipAddress: ip, userAgent: ua })
      .catch((e) => console.error("[analytics/mm-player]", e));

    if (queue.length > 0) {
      const waitingPlayerId = queue.shift()!;
      const waitingPlayer   = await kv.get(`player:${waitingPlayerId}`);

      if (!waitingPlayer) {
        await kv.set(queueKey, queue);
        await kv.set(`player:${player.id}`, player);
        queue.push(player.id);
        await kv.set(queueKey, queue);
        return c.json({ status: "queued", playerId: player.id });
      }

      const gameId = `match-${crypto.randomUUID()}`;
      const game = {
        gameId, difficulty,
        status: "setting_secrets",
        players: [waitingPlayer, player],
        guesses: [],
        createdAt: Date.now(),
        isMatchmaking: true,
        createdByIp: waitingPlayer.ipAddress || "unknown",
        joinedAt: Date.now(),
      };

      await kv.set(`game:${gameId}`, game);
      await kv.del(`player:${waitingPlayerId}`);
      await kv.set(queueKey, queue);

      // Analytics
      Promise.all([
        insertGame({ gameId, difficulty, isMatchmaking: true, createdByIp: waitingPlayer.ipAddress || "unknown" }),
        insertParticipant(gameId, waitingPlayer.id, 1),
        insertParticipant(gameId, player.id, 2),
        db().from("nd_games").update({ status: "setting_secrets", joined_at: new Date().toISOString() }).eq("id", gameId),
      ]).catch((e) => console.error("[analytics/mm-match]", e));

      return c.json({ gameId, playerId: player.id, game });
    } else {
      queue.push(player.id);
      await kv.set(queueKey, queue);
      await kv.set(`player:${player.id}`, player);
      return c.json({ status: "queued", playerId: player.id });
    }
  } catch (error) {
    console.error("Error joining matchmaking:", error);
    return c.json({ error: "Failed to join matchmaking" }, 500);
  }
});

// ── Matchmaking status poll ─────────────────────────────────────────────────
app.get("/server/make-server-16400ba4/matchmaking/status/:playerId", async (c) => {
  try {
    const playerId = c.req.param("playerId");
    const games    = await kv.getByPrefix("game:match-");
    for (const game of games) {
      if (game.players.some((p: any) => p?.id === playerId)) {
        await kv.del(`player:${playerId}`);
        return c.json({ status: "matched", gameId: game.gameId, game });
      }
    }
    return c.json({ status: "queued" });
  } catch (error) {
    console.error("Error checking matchmaking status:", error);
    return c.json({ error: "Failed to check status" }, 500);
  }
});

// ── Set secret number ───────────────────────────────────────────────────────
app.post("/server/make-server-16400ba4/game/:gameId/secret", async (c) => {
  try {
    const gameId            = c.req.param("gameId");
    const { playerId, secret } = await c.req.json();
    const game              = await kv.get(`game:${gameId}`);

    if (!game)                              return c.json({ error: "Game not found" }, 404);
    if (game.status !== "setting_secrets")  return c.json({ error: "Cannot set secret at this time" }, 400);

    const player = game.players.find((p: any) => p?.id === playerId);
    if (!player) return c.json({ error: "Player not in game" }, 403);
    if (!isValidSecret(secret, game.difficulty)) return c.json({ error: "Invalid secret number" }, 400);

    player.secretNumber = secret;
    player.lastSeen     = Date.now();
    player.secretSetAt  = Date.now();

    const bothReady = game.players.length === 2 && game.players.every((p: any) => p?.secretNumber);
    if (bothReady) {
      game.status        = "playing";
      game.currentTurn   = game.players[Math.floor(Math.random() * 2)].id;
      game.turnStartTime = Date.now();
      game.startedAt     = Date.now();
    }

    await kv.set(`game:${gameId}`, game);

    // Analytics
    recordSecret(gameId, playerId, secret).catch((e) => console.error("[analytics/secret]", e));
    if (bothReady) {
      db().from("nd_games").update({
        status:           "playing",
        first_player_id:  game.currentTurn,
        started_at:       new Date().toISOString(),
      }).eq("id", gameId).then(({ error: e }) => { if (e) console.error("[analytics/start]", e.message); });
    }

    return c.json({ success: true, game });
  } catch (error) {
    console.error("Error setting secret:", error);
    return c.json({ error: "Failed to set secret" }, 500);
  }
});

// ── Make a guess ────────────────────────────────────────────────────────────
app.post("/server/make-server-16400ba4/game/:gameId/guess", async (c) => {
  try {
    const gameId            = c.req.param("gameId");
    const { playerId, guess } = await c.req.json();
    const game              = await kv.get(`game:${gameId}`);

    if (!game)                        return c.json({ error: "Game not found" }, 404);
    if (game.status !== "playing")    return c.json({ error: "Game is not in progress" }, 400);
    if (game.currentTurn !== playerId) return c.json({ error: "Not your turn" }, 403);

    const player   = game.players.find((p: any) => p?.id === playerId);
    const opponent = game.players.find((p: any) => p?.id !== playerId);
    if (!player || !opponent) return c.json({ error: "Invalid game state" }, 500);
    if (!isValidSecret(guess, game.difficulty)) return c.json({ error: "Invalid guess" }, 400);

    const timeTakenMs    = game.turnStartTime ? Date.now() - game.turnStartTime : 0;
    player.lastSeen      = Date.now();
    const clues          = calculateClues(guess, opponent.secretNumber);
    const turnNumber     = game.guesses.filter((g: any) => g.playerId === playerId).length + 1;

    const guessRecord = {
      playerId, guess,
      correctNumbers:   clues.correctNumbers,
      correctPositions: clues.correctPositions,
      timestamp: Date.now(),
      turnNumber,
      timeTakenMs,
    };
    game.guesses.push(guessRecord);

    const won = isWinningGuess(clues.correctPositions, game.difficulty);

    if (won) {
      game.status    = "finished";
      game.winner    = playerId;
      game.winReason = "guessed";
      game.finishedAt = Date.now();
    } else {
      game.currentTurn   = opponent.id;
      game.turnStartTime = Date.now();
    }

    await kv.set(`game:${gameId}`, game);

    // Analytics — insert guess row, then finalise if game over
    insertGuess({
      gameId, playerId, turnNumber, guess,
      correctNumbers:   clues.correctNumbers,
      correctPositions: clues.correctPositions,
      timeTakenMs,
    }).then(async () => {
      if (won) {
        await finaliseGame({
          gameId,
          winnerId:    playerId,
          loserId:     opponent.id,
          endReason:   "guessed",
          totalTurns:  game.guesses.length,
          durationMs:  game.startedAt ? Date.now() - game.startedAt : 0,
        });
      }
    }).catch((e) => console.error("[analytics/guess]", e));

    return c.json({ success: true, game, clues });
  } catch (error) {
    console.error("Error making guess:", error);
    return c.json({ error: "Failed to make guess" }, 500);
  }
});

// ── Get game state ──────────────────────────────────────────────────────────
app.get("/server/make-server-16400ba4/game/:gameId", async (c) => {
  try {
    const gameId  = c.req.param("gameId");
    const playerId = c.req.query("playerId");
    const game    = await kv.get(`game:${gameId}`);

    if (!game) return c.json({ error: "Game not found" }, 404);

    if (playerId) {
      const player = game.players.find((p: any) => p?.id === playerId);
      if (player) { player.lastSeen = Date.now(); await kv.set(`game:${gameId}`, game); }
    }

    if (game.status === "playing" && shouldTimeout(game)) {
      await handleTimeout(game);
      await kv.set(`game:${gameId}`, game);
    }

    if (game.status === "playing") {
      for (const player of game.players) {
        if (player && shouldDisconnect(player) && player.id !== playerId) {
          game.status    = "finished";
          game.winner    = playerId;
          game.winReason = "opponent_disconnected";
          game.finishedAt = Date.now();
          await kv.set(`game:${gameId}`, game);

          finaliseGame({
            gameId,
            winnerId:   playerId!,
            loserId:    player.id,
            endReason:  "opponent_disconnected",
            totalTurns: game.guesses.length,
            durationMs: game.startedAt ? Date.now() - game.startedAt : 0,
          }).catch((e) => console.error("[analytics/disconnect]", e));
          break;
        }
      }
    }

    return c.json({ game });
  } catch (error) {
    console.error("Error getting game:", error);
    return c.json({ error: "Failed to get game" }, 500);
  }
});

// ── Get user stats ──────────────────────────────────────────────────────────
app.get("/server/make-server-16400ba4/stats/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    // Try rich stats from analytics table first
    const { data, error } = await db()
      .from("nd_player_stats")
      .select("*")
      .eq("player_id", userId)
      .maybeSingle();

    if (!error && data) return c.json(data);

    // Fall back to KV
    const stats = await kv.get(`stats:${userId}`);
    return c.json(stats ?? { userId, gamesPlayed: 0, wins: 0, losses: 0 });
  } catch (error) {
    console.error("Error getting stats:", error);
    return c.json({ error: "Failed to get stats" }, 500);
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────
async function handleTimeout(game: any) {
  const current  = game.players.find((p: any) => p?.id === game.currentTurn);
  const opponent = game.players.find((p: any) => p?.id !== game.currentTurn);
  if (!current || !opponent) return;

  current.timeouts++;

  if (current.timeouts >= 3) {
    game.status     = "finished";
    game.winner     = opponent.id;
    game.winReason  = "opponent_timeout";
    game.finishedAt = Date.now();

    finaliseGame({
      gameId:     game.gameId,
      winnerId:   opponent.id,
      loserId:    current.id,
      endReason:  "opponent_timeout",
      totalTurns: game.guesses.length,
      durationMs: game.startedAt ? Date.now() - game.startedAt : 0,
    }).catch((e) => console.error("[analytics/timeout]", e));
  } else {
    game.currentTurn   = opponent.id;
    game.turnStartTime = Date.now();
  }
}

Deno.serve(app.fetch);
