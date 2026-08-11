import { useMemo, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { defineRakshaTheme, MONACO_OPTIONS, useMonacoStatus } from '../lib/monaco';

/* ── Fallback side-by-side diff (GitHub-review style) ──────────────────── */

function SideBySide({ before, after }: { before: string; after: string }) {
  const b = before.split('\n');
  const a = after.split('\n');
  const max = Math.max(b.length, a.length);

  return (
    <div className="mono text-[11.5px] leading-[18px] overflow-auto scroll-thin" style={{ background: '#0b0e12' }}>
      {Array.from({ length: max }, (_, i) => {
        const changed = b[i] !== a[i];
        const hasB = i < b.length;
        const hasA = i < a.length;
        return (
          <div key={i} className="flex" style={{ minWidth: 'max-content' }}>
            <div className="flex-1 min-w-[45%] flex" style={{
              background: changed && hasB ? 'rgba(248,81,73,0.10)' : 'transparent',
              boxShadow: changed && hasB ? 'inset 3px 0 0 var(--color-critical)' : 'none',
            }}>
              <span className="select-none" style={{ width: 30, textAlign: 'right', color: '#3a4452', marginRight: 8 }}>{hasB ? i + 1 : ''}</span>
              <span style={{ color: changed && hasB ? '#f0883e' : '#93a1b0' }}>{hasB ? b[i] || ' ' : ' '}</span>
            </div>
            <div className="w-px shrink-0" style={{ background: 'var(--color-line)' }} />
            <div className="flex-1 min-w-[45%] flex" style={{
              background: changed && hasA ? 'rgba(63,185,80,0.10)' : 'transparent',
              boxShadow: changed && hasA ? 'inset 3px 0 0 var(--color-accent)' : 'none',
            }}>
              <span className="select-none" style={{ width: 30, textAlign: 'right', color: '#3a4452', marginRight: 8 }}>{hasA ? i + 1 : ''}</span>
              <span style={{ color: changed && hasA ? '#a5d6a1' : '#93a1b0' }}>{hasA ? a[i] || ' ' : ' '}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Diff pane ─────────────────────────────────────────────────────────── */

export default function DiffPane({
  before,
  after,
  height = 340,
  fileName,
}: {
  before: string;
  after: string;
  height?: number;
  fileName?: string;
}) {
  const monoStatus = useMonacoStatus();
  const [view, setView] = useState<'side' | 'unified'>('side');

  const header = (
    <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--color-line)]" style={{ background: 'var(--color-panel-2)' }}>
      <span className="mono text-[10.5px] text-[var(--color-low)]">{fileName ?? 'diff'}</span>
      <span className="mono text-[10.5px] text-[var(--color-ink-3)]">· before → after</span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setView('side')}
          className={`btn btn-xs ${view === 'side' ? 'btn-primary' : 'btn-ghost'}`}
        >
          SIDE-BY-SIDE
        </button>
        <button
          onClick={() => setView('unified')}
          className={`btn btn-xs ${view === 'unified' ? 'btn-primary' : 'btn-ghost'}`}
        >
          UNIFIED
        </button>
      </div>
    </div>
  );

  if (monoStatus !== 'ready') {
    return (
      <div className="panel overflow-hidden">
        {header}
        <SideBySide before={before} after={after} />
      </div>
    );
  }

  const baseOptions = {
    ...MONACO_OPTIONS,
    diffWordWrap: 'off' as const,
    renderSideBySide: view === 'side',
    renderOverviewRuler: false,
    hideUnchangedRegions: { enabled: true, revealLineCount: 4 },
  };

  return (
    <div className="panel overflow-hidden">
      {header}
      <DiffEditor
        height={height}
        language="python"
        original={before}
        modified={after}
        theme="vs-dark"
        beforeMount={defineRakshaTheme}
        options={baseOptions}
      />
    </div>
  );
}

/* ── Region-highlighting helper for unified render ─────────────────────── */

export function useChangedLines(before: string, after: string): Set<number> {
  return useMemo(() => {
    const b = before.split('\n');
    const a = after.split('\n');
    const set = new Set<number>();
    const max = Math.max(b.length, a.length);
    for (let i = 0; i < max; i++) if (b[i] !== a[i]) set.add(i + 1);
    return set;
  }, [before, after]);
}