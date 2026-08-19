import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Database,
  FileCode,
  Key,
  Lock,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import Seo from '../../components/Seo';

const TITLE = 'AI Code Security — ZORQEN';
const DESCRIPTION =
  'ZORQEN provides autonomous security validation for AI-built software: detect, reason, validate, and remediate vulnerabilities in repositories you control.';

const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: TITLE,
    description: DESCRIPTION,
    url: 'https://app.zorqen.ai/ai-code-security',
    isPartOf: { '@type': 'WebSite', name: 'ZORQEN', url: 'https://app.zorqen.ai/' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ZORQEN',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: 'Security validation for AI-built software: static analysis, secret detection, dependency review, and AI-reasoned vulnerability remediation.',
    url: 'https://app.zorqen.ai/ai-code-security',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What kinds of vulnerabilities does ZORQEN detect?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ZORQEN runs static analysis with Semgrep OWASP Top Ten and secrets rulesets, custom security checks, hardcoded secret detection, and dependency manifest review across the repository snapshot you authorize.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does ZORQEN use AI?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'In the reasoning phase ZORQEN correlates raw findings with entry points and sensitive sinks, assigns confidence scores, traces attack paths, and drafts localized patch diffs for remediation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does ZORQEN scan production systems?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. ZORQEN scans repository snapshots in isolated sandboxes and never runs against production environments.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does ZORQEN validate findings?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Each finding carries a confidence score and a validation state, from unvalidated through validated or confirmed, shown directly in the console alongside remediation proposals.',
        },
      },
    ],
  },
];

const PIPELINE = [
  ['01', 'DETECT', 'Static analysis with Semgrep OWASP Top Ten and secrets rulesets, custom checks, secret detection, and dependency manifest review.'],
  ['02', 'REASON', 'AI correlates findings with entry points and sensitive sinks, assigns confidence, and traces attack paths.'],
  ['03', 'VALIDATE', 'Exploit probes reproduce impact in ephemeral, isolated container sandboxes to confirm exploitability.'],
  ['04', 'REMEDIATE', 'Localized before/after patch diffs are generated for each confirmed finding.'],
  ['05', 'VERIFY', 'The patch proposal is re-checked so remediation can be confirmed against the original finding.'],
];

const CHECKS = [
  [Key, 'Secret Exposure', 'Scans environment configs, committed tokens, and hardcoded API credentials across repo history.'],
  [Lock, 'Broken Access Control', 'Maps authorization boundaries across endpoints to prevent unauthorized object reads.'],
  [Database, 'Injection Paths', 'Traces unsanitized user inputs into database queries, sub-processes, and dangerous sinks.'],
  [FileCode, 'Data Leakage', 'Audits request interceptors and logger output for unredacted PII or auth headers.'],
  [Zap, 'AI Security Drift', 'Flags insecure code patterns commonly introduced by automated AI code generators.'],
  [Terminal, 'Sandbox Verification', 'Executes automated exploit probes in ephemeral container sandboxes to prove impact.'],
] as const;

const FAQS = [
  [
    'What kinds of vulnerabilities does ZORQEN detect?',
    'ZORQEN runs static analysis with Semgrep OWASP Top Ten and secrets rulesets, custom security checks, hardcoded secret detection, and dependency manifest review across the repository snapshot you authorize.',
  ],
  [
    'How does ZORQEN use AI?',
    'In the reasoning phase ZORQEN correlates raw findings with entry points and sensitive sinks, assigns confidence scores, traces attack paths, and drafts localized patch diffs for remediation.',
  ],
  [
    'Does ZORQEN scan production systems?',
    'No. ZORQEN scans repository snapshots in isolated sandboxes and never runs against production environments.',
  ],
  [
    'How does ZORQEN validate findings?',
    'Each finding carries a confidence score and a validation state, from unvalidated through validated or confirmed, shown directly in the console alongside remediation proposals.',
  ],
  [
    'How do I run an assessment?',
    'Connect your GitHub account from the console, choose a repository, and run an assessment. Results stream through the DETECT → REASON → VALIDATE → REMEDIATE → VERIFY pipeline with findings, scores, and patch diffs.',
  ],
];

export default function AiCodeSecurityPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        canonicalPath="/ai-code-security"
        jsonLd={JSONLD}
      />

      <div className="max-w-[1240px] mx-auto space-y-10 sm:space-y-14">
        {/* Hero */}
        <section className="space-y-5 sm:space-y-6">
          <div className="protocol-tag">zorqen://platform/ai-code-security</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tighter leading-none">
            SECURITY VALIDATION <br />
            <span className="text-[#666666] font-normal">FOR AI-BUILT SOFTWARE.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#333333] max-w-[620px] leading-relaxed font-medium">
            AI-assisted development ships code faster — and ships more vulnerabilities. ZORQEN
            gives you an autonomous pipeline that detects, reasons through, validates, and
            helps you remediate security issues in repositories you control.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {['STATIC ANALYSIS', 'SECRET DETECTION', 'DEPENDENCY AUDIT', 'AI THREAT REASONING', 'PATCH DIFFS'].map((t) => (
              <span key={t} className="chip mono text-[10px] font-bold">{t}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="btn btn-accent px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-[13.5px]">
              Open the Console <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/ai-vulnerability-scanner" className="btn btn-primary px-5 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-[13.5px]">
              See What Gets Scanned
            </Link>
          </div>
        </section>

        <div className="h-[2px] bg-[#111111] w-full" />

        {/* Pipeline */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">AUTOMATED SECURITY WORKFLOW</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {PIPELINE.map(([num, step, desc]) => (
              <div key={num} className="p-4 rounded-xl bg-white border border-[#111111] shadow-hard space-y-2">
                <span className="mono text-[11px] font-extrabold bg-[#C5F82A] px-1.5 py-0.5 rounded border border-[#111111] inline-block">{num}</span>
                <div className="font-extrabold text-[13.5px] text-[#111111] tracking-tight">{step}</div>
                <p className="text-[11.5px] text-[#555555] leading-snug font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What ZORQEN checks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#111111]" />
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">WHAT ZORQEN CHECKS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {CHECKS.map(([IconComponent, title, desc], idx) => {
              const Icon = IconComponent as any;
              return (
                <div key={idx} className="p-5 rounded-xl bg-white border border-[#111111] shadow-hard space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-[#C5F82A] border border-[#111111] flex items-center justify-center text-[#111111]">
                      <Icon className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                    <span className="mono text-[14px] font-extrabold text-[#111111] bg-[#FAFAFA] px-2 py-0.5 rounded border border-[#111111]">{`0${idx + 1}`}</span>
                  </div>
                  <h3 className="font-extrabold text-[15px] text-[#111111] tracking-tight">{title}</h3>
                  <p className="text-[12.5px] text-[#555555] leading-relaxed font-medium">{desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Getting started */}
        <section className="p-5 sm:p-8 rounded-xl bg-white border border-[#111111] shadow-hard space-y-5">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">GET STARTED IN THREE STEPS</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ['01', 'Connect GitHub', 'Authorize ZORQEN from the console to access the repositories you want to validate.'],
              ['02', 'Run an assessment', 'ZORQEN snapshots the repository and streams results through the detection pipeline.'],
              ['03', 'Investigate and fix', 'Review findings, confidence, and attack paths — then apply the generated patch diffs.'],
            ].map(([num, title, desc]) => (
              <li key={num} className="p-4 rounded-lg border border-[#111111] bg-[#FAFAFA] shadow-hard-sm space-y-1.5">
                <div className="mono text-[11px] font-extrabold bg-[#C5F82A] px-1.5 py-0.5 rounded border border-[#111111] inline-block">{num}</div>
                <div className="font-extrabold text-[13px] text-[#111111]">{title}</div>
                <div className="text-[12px] text-[#555555] font-medium">{desc}</div>
              </li>
            ))}
          </ol>
          <Link to="/" className="btn btn-accent px-5 py-2.5 text-[13px]">
            Open the Console <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Guide links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            ['/ai-generated-code-security', 'AI-Generated Code Security', 'Why AI-assisted code introduces new risk — and how to validate it before it ships.'],
            ['/ai-vulnerability-scanner', 'AI Vulnerability Scanner', 'What a scanner for AI-built applications covers: from static rules to dependency audit.'],
            ['/vibe-coded-app-security', 'Vibe-Coded App Security', 'How to keep rapid, vibe-coded development fast without shipping obvious vulnerabilities.'],
            ['/ai-application-security', 'AI Application Security', 'Applying application security testing to software built with AI assistance.'],
            ['/docs', 'Docs', 'How ZORQEN works: the pipeline, the console, and the full finding lifecycle.'],
          ].map(([to, title, desc]) => (
            <Link key={to} to={to} className="group p-5 rounded-xl bg-white border border-[#111111] shadow-hard space-y-2 hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[15px] text-[#111111] tracking-tight">{title}</h3>
                <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[12.5px] text-[#555555] leading-relaxed font-medium">{desc}</p>
            </Link>
          ))}
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="divide-y divide-[#111111] border border-[#111111] rounded-xl bg-white shadow-hard">
            {FAQS.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="cursor-pointer font-extrabold text-[13.5px] sm:text-[15px] text-[#111111] tracking-tight list-none flex items-center justify-between gap-4">
                  {q}
                  <span className="mono text-[13px] text-[#666666] group-open:rotate-90 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-[12.5px] sm:text-[13px] text-[#555555] leading-relaxed font-medium max-w-[760px]">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
