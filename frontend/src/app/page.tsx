"use client";

import React, { useState, useRef, useCallback } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ModeSelector, { type Mode } from '@/components/ModeSelector';
import DiscoveryTree from '@/components/DiscoveryTree';
import SynthesisReport from '@/components/SynthesisReport';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNodeType(step: string, mode: Mode): string {
  if (mode === 'debate') {
    return step.startsWith('FOR:') ? 'debater_for' : 'debater_against';
  }
  if (mode === 'deep_curation')     return 'curator';
  if (mode === 'news_intelligence')   return 'news_reporter';
  if (mode === 'tech_stack')          return 'tech_advisor';
  if (mode === 'person_intelligence') return 'intel_agent';
  if (mode === 'learning_path')       return 'learn_scout';
  return 'explorer';
}

function formatNodeLabel(step: string, mode: Mode): string {
  if (mode === 'deep_curation') {
    if (step.includes('site:github.com'))             return '⬛ GitHub';
    if (step.includes('site:arxiv.org'))              return '📄 arXiv';
    if (step.includes('site:reddit.com'))             return '🔴 Reddit';
    if (step.includes('site:news.ycombinator.com'))   return '🟠 HackerNews';
    return '🔍 Web';
  }
  if (mode === 'debate') {
    const stripped = step.replace(/^(FOR|AGAINST):\s*/i, '').slice(0, 45);
    return stripped + (stripped.length === 45 ? '…' : '');
  }
  if (mode === 'news_intelligence') {
    if (step.includes('site:reuters.com'))    return '📡 Reuters';
    if (step.includes('site:techcrunch.com')) return '⚡ TechCrunch';
    if (step.includes('site:bloomberg.com'))  return '💹 Bloomberg';
    if (step.includes('site:ft.com'))         return '📊 FT';
    return '📰 News';
  }
  if (mode === 'tech_stack') {
    if (step.includes('site:github.com')) return '⬛ GitHub';
    if (step.includes('comparison'))      return '⚖️ Compare';
    if (step.includes('production'))      return '🏭 Production';
    if (step.includes('alternatives'))    return '🔀 Alternatives';
    return '🧪 Stack';
  }
  if (mode === 'person_intelligence') {
    if (step.includes('linkedin') || step.includes('crunchbase')) return '👤 Profile';
    if (step.includes('github'))      return '⬛ GitHub';
    if (step.includes('news') || step.includes('interviews'))     return '📰 News';
    if (step.includes('achievements')) return '🏆 Achievements';
    return '🔍 Intel';
  }
  if (mode === 'learning_path') {
    if (step.includes('roadmap'))      return '🗺 Roadmap';
    if (step.includes('site:github')) return '⬛ GitHub';
    if (step.includes('books') || step.includes('courses')) return '📚 Courses';
    if (step.includes('projects'))     return '🛠 Projects';
    if (step.includes('prerequisites')) return '🔑 Prerequisites';
    return '🎓 Resources';
  }
  return step.slice(0, 50) + (step.length > 50 ? '…' : '');
}

const EXAMPLE_QUERIES: Record<Mode, string[]> = {
  fact_check:        ['Is GPT-4 better than Claude 3?', 'Does caffeine improve cognitive performance?'],
  deep_curation:     ['best vector databases for RAG 2025', 'LLM quantization techniques'],
  debate:            ['Is remote work more productive?', 'Should AI be open source?'],
  news_intelligence:   ['AI chips market impact 2025', 'OpenAI market strategy latest'],
  tech_stack:          ['real-time chat app 100k users', 'AI document search system'],
  person_intelligence: ['Sam Altman OpenAI', 'Anthropic AI company'],
  learning_path:       ['machine learning from scratch', 'system design for engineers'],
};

// ── Main component ────────────────────────────────────────────────────────────

export default function AppDashboard() {
  const [nodes, setNodes]               = useState<Node[]>([]);
  const [edges, setEdges]               = useState<Edge[]>([]);
  const [query, setQuery]               = useState('');
  const [mode, setMode]                 = useState<Mode>('fact_check');
  const [isLoading, setIsLoading]       = useState(false);
  const [report, setReport]             = useState('');
  const [calibrationScore, setCalibrationScore] = useState<number | null>(null);

  const explorerIdsRef  = useRef<string[]>([]);
  const currentYRef     = useRef(150);
  const eventSourceRef  = useRef<EventSource | null>(null);

  const runResearch = useCallback((overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;

    eventSourceRef.current?.close();
    setIsLoading(true);
    setReport('');
    setCalibrationScore(null);
    explorerIdsRef.current = [];
    currentYRef.current    = 150;

    setNodes([{
      id: 'planner',
      type: 'planner',
      position: { x: 400, y: 50 },
      data: { label: `${q.slice(0, 45)}${q.length > 45 ? '…' : ''}` },
    }]);
    setEdges([]);

    const es = new EventSource(
      `http://localhost:8000/research/stream?query=${encodeURIComponent(q)}&mode=${mode}`
    );
    eventSourceRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      if (event.data === '[DONE]') { es.close(); setIsLoading(false); return; }

      try {
        const data = JSON.parse(event.data) as Record<string, Record<string, unknown>>;

        // Planner → fan-out explorer nodes
        if (data.planner?.plan) {
          const plan = data.planner.plan as string[];
          explorerIdsRef.current = plan.map((_, i) => `explorer_${i}`);

          const planNodes: Node[] = plan.map((step, i) => ({
            id:       `explorer_${i}`,
            type:     getNodeType(step, mode),
            position: { x: 80 + i * 280, y: currentYRef.current },
            data:     { label: formatNodeLabel(step, mode) },
          }));
          const planEdges: Edge[] = plan.map((_, i) => ({
            id:            `e-planner-explorer_${i}`,
            source:        'planner',
            sourceHandle:  'source',
            target:        `explorer_${i}`,
            targetHandle:  'target',
            animated:      true,
          }));

          setNodes(nds => [...nds, ...planNodes]);
          setEdges(eds => [...eds, ...planEdges]);
        }

        // Explorer results → auditor node
        if (data.explorer) {
          currentYRef.current += 160;
          const auditorNode: Node = {
            id: 'auditor', type: 'auditor',
            position: { x: 400, y: currentYRef.current },
            data: { label: mode === 'debate' ? 'Argument Auditor' : mode === 'deep_curation' ? 'Source Curator' : mode === 'news_intelligence' ? 'News Aggregator' : mode === 'tech_stack' ? 'Stack Analyzer' : mode === 'person_intelligence' ? 'Profile Aggregator' : mode === 'learning_path' ? 'Resource Collector' : 'CoVe Auditor' },
          };
          const explorerEdges: Edge[] = explorerIdsRef.current.map(id => ({
            id: `e-${id}-auditor`, source: id, sourceHandle: 'source',
            target: 'auditor', targetHandle: 'target', animated: true,
          }));
          setNodes(nds => [...nds, auditorNode]);
          setEdges(eds => [...eds, ...explorerEdges]);
        }

        // Auditor verify → synthesizer node + calibration score
        if (data.auditor_verify) {
          currentYRef.current += 160;
          const synthNode: Node = {
            id: 'synthesizer', type: 'synthesizer',
            position: { x: 400, y: currentYRef.current },
            data: { label: mode === 'deep_curation' ? 'Curator' : mode === 'debate' ? 'Debate Engine' : mode === 'news_intelligence' ? 'News Brief' : mode === 'tech_stack' ? 'Stack Report' : mode === 'person_intelligence' ? 'Intel Report' : mode === 'learning_path' ? 'Learning Path' : 'Synthesizer' },
          };
          setNodes(nds => [...nds, synthNode]);
          setEdges(eds => [...eds, {
            id: 'e-auditor-synthesizer', source: 'auditor', sourceHandle: 'source',
            target: 'synthesizer', targetHandle: 'target', animated: true,
          }]);
          if (data.auditor_verify.calibration_score != null)
            setCalibrationScore(data.auditor_verify.calibration_score as number);
        }

        // Synthesizer → final report
        if (data.synthesizer) {
          const finalReport = (data.synthesizer.verified_report ?? '') as string;
          if (finalReport) setReport(finalReport);
        }

      } catch { /* non-JSON frames ignored */ }
    };

    es.onerror = () => { es.close(); setIsLoading(false); };
  }, [query, mode]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setReport('');
    setCalibrationScore(null);
    setNodes([]);
    setEdges([]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="p-3 bg-white shadow-sm flex items-center gap-3 z-10 flex-wrap">
        <h1 className="text-lg font-bold text-slate-800 whitespace-nowrap">Verity-OS</h1>

        <ModeSelector mode={mode} onChange={handleModeChange} disabled={isLoading} />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            placeholder={
              mode === 'fact_check'          ? 'Enter a claim or question to fact-check…' :
              mode === 'deep_curation'       ? 'What topic do you want expert resources for?' :
              mode === 'news_intelligence'   ? 'Any market, tech or business topic…' :
              mode === 'tech_stack'          ? 'Describe your app or use case…' :
              mode === 'person_intelligence' ? 'Enter a public figure or company name…' :
              mode === 'learning_path'       ? 'What skill or technology do you want to learn?' :
                                              'Enter any topic to debate both sides…'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runResearch()}
            disabled={isLoading}
          />
          <Button onClick={() => runResearch()} disabled={isLoading || !query.trim()}>
            {isLoading ? 'Running…' : 'Discover'}
          </Button>
        </div>

        {report && calibrationScore !== null && mode === 'fact_check' && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">Confidence:</span>
            <span className={`text-xs px-2 py-1 rounded font-bold ${calibrationScore > 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {(calibrationScore * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Example queries ──────────────────────────────────────────────── */}
      {!isLoading && !report && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
          <span className="text-xs text-slate-400 shrink-0">Try:</span>
          {EXAMPLE_QUERIES[mode].map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); runResearch(q); }}
              className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div className="flex-1 w-full relative">
        <DiscoveryTree nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
        <SynthesisReport report={report} calibrationScore={calibrationScore} />
      </div>
    </div>
  );
}
