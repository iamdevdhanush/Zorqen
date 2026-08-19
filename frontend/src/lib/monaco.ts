import { loader } from '@monaco-editor/react';
import { useEffect, useState } from 'react';

type MonacoStatus = 'loading' | 'ready' | 'error';

let cached: MonacoStatus | null = null;
let promise: Promise<MonacoStatus> | null = null;

export function monacoStatus(): Promise<MonacoStatus> {
  if (cached) return Promise.resolve(cached);
  if (!promise) {
    promise = loader
      .init()
      .then(() => {
        cached = 'ready';
        return cached;
      })
      .catch(() => {
        cached = 'error';
        return cached;
      });
  }
  return promise;
}

export function useMonacoStatus(): MonacoStatus {
  const [state, setState] = useState<MonacoStatus>(() => (cached ? cached : 'loading'));
  useEffect(() => {
    let alive = true;
    monacoStatus().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export const MONACO_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  fontSize: 12,
  fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
  lineHeight: 18,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  renderLineHighlight: 'none' as const,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
  padding: { top: 8, bottom: 8 },
  wordWrap: 'off' as const,
  tabSize: 4,
  glyphMargin: true,
  folding: false,
};

export function defineZorqenTheme(monaco: any) {
  if (monaco.editor.getTheme) {
    try {
      if (monaco.editor.getTheme() === 'zorqen-dark') return;
    } catch {
      /* noop */
    }
  }
  monaco.editor.defineTheme('zorqen-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '59646f', fontStyle: 'italic' },
      { token: 'keyword', foreground: '58a6ff' },
      { token: 'string', foreground: 'a5d6a1' },
      { token: 'number', foreground: 'd29922' },
      { token: 'type', foreground: 'e6edf3' },
      { token: 'delimiter', foreground: '93a1b0' },
    ],
    colors: {
      'editor.background': '#0b0d0f',
      'editor.foreground': '#e6edf3',
      'editor.lineHighlightBackground': '#151a20',
      'editorLineNumber.foreground': '#3a4452',
      'editorLineNumber.activeForeground': '#93a1b0',
      'editor.selectionBackground': '#264f78',
      'editorGutter.background': '#0b0d0f',
      'editorIndentGuide.background1': '#1c232d',
      'scrollbarSlider.background': '#232b3677',
      'scrollbarSlider.hoverBackground': '#2e394777',
      'editorWidget.background': '#101318',
    },
  });
  monaco.editor.setTheme('zorqen-dark');
}