# Pisha Backend

Backend API for the Pisha student rating system with AI assistant integration.

## Tech Stack

- Python 3.12
- FastAPI
- Uvicorn
- Pydantic / pydantic-settings
- httpx (async HTTP client)

## Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your LLM provider and API key.

### 4. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at `http://localhost:8000`.

Docs: `http://localhost:8000/docs`

## LLM Providers

### Google Gemini (recommended, free)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a free API key
3. Set in `.env`:

```
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
```

### OpenRouter (free models)

1. Go to [OpenRouter](https://openrouter.ai)
2. Create an API key
3. Set in `.env`:

```
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
```

### Ollama (local)

1. Install [Ollama](https://ollama.com)
2. Pull a model: `ollama pull llama3.2`
3. Set in `.env`:

```
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

## API Endpoints

| Method | Path          | Description                  |
| ------ | ------------- | ---------------------------- |
| GET    | `/api/health` | Health check                 |
| POST   | `/api/chat`   | Send message to AI assistant |

### POST /api/chat

**Request:**

```json
{
  "message": "Как мне повысить рейтинг?"
}
```

**Response:**

```json
{
  "response": "Для повышения рейтинга..."
}
```

## Project Structure

```
backend/
├── app/
│   ├── api/           # Route handlers
│   ├── core/          # Config, settings
│   ├── llm/           # LLM provider abstraction
│   ├── models/        # Database models (future)
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   └── main.py        # FastAPI app entry point
├── requirements.txt
├── .env.example
└── README.md
```
