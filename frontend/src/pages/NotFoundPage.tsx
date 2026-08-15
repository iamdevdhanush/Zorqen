import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import Seo from '../components/Seo';
import PublicLayout from '../layouts/PublicLayout';

export default function NotFoundPage() {
  return (
    <PublicLayout>
      <Seo
        title="Page Not Found — RAKSHA"
        description="This page does not exist. Head back to the RAKSHA security validation home page."
        canonicalPath="/ai-code-security"
        noIndex
      />
      <div className="max-w-[720px] mx-auto py-12 sm:py-20 space-y-6 text-center">
        <div className="protocol-tag inline-flex">raksha://404</div>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-[#111111] tracking-tighter leading-none">
          404<span className="text-[#C5F82A]">.</span>
        </h1>
        <p className="text-base sm:text-lg text-[#333333] max-w-[520px] mx-auto leading-relaxed font-medium">
          This route does not exist. It may be a private workspace path, a removed page,
          or a typo. Nothing here is a security finding.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/ai-code-security" className="btn btn-accent px-5 py-2.5 text-[13px]">
            <Compass className="w-4 h-4" />
            RAKSHA Home
          </Link>
          <Link to="/" className="btn btn-primary px-5 py-2.5 text-[13px]">
            Open the Console <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
