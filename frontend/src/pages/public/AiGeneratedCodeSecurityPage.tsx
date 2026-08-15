import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import Seo from '../../components/Seo';

const TITLE = 'AI-Generated Code Security — RAKSHA';
const DESCRIPTION =
  'Why AI-generated code introduces new security risk, which vulnerability classes to watch for, and how to validate AI-assisted code before it ships.';

const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'AI-Generated Code Security',
    description: DESCRIPTION,
    author: { '@type': 'Organization', name: 'RAKSHA', url: 'https://raksha-ai-pink.vercel.app/' },
    publisher: { '@type': 'Organization', name: 'RAKSHA', url: 'https://raksha-ai-pink.vercel.app/' },
    url: 'https://raksha-ai-pink.vercel.app/ai-generated-code-security',
    isPartOf: { '@type': 'WebSite', name: 'RAKSHA', url: 'https://raksha-ai-pink.vercel.app/' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is AI-generated code more vulnerable than human-written code?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AI-generated code is not inherently more vulnerable, but it is produced at volume and often trusts context it was never given, so insecure patterns slip through — especially secrets, injection sinks, and outdated dependencies. That volume is why automated validation matters.',
        },
      },
      {
        '@type': 'Question',
        name: 'What security issues are common in AI-generated code?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Common issues include hardcoded secrets and credentials, SQL injection and other injection sinks, permissive access control, unvalidated user input, and dependency drift from libraries the model recommends.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I validate AI-generated code?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Run automated security validation on the repository snapshot: static analysis, secret detection, and dependency review, then use AI-reasoned findings with confidence scores and patch diffs to prioritize fixes. RAKSHA automates this pipeline.',
        },
      },
    ],
  },
];

const RISKS = [
  ['Hardcoded secrets', 'API keys, tokens, and credentials written directly into source instead of injected at deploy time.'],
  ['Injection sinks', 'Unsanitized user input concatenated into SQL queries, sub-processes, and dangerous sinks.'],
  ['Broken access control', 'Authorization boundaries that look right but permit unauthorized object reads.'],
  ['Dependency drift', 'Libraries and floating version pins recommended by the model that are out of date or unpinned.'],
  ['Hallucinated APIs', 'Calls to endpoints or functions that do not exist, or do not do what the model claims.'],
  ['Insecure defaults', 'Debug features enabled, permissive CORS, and example configurations copied into production.'],
];

const FAQS = [
  [
    'Is AI-generated code more vulnerable than human-written code?',
    'AI-generated code is not inherently more vulnerable, but it is produced at volume and often trusts context it was never given, so insecure patterns slip through — especially secrets, injection sinks, and outdated dependencies. That volume is why automated validation matters.',
  ],
  [
    'What security issues are common in AI-generated code?',
    'Common issues include hardcoded secrets and credentials, SQL injection and other injection sinks, permissive access control, unvalidated user input, and dependency drift from libraries the model recommends.',
  ],
  [
    'How do I validate AI-generated code?',
    'Run automated security validation on the repository snapshot: static analysis, secret detection, and dependency review, then use AI-reasoned findings with confidence scores and patch diffs to prioritize fixes. RAKSHA automates this pipeline.',
  ],
];

export default function AiGeneratedCodeSecurityPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        canonicalPath="/ai-generated-code-security"
        jsonLd={JSONLD}
      />

      <div className="max-w-[940px] mx-auto space-y-10 sm:space-y-14">
        <section className="space-y-5">
          <div className="protocol-tag">raksha://guides/ai-generated-code</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tighter leading-none">
            AI-GENERATED CODE <br />
            <span className="text-[#666666] font-normal">SECURITY.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#333333] max-w-[640px] leading-relaxed font-medium">
            More of every codebase is now written by AI assistants. That code looks
            confident and correct — and it still ships the same vulnerability classes as
            everything else, at higher volume.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/ai-code-security" className="btn btn-accent px-5 py-2.5 text-[13px]">
              See How RAKSHA Validates <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="btn btn-primary px-5 py-2.5 text-[13px]">
              Open the Console
            </Link>
          </div>
        </section>

        <div className="h-[2px] bg-[#111111] w-full" />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">WHY AI CODE NEEDS VALIDATION</h2>
          </div>
          <p className="text-[13px] sm:text-[14px] text-[#333333] leading-relaxed font-medium max-w-[720px]">
            Models are optimized to produce plausible, idiomatic code — not hardened code.
            The security context of your application, its users, and its environment is not
            something a code generator can fully see. The result is code that reads well and
            fails under attack. That gap between <em>plausible</em> and <em>secure</em> is
            exactly where AI security drift shows up.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">VULNERABILITY CLASSES TO WATCH FOR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {RISKS.map(([title, desc], idx) => (
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
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#111111]" />
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">VALIDATE BEFORE YOU SHIP</h2>
          </div>
          <ul className="space-y-3">
            {[
              'Scan the repository snapshot, not just the diff — drift hides in files the model touched weeks ago.',
              'Treat secrets and injection sinks as blockers, not triage items.',
              'Review AI-reasoned confidence scores so you prioritize proven impact over noise.',
              'Generate patch diffs and verify them before they land in main.',
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-[13px] text-[#333333] font-medium leading-relaxed">
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C5F82A] px-1.5 py-0.5 rounded border border-[#111111] shrink-0 mt-0.5">{`0${idx + 1}`}</span>
                {item}
              </li>
            ))}
          </ul>
          <Link to="/ai-code-security" className="btn btn-accent px-5 py-2.5 text-[13px]">
            Put Validation on Autopilot <ArrowRight className="w-4 h-4" />
          </Link>
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
