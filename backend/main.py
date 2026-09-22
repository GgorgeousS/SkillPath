"""SkillPath REST API: аккаунты, личные данные пользователя и обратная связь в PostgreSQL."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Deque, Dict, Optional, Tuple

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from psycopg import errors as pg_errors
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool
from pydantic import BaseModel, Field

HERE = Path(__file__).parent
load_dotenv(HERE / ".env")

log = logging.getLogger("skillpath.api")

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
PBKDF2_ITERATIONS = 600_000
SESSION_TTL_SECONDS = 30 * 24 * 3600
MAX_STATE_BYTES = 512 * 1024
REGISTER_LIMIT_PER_HOUR = int(os.getenv("REGISTER_LIMIT_PER_HOUR", "20"))


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "Не задана переменная окружения DATABASE_URL "
            "(пример: postgresql://user:password@127.0.0.1:5432/skillpath)"
        )
    return url


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = ConnectionPool(_database_url(), min_size=1, max_size=5, open=False)
    pool.open(wait=True, timeout=15)
    with pool.connection() as conn:
        conn.execute((HERE / "schema.sql").read_text(encoding="utf-8"))
    app.state.pool = pool
    try:
        yield
    finally:
        pool.close()


app = FastAPI(title="SkillPath API", version="3.0.0", lifespan=lifespan)

_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    # Без ALLOWED_ORIGINS разрешаем всё (удобно для разработки); в production задайте список.
    allow_origins=_origins or ["*"],
    allow_credentials=False,  # токен передаётся заголовком Authorization, куки не используются
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ---------------------------------------------------------------- пароли и токены

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt_hex, digest_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations))
        return hmac.compare_digest(digest, bytes.fromhex(digest_hex))
    except Exception:
        return False


# Для несуществующего email проверяем пароль против «пустышки», чтобы время ответа не выдавало,
# зарегистрирован ли адрес.
_DUMMY_HASH = hash_password("dummy-password-for-timing")


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- ограничение частоты запросов

_attempts: Dict[str, Deque[float]] = defaultdict(deque)


def _rate_limit(key: str, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    q = _attempts[key]
    while q and now - q[0] > window_seconds:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Слишком много попыток. Попробуйте позже.")
    q.append(now)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------- схемы запросов

class RegisterIn(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class LoginIn(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class StateIn(BaseModel):
    state: Dict[str, Any]


class FeedbackIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    message: str = Field(min_length=5, max_length=2000)


# ---------------------------------------------------------------- работа с БД

def _db_error() -> HTTPException:
    return HTTPException(status_code=503, detail="База данных недоступна")


def _user_json(row: Tuple[Any, ...]) -> Dict[str, Any]:
    return {"id": row[0], "email": row[1], "name": row[2]}


def _create_session(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute("DELETE FROM sessions WHERE expires_at < now()")
    conn.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (%s, %s, now() + make_interval(secs => %s))",
        (_token_hash(token), user_id, SESSION_TTL_SECONDS),
    )
    return token


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization[7:].strip() or None


def _user_by_token(token: str) -> Optional[Tuple[Any, ...]]:
    with app.state.pool.connection(timeout=5) as conn:
        return conn.execute(
            """
            SELECT u.id, u.email, u.name
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.expires_at > now()
            """,
            (_token_hash(token),),
        ).fetchone()


def require_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    token = _bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Требуется вход в аккаунт")
    try:
        row = _user_by_token(token)
    except Exception:
        log.exception("Database error")
        raise _db_error()
    if not row:
        raise HTTPException(status_code=401, detail="Сессия истекла, войдите снова")
    user = _user_json(row)
    user["token"] = token
    return user


# ---------------------------------------------------------------- эндпоинты

@app.get("/health")
def health() -> Dict[str, str]:
    try:
        with app.state.pool.connection(timeout=5) as conn:
            conn.execute("SELECT 1")
    except Exception:
        log.exception("Health check failed")
        raise _db_error()
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=201)
def register(body: RegisterIn, request: Request) -> Dict[str, Any]:
    _rate_limit("register:" + _client_ip(request), limit=REGISTER_LIMIT_PER_HOUR, window_seconds=3600)
    email = body.email.strip().lower()
    try:
        with app.state.pool.connection(timeout=5) as conn:
            row = conn.execute(
                "INSERT INTO users (email, name, password_hash) VALUES (%s, %s, %s) RETURNING id, email, name",
                (email, body.name.strip(), hash_password(body.password)),
            ).fetchone()
            token = _create_session(conn, row[0])
    except pg_errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже зарегистрирован")
    except Exception:
        log.exception("Database error")
        raise _db_error()
    return {"token": token, "user": _user_json(row)}


@app.post("/api/auth/login")
def login(body: LoginIn, request: Request) -> Dict[str, Any]:
    email = body.email.strip().lower()
    key = "login:%s:%s" % (_client_ip(request), email)
    _rate_limit(key, limit=8, window_seconds=600)
    try:
        with app.state.pool.connection(timeout=5) as conn:
            row = conn.execute(
                "SELECT id, email, name, password_hash FROM users WHERE lower(email) = %s", (email,)
            ).fetchone()
            ok = verify_password(body.password, row[3] if row else _DUMMY_HASH)
            if not row or not ok:
                raise HTTPException(status_code=401, detail="Неверный email или пароль")
            token = _create_session(conn, row[0])
    except HTTPException:
        raise
    except Exception:
        log.exception("Database error")
        raise _db_error()
    _attempts.pop(key, None)
    return {"token": token, "user": _user_json(row[:3])}


@app.post("/api/auth/logout", status_code=204, response_class=Response, response_model=None)
def logout(user: Dict[str, Any] = Depends(require_user)) -> None:
    with app.state.pool.connection(timeout=5) as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash = %s", (_token_hash(user["token"]),))


@app.get("/api/me")
def me(user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    return {"id": user["id"], "email": user["email"], "name": user["name"]}


@app.get("/api/me/state")
def get_state(user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    try:
        with app.state.pool.connection(timeout=5) as conn:
            row = conn.execute("SELECT state, updated_at FROM user_state WHERE user_id = %s", (user["id"],)).fetchone()
    except Exception:
        log.exception("Database error")
        raise _db_error()
    if not row:
        return {"state": None, "updated_at": None}
    return {"state": row[0], "updated_at": row[1].isoformat()}


@app.put("/api/me/state")
def put_state(body: StateIn, user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    if len(json.dumps(body.state, ensure_ascii=False)) > MAX_STATE_BYTES:
        raise HTTPException(status_code=413, detail="Слишком большой объём данных")
    try:
        with app.state.pool.connection(timeout=5) as conn:
            row = conn.execute(
                """
                INSERT INTO user_state (user_id, state, updated_at) VALUES (%s, %s, now())
                ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()
                RETURNING updated_at
                """,
                (user["id"], Jsonb(body.state)),
            ).fetchone()
    except Exception:
        log.exception("Database error")
        raise _db_error()
    return {"updated_at": row[0].isoformat()}


@app.delete("/api/me", status_code=204, response_class=Response, response_model=None)
def delete_me(user: Dict[str, Any] = Depends(require_user)) -> None:
    # Сессии и состояние удаляются каскадом; в обратной связи user_id обнуляется.
    with app.state.pool.connection(timeout=5) as conn:
        conn.execute("DELETE FROM users WHERE id = %s", (user["id"],))


@app.post("/api/feedback", status_code=201)
def create_feedback(body: FeedbackIn, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user_id = None
    token = _bearer(authorization)
    try:
        if token:
            row = _user_by_token(token)
            user_id = row[0] if row else None
        with app.state.pool.connection(timeout=5) as conn:
            row = conn.execute(
                "INSERT INTO feedback (user_id, name, email, message) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
                (user_id, body.name.strip(), body.email.strip(), body.message.strip()),
            ).fetchone()
    except Exception:
        log.exception("Database error")
        raise _db_error()
    return {"id": row[0], "created_at": row[1].isoformat()}
