import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { FindingStatus, Severity, ValidationState } from '../lib/types';

/* ── Severity helpers ──────────────────────────────────────────────────── */

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export function sevChip(sev: Severity): string {
  return `chip sev-${sev}`;
}

export function sevColor(sev: Severity): string {
  switch (sev) {
    case 'critical': return 'var(--color-critical)';
    case 'high': return 'var(--color-high)';
    case 'medium': return 'var(--color-medium)';
    case 'low': return 'var(--color-low)';
    default: return 'var(--color-info)';
  }
}

export function SevBadge({ sev }: { sev: Severity }) {
  return <span className={sevChip(sev)}>{sev.toUpperCase()}</span>;
}

export function SevTick({ sev }: { sev: Severity }) {
  return <span className={`w-2 h-2 rounded-full inline-block ${sev === 'critical' ? 'bg-red-600' : sev === 'high' ? 'bg-orange-500' : sev === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />;
}

export function ConfidenceText({ pct }: { pct: number }) {
  return <span className="mono font-semibold text-[#111111]">{pct}%</span>;
}

export function ValidationBadge({ v }: { v: ValidationState }) {
  const tone =
    v === 'CONFIRMED' ? 'ok' :
    v === 'VALIDATED' ? 'ok' :
    v === 'UNVALIDATED' ? 'warn' : 'info';
  return <span className={`chip ${tone}`}>{v}</span>;
}

export function StatusBadge({ s }: { s: FindingStatus }) {
  const tone =
    s === 'VERIFIED' ? 'ok' :
    s === 'OPEN' ? 'bad' :
    s === 'DISMISSED' ? 'info' : 'warn';
  return <span className={`chip ${tone}`}>{s.replace('_', ' ')}</span>;
}

export function AcidTag({ text }: { text: string }) {
  return (
    <div className="protocol-tag">
      {text}
    </div>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────────── */

export function Panel({
  title,
  right,
  children,
  flush,
  className = '',
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-head">
          <h3 className="panel-head-title">{title}</h3>
          {right && <div className="flex items-center gap-1.5">{right}</div>}
        </header>
      )}
      <div className={flush ? 'panel-body-flush' : 'panel-body'}>{children}</div>
    </section>
  );
}

/* ── Key/value rows ────────────────────────────────────────────────────── */

export function KV({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-[#DCDCD5] last:border-0">
      <span className="text-[11px] uppercase tracking-[0.06em] text-[#4A4A4A] font-extrabold">{k}</span>
      <span className={`text-[12.5px] text-[#111111] ${mono ? 'mono text-[12px] font-semibold' : ''}`}>{v}</span>
    </div>
  );
}

export function KVCol({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="py-1">
      <div className="text-[11px] uppercase tracking-[0.06em] text-[#4A4A4A] font-extrabold mb-[2px]">{k}</div>
      <div className="text-[12.5px] text-[#111111]">{v}</div>
    </div>
  );
}

/* ── Back link ─────────────────────────────────────────────────────────── */

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="btn btn-ghost btn-sm inline-flex items-center gap-1">
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state flex flex-col items-center gap-2">
      <div className="w-8 h-8 rounded border border-[#111111] flex items-center justify-center text-[#111111] text-[13px] font-bold">—</div>
      <span className="max-w-[280px] text-center leading-relaxed font-semibold text-[#333333]">{text}</span>
    </div>
  );
}

/* ── Status pill for live assessment status ───────────────────────────── */

export function RunStatus({ status }: { status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' }) {
  if (status === 'RUNNING') {
    return (
      <span className="chip ok inline-flex items-center gap-1.5 font-bold">
        <span className="pulse-dot" />
        ANALYSIS RUNNING
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span className="chip inline-flex items-center gap-1.5 font-bold">
        <span className="w-[7px] h-[7px] rounded-full bg-[#111111]" />
        COMPLETED
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="chip sev-critical inline-flex items-center gap-1.5 font-bold">
        <span className="w-[7px] h-[7px] rounded-full bg-[#DC2626]" />
        FAILED
      </span>
    );
  }
  return <span className="chip font-bold">STANDBY</span>;
}

export function PageHeader({ kicker, title, right }: { kicker?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 pb-4 border-b border-[#111111]">
      <div className="space-y-1 min-w-0">
        {kicker && <div className="text-[10.5px] mono uppercase tracking-[0.12em] text-[#4A4A4A] font-extrabold mb-1">{kicker}</div>}
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight leading-tight">{title}</h1>
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap shrink-0">{right}</div>}
    </div>
  );
}

export function SectionHeader({ icon: Icon, title, right }: { icon?: any; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-[#111111]" />}
        <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">{title}</h2>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

export function TechnicalMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="mono text-[11.5px] font-semibold text-[#333333]">
      <span className="font-extrabold text-[#111111]">{label}: </span>
      <span>{value}</span>
    </span>
  );
}

/* ── Dropdown (popover anchored to a trigger) ──────────────────────────── */

export function Dropdown({
  trigger,
  children,
  align = 'left',
  className = '',
}: {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="block w-full text-left outline-none cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+8px)] z-50 bg-white border-2 border-[#111111] rounded-[18px] shadow-hard-lg overflow-hidden animate-dropdown-in"
          style={{ ...(align === 'right' ? { right: 0 } : { left: 0 }), minWidth: 280 }}
          onClick={(e) => e.stopPropagation()}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton rows ─────────────────────────────────────────────────────── */

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-[#DCDCD5]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-[#DCDCD5] animate-pulse" />
          <span className="h-4 bg-[#EAEAE2] rounded flex-1 max-w-[50%] animate-pulse" />
          <span className="h-4 bg-[#EAEAE2] rounded w-16 ml-auto animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* ── Animated metric ───────────────────────────────────────────────────── */

export function AnimatedNumber({ value, duration = 400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span>{display}</span>;
}