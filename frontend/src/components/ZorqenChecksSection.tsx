import { Database, FileCode, Key, Lock, ShieldCheck, Terminal, Zap } from 'lucide-react';

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
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#0A0A0A]" />
          <h2 className="text-section text-[24px] sm:text-[32px]">
            WHAT ZORQEN CHECKS
          </h2>
        </div>
        <span className="mono text-[11px] font-bold text-[#5E5E5E] hidden sm:inline">
          6 Active Modules
        </span>
      </div>

      {/* ── DESKTOP 3-COLUMN GRID & MOBILE HORIZONTAL SNAPPING CAROUSEL ────── */}
      <div className="flex md:grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory scroll-thin pb-2">
        {CHECKS_DATA.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="snap-start shrink-0 w-[280px] sm:w-[320px] md:w-auto p-5 sm:p-6 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-4 transition-all duration-120 hover:-translate-y-0.5 hover:scale-[1.005]"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[10px] bg-[#C8FF2E] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                  <Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <span className="mono text-[12px] font-extrabold text-[#0A0A0A] bg-[#FAFAFA] px-2.5 py-0.5 rounded-[6px] border-2 border-[#111111]">
                  {item.num}
                </span>
              </div>
              <h3 className="font-extrabold text-[18px] text-[#0A0A0A] tracking-tight">{item.title}</h3>
              <p className="text-[14px] text-[#5E5E5E] leading-relaxed font-medium">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
