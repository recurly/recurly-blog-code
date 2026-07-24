# Generative UI — Minimalism

A minimal reference implementation of **generative UI** using [Google ADK](https://google.github.io/adk-docs/) and React. The agent returns structured UI metadata alongside text, and the frontend renders purpose-built components instead of plain text descriptions.

Companion code for the article series on generative UI with ADK.

## What is generative UI?

In a standard chat agent, tool results get summarized as text. In a generative UI approach, tool responses include a typed `element` payload:

```json
{
  "status": "success",
  "element": {
    "type": "weather",
    "params": { "location": "New York City", "condition": "snowy", ... }
  }
}
```

The frontend intercepts this payload and renders a rich component — a weather card, a chart, a table — rather than displaying the agent's prose description of the data.

## Project structure

```
generative-ui-minimalism/
├── chat_agent/          # ADK agent (Python)
│   ├── agent.py         # Root agent + get_weather tool
│   └── .env             # GOOGLE_API_KEY
└── ui/                  # Chat frontend (React + TypeScript + Vite)
    ├── src/main.tsx     # App, ADK client, WeatherCard, ElementRenderer
    └── index.html
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key

## Setup

### Agent

```bash
cd chat_agent
pip install google-adk
```

Add your API key to `.env`:

```
GOOGLE_API_KEY=your_key_here
GOOGLE_GENAI_USE_VERTEXAI=0
```

### UI

```bash
cd ui
npm install
```

## Running

Start the ADK dev server (default port `1338`):

```bash
cd chat_agent
adk api_server
```

In a separate terminal, start the Vite dev server:

```bash
cd ui
npm run dev
```

Open `http://localhost:5173` and ask about the weather.

## How it works

1. The user sends a message via the chat UI.
2. The UI calls the ADK `/run` endpoint, which runs the agent.
3. The agent calls `get_weather`, which returns a structured `element` object in addition to its normal tool response.
4. The UI parses the ADK event stream, extracting both the agent's text reply and any `element` payload from `functionResponse` parts.
5. `ElementRenderer` switches on `element.type` and renders the matching component (`WeatherCard` for `"weather"`).

## Extending with new element types

1. **Add a tool** in `agent.py` that returns `{"status": "success", "element": {"type": "your_type", "params": {...}}}`.
2. **Add a component** in `ui/src/main.tsx` that accepts the params shape.
3. **Register it** in `ElementRenderer` with a new `if (element.type === 'your_type')` branch.
4. **Add the TypeScript types** to `ChatElement` and any new params interface.
