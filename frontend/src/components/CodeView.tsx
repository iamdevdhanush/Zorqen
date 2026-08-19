import { memo, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { defineZorqenTheme, MONACO_OPTIONS, useMonacoStatus } from '../lib/monaco';

const LANG_MAP: Record<string, string> = {
  python: 'python',
  typescript: 'typescript',
  dockerfile: 'dockerfile',
  yaml: 'yaml',
  json: 'json',
  dotenv: 'plaintext',
  text: 'plaintext',
};

/* ── Fallback renderer (works without Monaco / offline) ────────────────── */

function keywordize(code: string): string {
  const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span style="color:#59646f;font-style:italic">$1</span>')
    .replace(/("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g, '<span style="color:#a5d6a1">$1</span>')
    .replace(/\b(def|class|return|import|from|async|await|if|else|for|while|with|try|except|raise|lambda|True|False|None|const|let|var|function|export|interface|type|new|switch|case|break|yield)\b/g, '<span style="color:#58a6ff">$1</span>')
    .replace(/\b(f\d*|%s|%\(|''|"")/g, '<span style="color:#d29922">$1</span>');
}

export const FallbackCode = memo(function FallbackCode({
  snippet,
  startLine = 1,
  highlightLine,
  className = '',
  tone = 'err',
}: {
  snippet: string;
  startLine?: number;
  highlightLine?: number;
  className?: string;
  tone?: 'err' | 'ok' | 'none';
}) {
  const lines = snippet.split('\n');
  return (
    <div className={`mono text-[11.5px] leading-[18px] overflow-auto scroll-thin ${className}`} style={{ background: '#0b0e12' }}>
      {lines.map((line, i) => {
        const highlighted = highlightLine != null && i + 1 === highlightLine;
        return (
          <div
            key={i}
            style={{
              background: highlighted ? (tone === 'err' ? 'rgba(248,81,73,0.12)' : tone === 'ok' ? 'rgba(63,185,80,0.10)' : 'transparent') : 'transparent',
              boxShadow: highlighted ? (tone === 'err' ? 'inset 3px 0 0 var(--color-critical)' : 'inset 3px 0 0 var(--color-accent)') : 'none',
            }}
          >
            <span className="select-none" style={{ display: 'inline-block', width: 34, color: '#3a4452', textAlign: 'right', marginRight: 8 }}>
              {String(startLine + i).padStart(3, ' ')}
            </span>
            <span dangerouslySetInnerHTML={{ __html: keywordize(line) || '&nbsp;' }} />
          </div>
        );
      })}
    </div>
  );
});

/* ── Monaco read-only code view with vulnerable-line highlight ─────────── */

const CodeView = memo(function CodeView({
  snippet,
  startLine = 1,
  language = 'python',
  highlightLine,
  height = 320,
  filePath,
}: {
  snippet: string;
  startLine?: number;
  language?: string;
  highlightLine?: number;
  height?: number;
  filePath?: string;
}) {
  const monoStatus = useMonacoStatus();

  const changedLines = useMemo(() => {
    if (highlightLine == null) return [];
    return [highlightLine];
  }, [highlightLine]);

  const header = filePath ? (
    <div className="mono text-[10.5px] text-[var(--color-ink-3)] px-2 py-1 border-b border-[var(--color-line)] flex items-center gap-2" style={{ background: 'var(--color-panel-2)' }}>
      <span style={{ color: 'var(--color-low)' }}>{filePath}</span>
      {highlightLine != null && <span>· line {startLine + highlightLine - 1}</span>}
      <span className="ml-auto flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${monoStatus === 'ready' ? 'ok' : 'warn'}`} style={{ background: monoStatus === 'ready' ? 'var(--color-accent)' : 'var(--color-medium)' }} />
        {monoStatus === 'ready' ? 'monaco' : monoStatus === 'error' ? 'plain render' : 'loading…'}
      </span>
    </div>
  ) : null;

  if (monoStatus !== 'ready') {
    return (
      <div className="panel overflow-hidden">
        {header}
        <FallbackCode snippet={snippet} startLine={startLine} highlightLine={highlightLine} className="p-2" tone={highlightLine ? 'err' : 'none'} />
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      {header}
      <Editor
        height={height}
        language={LANG_MAP[language] ?? 'plaintext'}
        value={snippet}
        theme="vs-dark"
        beforeMount={defineZorqenTheme}
        options={{ ...MONACO_OPTIONS }}
        onMount={(editor, monaco) => {
          defineZorqenTheme(monaco);
          if (changedLines.length) {
            editor.createDecorationsCollection(
              changedLines.map((ln) => ({
                range: new monaco.Range(ln, 1, ln, 1),
                options: {
                  isWholeLine: true,
                  className: 'codehl-line',
                  glyphMarginClassName: 'codehl-glyph',
                  linesDecorationsClassName: 'codehl-line',
                },
              }))
            );
          }
          editor.revealLineInCenter(Math.max(1, (highlightLine ?? 1) - 2));
        }}
      />
    </div>
  );
});

export default CodeView;