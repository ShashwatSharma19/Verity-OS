import os
import re
import json
import asyncio
import operator
from typing import Dict, List, TypedDict, Annotated

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from core.search_mcp import BraveSearchMCP
from core.toulmin_logic import analyze_document_reasoning
from utils.calibration import calculate_discriminative_calibration

brave_mcp = BraveSearchMCP()

# ---------------------------------------------------------------------------
# Helper utilities — shared across all modes
# ---------------------------------------------------------------------------

def extract_links_from_results(results: Dict[str, str]) -> list:
    """Parse every [title](url): snippet entry out of formatted search results."""
    all_items = []
    pattern = r'\[([^\]]+)\]\((https?://[^)]+)\)(?::\s*([^|]*))?'
    for query_key, text in results.items():
        for match in re.finditer(pattern, text):
            title   = match.group(1).strip()
            url     = match.group(2).strip()
            snippet = (match.group(3) or "").strip()[:250]
            all_items.append({
                "title": title,
                "url": url,
                "snippet": snippet,
                "source_query": query_key,
            })
    return all_items


def extract_key_points(results: Dict[str, str], prefix: str = "") -> List[str]:
    """Pull plain-text snippets from results, optionally filtered by key prefix."""
    points: List[str] = []
    for key, text in results.items():
        if prefix and not key.upper().startswith(prefix.upper()):
            continue
        for item in text.split(" | "):
            if "): " in item:
                snippet = item.split("): ", 1)[1].strip()
                if len(snippet) > 40:
                    points.append(snippet[:200])
    return points


# ---------------------------------------------------------------------------
# Mock LLM  (replace with ChatAnthropic / ChatOpenAI for production)
# Deep-curation and debate modes bypass this — they use deterministic synthesis.
# ---------------------------------------------------------------------------

class MockLLM:
    async def ainvoke(self, messages: list) -> AIMessage:
        prompt: str = messages[-1].content.lower()
        raw: str    = messages[-1].content

        # PLANNER — fact_check
        if "3-step research plan" in prompt:
            query = raw.split("query:")[1].split(".")[0].strip() if "query:" in raw else "the topic"
            plan = [
                f"Define key concepts: {query[:50]}",
                f"Benchmark data & performance metrics: {query[:40]}",
                f"Synthesis & trade-off analysis: {query[:40]}",
            ]
            return AIMessage(content=json.dumps(plan))

        # AUDITOR — phase 1
        if "generate 3 verification questions" in prompt:
            return AIMessage(content=json.dumps([
                "Are the primary sources cited technically credible and peer-reviewed?",
                "Is there multi-source consensus on the quantitative claims made?",
                "Do the stated performance metrics align with independently reported benchmarks?",
            ]))

        # AUDITOR — phase 2
        if "answer these verification questions using only the provided evidence" in prompt:
            evidence = raw.split("Evidence:")[1].strip() if "Evidence:" in raw else "No evidence."
            return AIMessage(content=(
                "Verification Report\n-------------------\n"
                "Source credibility: Context references established techniques in the literature.\n"
                "Consensus check: Multiple independent fragments corroborate the core claims.\n"
                "Metric alignment: Figures fall within expected ranges.\n\n"
                f"Evidence (first 300 chars):\n{evidence[:300]}…"
            ))

        # SYNTHESIZER — Toulmin (fact_check)
        if "synthesize" in prompt and "toulmin" in prompt:
            verified = raw.split("Verified report:")[1].strip() if "Verified report:" in raw else ""
            return AIMessage(content=json.dumps({
                "claim": "The retrieved evidence supports a well-grounded answer to the research query.",
                "grounds": [
                    "Multiple independent sources confirm the core technical claims.",
                    "Quantitative benchmarks show consistent performance trends.",
                    "Recent literature corroborates the primary findings.",
                ],
                "warrant": (
                    "Because the evidence converges across independent sources and aligns "
                    "with established benchmarks, the claim is logically supported."
                ),
                "backing": ["Verified report summary: " + verified[:200] + "…"],
                "rebuttal": "Results may not generalise to all hardware or deployment configurations.",
                "qualifier": "Highly likely",
            }))

        return AIMessage(content="Acknowledged. Proceeding with available context.")


llm = MockLLM()

# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------

app = FastAPI(title="Verity-OS Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# LangGraph state
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    query: str
    mode: str                                               # fact_check | deep_curation | debate
    plan: List[str]
    research_results: Annotated[Dict[str, str], operator.ior]
    draft_report: str
    verification_questions: List[str]
    verified_report: str
    calibration_score: float
    messages: Annotated[List[BaseMessage], operator.add]


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

async def planner_node(state: AgentState) -> dict:
    query = state["query"]
    mode  = state.get("mode", "fact_check")

    if mode == "deep_curation":
        plan = [
            f"site:github.com {query}",
            f"site:arxiv.org {query}",
            f"site:reddit.com {query} recommendations discussion",
            f"site:news.ycombinator.com {query}",
            f"{query} expert newsletter substack indie blog",
        ]
        return {"plan": plan}

    if mode == "debate":
        plan = [
            f"FOR: strongest evidence and arguments supporting {query}",
            f"FOR: expert opinions and studies in favour of {query}",
            f"AGAINST: strongest counterarguments challenging {query}",
            f"AGAINST: evidence and research contradicting {query}",
        ]
        return {"plan": plan}

    if mode == "news_intelligence":
        plan = [
            f"site:reuters.com {query}",
            f"site:techcrunch.com {query}",
            f"site:bloomberg.com {query} market impact",
            f"site:ft.com {query} business analysis",
            f"{query} market implications latest 2025",
        ]
        return {"plan": plan}

    if mode == "tech_stack":
        plan = [
            f"site:github.com {query} architecture stack",
            f"{query} best framework comparison 2025",
            f"{query} production tech stack real world",
            f"{query} vs alternatives performance trade-offs",
        ]
        return {"plan": plan}

    if mode == "person_intelligence":
        plan = [
            f'"{query}" background career profile biography',
            f'"{query}" site:linkedin.com OR site:crunchbase.com',
            f'"{query}" site:github.com projects contributions',
            f'"{query}" news interviews statements 2025',
            f'"{query}" achievements impact notable work',
        ]
        return {"plan": plan}

    if mode == "learning_path":
        plan = [
            f"{query} complete roadmap beginner to advanced 2025",
            f"site:github.com {query} learning curriculum resources",
            f"{query} best books courses tutorials",
            f"{query} hands-on projects portfolio ideas",
            f"{query} prerequisites what to learn first",
        ]
        return {"plan": plan}

    # fact_check — LLM-decomposed plan
    prompt = (
        f"Break down this query into a 3-step research plan. "
        f"query: {query}. Return ONLY a valid JSON list of strings."
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        plan = json.loads(response.content)
        if not isinstance(plan, list):
            raise ValueError
        clean = []
        for step in plan:
            for marker in ["Return ONLY", "JSON list", "valid JSON"]:
                if marker in step:
                    step = step[:step.index(marker)].strip().rstrip(".")
            clean.append(str(step))
        plan = clean
    except (json.JSONDecodeError, ValueError):
        plan = [
            f"Define core concepts for: {query[:60]}",
            "Retrieve recent empirical benchmarks",
            "Synthesise cross-source findings",
        ]
    return {"plan": plan}


async def explorer_node(state: AgentState) -> dict:
    """Parallel fan-out — all sub-queries fire simultaneously."""
    plan = state.get("plan", [])
    if not plan:
        return {"research_results": {}, "draft_report": "No plan generated."}

    tasks      = [brave_mcp.search(step) for step in plan]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    new_results: Dict[str, str] = {
        step: (str(r) if not isinstance(r, Exception) else f"Search error: {r}")
        for step, r in zip(plan, raw_results)
    }
    return {"research_results": new_results, "draft_report": f"Draft from {len(new_results)} parallel searches."}


async def context_pruning_node(state: AgentState) -> dict:
    """Trim combined context to 85 % of context window (~5 200 words)."""
    results  = state.get("research_results", {})
    MAX_WORDS = 5200
    current   = 0
    pruned: Dict[str, str] = {}

    for key, text in results.items():
        wc = len(text.split())
        if current + wc > MAX_WORDS:
            remaining = MAX_WORDS - current
            pruned[key] = (" ".join(text.split()[:remaining]) + " … [TRUNCATED]") if remaining > 0 else "[OMITTED]"
            current = MAX_WORDS
        else:
            pruned[key] = text
            current += wc

    return {"research_results": pruned}


async def auditor_generate_questions_node(state: AgentState) -> dict:
    """CoVe Phase 1 — only active in fact_check mode."""
    if state.get("mode", "fact_check") != "fact_check":
        return {"verification_questions": []}

    prompt = f"Read this draft and generate 3 verification questions:\n\n{state.get('draft_report', '')}"
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        questions = json.loads(response.content)
        if not isinstance(questions, list):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        questions = [
            "Are sources technically credible?",
            "Is there multi-source consensus?",
            "Do metrics align with independent benchmarks?",
        ]
    return {"verification_questions": questions}


async def auditor_verify_answers_node(state: AgentState) -> dict:
    """CoVe Phase 2 — skipped for non-fact_check modes."""
    mock_logprobs = [-0.01, -0.05, -0.02, -0.10, -0.04, -0.08]
    calibration   = calculate_discriminative_calibration(mock_logprobs, length_penalty=1.0)

    if state.get("mode", "fact_check") != "fact_check":
        return {"verified_report": state.get("draft_report", ""), "calibration_score": calibration}

    questions    = state.get("verification_questions", [])
    raw_evidence = str(state.get("research_results", {}))
    prompt = (
        "Answer these verification questions using ONLY the provided evidence. "
        f"Questions: {questions}. Evidence: {raw_evidence}"
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return {"verified_report": response.content, "calibration_score": calibration}


# ---------------------------------------------------------------------------
# Mode-specific synthesisers
# ---------------------------------------------------------------------------

async def _synthesize_fact_check(state: AgentState) -> dict:
    """Toulmin-structured report with MISSING_EVIDENCE circuit breaker."""
    verified = state.get("verified_report", "")
    prompt = (
        "Synthesize a final report using the Toulmin Model format. "
        "Return ONLY valid JSON with keys: claim, grounds (list), warrant, "
        "backing (list), rebuttal, qualifier. "
        f"Verified report: {verified}"
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    toulmin  = analyze_document_reasoning(response.content)

    if toulmin["status"] != "SUCCESS":
        final = (
            f"**Synthesis Halted — Circuit Breaker**\n\n"
            f"Status: `{toulmin['status']}`\n"
            f"Reason: {toulmin.get('reason', 'Insufficient evidence or logic chain.')}"
        )
    else:
        arg        = toulmin["argument"]
        grounds_md = "\n".join(f"- {g}" for g in arg["grounds"])
        backing_md = "\n".join(f"- {b}" for b in arg.get("backing", []))
        final = (
            f"### Verified Synthesis Report\n\n"
            f"**Claim:** {arg['claim']}\n\n"
            f"**Grounds (Evidence):**\n{grounds_md}\n\n"
            f"**Warrant (Logical Connection):** {arg['warrant']}\n\n"
            f"**Backing:**\n{backing_md}\n\n"
            f"**Qualifier:** {arg.get('qualifier', 'Likely')}\n\n"
            + (f"**Rebuttal:** {arg['rebuttal']}\n" if arg.get("rebuttal") else "")
        )
    return {"verified_report": final}


async def _synthesize_curation(state: AgentState) -> dict:
    """Bucket real DDG links into niche resource categories."""
    results   = state.get("research_results", {})
    query     = state.get("query", "")
    all_links = extract_links_from_results(results)

    def pick(domains: list, n: int = 3) -> list:
        return [l for l in all_links if any(d in l["url"] for d in domains)][:n]

    github_links  = pick(["github.com"])
    arxiv_links   = pick(["arxiv.org"])
    reddit_links  = pick(["reddit.com"])
    hn_links      = pick(["ycombinator.com"])
    paper_links   = [l for l in all_links
                     if any(kw in l["title"].lower() for kw in ["paper", "research", "study", "journal"])
                     and l not in arxiv_links][:2]
    other_links   = [l for l in all_links
                     if l not in github_links + arxiv_links + reddit_links + hn_links + paper_links][:4]

    by_snippet    = sorted(all_links, key=lambda x: len(x.get("snippet", "")), reverse=True)
    the_one       = by_snippet[0] if by_snippet else None

    curation = {
        "mode": "deep_curation",
        "query": query,
        "primary_sources": (arxiv_links + paper_links)[:3],
        "working_code": github_links,
        "expert_discussions": (reddit_links + hn_links)[:4],
        "deep_reads": other_links[:3],
        "the_one_thing": the_one,
        "total_sources": len(all_links),
    }
    return {"verified_report": json.dumps(curation)}


async def _synthesize_debate(state: AgentState) -> dict:
    """Split FOR/AGAINST search results into a structured debate."""
    results        = state.get("research_results", {})
    query          = state.get("query", "")
    for_points     = extract_key_points(results, prefix="FOR:")
    against_points = extract_key_points(results, prefix="AGAINST:")

    if not for_points and not against_points:
        all_pts = extract_key_points(results)
        mid = max(1, len(all_pts) // 2)
        for_points     = all_pts[:mid]
        against_points = all_pts[mid:]

    debate = {
        "mode": "debate",
        "topic": query,
        "for": {
            "headline": f"The case FOR: {query}",
            "arguments": for_points[:4] if for_points else [
                "Evidence from multiple independent sources supports this position.",
                "Recent developments have reinforced the foundational claims.",
                "Domain experts largely agree on the core merits.",
            ],
            "strongest_point": for_points[0] if for_points else "Convergent independent evidence.",
        },
        "against": {
            "headline": f"The case AGAINST: {query}",
            "arguments": against_points[:4] if against_points else [
                "Methodological concerns have been raised in peer review.",
                "Conflicting datasets produce inconsistent conclusions.",
                "Long-term effects remain under-studied.",
            ],
            "strongest_point": against_points[0] if against_points else "Significant counterarguments persist.",
        },
        "verdict": (
            f"On '{query}': both sides present substantiated positions. "
            "The core disagreement centres on how evidence is weighted and which "
            "trade-offs matter most for a given context."
        ),
    }
    return {"verified_report": json.dumps(debate)}


async def _synthesize_news(state: AgentState) -> dict:
    """Categorise news results into market impact, tech developments, sources."""
    results   = state.get("research_results", {})
    query     = state.get("query", "")
    all_links = extract_links_from_results(results)
    all_points = extract_key_points(results)

    market_domains = ["bloomberg", "ft.com", "reuters", "wsj", "finance", "investing", "marketwatch"]
    tech_domains   = ["techcrunch", "wired", "arstechnica", "theverge", "ycombinator", "venturebeat"]

    market_links = [l for l in all_links if any(d in l["url"] for d in market_domains)][:3]
    tech_links   = [l for l in all_links if any(d in l["url"] for d in tech_domains)][:3]

    snippets = [l["snippet"] for l in all_links if l.get("snippet")][:3]
    summary  = " ".join(snippets)[:400] if snippets else f"Aggregated intelligence on: {query}."

    # Extract unique publisher domains as key players
    key_players = list({
        l["url"].split("/")[2].replace("www.", "")
        for l in all_links if l.get("url") and "/" in l["url"]
    })[:6]

    news = {
        "mode": "news_intelligence",
        "topic": query,
        "summary": summary,
        "market_impact": [
            {"title": l["title"], "url": l["url"], "snippet": l.get("snippet", "")}
            for l in (market_links or all_links[:2])
        ],
        "tech_developments": [
            {"title": l["title"], "url": l["url"], "snippet": l.get("snippet", "")}
            for l in (tech_links or all_links[2:4])
        ],
        "key_players": key_players,
        "what_to_watch": [p[:150] for p in all_points[:3]] if all_points else [
            f"Monitor regulatory responses to {query}",
            "Track competitor and market leader reactions",
            "Watch for downstream supply chain or pricing effects",
        ],
        "sources": [{"title": l["title"], "url": l["url"]} for l in all_links[:5]],
    }
    return {"verified_report": json.dumps(news)}


async def _synthesize_tech_stack(state: AgentState) -> dict:
    """Detect technology mentions in search results and build a stack recommendation."""
    results    = state.get("research_results", {})
    query      = state.get("query", "")
    all_links  = extract_links_from_results(results)
    all_points = extract_key_points(results)
    full_text  = " ".join(results.values()).lower()

    FRONTEND = ["react", "next.js", "nextjs", "vue", "nuxt", "angular", "svelte", "remix", "astro"]
    BACKEND  = ["fastapi", "django", "express", "nestjs", "rails", "spring", "gin", "fiber", "hono", "flask", "actix"]
    DATABASE = ["postgresql", "postgres", "mongodb", "redis", "mysql", "supabase", "planetscale",
                "sqlite", "lancedb", "pinecone", "qdrant", "weaviate", "neon"]
    INFRA    = ["vercel", "railway", "fly.io", "aws", "gcp", "azure", "docker", "kubernetes",
                "render", "cloudflare", "netlify"]

    def find_mentions(tech_list: list) -> list:
        return [t for t in tech_list if t in full_text]

    frontend_hits = find_mentions(FRONTEND)
    backend_hits  = find_mentions(BACKEND)
    db_hits       = find_mentions(DATABASE)
    infra_hits    = find_mentions(INFRA)

    github_links = [{"title": l["title"], "url": l["url"]}
                    for l in all_links if "github.com" in l.get("url", "")][:3]

    stack = {
        "mode": "tech_stack",
        "use_case": query,
        "recommended": {
            "frontend": frontend_hits[:2] if frontend_hits else ["Next.js"],
            "backend":  backend_hits[:2]  if backend_hits  else ["FastAPI"],
            "database": db_hits[:2]       if db_hits       else ["PostgreSQL"],
            "infra":    infra_hits[:2]    if infra_hits    else ["Vercel + Railway"],
        },
        "reasoning": [p[:150] for p in all_points[:4]] if all_points else [
            "Match stack maturity to team size — managed services reduce ops burden early.",
            "Typed API contracts (FastAPI OpenAPI, tRPC) prevent frontend/backend drift.",
            "Prefer postgres-compatible DBs for relational data; add vector store only when needed.",
        ],
        "avoid": [
            "Microservices before product-market fit — monolith first, split on bottleneck.",
            "Choosing technology for hype over ecosystem maturity and hiring pool.",
        ],
        "starter_resources": github_links,
        "sources_scanned": len(all_links),
    }
    return {"verified_report": json.dumps(stack)}


async def _synthesize_person_intel(state: AgentState) -> dict:
    """Aggregate public information about a person or company."""
    results   = state.get("research_results", {})
    query     = state.get("query", "")
    all_links = extract_links_from_results(results)
    all_points = extract_key_points(results)

    profile_domains = ["linkedin.com", "crunchbase.com", "bloomberg.com", "forbes.com"]
    social_domains  = ["github.com", "twitter.com", "x.com", "medium.com", "substack.com"]
    news_domains    = ["techcrunch.com", "reuters.com", "wired.com", "theverge.com", "ft.com"]

    profile_links = [l for l in all_links if any(d in l["url"] for d in profile_domains)][:2]
    social_links  = [l for l in all_links if any(d in l["url"] for d in social_domains)][:3]
    news_links    = [l for l in all_links if any(d in l["url"] for d in news_domains)][:3]

    snippets = sorted([l["snippet"] for l in all_links if l.get("snippet")], key=len, reverse=True)
    summary  = snippets[0][:400] if snippets else f"Intelligence report on: {query}."
    key_facts = [p[:150] for p in all_points[:5]] if all_points else [
        f"Multiple public sources reference {query}.",
        "Cross-reference with LinkedIn or Crunchbase for verified details.",
    ]

    profile = {
        "mode":                 "person_intelligence",
        "subject":              query,
        "summary":              summary,
        "key_facts":            key_facts,
        "professional_profiles": [{"title": l["title"], "url": l["url"], "snippet": l.get("snippet", "")} for l in (profile_links or all_links[:2])],
        "online_presence":      [{"title": l["title"], "url": l["url"]} for l in (social_links or all_links[2:4])],
        "recent_coverage":      [{"title": l["title"], "url": l["url"], "snippet": l.get("snippet", "")} for l in (news_links or all_links[4:6])],
        "sources_scanned":      len(all_links),
    }
    return {"verified_report": json.dumps(profile)}


async def _synthesize_learning_path(state: AgentState) -> dict:
    """Build a 3-phase structured learning path from search results."""
    results    = state.get("research_results", {})
    query      = state.get("query", "")
    all_links  = extract_links_from_results(results)
    all_points = extract_key_points(results)
    full_text  = " ".join(results.values()).lower()

    course_domains = ["coursera", "udemy", "edx", "pluralsight", "freecodecamp",
                      "khanacademy", "youtube", "linkedin.com/learning", "egghead"]
    github_links   = [l for l in all_links if "github.com" in l.get("url", "")][:4]
    course_links   = [l for l in all_links if any(d in l["url"] for d in course_domains)][:3]
    doc_links      = [l for l in all_links if any(d in l["url"] for d in ["docs.", "readthedocs", "developer.", "wiki"])][:2]

    prereq_hints  = [p for p in all_points if any(w in p.lower() for w in ["prerequisite", "before", "first", "basic", "foundation"])][:3]
    project_hints = [p for p in all_points if any(w in p.lower() for w in ["project", "build", "create", "implement", "practice"])][:3]

    third = max(1, len(all_links) // 3)

    path = {
        "mode":  "learning_path",
        "topic": query,
        "phases": [
            {
                "name":      "Foundation",
                "duration":  "2–4 weeks",
                "goal":      f"Understand core concepts and fundamentals of {query}",
                "resources": [{"title": l["title"], "url": l["url"]} for l in (course_links or all_links[:third])[:3]],
            },
            {
                "name":      "Intermediate",
                "duration":  "4–8 weeks",
                "goal":      f"Build real projects and deepen understanding",
                "resources": [{"title": l["title"], "url": l["url"]} for l in (doc_links + all_links[third:third * 2])[:3]],
            },
            {
                "name":      "Advanced",
                "duration":  "8–12 weeks",
                "goal":      f"Master advanced patterns and contribute to the ecosystem",
                "resources": [{"title": l["title"], "url": l["url"]} for l in (github_links or all_links[third * 2:])[:3]],
            },
        ],
        "prerequisites": prereq_hints if prereq_hints else [
            "Basic programming fundamentals",
            "Comfort with the command line",
        ],
        "projects": project_hints if project_hints else [
            f"Build a small end-to-end {query} project from scratch",
            f"Contribute to an open-source {query} repository",
            f"Recreate a real-world {query} use case with your own data",
        ],
        "key_resources":   [{"title": l["title"], "url": l["url"]} for l in all_links[:5]],
        "sources_scanned": len(all_links),
    }
    return {"verified_report": json.dumps(path)}


async def synthesizer_node(state: AgentState) -> dict:
    mode = state.get("mode", "fact_check")
    if mode == "deep_curation":     return await _synthesize_curation(state)
    if mode == "debate":            return await _synthesize_debate(state)
    if mode == "news_intelligence": return await _synthesize_news(state)
    if mode == "tech_stack":        return await _synthesize_tech_stack(state)
    if mode == "person_intelligence": return await _synthesize_person_intel(state)
    if mode == "learning_path":     return await _synthesize_learning_path(state)
    return await _synthesize_fact_check(state)


# ---------------------------------------------------------------------------
# LangGraph workflow
# ---------------------------------------------------------------------------

workflow = StateGraph(AgentState)
workflow.add_node("planner",           planner_node)
workflow.add_node("explorer",          explorer_node)
workflow.add_node("context_pruning",   context_pruning_node)
workflow.add_node("auditor_questions", auditor_generate_questions_node)
workflow.add_node("auditor_verify",    auditor_verify_answers_node)
workflow.add_node("synthesizer",       synthesizer_node)

workflow.set_entry_point("planner")
workflow.add_edge("planner",           "explorer")
workflow.add_edge("explorer",          "context_pruning")
workflow.add_edge("context_pruning",   "auditor_questions")
workflow.add_edge("auditor_questions", "auditor_verify")
workflow.add_edge("auditor_verify",    "synthesizer")
workflow.add_edge("synthesizer",       END)

memory    = MemorySaver()
app_graph = workflow.compile(checkpointer=memory)

# ---------------------------------------------------------------------------
# SSE streaming endpoint
# ---------------------------------------------------------------------------

async def run_graph_stream(query: str, mode: str, thread_id: str):
    initial_state: AgentState = {
        "query": query,
        "mode": mode,
        "plan": [],
        "research_results": {},
        "draft_report": "",
        "verification_questions": [],
        "verified_report": "",
        "calibration_score": 0.0,
        "messages": [],
    }
    config = {"configurable": {"thread_id": thread_id}}
    try:
        async for event in app_graph.astream(initial_state, config, stream_mode="updates"):
            serializable: dict = {}
            for node, data in event.items():
                node_data: dict = {}
                for k, v in data.items():
                    node_data[k] = (
                        [{"type": m.type, "content": m.content} for m in v]
                        if k == "messages" else v
                    )
                serializable[node] = node_data
            yield f"data: {json.dumps(serializable)}\n\n"
            await asyncio.sleep(0)
        yield "data: [DONE]\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"


@app.get("/research/stream")
async def research_stream(query: str, mode: str = "fact_check") -> StreamingResponse:
    thread_id = os.urandom(8).hex()
    return StreamingResponse(
        run_graph_stream(query, mode, thread_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
