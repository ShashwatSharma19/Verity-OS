"use client";

import React from 'react';

export type Mode = 'fact_check' | 'deep_curation' | 'debate' | 'news_intelligence' | 'tech_stack';

interface ModeSelectorProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  disabled: boolean;
}

const MODES: { id: Mode; icon: string; label: string; description: string }[] = [
  {
    id: 'fact_check',
    icon: '✓',
    label: 'Fact Check',
    description: 'Verify any claim with sourced evidence and a confidence score',
  },
  {
    id: 'deep_curation',
    icon: '🕳',
    label: 'Deep Curation',
    description: 'Find niche resources — GitHub repos, papers, expert threads — not SEO content',
  },
  {
    id: 'debate',
    icon: '⚔',
    label: 'Debate',
    description: 'Steel-man both sides of any topic with sourced arguments',
  },
  {
    id: 'news_intelligence',
    icon: '📰',
    label: 'News',
    description: 'Market & tech news with impact analysis — finance, startups, macro trends',
  },
  {
    id: 'tech_stack',
    icon: '🧪',
    label: 'Tech Stack',
    description: 'Get a tailored tech stack recommendation based on your use case',
  },
];

export default function ModeSelector({ mode, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => !disabled && onChange(m.id)}
          disabled={disabled}
          title={m.description}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap
            ${mode === m.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <span className="mr-1">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
