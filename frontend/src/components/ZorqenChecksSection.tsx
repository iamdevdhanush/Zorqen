import { Database, FileCode, Key, Lock, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { ChecksHeadingDotAccent } from './SelectiveDotGrid';

const CHECKS_DATA = [
  {
    icon: Key,
    num: '01',
    title: 'Secret Exposure',
    subtitle: 'Credentials & tokens',
    desc: 'Scans environment configs, committed tokens, and hardcoded API credentials across repo history.',
    badgeVariant: 'active' as const,
  },
  {
    icon: Lock,
    num: '02',
    title: 'Broken Access Control',
    subtitle: 'Authorization boundaries',
    desc: 'Maps authorization boundaries across endpoints to prevent unauthorized object reads.',
    badgeVariant: '' as const,
  },
  {
    icon: Database,
    num: '03',
    title: 'Injection Paths',
    subtitle: 'Unsafe input → sinks',
    desc: 'Traces unsanitized user inputs into database queries, sub-processes, and dangerous sinks.',
    badgeVariant: '' as const,
  },
  {
    icon: FileCode,
    num: '04',
    title: 'Data Leakage',
    subtitle: 'PII & log redaction',
    desc: 'Audits request interceptors and logger output for unredacted PII or auth headers.',
    badgeVariant: '' as const,
  },
  {
    icon: Zap,
    num: '05',
    title: 'AI Security Drift',
    subtitle: 'AI code hallucinations',
    desc: 'Flags insecure code patterns commonly introduced by automated AI code generators.',
    badgeVariant: '' as const,
  },
  {
    icon: Terminal,
    num: '06',
    title: 'Sandbox Verification',
    subtitle: 'Containerized exploit probes (Pending)',
    desc: 'Future isolated container sandbox for automated exploit verification (Infrastructure pending).',
    badgeVariant: 'inverted' as const,
    isValidation: true,
  },
];

export default function ZorqenChecksSection() {
  return (
    <div className="space-y-5">
      {/* Section Header — section-label with divider + editorial dot accent */}
      <div className="relative">
        <ChecksHeadingDotAccent />
        <div className="relative z-1 flex items-center justify-between gap-4">
          <div className="section-label">
            <ShieldCheck className="w-[18px] h-[18px] text-[#111111] shrink-0" aria-hidden="true" />
            <h2 className="text-[11px] font-extrabold tracking-[0.10em] text-[rgba(17,17,17,0.45)] uppercase leading-none whitespace-nowrap">
              WHAT ZORQEN CHECKS
            </h2>
          </div>
          <span className="mono text-[11px] font-bold text-[#525252] shrink-0 hidden sm:block">
            5 Active • 1 Planned Module
          </span>
        </div>
      </div>

      {/* 3-Column Grid — clean card surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        {CHECKS_DATA.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-3.5 interactive-card relative overflow-hidden"
            >
              {/* Badge row: industrial rounded-square + module number */}
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-[10px] border-2 border-[#111111] flex items-center justify-center shadow-hard-sm ${item.badgeVariant === 'inverted' ? 'bg-[#111111]' : 'bg-[#C8F31D]'}`}>
                  <Icon className={`w-5 h-5 stroke-[2] ${item.badgeVariant === 'inverted' ? 'text-[#C8F31D]' : 'text-[#111111]'}`} aria-hidden="true" />
                </div>
                <span className={`module-badge ${item.badgeVariant}`}>{item.num}</span>
              </div>

              {/* Title & subtitle */}
              <div>
                <h3 className="font-extrabold text-[15.5px] text-[#111111] tracking-tight leading-snug">
                  {item.title}
                </h3>
                <div className="mono text-[11px] text-[#525252] font-semibold mt-0.5">{item.subtitle}</div>
              </div>

              {/* Description */}
              <p className="text-[13px] text-[#525252] leading-relaxed font-medium line-clamp-2">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
