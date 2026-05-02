# Отчёт (Track B / Code‑First) — Этап 4: CRM интеграция (Вариант C: API интеграция)

Дата: 2026‑04‑30  
Проект: SkillPath (статический фронтенд + отдельный CRM backend)

## 1) Цель интеграции

Сделать серверную интеграцию с CRM по принципу **API‑proxy**:

- фронтенд (Vue 3 без сборки) отправляет анкету/результаты на **свой backend API**;
- backend:
  - валидирует запрос (API key);
  - пишет заявку в локальный лог (SQLite) для аудита;
  - **опционально** проксирует заявку в Bitrix24 через inbound webhook, создавая **Contact**.

Критически важно: Bitrix webhook **никогда не хранится на фронтенде** (GitHub Pages), он настраивается только в окружении backend.

## 2) Архитектура (Code‑First схема)

```mermaid
flowchart LR
  U[Пользователь] --> B[Браузер: Vue 3 (CDN)]
  B -->|POST /api/leads + X-API-Key| API[CRM API (FastAPI)]
  API -->|INSERT| DB[(SQLite: crm_api/crm.db)]
  API -->|crm.contact.add (если включено)| BX[Bitrix24 REST Webhook]
  BX -->|result: contact_id| API
  API -->|JSON {id, created_at, bitrix_contact_id}| B
```

### Ключевой принцип Track B

Интеграция реализована **через собственный backend**, который выступает boundary‑слоем:

- секрет Bitrix хранится в переменных окружения (server‑side);
- фронтенд общается только с вашим API;
- добавлены production‑похожие контуры: CORS, API key, таймауты, обработка ошибок, база аудита.

## 3) Где в коде реализовано (точки входа)

### Фронтенд

1) Клиент CRM API: [js/crm.js](js/crm.js)

- `SkillPathCRM.createLead(payload)` делает `fetch( base + '/api/leads' )` с заголовком `X-API-Key`.
- Конфигурация может быть переопределена через `localStorage`:
  - `skillpath_crm_base_url`
  - `skillpath_crm_api_key`

2) Формирование payload и отправка: [components/Skills.js](components/Skills.js)

- `crmPayload()` собирает данные пользователя + результаты:
  - `name`, `last_name`, `phone`, `email`
  - `persona_type`
  - `interests`, `skills`, `recommended_directions`
  - `assessment_result`
- `submit()` вызывает `SkillPathCRM.createLead(crmPayload())` и показывает статус.

3) Источник интересов и рекомендаций: [components/Survey.js](components/Survey.js)

- интересы выбираются пользователем;
- рекомендации считаются локально и сохраняются в state.

### Backend

Файл: [crm_api/main.py](crm_api/main.py)

- `POST /api/leads` — основной endpoint интеграции.
- `GET /api/leads` — просмотр последних заявок (для демонстрации/аудита).
- `GET /health` — healthcheck.

## 4) Контракт API (HTTP)

### 4.1 POST /api/leads

URL: `POST {CRM_API_BASE_URL}/api/leads`

Заголовки:

- `Content-Type: application/json`
- `X-API-Key: <CRM_API_KEY>` (если на backend задан `CRM_API_KEY`)

Тело запроса (пример, как отправляет фронтенд):

```json
{
  "name": "Иван",
  "last_name": "Иванов",
  "phone": "+7 900 000-00-00",
  "email": "ivan@example.com",

  "persona_type": "student",
  "interests": ["Python", "SQL / Базы данных"],
  "skills": {"python": "yes", "sql": "maybe"},
  "recommended_directions": ["Backend", "Data"],
  "assessment_result": "Direction: Backend\nStrengths: ...\nGaps: ...",

  "source": "SkillPath Form",
  "created_at": "2026-04-30T12:00:00.000Z"
}
```

Ответ (успех):

```json
{
  "id": 1,
  "created_at": "2026-04-30T12:00:00+00:00",
  "bitrix_contact_id": 123
}
```

- `id` — ID в SQLite таблице `leads`.
- `bitrix_contact_id` — ID созданного Contact в Bitrix24 (если Bitrix включен), иначе `null`.

Ошибки:

- `401 Invalid API key` — неверный/отсутствующий ключ (если ключ включен на backend).
- `400 Body must be a JSON object` — тело не объект.
- `502 Bitrix ...` — ошибка прокси‑вызова Bitrix (таймаут/HTTP error/ошибка JSON/error_description).

### 4.2 GET /api/leads

URL: `GET {CRM_API_BASE_URL}/api/leads?limit=50`

- Возвращает список заявок из SQLite (последние `limit`, максимум 200).
- Требует `X-API-Key`, если ключ включен.

### 4.3 GET /health

URL: `GET {CRM_API_BASE_URL}/health`

- Возвращает `{status: "ok", time: ...}`.

## 5) Хранилище и аудит (SQLite)

CRM backend создаёт SQLite БД (по умолчанию `crm_api/crm.db`) и таблицу `leads`:

- `created_at`
- `email`, `name`, `persona_type`
- `selected_direction`
- `recommended_directions_json`, `interests_json`, `skills_json`
- `raw_json` — исходный payload целиком (для отладки и доказательств).

Это даёт «production‑похожий» слой аудита: можно показать, какие заявки успешно проходили через ваш API (и при необходимости выгрузить их через `GET /api/leads`).

### 5.1 Supabase (дополнительно)

В проекте также подключён Supabase для сохранения “отправок анкеты” в таблицу `submissions` (это отдельный канал хранения и не зависит от SQLite‑лога CRM API):

- клиент: [js/supabase.js](js/supabase.js)
- вызов после успешной отправки в CRM API: [components/Skills.js](components/Skills.js#L217-L239)

В демо можно показывать результат как:

- появление новой записи в `GET /api/leads` (SQLite лог CRM API),
- и/или появление новой строки в Supabase Table Editor → `submissions`.

Важно про текущую реализацию: если включён Bitrix и вызов `crm.contact.add` падает, endpoint вернёт `502` и запись в SQLite **не будет добавлена** (потому что вставка в БД выполняется после Bitrix‑вызова). Для гарантированной фиксации “приняли заявку → потом доставили в CRM” обычно добавляют очередь/ретраи и/или сохраняют заявку в БД до внешнего вызова.

## 6) Bitrix24: создание Contact (server‑side)

Примечание про демо/тариф: в некоторых порталах Bitrix24 создание входящих вебхуков (Inbound Webhook) может быть недоступно без подписки. В этом случае включить `BITRIX_WEBHOOK_URL` и продемонстрировать создание Contact через REST невозможно. При этом сам Вариант C (API интеграция) остаётся выполненным: фронтенд отправляет данные в ваш CRM backend по HTTP API, а backend сохраняет заявки в SQLite.

### 6.1 Условие включения

Если в окружении backend задан `BITRIX_WEBHOOK_URL`, то при `POST /api/leads` будет выполнен вызов:

- метод: `crm.contact.add`
- transport: HTTP POST JSON
- таймаут запроса: 15 секунд

### 6.2 Маппинг полей (payload → Contact fields)

Маппинг реализован функцией `_to_bitrix_contact_fields(payload)` в `crm_api/main.py`.

| Поле в payload | Поле Bitrix Contact | Комментарий |
|---|---|---|
| `name` | `NAME` | базовое поле |
| `last_name` | `LAST_NAME` | базовое поле |
| `phone` | `PHONE[0].VALUE` | тип `WORK` |
| `email` | `EMAIL[0].VALUE` | тип `WORK` |
| `persona_type` | `UF_PERSONA_TYPE` | код UF переопределяется env |
| `interests` | `UF_INTERESTS` | список склеивается через `, ` |
| `skills` | `UF_SKILLS` | JSON (строка) |
| `recommended_directions` | `UF_RECOMMENDED_DIRECTIONS` | список через `, ` |
| `assessment_result` | `UF_ASSESSMENT_RESULT` | строка |
| — | `UF_SOURCE` | задаётся на сервере через `BITRIX_SOURCE` (по умолчанию `SkillPath Form`) |
| — | `UF_CREATED_AT` | задаётся на сервере текущим UTC временем (`YYYY-MM-DD HH:MM:SS`) |
| — | `ASSIGNED_BY_ID` | опционально из env `BITRIX_ASSIGNED_BY_ID` |

Если у пользовательских полей в вашем Bitrix другие коды, они переопределяются переменными окружения:

- `BITRIX_UF_PERSONA_TYPE`
- `BITRIX_UF_INTERESTS`
- `BITRIX_UF_SKILLS`
- `BITRIX_UF_RECOMMENDED_DIRECTIONS`
- `BITRIX_UF_ASSESSMENT_RESULT`
- `BITRIX_UF_SOURCE`
- `BITRIX_UF_CREATED_AT`

## 7) Настройка и запуск (локальное демо)

### 7.1 Backend

1) Установка зависимостей:

```bash
pip install -r crm_api/requirements.txt
```

2) Задать ключ (PowerShell пример):

```powershell
$env:CRM_API_KEY="<ВАШ_СЕКРЕТ>"
```

3) (Опционально) включить Bitrix:

```powershell
$env:BITRIX_WEBHOOK_URL="https://<portal>.bitrix24.ru/rest/<user>/<webhook>"
# $env:BITRIX_ASSIGNED_BY_ID="123"
```

4) Запуск:

```powershell
uvicorn crm_api.main:app --host 127.0.0.1 --port 8081
```

Проверка:

- `http://127.0.0.1:8081/health`

### 7.2 Frontend

Запуск статического сайта:

```bash
python -m http.server 5173
```

Открыть:

- `http://127.0.0.1:5173`

Сконфигурировать CRM без правок файлов (через консоль браузера):

```js
localStorage.setItem('skillpath_crm_base_url', 'http://127.0.0.1:8081');
localStorage.setItem('skillpath_crm_api_key', '<ВАШ_СЕКРЕТ>');
```

Дальше пройти сценарий: интересы → результаты → навыки → заполнить email/имя → нажать «Отправить».

## 8) Доказательства для отчёта (что заскринить)

Минимальный набор артефактов, чтобы доказать интеграцию «end‑to‑end»:

1) Скрин страницы «Навыки» с заполненными данными и нажатием «Отправить» (UI‑событие).
2) Скрин ответа API:
   - либо Network вкладка (request/response на `/api/leads`),
   - либо браузером открыть `/api/leads` и показать появление новой записи.
3) Скрин результата “новая заявка в CRM”:
  - если Bitrix доступен: скрин Bitrix24 (новый Contact создан и поля заполнены),
  - если Bitrix недоступен по тарифу: выберите один из вариантов (или оба):
    - скрин `GET /api/leads?limit=1` (видна новая запись из SQLite лога CRM API),
    - скрин Supabase (Table Editor → таблица `submissions`) с новой строкой после нажатия «Отправить».
4) Скрин конфигурации (без раскрытия секретов):
  - показать, что ключи/секреты задаются на backend (env или `crm_api/.env`),
  - а на фронтенде нет Bitrix webhook.

## 9) Production‑заметки (что важно для “боевого” режима)

- Backend должен быть доступен по HTTPS (в `js/crm.js` для не‑localhost http запрещён).
- Ограничить `ALLOWED_ORIGINS` конкретными доменами фронтенда.
- Не хранить `CRM_API_KEY` в исходниках фронтенда; использовать server‑side секреты/токены.
- Логировать ошибки Bitrix и добавить ретраи/очередь, если нужен гарантированный delivery.

---

Приложение: конфигурационный шаблон переменных окружения — [crm_api/.env.example](crm_api/.env.example).
