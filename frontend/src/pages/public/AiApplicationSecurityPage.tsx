import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Seo from '../../components/Seo';

const TITLE = 'AI Application Security — RAKSHA';
const DESCRIPTION =
  'How application security testing applies to software built with AI assistance: static analysis, secret detection, dependency review, and AI-reasoned validation.';

const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'AI Application Security',
    description: DESCRIPTION,
    author: { '@type': 'Organization', name: 'RAKSHA', url: 'https://raksha-ai-pink.vercel.app/' },
    publisher: { '@type': 'Organization', name: 'RAKSHA', url: 'https://raksha-ai-pink.vercel.app/' },
    url: 'https://raksha-ai-pink.vercel.app/ai-application-security',
    isPartOf: { '@type': 'WebSite', name: 'RAKSHA', url: 'https://raksha-ai-pink.vercel.app/' },
  },
];

const PILLARS = [
  ['Static Analysis', 'Deterministic rule-based scanning (Semgrep OWASP Top Ten and secrets rulesets) that does not depend on a model deciding what looks risky.'],
  ['Secret Detection', 'Repository history is scanned for committed tokens, keys, and credentials before they become a leak.'],
  ['Dependency Review', 'Manifest files are parsed and version pins are checked so drift and unpinned releases are surfaced.'],
  ['AI Security Reasoning', 'Findings are correlated with entry points and sensitive sinks to assign confidence and trace attack paths.'],
  ['Developer Remediation', 'Each confirmed finding ships with a localized before/after patch diff instead of a generic advisory.'],
];

export default function AiApplicationSecurityPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        canonicalPath="/ai-application-security"
        jsonLd={JSONLD}
      />

      <div className="max-w-[940px] mx-auto space-y-10 sm:space-y-14">
        <section className="space-y-5">
          <div className="protocol-tag">raksha://guides/ai-application-security</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tighter leading-none">
            AI APPLICATION <br />
            <span className="text-[#666666] font-normal">SECURITY.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#333333] max-w-[640px] leading-relaxed font-medium">
            Application security testing has always been about proving risk in code. Software
            built with AI assistance raises the same questions faster: where is the data
            exposed, where is the input trusted, and who is going to catch it before a user does.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="btn btn-accent px-5 py-2.5 text-[13px]">
              Run an Assessment <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/docs" className="btn btn-primary px-5 py-2.5 text-[13px]">
              Read the Docs
            </Link>
          </div>
        </section>

        <div className="h-[2px] bg-[#111111] w-full" />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#111111]" />
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">THE FIVE PILLARS RAKSHA APPLIES</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {PILLARS.map(([title, desc], idx) => (
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
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">FROM CHECKLIST TO PROOF</h2>
          <p className="text-[13px] sm:text-[14px] text-[#333333] leading-relaxed font-medium max-w-[760px]">
            Traditional AppSec hands developers a list of issues and a ticket. RAKSHA instead
            closes the loop: every finding has a confidence score, a validation state, the
            attack path that connects it to an entry point, and a patch diff to review.
            That is what turns a security report into something a developer can act on in one pass.
          </p>
          <ul className="space-y-3">
            {[
              'Scan the repository snapshot with deterministic rules, not vibes.',
              'Let AI reasoning prioritize findings by confidence and reachability.',
              'Validate and generate remediation that fits the actual codebase.',
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-[13px] text-[#333333] font-medium leading-relaxed">
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C5F82A] px-1.5 py-0.5 rounded border border-[#111111] shrink-0 mt-0.5">{`0${idx + 1}`}</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            ['/ai-code-security', 'AI Code Security', 'The full validation pipeline for AI-built software.'],
            ['/ai-vulnerability-scanner', 'AI Vulnerability Scanner', 'What the scanner covers, from static rules to dependency audit.'],
            ['/vibe-coded-app-security', 'Vibe-Coded App Security', 'Keeping rapid development fast without shipping obvious vulnerabilities.'],
            ['/docs', 'Docs', 'How the console, pipeline, and finding lifecycle work.'],
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
      </div>
    </>
  );
}
