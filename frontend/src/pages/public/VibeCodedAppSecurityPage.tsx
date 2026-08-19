import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import Seo from '../../components/Seo';

const TITLE = 'Vibe-Coded App Security — RAKSHA';
const DESCRIPTION =
  'Vibe coding is fast, but speed hides risk. Learn what to watch for in vibe-coded applications and how to keep velocity without shipping vulnerabilities.';

const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Vibe-Coded App Security',
    description: DESCRIPTION,
    author: { '@type': 'Organization', name: 'RAKSHA', url: 'https://app.raksha.ai/' },
    publisher: { '@type': 'Organization', name: 'RAKSHA', url: 'https://app.raksha.ai/' },
    url: 'https://app.raksha.ai/vibe-coded-app-security',
    isPartOf: { '@type': 'WebSite', name: 'RAKSHA', url: 'https://app.raksha.ai/' },
  },
];

const WATCHLIST = [
  ['Secrets in source', 'Tokens and credentials the model emits into configs, tests, or commit history.'],
  ['Prompts-as-policy', 'Security logic embedded only in prompts, with no enforcement in code.'],
  ['Missing input validation', 'User input flowing to queries and sinks without sanitization checks.'],
  ['Copy-paste defaults', 'Example CORS, debug flags, and admin routes carried straight into production.'],
  ['Dependency sprawl', 'Recommended libraries pinned to floating or abandoned versions.'],
  ['No review trail', 'Large volumes of generated code that never received a human security review.'],
];

export default function VibeCodedAppSecurityPage() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        canonicalPath="/vibe-coded-app-security"
        jsonLd={JSONLD}
      />

      <div className="max-w-[940px] mx-auto space-y-10 sm:space-y-14">
        <section className="space-y-5">
          <div className="protocol-tag">raksha://guides/vibe-coded-apps</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tighter leading-none">
            VIBE-CODED APP <br />
            <span className="text-[#666666] font-normal">SECURITY.</span>
          </h1>
          <p className="text-base sm:text-lg text-[#333333] max-w-[640px] leading-relaxed font-medium">
            Vibe coding — describing an app and letting an AI build it — ships products in
            hours. It also skips the review discipline that used to catch the obvious stuff.
            The risk is not that the AI is malicious. It is that speed outruns scrutiny.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/ai-code-security" className="btn btn-accent px-5 py-2.5 text-[13px]">
              Add a Security Pass <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="btn btn-primary px-5 py-2.5 text-[13px]">
              Open the Console
            </Link>
          </div>
        </section>

        <div className="h-[2px] bg-[#111111] w-full" />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#111111]" />
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">WHAT SLIPS THROUGH THE VIBE</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {WATCHLIST.map(([title, desc], idx) => (
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
          <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] tracking-tight">KEEP THE SPEED, CLOSE THE GAP</h2>
          <ul className="space-y-3">
            {[
              'Run automated validation on the full repository snapshot, not just the latest prompt.',
              'Treat secrets, injection sinks, and permissive access control as launch blockers.',
              'Use confidence-scored findings to separate proven impact from AI noise.',
              'Review generated patch diffs — automation proposes, you approve.',
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-[13px] text-[#333333] font-medium leading-relaxed">
                <span className="mono text-[11px] font-extrabold text-[#111111] bg-[#C5F82A] px-1.5 py-0.5 rounded border border-[#111111] shrink-0 mt-0.5">{`0${idx + 1}`}</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="pt-1 flex flex-wrap gap-3">
            <Link to="/ai-vulnerability-scanner" className="btn btn-accent px-5 py-2.5 text-[13px]">
              See the Scanner
            </Link>
            <Link to="/ai-generated-code-security" className="btn btn-primary px-5 py-2.5 text-[13px]">
              The Vulnerability Classes
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
