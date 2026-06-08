# Historical GeoGuessr

Мультиплеерная игра: 360° панорамы исторических событий, угадывание года и места на карте.

## Структура

```
my-geoguessr/
├── client/          # Vue 3 + Three.js + Leaflet (собирается в dist)
├── server/          # Node: HTTP + WebSocket + панорамы
├── shared/          # Общие типы и scoring
└── README.md
```

## Локальный запуск

### 1. Клиент

```bash
cd client
npm install
npm run dev
```

Откроется `http://localhost:5173`

### 2. Сервер

```bash
cd server
npm install
npm run dev
```

WebSocket: `ws://localhost:3001`

### Переменные окружения

**client/.env** (для `npm run dev` — Vite на :5173, сервер на :3001)

```
VITE_WS_URL=ws://localhost:3001
VITE_ASSETS_BASE_URL=
```

В production на одном домене `VITE_*` можно не задавать — клиент сам подключится к `wss://тот-же-хост`.

**server/.env**

```
PORT=3001
PANORAMAS_URL=
ROUND_DURATION_MS=60000
TOTAL_ROUNDS=5
REVEAL_DURATION_MS=8000
```

Локально сервер читает `server/data/panoramas.json`. Панорамы лежат **только** в `server/data/panorams/`.

### Локально «как в проде» (один сервер)

```bash
npm run build:client
npm run start
```

Откроется `http://localhost:3001` — и SPA, и WebSocket, и `/panorams/*.webp` с одного порта.

## Деплой

Один Node-процесс отдаёт всё:

| Путь | Что |
|------|-----|
| `/` | Vue SPA (`client/dist`) |
| `/assets/*` | JS/CSS сборки |
| `/panorams/*.webp` | панорамы из `server/data/panorams/` |
| `/health` | health check → `ok` |
| WebSocket | игра на том же порту |

`panoramas.json` **никогда** не отдаётся клиенту — только через `round_end` после раунда.

### Деплой на Render.com

Один Web Service. В репозитории есть `render.yaml`.

#### Подготовка

```bash
npm run sync-panoramas
```

В git должны быть:
- `server/data/panoramas.json`
- `server/data/panorams/*.webp`

#### Blueprint

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Подключи репозиторий
3. Render создаст сервис `historical-geoguessr` с URL вида `https://historical-geoguessr.onrender.com`

Домен `.onrender.com` — бесплатный поддомен Render. Свой домен можно привязать в настройках сервиса.

Переменные окружения (опционально):

```
ROUND_DURATION_MS=60000
TOTAL_ROUNDS=5
```

`VITE_WS_URL` и `VITE_ASSETS_BASE_URL` **не нужны** — клиент использует тот же хост.

#### Вручную через Dashboard

| Поле | Значение |
|------|----------|
| Root Directory | *(корень репо)* |
| Build Command | `npm install --prefix client && npm run build --prefix client && npm install --prefix server` |
| Start Command | `npm run start --prefix server` |
| Health Check Path | `/health` |

#### Проверка

1. `https://ТВОЙ-СЕРВИС.onrender.com` — главная страница
2. `https://ТВОЙ-СЕРВИС.onrender.com/health` → `ok`
3. DevTools → WS на `wss://ТВОЙ-СЕРВИС.onrender.com`
4. Раунд — панорама с `/panorams/....webp` того же хоста

#### Ограничения free tier

- Сервис **засыпает** после ~15 мин без трафика — первый заход 30–60 сек
- Комнаты в памяти — сбрасываются при рестарте/деплое

#### Обновление

Пуш в `main` → auto-deploy. Новые панорамы: `npm run sync-panoramas`, закоммить `.webp` в `server/data/panorams/`.

### VPS (альтернатива)

```bash
npm run build
cd server && npm install && npm start
```

Reverse proxy (nginx/Caddy) с TLS на порт приложения. `PORT` задаётся прокси или env.

## Языки

Интерфейс: **русский** и **английский**. Язык выбирается автоматически по `navigator.language` (если система на русском — `ru`, иначе `en`).

Названия панорам тоже могут быть локализованы:

```json
"title": {
  "ru": "Битва при Ватерлоо",
  "en": "Battle of Waterloo"
}
```

## Панорамы

### Неочевидные имена файлов

Файлы и `id` в JSON **не должны выдавать ответ** (никаких `waterloo-1815.webp`).

Используй opaque id, например `a1f84e20.webp`, и то же значение в поле `id`.

### Быстрое добавление картинки

```bash
node tools/register-panorama.mjs path/to/photo.webp
```

Скрипт:
- генерирует opaque id (8 hex-символов)
- копирует файл в `server/data/panorams/`
- добавляет заготовку в `server/data/panoramas.json`

После редактирования метаданных:

```bash
npm run sync-panoramas
```

Скрипт чистит пул и синхронизирует `server/data/panoramas.json` с файлами на диске.

### Формат `data/panoramas.json`

```json
{
  "id": "a1f84e20",
  "image": "/panorams/a1f84e20.webp",
  "title": { "ru": "Битва при Ватерлоо", "en": "Battle of Waterloo" },
  "year": 1815,
  "date": "1815-06-18",
  "place": { "ru": "Ватерлоо, Бельгия", "en": "Waterloo, Belgium" },
  "location": { "lat": 50.68, "lng": 4.41 },
  "wikipedia": {
    "ru": "https://ru.wikipedia.org/wiki/Битва_при_Ватерлоо",
    "en": "https://en.wikipedia.org/wiki/Battle_of_Waterloo"
  },
  "difficulty": "medium",
  "epoch": "modern",
  "eventType": "battle"
}
```

- Изображение: equirectangular 2:1 (например 4096×2048)
- `date` — ISO `YYYY-MM-DD`; в интерфейсе форматируется автоматически через `Intl` (ru/en)
- `wikipedia` — ссылки по языкам; после раунда подтягивается превью статьи через Wikipedia API
- Генерируй в AI, затем регистрируй скриптом или клади вручную

## Игровой flow

1. Создать комнату или войти по коду (4 символа)
2. Все нажимают «Готов», хост стартует игру
3. 5 раундов по 60 секунд (настраивается на сервере)
4. Игрок крутит панораму, выбирает год и точку на карте
5. После раунда — результаты, затем следующий раунд
6. В конце — итоговый счёт (без сохранения в БД)

## Очки

- Год: до 5000, штраф 50 за каждый год ошибки
- Место: до 5000, экспоненциальный спад по расстоянию
- Итог раунда: 40% год + 60% место
