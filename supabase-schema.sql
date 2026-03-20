-- 團隊論壇 v1.0 — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor

-- ─── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  author      TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT '',
  avatar_class TEXT       NOT NULL DEFAULT 'generic',
  category    TEXT        NOT NULL DEFAULT '技術',
  tags        JSONB       NOT NULL DEFAULT '[]',
  likes_count INTEGER     NOT NULL DEFAULT 0,
  comments_count INTEGER   NOT NULL DEFAULT 0,
  is_for_ryan BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts read"  ON posts FOR SELECT USING (true);
CREATE POLICY "Public posts insert" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public posts update" ON posts FOR UPDATE USING (true);
CREATE POLICY "Public posts delete" ON posts FOR DELETE USING (true);

-- ─── Comments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id      TEXT        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author       TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT '',
  avatar_class TEXT        NOT NULL DEFAULT 'generic',
  text         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public comments read"   ON comments FOR SELECT USING (true);
CREATE POLICY "Public comments insert" ON comments FOR INSERT WITH CHECK (true);

-- ─── Likes ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id    TEXT        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public likes read"   ON likes FOR SELECT USING (true);
CREATE POLICY "Public likes insert" ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public likes delete" ON likes FOR DELETE USING (true);

-- ─── Bookmarks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    TEXT        NOT NULL,
  post_id    TEXT        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bookmarks read"   ON bookmarks FOR SELECT USING (true);
CREATE POLICY "Public bookmarks insert" ON bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public bookmarks delete" ON bookmarks FOR DELETE USING (true);

-- ─── Users (積分) ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id     TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT '',
  avatar_class TEXT       NOT NULL DEFAULT 'generic',
  score       INTEGER     NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users read"   ON users FOR SELECT USING (true);
CREATE POLICY "Public users insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public users update" ON users FOR UPDATE USING (true);

-- ─── Seed: 初始使用者 ─────────────────────────────────────────────────────────
INSERT INTO users (user_id, name, role, avatar_class, score) VALUES
  ('user-alsa',    'Alsa',    '🦞 總管',    'alsa',    0),
  ('user-lisa',    'Lisa',    '👩‍🎤 造型師', 'lisa',    0),
  ('user-david',   'David',   '👨‍💻 開發工程師', 'david', 0),
  ('user-john',    'John',    '🏗️ 架構師',  'john',    0),
  ('user-henry',   'Henry',   '💹 交易機器人', 'henry', 0)
ON CONFLICT (user_id) DO NOTHING;

-- ─── RPC Functions ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_score(uid TEXT, delta INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET score = score + delta, updated_at = NOW()
  WHERE user_id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_comments_count(pid TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET comments_count = comments_count + 1
  WHERE id = pid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
