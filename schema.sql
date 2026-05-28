-- =========================================
-- paste following in SQL editor of Supabase
-- =========================================


-- =========================================
-- Terminal 1
-- =========================================
CREATE TABLE IF NOT EXISTS nd_players (
  id             TEXT        PRIMARY KEY,
  display_name   TEXT        NOT NULL,
  is_guest       BOOLEAN     NOT NULL DEFAULT true,
  ip_address     TEXT,
  user_agent     TEXT,
  country_code   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nd_games (
  id              TEXT        PRIMARY KEY,
  room_code       TEXT,
  difficulty      SMALLINT    NOT NULL CHECK (difficulty IN (3, 4, 5)),
  is_matchmaking  BOOLEAN     NOT NULL DEFAULT false,
  status          TEXT        NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting','setting_secrets','playing','finished')),
  created_by_ip   TEXT,
  first_player_id TEXT        REFERENCES nd_players (id),
  winner_id       TEXT        REFERENCES nd_players (id),
  loser_id        TEXT        REFERENCES nd_players (id),
  end_reason      TEXT        CHECK (end_reason IN ('guessed','opponent_timeout','opponent_disconnected')),
  total_turns     INT         DEFAULT 0,
  duration_ms     BIGINT      DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at       TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS nd_participants (
  id              BIGSERIAL   PRIMARY KEY,
  game_id         TEXT        NOT NULL REFERENCES nd_games (id) ON DELETE CASCADE,
  player_id       TEXT        NOT NULL REFERENCES nd_players (id),
  slot            SMALLINT    NOT NULL CHECK (slot IN (1, 2)),
  secret_number   TEXT,
  secret_set_at   TIMESTAMPTZ,
  outcome         TEXT        CHECK (outcome IN ('win','loss','draw')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id),
  UNIQUE (game_id, slot)
);

CREATE TABLE IF NOT EXISTS nd_guesses (
  id                BIGSERIAL   PRIMARY KEY,
  game_id           TEXT        NOT NULL REFERENCES nd_games (id) ON DELETE CASCADE,
  player_id         TEXT        NOT NULL REFERENCES nd_players (id),
  turn_number       INT         NOT NULL,
  guess_value       TEXT        NOT NULL,
  correct_numbers   SMALLINT    NOT NULL,
  correct_positions SMALLINT    NOT NULL,
  time_taken_ms     INT         NOT NULL DEFAULT 0,
  guessed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);



-- =========================================
-- Terminal 2
-- =========================================

CREATE INDEX IF NOT EXISTS nd_players_ip    ON nd_players (ip_address);
CREATE INDEX IF NOT EXISTS nd_players_seen  ON nd_players (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS nd_games_status  ON nd_games (status);
CREATE INDEX IF NOT EXISTS nd_games_room    ON nd_games (room_code) WHERE room_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS nd_games_winner  ON nd_games (winner_id) WHERE winner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS nd_games_created ON nd_games (created_at DESC);
CREATE INDEX IF NOT EXISTS nd_games_mm      ON nd_games (is_matchmaking);
CREATE INDEX IF NOT EXISTS nd_games_diff    ON nd_games (difficulty);
CREATE INDEX IF NOT EXISTS nd_parts_game    ON nd_participants (game_id);
CREATE INDEX IF NOT EXISTS nd_parts_player  ON nd_participants (player_id);
CREATE INDEX IF NOT EXISTS nd_parts_outcome ON nd_participants (outcome);
CREATE INDEX IF NOT EXISTS nd_guesses_game  ON nd_guesses (game_id);
CREATE INDEX IF NOT EXISTS nd_guesses_player ON nd_guesses (player_id);
CREATE INDEX IF NOT EXISTS nd_guesses_time  ON nd_guesses (guessed_at DESC);
CREATE INDEX IF NOT EXISTS nd_guesses_pos   ON nd_guesses (correct_positions);





-- =========================================
-- Terminal 3
-- =========================================
CREATE OR REPLACE VIEW nd_player_stats AS
SELECT
  p.id                                                      AS player_id,
  p.display_name,
  p.is_guest,
  p.created_at                                              AS first_seen,
  p.last_seen_at,
  COUNT(DISTINCT pt.game_id)                                AS games_played,
  COUNT(DISTINCT pt.game_id) FILTER (WHERE pt.outcome = 'win')  AS wins,
  COUNT(DISTINCT pt.game_id) FILTER (WHERE pt.outcome = 'loss') AS losses,
  ROUND(
    100.0 * COUNT(DISTINCT pt.game_id) FILTER (WHERE pt.outcome = 'win')
          / NULLIF(COUNT(DISTINCT pt.game_id), 0), 1
  )                                                         AS win_rate_pct,
  AVG(g2.turn_number) FILTER (WHERE pt.outcome = 'win')    AS avg_turns_to_win,
  MIN(g2.turn_number) FILTER (WHERE pt.outcome = 'win')    AS best_win_turns,
  AVG(gs.time_taken_ms)                                    AS avg_guess_time_ms,
  COUNT(gs.id) FILTER (WHERE gs.time_taken_ms = 0)         AS timeouts
FROM nd_players      p
LEFT JOIN nd_participants pt ON pt.player_id = p.id
LEFT JOIN nd_games         g  ON g.id = pt.game_id AND g.winner_id = p.id
LEFT JOIN nd_guesses       g2 ON g2.game_id = pt.game_id AND g2.player_id = p.id
                               AND g2.correct_positions = (
                                 SELECT difficulty FROM nd_games WHERE id = pt.game_id
                               )
LEFT JOIN nd_guesses       gs ON gs.game_id = pt.game_id AND gs.player_id = p.id
GROUP BY p.id, p.display_name, p.is_guest, p.created_at, p.last_seen_at;





-- =========================================
-- Terminal 4
-- =========================================
CREATE OR REPLACE FUNCTION nd_increment_stats(
  p_player_id TEXT,
  p_won       BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE nd_players
  SET last_seen_at = now()
  WHERE id = p_player_id;
END;
$$;



-- =========================================
-- Terminal 5
-- =========================================

ALTER TABLE nd_players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nd_games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nd_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nd_guesses      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nd_players_read_all"      ON nd_players      FOR SELECT USING (true);
CREATE POLICY "nd_games_read_all"        ON nd_games        FOR SELECT USING (true);
CREATE POLICY "nd_participants_read_all" ON nd_participants  FOR SELECT USING (true);
CREATE POLICY "nd_guesses_read_all"      ON nd_guesses      FOR SELECT USING (true);

