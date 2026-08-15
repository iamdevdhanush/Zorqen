import { useState } from 'react';
import { Download, ArrowRight, AlertCircle, GitPullRequest } from 'lucide-react';
import GithubIcon from '../components/GithubIcon';

const BUY_ME_A_COFFEE_URL = import.meta.env.VITE_BUY_ME_A_COFFEE_URL || 'https://buymeacoffee.com/raksha';
const GITHUB_REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL || 'https://github.com/iamdevdhanush/Raksha-ai';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const GITHUB_CONTRIBUTE_URL = `${GITHUB_REPO_URL}#contribute`;

export default function BannerPage() {
  const [exporting, setExporting] = useState(false);

  const handleDownloadSvg = () => {
    const link = document.createElement('a');
    link.href = '/raksha-banner.svg';
    link.download = 'raksha-banner.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPng = () => {
    setExporting(true);
    fetch('/raksha-banner.svg')
      .then((res) => res.text())
      .then((svgText) => {
        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 3200;
          canvas.height = 800;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#F7F7F2';
            ctx.fillRect(0, 0, 3200, 800);
            ctx.drawImage(img, 0, 0, 3200, 800);
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = 'raksha-banner-3200x800.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
          setExporting(false);
        };
        img.src = url;
      })
      .catch(() => setExporting(false));
  };

  return (
    <div className="max-w-[1100px] mx-auto py-10 px-4 sm:px-6 space-y-16 slide-up">
      
      {/* ── SECTION 1 — HERO ───────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-[0.2em] text-[#666666] font-bold">
            SUPPORT RAKSHA
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.15] max-w-[820px]">
            HELP BUILD BETTER SECURITY TOOLS.
          </h1>
          <p className="text-base sm:text-lg text-[#444444] font-medium leading-relaxed max-w-[760px]">
            RAKSHA is an open security validation platform designed to help developers understand vulnerabilities, trace attack paths, and turn security findings into actionable remediation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 pt-2">
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-accent font-extrabold text-sm sm:text-base px-6 py-3 shadow-hard hover:-translate-y-0.5 transition-transform"
          >
            <span>☕ SUPPORT RAKSHA</span>
          </a>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="btn font-extrabold text-sm sm:text-base px-6 py-3 shadow-hard hover:-translate-y-0.5 transition-transform"
          >
            <GithubIcon className="w-4 h-4 text-[#111111]" />
            <span>VIEW ON GITHUB</span>
          </a>
        </div>
      </section>

      {/* ── SECTION 2 — WHY SUPPORT? ───────────────────────────────────────── */}
      <section className="space-y-6 pt-4 border-t border-[#111111]">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
            WHY SUPPORT RAKSHA?
          </h2>
          <p className="text-sm sm:text-base text-[#444444] font-medium leading-relaxed max-w-[820px]">
            Security tooling shouldn&apos;t only belong to large companies with expensive infrastructure. RAKSHA is being built to make practical security analysis more accessible to developers, students, researchers, and open-source projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="panel p-5 space-y-2 bg-white">
            <div className="mono text-[10.5px] font-extrabold text-[#111111] uppercase tracking-wider">
              OPEN SECURITY TOOLING
            </div>
            <p className="text-xs sm:text-sm text-[#555555] font-medium leading-relaxed">
              Building practical tools for vulnerability analysis and security validation.
            </p>
          </div>

          <div className="panel p-5 space-y-2 bg-white">
            <div className="mono text-[10.5px] font-extrabold text-[#111111] uppercase tracking-wider">
              RESEARCH &amp; DEVELOPMENT
            </div>
            <p className="text-xs sm:text-sm text-[#555555] font-medium leading-relaxed">
              Improving analysis workflows, evidence collection, and AI-assisted security reasoning.
            </p>
          </div>

          <div className="panel p-5 space-y-2 bg-white">
            <div className="mono text-[10.5px] font-extrabold text-[#111111] uppercase tracking-wider">
              OPEN-SOURCE COMMUNITY
            </div>
            <p className="text-xs sm:text-sm text-[#555555] font-medium leading-relaxed">
              Making useful security capabilities easier to explore, learn from, and contribute to.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — SUPPORT CARD (Visually Dominant Component) ─────────── */}
      <section className="pt-2">
        <div className="panel p-6 sm:p-10 space-y-6 bg-white border-2 border-[#111111] shadow-hard max-w-[880px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#C5F82A] stroke-[#111111] border border-[#111111] shadow-hard-sm">
            <span className="mono text-xs font-extrabold text-[#111111] uppercase tracking-wider">
              ☕ BUY ME A COFFEE
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              SUPPORT THE PROJECT
            </h2>
            <p className="text-sm sm:text-base text-[#444444] font-medium leading-relaxed max-w-[680px]">
              Your support helps fund the time, infrastructure, experimentation, and development required to keep RAKSHA moving forward.
            </p>
          </div>

          <div className="pt-2">
            <a
              href={BUY_ME_A_COFFEE_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-accent font-extrabold text-base sm:text-lg px-8 py-4 inline-flex items-center gap-3 shadow-hard hover:-translate-y-0.5 transition-transform"
            >
              <span>SUPPORT RAKSHA</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </a>
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — WHERE SUPPORT GOES ─────────────────────────────────── */}
      <section className="space-y-6 pt-4 border-t border-[#111111]">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
          WHERE SUPPORT GOES
        </h2>

        <div className="space-y-3 max-w-[880px]">
          {/* Row 1 */}
          <div className="panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 bg-white">
            <div className="mono text-sm font-extrabold text-[#111111] bg-[#FAFAFA] border border-[#111111] px-3 py-1.5 rx-4 rounded w-fit shrink-0 shadow-hard-sm">
              01
            </div>
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-sm sm:text-base text-[#111111]">
                SECURITY ENGINE DEVELOPMENT
              </h3>
              <p className="text-xs sm:text-sm text-[#555555] font-medium">
                Improve vulnerability detection, evidence analysis, and security workflows.
              </p>
            </div>
          </div>

          {/* Row 2 */}
          <div className="panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 bg-white">
            <div className="mono text-sm font-extrabold text-[#111111] bg-[#FAFAFA] border border-[#111111] px-3 py-1.5 rx-4 rounded w-fit shrink-0 shadow-hard-sm">
              02
            </div>
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-sm sm:text-base text-[#111111]">
                INFRASTRUCTURE
              </h3>
              <p className="text-xs sm:text-sm text-[#555555] font-medium">
                Hosting, testing environments, APIs, and development infrastructure.
              </p>
            </div>
          </div>

          {/* Row 3 */}
          <div className="panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 bg-white">
            <div className="mono text-sm font-extrabold text-[#111111] bg-[#FAFAFA] border border-[#111111] px-3 py-1.5 rx-4 rounded w-fit shrink-0 shadow-hard-sm">
              03
            </div>
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-sm sm:text-base text-[#111111]">
                RESEARCH &amp; EXPERIMENTATION
              </h3>
              <p className="text-xs sm:text-sm text-[#555555] font-medium">
                Explore better security analysis techniques and AI-assisted workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — RAKSHA BRAND ASSETS ───────────────────────────────── */}
      <section className="space-y-5 pt-4 border-t border-[#111111]">
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
            RAKSHA BRAND ASSETS
          </h2>
          <p className="text-xs sm:text-sm text-[#555555] font-medium max-w-[700px]">
            Want to feature RAKSHA on your project page, profile, or community post? Use the official RAKSHA artwork below.
          </p>
        </div>

        <div className="space-y-4">
          <div className="w-full overflow-hidden border-2 border-[#111111] rounded-xl shadow-hard bg-[#F7F7F2]">
            <img
              src="/raksha-banner.svg"
              alt="Official RAKSHA Artwork Banner"
              className="w-full h-auto block object-contain"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleDownloadSvg} className="btn btn-accent font-bold">
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD SVG</span>
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={exporting}
              className="btn btn-primary font-bold"
            >
              <Download className="w-3.5 h-3.5 text-[#C5F82A]" />
              <span>{exporting ? 'EXPORTING...' : 'EXPORT PNG'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — SUPPORT ELSEWHERE / GET INVOLVED ───────────────────── */}
      <section className="space-y-3 pt-4 border-t border-[#111111]">
        <div className="mono text-[11px] uppercase tracking-[0.18em] text-[#666666] font-bold">
          GET INVOLVED
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm"
          >
            <GithubIcon className="w-3.5 h-3.5 text-[#111111]" />
            <span>GitHub</span>
          </a>

          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm"
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#111111]" />
            <span>Report an Issue</span>
          </a>

          <a
            href={GITHUB_CONTRIBUTE_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-[#111111]" />
            <span>Contribute</span>
          </a>
        </div>
      </section>

    </div>
  );
}
