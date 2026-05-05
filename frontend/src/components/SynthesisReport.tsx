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

// ── Root component — auto-detects mode from report payload ────────────────────

export default function SynthesisReport({ report, calibrationScore }: SynthesisReportProps) {
  if (!report) return null;

  let parsed: (CurationData | DebateData) | null = null;
  try {
    parsed = JSON.parse(report) as CurationData | DebateData;
  } catch {
    // Not JSON — render as fact_check markdown
  }

  if (parsed?.mode === 'deep_curation')
    return <CurationReport data={parsed as CurationData} calibrationScore={calibrationScore} />;
  if (parsed?.mode === 'debate')
    return <DebateReport data={parsed as DebateData} calibrationScore={calibrationScore} />;

  return <FactCheckReport report={report} calibrationScore={calibrationScore} />;
}
