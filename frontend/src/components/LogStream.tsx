import { useEffect, useRef } from 'react';
import type { LogLine } from '../lib/types';

const TONE_CLASS: Record<string, string> = {
  ok: 'ok',
  err: 'err',
  warn: 'warn',
  info: '',
};

export default function LogStream({ logs, height = 220, autoScroll = true }: { logs: LogLine[]; height?: number; autoScroll?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (logs.length === 0) {
    return (
      <div className="logstream flex items-center justify-center text-[var(--color-ink-3)]" style={{ height }}>
        waiting for pipeline output…
      </div>
    );
  }

  return (
    <div ref={ref} className="logstream scroll-thin" style={{ height }}>
      {logs.map((l, i) => (
        <div key={i} className={`log-line ${TONE_CLASS[l.tone ?? ''] ?? ''}`}>
          <span className="log-time">{l.time}</span>
          <span className="log-src">{l.source}:</span>
          <span className="log-txt">{l.text}</span>
        </div>
      ))}
    </div>
  );
}