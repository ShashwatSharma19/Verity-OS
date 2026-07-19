"use client";

import React from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface CurationItem {
  title: string;
  url: string;
  snippet?: string;
}

interface CurationData {
  mode: 'deep_curation';
  query: string;
  primary_sources: CurationItem[];
  working_code: CurationItem[];
  expert_discussions: CurationItem[];
  deep_reads: CurationItem[];
  the_one_thing: CurationItem | null;
  total_sources: number;
}

interface DebateSideData {
  headline: string;
  arguments: string[];
  strongest_point: string;
}

interface DebateData {
  mode: 'debate';
  topic: string;
  for: DebateSideData;
  against: DebateSideData;
  verdict: string;
}

interface NewsItem {
  title: string;
  url: string;
  snippet?: string;
}

interface NewsData {
  mode: 'news_intelligence';
  topic: string;
  summary: string;
  market_impact: NewsItem[];
  tech_developments: NewsItem[];
  key_players: string[];
  what_to_watch: string[];
  sources: NewsItem[];
}

interface TechStackData {
  mode: 'tech_stack';
  use_case: string;
  recommended: {
    frontend: string[];
    backend: string[];
    database: string[];
    infra: string[];
  };
  reasoning: string[];
  avoid: string[];
  starter_resources: { title: string; url: string }[];
  sources_scanned: number;
}

interface ProfileLink {
  title: string;
  url: string;
  snippet?: string;
}

interface PersonIntelData {
  mode: 'person_intelligence';
  subject: string;
  summary: string;
  key_facts: string[];
  professional_profiles: ProfileLink[];
  online_presence: { title: string; url: string }[];
  recent_coverage: ProfileLink[];
  sources_scanned: number;
}

interface LearningPhase {
  name: string;
  duration: string;
  goal: string;
  resources: { title: string; url: string }[];
}

interface LearningPathData {
  mode: 'learning_path';
  topic: string;
  phases: LearningPhase[];
  prerequisites: string[];
  projects: string[];
  key_resources: { title: string; url: string }[];
  sources_scanned: number;
}

interface SynthesisReportProps {
  report: string;
  calibrationScore: number | null;
}

// ── Shared header ─────────────────────────────────────────────────────────────

function ReportHeader({
  icon, title, subtitle, badge, badgeColor,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        {badge && (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
}

// ── Fact Check view ───────────────────────────────────────────────────────────

function inlineMarkdown(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### '))
      return <h3 key={i} className="text-sm font-bold text-slate-800 mt-3 mb-1">{line.replace('### ', '')}</h3>;
    if (line.startsWith('- '))
      return <li key={i} className="ml-4 list-disc text-slate-600 text-sm">{inlineMarkdown(line.replace(/^- /, ''))}</li>;
    if (line.trim() === '')
      return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-slate-600 leading-relaxed">{inlineMarkdown(line)}</p>;
  });
}

function FactCheckReport({ report, calibrationScore }: { report: string; calibrationScore: number | null }) {
  const confidence = calibrationScore ?? 0;
  const isHigh     = confidence > 0.8;
  return (
    <div className="absolute bottom-4 right-4 bg-white shadow-2xl rounded-xl max-w-md w-full border border-slate-200 z-50 flex flex-col max-h-[60vh]">
      <ReportHeader
        icon="✓"
        title="Verified Synthesis Report"
        badge={calibrationScore !== null ? `Confidence: ${(confidence * 100).toFixed(1)}%` : undefined}
        badgeColor={isHigh ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
      />
      {calibrationScore !== null && (
        <div className="h-1 w-full bg-slate-100 flex-shrink-0">
          <div
            className={`h-1 transition-all duration-700 ${isHigh ? 'bg-green-400' : 'bg-orange-400'}`}
            style={{ width: `${(confidence * 100).toFixed(1)}%` }}
          />
        </div>
      )}
      <div className="overflow-y-auto flex-1 px-5 py-4">{renderMarkdown(report)}</div>
    </div>
  );
}

// ── Deep Curation view ────────────────────────────────────────────────────────

function ResourceList({ title, icon, items }: { title: string; icon: string; items: CurationItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-slate-300 text-xs mt-1">▸</span>
            <div className="min-w-0">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline break-words"
              >
                {item.title}
              </a>
              {item.snippet && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {item.snippet.slice(0, 120)}{item.snippet.length > 120 ? '…' : ''}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CurationReport({ data, calibrationScore }: { data: CurationData; calibrationScore: number | null }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white shadow-2xl rounded-xl max-w-md w-full border border-slate-200 z-50 flex flex-col max-h-[70vh]">
      <ReportHeader
        icon="🕳"
        title="Deep Curation"
        subtitle={data.query}
        badge={`${data.total_sources} sources found`}
        badgeColor="bg-purple-100 text-purple-700"
      />

      {/* The One Thing — hero highlight */}
      {data.the_one_thing && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">⭐ Start Here</div>
          <a
            href={data.the_one_thing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-blue-700 hover:underline break-words"
          >
            {data.the_one_thing.title}
          </a>
          {data.the_one_thing.snippet && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {data.the_one_thing.snippet.slice(0, 110)}…
            </p>
          )}
        </div>
      )}

      <div className="overflow-y-auto flex-1 px-5 py-4">
        <ResourceList title="Primary Sources"     icon="📄" items={data.primary_sources} />
        <ResourceList title="Working Code"        icon="💻" items={data.working_code} />
        <ResourceList title="Expert Discussions"  icon="🧵" items={data.expert_discussions} />
        <ResourceList title="Deep Reads"          icon="📖" items={data.deep_reads} />
      </div>
    </div>
  );
}

// ── Debate view ───────────────────────────────────────────────────────────────

function DebateSide({ side, isFor }: { side: DebateSideData; isFor: boolean }) {
  const accent = isFor
    ? { bg: 'bg-green-50', border: 'border-green-200', label: 'text-green-700', pill: 'bg-green-100 text-green-800', icon: '✅' }
    : { bg: 'bg-red-50',   border: 'border-red-200',   label: 'text-red-700',   pill: 'bg-red-100 text-red-800',     icon: '❌' };

  return (
    <div className={`flex-1 p-3 ${accent.bg} border ${accent.border} rounded-lg flex flex-col gap-2`}>
      <div className={`text-xs font-bold uppercase ${accent.label}`}>
        {accent.icon} {isFor ? 'FOR' : 'AGAINST'}
      </div>
      <ul className="space-y-1.5 flex-1">
        {side.arguments.map((arg, i) => (
          <li key={i} className="text-xs text-slate-700 leading-relaxed">
            <span className={`font-bold ${accent.label}`}>• </span>{arg}
          </li>
        ))}
      </ul>
      <div className={`text-xs p-2 rounded ${accent.pill} leading-relaxed`}>
        <span className="font-bold">Strongest: </span>{side.strongest_point}
      </div>
    </div>
  );
}

function DebateReport({ data, calibrationScore }: { data: DebateData; calibrationScore: number | null }) {
  const confidence = calibrationScore ?? 0;
  return (
    <div className="absolute bottom-4 right-4 bg-white shadow-2xl rounded-xl max-w-xl w-full border border-slate-200 z-50 flex flex-col max-h-[70vh]">
      <ReportHeader
        icon="⚔️"
        title="Debate Analysis"
        subtitle={data.topic}
        badge={calibrationScore !== null ? `${(confidence * 100).toFixed(1)}% confidence` : undefined}
        badgeColor="bg-blue-100 text-blue-700"
      />

      <div className="flex gap-2 p-4 overflow-y-auto flex-1">
        <DebateSide side={data.for}     isFor={true} />
        <DebateSide side={data.against} isFor={false} />
      </div>

      <div className="px-4 pb-4 flex-shrink-0">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">⚖️ Verdict</div>
          <p className="text-xs text-slate-600 leading-relaxed">{data.verdict}</p>
        </div>
      </div>
    </div>
  );
}

// ── News Intelligence view ───────────────────────────────────────────────────

function NewsLink({ item }: { item: NewsItem }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-slate-300 text-xs mt-1">▸</span>
      <div className="min-w-0">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline break-words">
            {item.title}
          </a>
        ) : (
          <span className="text-sm font-medium text-slate-700">{item.title}</span>
        )}
        {item.snippet && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {item.snippet.slice(0, 120)}{item.snippet.length > 120 ? '…' : ''}
          </p>
        )}
      </div>
    </li>
  );
}

function NewsReport({ data }: { data: NewsData }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white shadow-2xl rounded-xl max-w-md w-full border border-slate-200 z-50 flex flex-col max-h-[75vh]">
      <ReportHeader icon="📰" title="News Intelligence" subtitle={data.topic}
        badge="Market + Tech" badgeColor="bg-orange-100 text-orange-700" />

      {/* Summary strip */}
      <div className="mx-4 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex-shrink-0">
        <p className="text-xs text-slate-600 leading-relaxed">{data.summary}</p>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        {data.market_impact?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">💹</span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Market Impact</span>
            </div>
            <ul className="space-y-2">{data.market_impact.map((item, i) => <NewsLink key={i} item={item} />)}</ul>
          </div>
        )}

        {data.tech_developments?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">⚡</span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tech Developments</span>
            </div>
            <ul className="space-y-2">{data.tech_developments.map((item, i) => <NewsLink key={i} item={item} />)}</ul>
          </div>
        )}

        {data.what_to_watch?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">👁</span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">What to Watch</span>
            </div>
            <ul className="space-y-1">
              {data.what_to_watch.map((w, i) => (
                <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-1.5">
                  <span className="text-orange-400 font-bold">•</span>{w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.key_players?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">🏢</span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Key Players</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.key_players.map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tech Stack Advisor view ───────────────────────────────────────────────────

const STACK_LAYERS: { key: keyof TechStackData['recommended']; icon: string; label: string; color: string }[] = [
  { key: 'frontend', icon: '🖥',  label: 'Frontend',  color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'backend',  icon: '⚙️',  label: 'Backend',   color: 'bg-green-50 border-green-200 text-green-800' },
  { key: 'database', icon: '🗄',  label: 'Database',  color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { key: 'infra',    icon: '☁️',  label: 'Infra',     color: 'bg-orange-50 border-orange-200 text-orange-800' },
];

function TechStackReport({ data }: { data: TechStackData }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white shadow-2xl rounded-xl max-w-md w-full border border-slate-200 z-50 flex flex-col max-h-[75vh]">
      <ReportHeader icon="🧪" title="Tech Stack Recommendation" subtitle={data.use_case}
        badge={`${data.sources_scanned} sources`} badgeColor="bg-teal-100 text-teal-700" />

      {/* Stack grid */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 flex-shrink-0">
        {STACK_LAYERS.map(({ key, icon, label, color }) => (
          <div key={key} className={`p-2.5 rounded-lg border ${color}`}>
            <div className="text-xs font-bold uppercase mb-1">{icon} {label}</div>
            {data.recommended[key].map((t, i) => (
              <div key={i} className="text-xs font-semibold">{t}</div>
            ))}
          </div>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        {data.reasoning?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">💡 Why This Stack</div>
            <ul className="space-y-1.5">
              {data.reasoning.map((r, i) => (
                <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-1.5">
                  <span className="text-teal-500 font-bold shrink-0">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.avoid?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">⚠️ Avoid</div>
            <ul className="space-y-1.5">
              {data.avoid.map((a, i) => (
                <li key={i} className="text-xs text-red-600 leading-relaxed flex gap-1.5">
                  <span className="font-bold shrink-0">✕</span>{a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.starter_resources?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">⬛ Starter Repos</div>
            <ul className="space-y-1.5">
              {data.starter_resources.map((r, i) => (
                <li key={i}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-words">
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Person / Company Intelligence view ───────────────────────────────────────

function PersonIntelReport({ data }: { data: PersonIntelData }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white shadow-2xl rounded-xl max-w-md w-full border border-slate-200 z-50 flex flex-col max-h-[75vh]">
      <ReportHeader icon="🔍" title={data.subject} subtitle="Intelligence Report"
        badge={`${data.sources_scanned} sources`} badgeColor="bg-indigo-100 text-indigo-700" />

      {/* Legal disclaimer */}
      <div className="mx-4 mt-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg flex-shrink-0">
        <p className="text-xs text-yellow-800 leading-snug">
          ⚠️ Results aggregated from publicly indexed sources only. Accuracy is not guaranteed — always verify before acting on this information.
        </p>
      </div>

      {/* Summary */}
      <div className="mx-4 mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex-shrink-0">
        <p className="text-xs text-slate-700 leading-relaxed">{data.summary}</p>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        {/* Key facts */}
        {data.key_facts?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">📌 Key Facts</div>
            <ul className="space-y-1.5">
              {data.key_facts.map((f, i) => (
                <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-1.5">
                  <span className="text-indigo-400 font-bold shrink-0">•</span>{f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Professional profiles */}
        {data.professional_profiles?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">👤 Profiles</div>
            <ul className="space-y-2">
              {data.professional_profiles.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline break-words">{l.title}</a>
                  {l.snippet && <p className="text-xs text-slate-500 mt-0.5">{l.snippet.slice(0, 100)}…</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Online presence */}
        {data.online_presence?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">🌐 Online Presence</div>
            <div className="flex flex-wrap gap-2">
              {data.online_presence.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 bg-slate-100 text-blue-600 rounded-full hover:underline">
                  {l.title.slice(0, 30)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Recent coverage */}
        {data.recent_coverage?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">📰 Recent Coverage</div>
            <ul className="space-y-2">
              {data.recent_coverage.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline break-words">{l.title}</a>
                  {l.snippet && <p className="text-xs text-slate-500 mt-0.5">{l.snippet.slice(0, 100)}…</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Learning Path view ────────────────────────────────────────────────────────

const PHASE_COLORS = [
  { bg: 'bg-green-50', border: 'border-green-200', label: 'text-green-700', dot: 'bg-green-400' },
  { bg: 'bg-blue-50',  border: 'border-blue-200',  label: 'text-blue-700',  dot: 'bg-blue-400'  },
  { bg: 'bg-purple-50',border: 'border-purple-200',label: 'text-purple-700',dot: 'bg-purple-400'},
];

function LearningPathReport({ data }: { data: LearningPathData }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white shadow-2xl rounded-xl max-w-lg w-full border border-slate-200 z-50 flex flex-col max-h-[80vh]">
      <ReportHeader icon="🎓" title={`Learn: ${data.topic}`}
        badge={`${data.sources_scanned} sources`} badgeColor="bg-yellow-100 text-yellow-700" />

      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        {/* 3 phases */}
        {data.phases?.map((phase, i) => {
          const c = PHASE_COLORS[i] ?? PHASE_COLORS[2];
          return (
            <div key={i} className={`p-3 rounded-lg border ${c.bg} ${c.border}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold uppercase ${c.label}`}>
                  Phase {i + 1} — {phase.name}
                </span>
                <span className="text-xs text-slate-500">{phase.duration}</span>
              </div>
              <p className="text-xs text-slate-600 mb-2 leading-relaxed">{phase.goal}</p>
              {phase.resources?.length > 0 && (
                <ul className="space-y-1">
                  {phase.resources.map((r, j) => (
                    <li key={j} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate">{r.title}</a>
                      ) : (
                        <span className="text-xs text-slate-600">{r.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Prerequisites */}
        {data.prerequisites?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">🔑 Prerequisites</div>
            <ul className="space-y-1">
              {data.prerequisites.map((p, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-yellow-500 font-bold shrink-0">•</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Project ideas */}
        {data.projects?.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">🛠 Project Ideas</div>
            <ul className="space-y-1">
              {data.projects.map((p, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-slate-400 font-bold shrink-0">{i + 1}.</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root component — auto-detects mode from report payload ────────────────────

export default function SynthesisReport({ report, calibrationScore }: SynthesisReportProps) {
  if (!report) return null;

  let parsed: (CurationData | DebateData | NewsData | TechStackData | PersonIntelData | LearningPathData) | null = null;
  try {
    parsed = JSON.parse(report) as CurationData | DebateData | NewsData | TechStackData | PersonIntelData | LearningPathData;
  } catch {
    // Not JSON — render as fact_check markdown
  }

  if (parsed?.mode === 'deep_curation')       return <CurationReport data={parsed as CurationData} calibrationScore={calibrationScore} />;
  if (parsed?.mode === 'debate')              return <DebateReport data={parsed as DebateData} calibrationScore={calibrationScore} />;
  if (parsed?.mode === 'news_intelligence')   return <NewsReport data={parsed as NewsData} />;
  if (parsed?.mode === 'tech_stack')          return <TechStackReport data={parsed as TechStackData} />;
  if (parsed?.mode === 'person_intelligence') return <PersonIntelReport data={parsed as PersonIntelData} />;
  if (parsed?.mode === 'learning_path')       return <LearningPathReport data={parsed as LearningPathData} />;

  return <FactCheckReport report={report} calibrationScore={calibrationScore} />;
}
