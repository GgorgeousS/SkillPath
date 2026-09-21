-- Схема БД SkillPath (PostgreSQL). Применяется автоматически при старте API (CREATE ... IF NOT EXISTS).

-- Пользователи. Пароль хранится только в виде хеша (PBKDF2-SHA256 с солью).
CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    email          TEXT NOT NULL,
    name           TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- Сессии входа. В базе лежит только SHA-256 от токена, сам токен есть только у клиента.
CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Данные пользователя: интересы, направление, навыки, план, отметки заданий, история обучения.
CREATE TABLE IF NOT EXISTS user_state (
    user_id     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Обратная связь (может быть отправлена и без входа).
CREATE TABLE IF NOT EXISTS feedback (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL
);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);
