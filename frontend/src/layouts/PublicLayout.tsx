import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const PUBLIC_NAV = [
  { to: '/ai-code-security', label: 'AI Code Security', end: true },
  { to: '/ai-vulnerability-scanner', label: 'AI Vulnerability Scanner' },
  { to: '/ai-generated-code-security', label: 'AI-Generated Code Security' },
  { to: '/vibe-coded-app-security', label: 'Vibe-Coded App Security' },
  { to: '/ai-application-security', label: 'AI Application Security' },
  { to: '/docs', label: 'Docs' },
];

const FOOTER_NAV = [
  { to: '/ai-code-security', label: 'AI Code Security' },
  { to: '/ai-vulnerability-scanner', label: 'AI Vulnerability Scanner' },
  { to: '/ai-generated-code-security', label: 'AI-Generated Code Security' },
  { to: '/vibe-coded-app-security', label: 'Vibe-Coded App Security' },
  { to: '/ai-application-security', label: 'AI Application Security' },
  { to: '/docs', label: 'Docs' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-base)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#111111] px-4 sm:px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-5 lg:gap-8 min-w-0">
            <Link to="/ai-code-security" className="flex items-center gap-3 group shrink-0 py-0.5">
              <img
                src="/logo.png"
                alt="ZORQEN"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 transition-transform group-hover:-translate-y-0.5"
              />
              <div className="leading-tight flex flex-col justify-center">
                <div className="font-extrabold text-[15px] sm:text-[16px] tracking-tight text-[#111111] leading-none flex items-center gap-1.5">
                  ZORQEN
                </div>
                <div className="mono text-[8px] sm:text-[8.5px] font-bold tracking-[0.18em] text-[#666666] uppercase mt-1">
                  SECURITY VALIDATION
                </div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5 ml-2" aria-label="ZORQEN product pages">
              {PUBLIC_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-2.5 xl:px-3.5 py-1.5 rounded-md text-[12.5px] font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                      isActive
                        ? 'bg-[#C5F82A] text-[#111111] border border-[#111111] shadow-hard-sm'
                        : 'text-[#555555] hover:text-[#111111] hover:bg-black/5 border border-transparent'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#111111] bg-[#C5F82A] shadow-hard-sm text-[12px] font-bold text-[#111111] hover:bg-[#B4EA1B] transition-all"
            >
              <span>Open Console</span>
            </Link>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="flex lg:hidden items-center justify-center p-2 rounded-md border border-[#111111] bg-white shadow-hard-sm text-[#111111] hover:bg-[#FAFAFA] transition-all"
              aria-label="Toggle product navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden pt-3 pb-2 border-t border-[#111111] mt-3 space-y-1.5 slide-down">
            <nav className="flex flex-col gap-1.5" aria-label="Mobile product navigation">
              {PUBLIC_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md text-[13.5px] font-bold transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-[#C5F82A] text-[#111111] border border-[#111111] shadow-hard-sm'
                        : 'text-[#333333] hover:bg-black/5 border border-transparent'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  <span className="mono text-[10px] text-[#666666]">→</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>

      <footer className="border-t border-[var(--color-line)] bg-white px-4 sm:px-6 py-4 sm:py-6 mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11.5px] text-[var(--color-ink-3)]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--color-ink)]">ZORQEN</span>
            <span>— security validation for AI-built software</span>
          </div>
          <nav className="flex items-center gap-3 flex-wrap" aria-label="Footer">
            {FOOTER_NAV.map((item) => (
              <Link key={item.to} to={item.to} className="font-bold text-[var(--color-ink-2)] hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mono text-[10.5px]">scans run in isolated sandboxes • never against production</div>
        </div>
      </footer>
    </div>
  );
}
