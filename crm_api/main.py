from __future__ import annotations

import json
import os
import sqlite3
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware


def _load_dotenv() -> None:
    """Load env vars from crm_api/.env if present.

    This project is often run from PowerShell where env vars can be confusing.
    A local .env file (gitignored) makes setup reproducible.
    """

    env_path = (Path(__file__).parent / ".env").resolve()
    if not env_path.exists():
        return

    try:
        content = env_path.read_text(encoding="utf-8")
    except Exception:
        return

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ.setdefault(key, value)


_load_dotenv()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _utc_now_bitrix() -> str:
    # Bitrix commonly accepts "YYYY-MM-DD HH:MM:SS" for datetime user fields
    return datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%d %H:%M:%S")


def _get_env(name: str, default: str = "") -> str:
    v = os.getenv(name)
    return v.strip() if isinstance(v, str) else default


def _db_path() -> Path:
    configured = _get_env("CRM_DB_PATH", "")
    if configured:
        p = Path(configured)
        if not p.is_absolute():
            p = (Path(__file__).parent / p).resolve()
        return p
    return (Path(__file__).parent / "crm.db").resolve()


def _open_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_db_path()), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL,
          email TEXT,
          name TEXT,
          persona_type TEXT,
          selected_direction TEXT,
          recommended_directions_json TEXT,
          interests_json TEXT,
          skills_json TEXT,
          raw_json TEXT NOT NULL
        );
        """
    )
    conn.commit()


DB = _open_db()
_init_db(DB)

app = FastAPI(title="SkillPath CRM API", version="1.0.0")

# CORS
origins_raw = _get_env("ALLOWED_ORIGINS", "")
if origins_raw:
    allow_origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
else:
    # Dev-friendly default (set ALLOWED_ORIGINS in production)
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _require_api_key(x_api_key: Optional[str]) -> None:
    expected = _get_env("CRM_API_KEY", "")
    if not expected:
        # Dev mode: API key not set. For production always set CRM_API_KEY.
        return
    if not x_api_key or x_api_key.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _bitrix_webhook_base() -> str:
    # Example: https://your-domain.bitrix24.ru/rest/1/xxxxxxxxxxxxxxx
    base = _get_env("BITRIX_WEBHOOK_URL", "").rstrip("/")
    return base


def _bitrix_enabled() -> bool:
    return bool(_bitrix_webhook_base())


def _bitrix_field(name: str, default: str) -> str:
    v = _get_env(name, "")
    return v if v else default


def _bitrix_call(method: str, params: Dict[str, Any]) -> Dict[str, Any]:
    base = _bitrix_webhook_base()
    if not base:
        raise HTTPException(status_code=500, detail="Bitrix webhook is not configured")

    url = f"{base}/{method}.json"
    data = json.dumps(params, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else str(e)
        code = getattr(e, "code", None)
        code_part = f" ({code})" if code is not None else ""
        raise HTTPException(status_code=502, detail=f"Bitrix HTTP error{code_part}: {raw}")
    except urllib.error.URLError as e:
        reason = getattr(e, "reason", None)
        detail = reason if reason is not None else repr(e)
        raise HTTPException(status_code=502, detail=f"Bitrix URL error: {detail}")
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Bitrix request failed ({type(e).__name__}): {e!r}",
        )

    try:
        parsed = json.loads(raw) if raw else {}
    except Exception:
        raise HTTPException(status_code=502, detail=f"Bitrix invalid JSON: {raw}")

    if isinstance(parsed, dict) and parsed.get("error"):
        msg = parsed.get("error_description") or parsed.get("error")
        raise HTTPException(status_code=502, detail=f"Bitrix error: {msg}")

    return parsed if isinstance(parsed, dict) else {"result": parsed}


def _to_bitrix_contact_fields(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Base fields
    name = str(payload.get("name") or "").strip()
    last_name = str(payload.get("last_name") or "").strip()
    phone = str(payload.get("phone") or "").strip()
    email = str(payload.get("email") or "").strip()

    persona_type = payload.get("persona_type")
    interests = payload.get("interests")
    skills = payload.get("skills")
    recommended = payload.get("recommended_directions")
    assessment_result = payload.get("assessment_result")

    # Required by spec: set source + created_at on server side
    source = _get_env("BITRIX_SOURCE", "SkillPath Form")
    created_at = _utc_now_bitrix()

    fields: Dict[str, Any] = {
        "NAME": name,
        "LAST_NAME": last_name,
        "OPENED": "Y",
    }

    if phone:
        fields["PHONE"] = [{"VALUE": phone, "VALUE_TYPE": "WORK"}]
    if email:
        fields["EMAIL"] = [{"VALUE": email, "VALUE_TYPE": "WORK"}]

    # Custom UF_* fields (codes can be overridden by env)
    fields[_bitrix_field("BITRIX_UF_PERSONA_TYPE", "UF_PERSONA_TYPE")] = (
        str(persona_type) if persona_type is not None else ""
    )
    fields[_bitrix_field("BITRIX_UF_INTERESTS", "UF_INTERESTS")] = (
        ", ".join([str(x) for x in interests]) if isinstance(interests, list) else str(interests or "")
    )
    fields[_bitrix_field("BITRIX_UF_SKILLS", "UF_SKILLS")] = (
        json.dumps(skills, ensure_ascii=False) if isinstance(skills, (dict, list)) else str(skills or "")
    )
    fields[_bitrix_field("BITRIX_UF_RECOMMENDED_DIRECTIONS", "UF_RECOMMENDED_DIRECTIONS")] = (
        ", ".join([str(x) for x in recommended]) if isinstance(recommended, list) else str(recommended or "")
    )
    fields[_bitrix_field("BITRIX_UF_ASSESSMENT_RESULT", "UF_ASSESSMENT_RESULT")] = str(
        assessment_result or ""
    )
    fields[_bitrix_field("BITRIX_UF_SOURCE", "UF_SOURCE")] = source
    fields[_bitrix_field("BITRIX_UF_CREATED_AT", "UF_CREATED_AT")] = created_at

    assigned_by_id = _get_env("BITRIX_ASSIGNED_BY_ID", "")
    if assigned_by_id:
        try:
            fields["ASSIGNED_BY_ID"] = int(assigned_by_id)
        except Exception:
            # ignore if misconfigured
            pass

    return fields


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "time": _utc_now_iso()}


@app.post("/api/leads")
async def create_lead(
    request: Request,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> Dict[str, Any]:
    _require_api_key(x_api_key)

    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")

    email = payload.get("email")
    name = payload.get("name")
    persona_type = payload.get("persona_type")

    # Compatibility: if payload comes from Supabase-style structure, derive fields
    answers = payload.get("answers") if isinstance(payload.get("answers"), dict) else {}
    selected_direction = answers.get("selected_direction") if isinstance(answers, dict) else payload.get(
        "selected_direction"
    )
    interests = answers.get("interests") if isinstance(answers, dict) else payload.get("interests")
    interests = interests if isinstance(interests, list) else []

    recommended = payload.get("recommended_directions")
    skills = payload.get("skills")

    # Minimal validation (production-ready: tighten if needed)
    if email is not None and not isinstance(email, str):
        raise HTTPException(status_code=400, detail="email must be a string")
    if name is not None and not isinstance(name, str):
        raise HTTPException(status_code=400, detail="name must be a string")

    created_at = _utc_now_iso()

    bitrix_contact_id: Optional[int] = None
    if _bitrix_enabled():
        fields = _to_bitrix_contact_fields(payload)
        res = _bitrix_call("crm.contact.add", {"fields": fields})
        # Bitrix returns {"result": <id>} or {"result": {"result": <id>}} depending on wrapper
        r = res.get("result")
        if isinstance(r, dict) and "result" in r:
            r = r.get("result")
        if isinstance(r, int):
            bitrix_contact_id = r
        elif isinstance(r, str) and r.isdigit():
            bitrix_contact_id = int(r)

    cur = DB.execute(
        """
        INSERT INTO leads (
          created_at,
          email,
          name,
          persona_type,
          selected_direction,
          recommended_directions_json,
          interests_json,
          skills_json,
          raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            created_at,
            email,
            name,
            persona_type,
            selected_direction,
            json.dumps(recommended, ensure_ascii=False),
            json.dumps(interests, ensure_ascii=False),
            json.dumps(skills, ensure_ascii=False),
            json.dumps(payload, ensure_ascii=False),
        ),
    )
    DB.commit()

    return {"id": int(cur.lastrowid), "created_at": created_at, "bitrix_contact_id": bitrix_contact_id}


@app.get("/api/leads")
def list_leads(
    limit: int = 50,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> Dict[str, Any]:
    _require_api_key(x_api_key)

    limit = max(1, min(int(limit), 200))
    rows = DB.execute(
        "SELECT id, created_at, email, name, persona_type, selected_direction, raw_json FROM leads ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()

    items: List[Dict[str, Any]] = []
    for r in rows:
        raw = None
        try:
            raw = json.loads(r["raw_json"]) if r["raw_json"] else None
        except Exception:
            raw = None
        items.append(
            {
                "id": int(r["id"]),
                "created_at": r["created_at"],
                "email": r["email"],
                "name": r["name"],
                "persona_type": r["persona_type"],
                "selected_direction": r["selected_direction"],
                "raw": raw,
            }
        )

    return {"items": items, "count": len(items)}
