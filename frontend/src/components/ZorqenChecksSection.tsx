import { Database, FileCode, Key, Lock, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { CardBadgeCluster, CardCornerCluster, RadialDotHalo } from './SelectiveDotGrid';

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
    isValidation: true,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CHECKS_DATA.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-[24px] bg-white border-[3px] border-[#111111] shadow-hard space-y-3 transition-all duration-180 hover:-translate-y-1 hover:shadow-hard-lg interactive-card relative overflow-hidden"
            >
              {/* Selective Dot Clusters in corners / behind badge (opacity < 12%) */}
              <CardBadgeCluster />
              <CardCornerCluster />

              <div className="flex items-center justify-between relative z-10">
                <div className="relative inline-flex items-center justify-center">
                  {/* Radial Dot Halo behind validation card icon */}
                  {item.isValidation && <RadialDotHalo />}
                  <div className="w-10 h-10 rounded-[12px] bg-[#C8F31D] border-2 border-[#111111] flex items-center justify-center text-[#111111] shadow-hard-sm relative z-10">
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                </div>
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#F7F5F0] px-3 py-0.5 rounded-full border-[1.5px] border-[#111111] shadow-hard-sm">
                  {item.num}
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="font-extrabold text-[16px] text-[#111111] tracking-tight">{item.title}</h3>
                <div className="mono text-[11px] text-[#525252] font-semibold">{item.subtitle}</div>
              </div>
              <p className="text-[13px] text-[#525252] leading-relaxed font-medium line-clamp-2 relative z-10">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
