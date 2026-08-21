import { useState } from 'react';
import { ChevronDown, Database, FileCode, Key, Lock, ShieldCheck, Terminal, Zap } from 'lucide-react';

const CHECKS_DATA = [
  {
    icon: Key,
    num: '01',
    title: 'Secret Exposure',
    subtitle: 'Credentials & tokens',
    desc: 'Scans environment configs, committed tokens, and hardcoded API credentials across repo history.',
  },
  {
    icon: Lock,
    num: '02',
    title: 'Broken Access Control',
    subtitle: 'Authorization boundaries',
    desc: 'Maps authorization boundaries across endpoints to prevent unauthorized object reads.',
  },
  {
    icon: Database,
    num: '03',
    title: 'Injection Paths',
    subtitle: 'Unsafe input → sinks',
    desc: 'Traces unsanitized user inputs into database queries, sub-processes, and dangerous sinks.',
  },
  {
    icon: FileCode,
    num: '04',
    title: 'Data Leakage',
    subtitle: 'PII & log redaction',
    desc: 'Audits request interceptors and logger output for unredacted PII or auth headers.',
  },
  {
    icon: Zap,
    num: '05',
    title: 'AI Security Drift',
    subtitle: 'AI code hallucinations',
    desc: 'Flags insecure code patterns commonly introduced by automated AI code generators.',
  },
  {
    icon: Terminal,
    num: '06',
    title: 'Sandbox Verification',
    subtitle: 'Containerized exploit probes',
    desc: 'Executes automated exploit probes in ephemeral container sandboxes to prove impact.',
  },
];

export default function ZorqenChecksSection() {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-[#0A0A0A]" />
        <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#0A0A0A] tracking-tight">
          WHAT ZORQEN CHECKS
        </h2>
      </div>

      {/* ── DESKTOP GRID (>= md: 2x3 Grid) ─────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
        {CHECKS_DATA.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-4 transition-all duration-200 hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[10px] bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                  <Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <span className="mono text-[12px] font-extrabold text-[#0A0A0A] bg-[#FAFAFA] px-2.5 py-0.5 rounded-[6px] border border-[#111111]">
                  {item.num}
                </span>
              </div>
              <h3 className="font-extrabold text-[18px] text-[#0A0A0A] tracking-tight">{item.title}</h3>
              <p className="text-[14px] text-[#5E5E5E] leading-relaxed font-medium">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* ── MOBILE COLLAPSIBLE (< md: 2 Large Cards + Compact Rows) ────────── */}
      <div className="flex md:hidden flex-col gap-3">
        {CHECKS_DATA.map((item, idx) => {
          const Icon = item.icon;
          const isAlwaysExpanded = idx < 2; // First 2 cards remain large
          const isExpanded = isAlwaysExpanded || Boolean(expandedIndices[idx]);

          if (isAlwaysExpanded) {
            return (
              <div
                key={idx}
                className="p-5 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-[10px] bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="mono text-[12px] font-extrabold text-[#0A0A0A] bg-[#FAFAFA] px-2.5 py-0.5 rounded-[6px] border border-[#111111]">
                    {item.num}
                  </span>
                </div>
                <h3 className="font-extrabold text-[17px] text-[#0A0A0A] tracking-tight">{item.title}</h3>
                <p className="text-[13.5px] text-[#5E5E5E] leading-relaxed font-medium">{item.desc}</p>
              </div>
            );
          }

          return (
            <div
              key={idx}
              onClick={() => toggleExpand(idx)}
              className="rounded-[14px] bg-white border-2 border-[#111111] shadow-hard-sm transition-all duration-200 cursor-pointer overflow-hidden"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(idx); } }}
            >
              {/* Compact Row Trigger */}
              <div className="p-4 flex items-center justify-between gap-3 min-h-[52px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-[8px] bg-[#C8FF2E] border border-[#111111] flex items-center justify-center text-[#111111] shrink-0">
                    <Icon className="w-4 h-4" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[11px] font-extrabold text-[#0A0A0A]">{item.num}</span>
                      <span className="font-extrabold text-[14.5px] text-[#0A0A0A] truncate">{item.title}</span>
                    </div>
                    <div className="text-[12px] text-[#6B6B6B] font-medium truncate">{item.subtitle}</div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-[8px] bg-[#FAFAFA] border border-[#111111]/20 flex items-center justify-center text-[#0A0A0A] shrink-0">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Smooth Collapsible Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-[#111111]/15 bg-[#FAFAFA]/50 text-[13.5px] text-[#5E5E5E] leading-relaxed font-medium transition-all duration-200">
                  {item.desc}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
