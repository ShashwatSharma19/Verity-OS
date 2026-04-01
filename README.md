# Verity-OS

A multi-agent research engine that **fact-checks claims**, **curates niche expert resources**, and **debates both sides** of any topic — no API key required.

Built with LangGraph, FastAPI, DuckDuckGo search, and React Flow.

---

## What it does

Pick a mode, type a query, hit **Discover** — watch the agent tree build live on canvas, then read the structured report.

| Mode | What you get |
|------|-------------|
| **Fact Check** | Toulmin-structured argument with a confidence score — claim, grounds, warrant, rebuttal |
| **Deep Curation** | Niche expert resources bucketed by type: GitHub repos, arXiv papers, Reddit/HN threads, newsletters |
| **Debate** | Steel-manned FOR / AGAINST split with a verdict |

---

## How it works

```
User Query
    │
    ▼
┌─────────────┐   parallel   ┌──────────────┐
│   Planner   │ ────────────▶│  Explorer ×N │  DuckDuckGo (free) · Tavily · Brave
│  (mode-aware│              └──────┬───────┘
│   queries)  │                     │ asyncio.gather fan-out
└─────────────┘                     ▼
                           ┌─────────────────┐
                           │ Context Pruning │  85% window cap
                           └────────┬────────┘
                                    ▼
                           ┌─────────────────┐
                           │  CoVe Auditor   │  Factored Chain-of-Verification
                           │  (fact_check    │  — verification questions answered
                           │   mode only)    │    without seeing the draft
                           └────────┬────────┘
                                    ▼
                           ┌─────────────────┐
                           │  Synthesizer    │  Mode-specific structured output
                           └────────┬────────┘
                                    │  SSE stream
                                    ▼
                          React Flow Canvas + Report Panel
```

---

## Setup

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r ../requirements.txt
python main.py
# Runs on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3001
```

Open **http://localhost:3001**, pick a mode, type a query, click **Discover**.

---

## Search backends

No API key needed — DuckDuckGo works out of the box. Add a key to upgrade:

| Priority | Backend | Setup |
|----------|---------|-------|
| 1 | Brave Search | `BRAVE_API_KEY=...` in `backend/.env` |
| 2 | Tavily | `TAVILY_API_KEY=...` in `backend/.env` |
| 3 | DuckDuckGo | Default — no key required |

---

## Connect a real LLM

The engine ships with a `MockLLM` stub so it runs without any API key. To get real AI-generated reports, swap it in `backend/main.py`:

```python
from langchain_anthropic import ChatAnthropic
llm = ChatAnthropic(model="claude-sonnet-4-6")
```

All agent nodes call `llm.ainvoke(messages)` — nothing else changes.

---

## Key files

| Path | Responsibility |
|------|----------------|
| `backend/main.py` | LangGraph orchestration, SSE endpoint, three-mode synthesizer |
| `backend/core/search_mcp.py` | Multi-backend search (Brave / Tavily / DuckDuckGo) |
| `backend/core/toulmin_logic.py` | Toulmin circuit breakers (`MISSING_EVIDENCE`) |
| `backend/core/quote_resolver.py` | `difflib` fuzzy quote attribution (threshold 0.85) |
| `backend/utils/calibration.py` | Discriminative Calibration Score S_cal |
| `frontend/src/app/page.tsx` | SSE consumer, React Flow state, mode routing |
| `frontend/src/components/Discoverytree.tsx` | Live React Flow canvas with typed custom nodes |
| `frontend/src/components/SynthesisReport.tsx` | Mode-aware report renderer (3 layouts) |
| `frontend/src/components/ModeSelector.tsx` | Mode toggle (Fact Check / Deep Curation / Debate) |

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
