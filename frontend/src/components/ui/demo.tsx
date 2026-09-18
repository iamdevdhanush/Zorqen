import { AntiMetalButton } from './anti-metal-button';
import { ArrowRight, Sparkles, GitPullRequest } from 'lucide-react';
import GithubIcon from '../GithubIcon';

/**
 * Temporary preview demo component for AntiMetalButton verification.
 * To be deleted after integration.
 */
export default function AntiMetalButtonDemo() {
  return (
    <div className="p-8 space-y-6 bg-[#ECEAE4] border-2 border-[#111111] rounded-[20px] max-w-xl mx-auto my-8">
      <h3 className="text-xl font-extrabold text-[#111111]">AntiMetalButton Preview Demo</h3>
      <div className="flex flex-wrap items-center gap-4">
        {/* Default Button */}
        <AntiMetalButton label="Connect GitHub" icon={<GithubIcon className="w-4 h-4 text-white" />} rightIcon={<ArrowRight className="w-4 h-4" />} />

        {/* Compact Button */}
        <AntiMetalButton size="compact" label="Investigate" icon={<Sparkles className="w-3.5 h-3.5 text-[#C8F31D]" />} />

        {/* Action Button */}
        <AntiMetalButton label="Generate Patch" icon={<GitPullRequest className="w-4 h-4 text-[#C8F31D]" />} />
      </div>
    </div>
  );
}
