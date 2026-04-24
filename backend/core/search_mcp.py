import os
import asyncio
from typing import Optional

# ---------------------------------------------------------------------------
# Search backend selection
#
#   Priority 1 — Brave Search  (set BRAVE_API_KEY)
#   Priority 2 — Tavily        (set TAVILY_API_KEY  — free tier: 1,000/mo)
#   Priority 3 — DuckDuckGo    (no key required, always available)
# ---------------------------------------------------------------------------

try:
    from ddgs import DDGS  # pip install ddgs
    _DDG_AVAILABLE = True
except ImportError:
    try:
        from duckduckgo_search import DDGS  # fallback for older installs
        _DDG_AVAILABLE = True
    except ImportError:
        _DDG_AVAILABLE = False

try:
    import aiohttp
    _AIOHTTP_AVAILABLE = True
except ImportError:
    _AIOHTTP_AVAILABLE = False


class BraveSearchMCP:
    """
    Universal search client with automatic backend fallback:
      BRAVE_API_KEY set  →  Brave Search  (best quality, paid)
      TAVILY_API_KEY set →  Tavily Search (great for AI, free 1k/mo)
      neither set        →  DuckDuckGo    (free, no key, works immediately)
    """

    BRAVE_URL  = "https://api.search.brave.com/res/v1/web/search"
    TAVILY_URL = "https://api.tavily.com/search"

    def __init__(self) -> None:
        self.brave_key:  Optional[str] = os.environ.get("BRAVE_API_KEY")
        self.tavily_key: Optional[str] = os.environ.get("TAVILY_API_KEY")

        if self.brave_key:
            self._backend = "brave"
        elif self.tavily_key:
            self._backend = "tavily"
        elif _DDG_AVAILABLE:
            self._backend = "duckduckgo"
        else:
            self._backend = "stub"

        print(f"[SearchMCP] Using backend: {self._backend.upper()}")

    async def search(self, query: str, num_results: int = 5, freshness: str = "py") -> str:
        if self._backend == "brave":
            return await self._brave_search(query, num_results, freshness)
        if self._backend == "tavily":
            return await self._tavily_search(query, num_results)
        if self._backend == "duckduckgo":
            return await self._ddg_search(query, num_results)
        return self._stub(query)

    # ── Brave ──────────────────────────────────────────────────────────────

    async def _brave_search(self, query: str, num_results: int, freshness: str) -> str:
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.brave_key,
        }
        params = {
            "q": query,
            "count": num_results,
            "text_decorations": "0",
            "spellcheck": "1",
            "extra_snippets": "true",
            "freshness": freshness,
            "result_filter": "web",
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.BRAVE_URL, headers=headers, params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        return self._format_brave(await resp.json())
                    return f"Brave Search error {resp.status} for: {query}"
        except Exception as exc:
            return f"Brave Search failed: {exc}"

    @staticmethod
    def _format_brave(data: dict) -> str:
        results = []
        for item in data.get("web", {}).get("results", []):
            title = item.get("title", "")
            url   = item.get("url", "")
            extra = item.get("extra_snippets", [])
            desc  = item.get("description", "")
            snippet = " ".join(extra[:2]) if extra else desc
            results.append(f"[{title}]({url}): {snippet}")
        return " | ".join(results) if results else "No results."

    # ── Tavily ─────────────────────────────────────────────────────────────

    async def _tavily_search(self, query: str, num_results: int) -> str:
        payload = {
            "api_key": self.tavily_key,
            "query": query,
            "max_results": num_results,
            "search_depth": "advanced",
            "include_answer": True,
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.TAVILY_URL, json=payload,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        results = []
                        if data.get("answer"):
                            results.append(f"Summary: {data['answer']}")
                        for r in data.get("results", []):
                            results.append(f"[{r.get('title','')}]({r.get('url','')}): {r.get('content','')[:200]}")
                        return " | ".join(results) if results else "No results."
                    return f"Tavily error {resp.status} for: {query}"
        except Exception as exc:
            return f"Tavily search failed: {exc}"

    # ── DuckDuckGo (free, no key) ───────────────────────────────────────────

    async def _ddg_search(self, query: str, num_results: int) -> str:
        try:
            # Run the synchronous DDGS in a thread so we don't block the event loop
            loop = asyncio.get_event_loop()
            raw = await loop.run_in_executor(
                None,
                lambda: list(DDGS().text(query, max_results=num_results))
            )
            results = []
            for r in raw:
                title = r.get("title", "")
                url   = r.get("href", "")
                body  = r.get("body", "")
                results.append(f"[{title}]({url}): {body[:250]}")
            return " | ".join(results) if results else "No DuckDuckGo results."
        except Exception as exc:
            return f"DuckDuckGo search failed: {exc}"

    # ── Stub (no backend available) ────────────────────────────────────────

    @staticmethod
    def _stub(query: str) -> str:
        return (
            f"Research context for '{query}': covers recent advances in large language "
            "model efficiency, quantization techniques, and inference-time compute scaling. "
            "Install 'duckduckgo-search' (pip install duckduckgo-search) for free live results."
        )
