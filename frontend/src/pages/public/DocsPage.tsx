import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Seo from '../../components/Seo';
import GithubIcon from '../../components/GithubIcon';

const TITLE = 'ZORQEN Docs — How Security Validation Works';
const DESCRIPTION =
  'Documentation for ZORQEN: the DETECT → REASON → VALIDATE → REMEDIATE → VERIFY pipeline, the console, GitHub integration, finding lifecycle, and privacy model.';

const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'ZORQEN Documentation',
    description: DESCRIPTION,
    url: 'https://app.zorqen.ai/docs',
    isPartOf: { '@type': 'WebSite', name: 'ZORQEN', url: 'https://app.zorqen.ai/' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What does ZORQEN do?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ZORQEN validates the security of software built with AI assistance. It scans a repository snapshot with static analysis, secret detection, and dependency review, then uses AI reasoning to correlate findings, assign confidence, and generate remediation diffs.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which code does ZORQEN scan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ZORQEN scans the repository snapshot you authorize through the GitHub integration. Scans target the codebase, its secrets, and its dependency manifests — never your production environment.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the GitHub integration work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You connect a GitHub account from the console. ZORQEN then reads the repositories you authorize so an assessment can be run against the chosen snapshot.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my source code exposed?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Scans run against repository snapshots in isolated sandboxes. Findings, scores, and remediation diffs are surfaced in your console only.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I try ZORQEN without a GitHub account?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Connect a GitHub account with read-only access and run an assessment on any repository you control — no credit card or trial period required.',
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

const CONSOLE = [
  ['Overview', 'Repository posture at a glance: score, severity counts, and the biggest finding.'],
  ['Repositories', 'Connect and switch between the GitHub repositories you authorize.'],
  ['Assessments', 'Run the pipeline and watch logs stream through each stage.'],
  ['Findings', 'Review vulnerability details: severity, confidence, validation state, and CWE.'],
  ['Remediation', 'Open localized patch diffs generated for each confirmed finding.'],
  ['Verification', 'Confirm the proposed fix addresses the original finding.'],
];

const FAQS = [
  [
    'What does ZORQEN do?',
    'ZORQEN validates the security of software built with AI assistance. It scans a repository snapshot with static analysis, secret detection, and dependency review, then uses AI reasoning to correlate findings, assign confidence, and generate remediation diffs.',
  ],
  [
    'Which code does ZORQEN scan?',
    'ZORQEN scans the repository snapshot you authorize through the GitHub integration. Scans target the codebase, its secrets, and its dependency manifests — never your production environment.',
  ],
  [
    'How does the GitHub integration work?',
    'You connect a GitHub account from the console. ZORQEN then reads the repositories you authorize so an assessment can be run against the chosen snapshot.',
  ],
  [
    'Is my source code exposed?',
    'No. Scans run against repository snapshots in isolated sandboxes. Findings, scores, and remediation diffs are surfaced in your console only.',
  ],
  [
    'Can I try ZORQEN without a GitHub account?',
    'Yes. Connect a GitHub account with read-only access and run an assessment on any repository you control — no credit card or trial period required.',
  ],
];

export default function DocsPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        canonicalPath="/docs"
        jsonLd={JSONLD}
      />

      <div className="max-w-[940px] mx-auto space-y-10 sm:space-y-14">
        <section className="space-y-5">
          <div className="protocol-tag">zorqen://docs</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tighter leading-none">
            DOCUMENTATION.
          </h1>
          <p className="text-base sm:text-lg text-[#333333] max-w-[640px] leading-relaxed font-medium">
            Everything you need to understand how ZORQEN validates the security of
            AI-built software — the pipeline, the console, and the finding lifecycle.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="btn btn-accent px-5 py-2.5 text-[13px]">
              Open the Console <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/ai-code-security" className="btn btn-primary px-5 py-2.5 text-[13px]">
              AI Code Security Overview
            </Link>
          </div>
        </section>

        <div className="h-[2px] bg-[#111111] w-full" />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#111111]" />
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">THE PIPELINE</h2>
          </div>
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

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <GithubIcon className="w-5 h-5 text-[#111111]" />
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">THE CONSOLE</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {CONSOLE.map(([title, desc], idx) => (
              <div key={idx} className="p-5 rounded-xl bg-white border border-[#111111] shadow-hard space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-[14.5px] text-[#111111] tracking-tight">{title}</h3>
                  <span className="mono text-[12px] font-extrabold text-[#111111] bg-[#FAFAFA] px-2 py-0.5 rounded border border-[#111111]">{`0${idx + 1}`}</span>
                </div>
                <p className="text-[12.5px] text-[#555555] leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="p-5 sm:p-8 rounded-xl bg-white border border-[#111111] shadow-hard space-y-5">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">FINDING LIFECYCLE</h2>
          <p className="text-[13px] sm:text-[14px] text-[#333333] leading-relaxed font-medium max-w-[760px]">
            A finding moves from detection to proof. Each finding carries a severity, a CWE
            reference, a confidence score, and a validation state — from unvalidated through
            validated or confirmed. Confirmed findings open a remediation view with a
            localized patch diff, and the verification stage confirms the fix addresses the
            original issue. This closed loop is what separates validation from a raw report.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ['DETECTED', 'Found by rules'],
              ['REASONED', 'AI confidence'],
              ['VALIDATED', 'Sandbox probe'],
              ['REMEDIATED', 'Patch diff'],
              ['VERIFIED', 'Fix confirmed'],
            ].map(([step, sub]) => (
              <div key={step} className="p-3 rounded-lg border border-[#111111] bg-[#FAFAFA] shadow-hard-sm text-center">
                <div className="mono text-[10.5px] font-extrabold text-[#111111]">{step}</div>
                <div className="text-[10.5px] text-[#666666] font-medium mt-1">{sub}</div>
              </div>
            ))}
          </div>
        </section>

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
