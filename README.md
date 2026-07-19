# Verity-OS

A multi-agent research engine that fact-checks claims, curates niche expert resources, debates both sides of any topic, tracks market & tech news, and recommends tech stacks — no API key required.

Built with LangGraph, FastAPI, DuckDuckGo search, and React Flow.

---

## What it does

Pick a mode, type a query, hit **Discover** — watch the agent tree build live on canvas, then read the structured report.

| Mode | What you get |
|------|-------------|
| **✓ Fact Check** | Toulmin-structured argument with a confidence score — claim, grounds, warrant, rebuttal |
| **🕳 Deep Curation** | Niche expert resources bucketed by type: GitHub repos, arXiv papers, Reddit/HN threads, newsletters |
| **⚔ Debate** | Steel-manned FOR / AGAINST split with a verdict |
| **📰 News Intelligence** | Market and tech news aggregated from Reuters, Bloomberg, TechCrunch, FT — with impact analysis and what to watch |
| **🧪 Tech Stack** | Tailored stack recommendation (frontend / backend / database / infra) with reasoning and starter repos |

---

## How it works

```
User Query + Mode
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
                           │  (fact_check    │  — answers verified without seeing
                           │   mode only)    │    the draft (prevents seed bias)
                           └────────┬────────┘
                                    ▼
                           ┌─────────────────┐
                           │  Synthesizer    │  Mode-specific structured output
                           └────────┬────────┘
                                    │  SSE stream (live, frame-by-frame)
                                    ▼
                     React Flow Canvas + Report Panel
```

Each agent node appears on the canvas **as it completes** — you see the research happen in real time.

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

No API key needed — DuckDuckGo works out of the box. Add a key to upgrade result quality:

| Priority | Backend | How to activate |
|----------|---------|-----------------|
| 1 | Brave Search | `BRAVE_API_KEY=...` in `backend/.env` |
| 2 | Tavily | `TAVILY_API_KEY=...` in `backend/.env` — free 1,000 searches/mo |
| 3 | DuckDuckGo | Default — no key, no limit |

The engine auto-detects which key is present at startup. No code changes needed to switch.

---

## Connect a real LLM

The engine ships with a `MockLLM` stub so it runs without any API key. To get real AI-generated reports, swap one line in `backend/main.py`:

```python
from langchain_anthropic import ChatAnthropic
llm = ChatAnthropic(model="claude-sonnet-4-6")
```

All agent nodes call `llm.ainvoke(messages)` — nothing else changes.

---

## Key files

| Path | Responsibility |
|------|----------------|
| `backend/main.py` | LangGraph orchestration, SSE endpoint, five-mode synthesizer |
| `backend/core/search_mcp.py` | Multi-backend search client (Brave / Tavily / DuckDuckGo) |
| `backend/core/toulmin_logic.py` | Toulmin circuit breakers (`MISSING_EVIDENCE`, `MISSING_LOGIC`) |
| `backend/core/quote_resolver.py` | `difflib` fuzzy quote attribution (threshold 0.85) |
| `backend/utils/calibration.py` | Discriminative Calibration Score S_cal |
| `backend/evals/run_facts_search.py` | FACTS Search benchmark — target ≥ 80% F1 |
| `frontend/src/app/page.tsx` | SSE consumer, React Flow state, mode routing |
| `frontend/src/components/Discoverytree.tsx` | Live React Flow canvas with 9 typed node types |
| `frontend/src/components/SynthesisReport.tsx` | Mode-aware report renderer (5 layouts) |
| `frontend/src/components/ModeSelector.tsx` | Mode toggle (5 modes) |

---

## Roadmap

| Phase | Modes | Status |
|-------|-------|--------|
| 1 | Fact Check · Deep Curation · Debate | ✅ Complete |
| 2 | News Intelligence · Tech Stack Advisor | ✅ Complete |
| 3 | Person / Company Intelligence · Learning Path Builder | ✅ Complete |
| 4 | Real LLM integration · token log-prob calibration | Pending API key |
| 5 | Redis-backed persistent state · multi-session support | Planned |

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
