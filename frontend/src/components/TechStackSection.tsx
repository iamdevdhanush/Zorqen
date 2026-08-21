import { memo, useState } from 'react';
import { Cpu, ChevronDown } from 'lucide-react';

interface TechStackSectionProps {
  primaryLanguage?: string;
  frameworks?: string[];
  dependenciesCount?: number;
}

export const TechStackSection = memo(function TechStackSection({
  primaryLanguage = 'Python',
  frameworks = ['FastAPI', 'PostgreSQL', 'Docker', 'Redis', 'SQLAlchemy', 'Pydantic', 'Pytest', 'Aiohttp'],
  dependenciesCount,
}: TechStackSectionProps) {
  const [showAll, setShowAll] = useState(false);

  // Combine primary language + frameworks
  const allStack = Array.from(new Set([primaryLanguage, ...frameworks])).filter(Boolean);
  const primaryVisible = allStack.slice(0, 4);
  const remainingCount = Math.max(0, allStack.length - 4);

  const visibleList = showAll ? allStack : primaryVisible;

  return (
    <div className="p-5 rounded-[16px] bg-white border-2 border-[#111111] shadow-hard-sm space-y-3">
      <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#111111]" />
          <h3 className="mono text-[11px] font-extrabold text-[#5E5E5E] uppercase tracking-[0.14em]">
            DETECTED STACK
          </h3>
        </div>
        {dependenciesCount != null && (
          <span className="mono text-[11px] font-bold text-[#0A0A0A] bg-[#FAFAFA] px-2.5 py-0.5 rounded border border-[#111111]/20">
            {dependenciesCount} Dependencies Scanned
          </span>
        )}
      </div>

      {/* Primary Tech Pills Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {visibleList.map((tech) => (
          <span
            key={tech}
            className="mono text-[13px] font-extrabold text-[#0A0A0A] bg-[#FAFAFA] border-2 border-[#111111] px-3 py-1.5 rounded-[8px] shadow-hard-sm"
          >
            {tech}
          </span>
        ))}

        {remainingCount > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="mono text-[13px] font-extrabold text-[#111111] bg-[#C8FF2E] hover:bg-[#b5eb1c] border-2 border-[#111111] px-3 py-1.5 rounded-[8px] shadow-hard-sm transition-all flex items-center gap-1 cursor-pointer min-h-[44px]"
          >
            <span>+{remainingCount} more</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="mono text-[12px] font-extrabold text-[#5E5E5E] hover:text-[#0A0A0A] underline ml-1 cursor-pointer min-h-[44px]"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
});

export default TechStackSection;
