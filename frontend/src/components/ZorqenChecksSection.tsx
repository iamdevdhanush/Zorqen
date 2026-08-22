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
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#111111]" />
          <h2 className="text-section-title">
            WHAT ZORQEN CHECKS
          </h2>
        </div>
        <span className="text-metadata hidden sm:inline">
          6 Active Modules
        </span>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHECKS_DATA.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-4.5 rounded-[12px] bg-white border border-[#111111]/20 shadow-hard-sm space-y-2.5 transition-all duration-150 interactive-card"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-[8px] bg-[#C7F11A] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                  <Icon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#F9F8F5] px-2 py-0.5 rounded border border-[#111111]/30">
                  {item.num}
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-[16px] text-[#111111] tracking-tight">{item.title}</h3>
                <div className="mono text-[10.5px] text-[#555555] font-semibold">{item.subtitle}</div>
              </div>
              <p className="text-[13px] text-[#333333] leading-snug font-normal line-clamp-2">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
