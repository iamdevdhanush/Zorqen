import { memo } from 'react';
import { Cpu } from 'lucide-react';

interface TechStackSectionProps {
  primaryLanguage?: string;
  frameworks?: string[];
  dependenciesCount?: number;
}

export const TechStackSection = memo(function TechStackSection({
  primaryLanguage = 'Python',
  frameworks = ['FastAPI', 'PostgreSQL', 'Docker', 'Redis', 'SQLAlchemy', 'Pydantic', 'Pytest', 'Aiohttp'],
  dependenciesCount = 28,
}: TechStackSectionProps) {
  const stackChips = Array.from(new Set(frameworks.filter(f => f && f !== primaryLanguage)));

  return (
    <div className="p-5 rounded-[12px] bg-white border border-[#111111]/20 shadow-hard-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#111111]/15 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4.5 h-4.5 text-[#111111]" />
          <h3 className="text-metadata text-[11px]">
            DETECTED TECH STACK
          </h3>
        </div>
        {dependenciesCount != null && (
          <span className="mono text-[11px] font-bold text-[#111111] bg-[#F9F8F5] px-2.5 py-0.5 rounded border border-[#111111]/20">
            {dependenciesCount} Dependencies Scanned
          </span>
        )}
      </div>

      {/* Primary Language & Tech Chips in Responsive Wrap */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Primary Language Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] bg-[#C7F11A] border-2 border-[#111111] shadow-hard-sm">
          <span className="mono text-[13px] font-extrabold text-[#111111]">{primaryLanguage}</span>
          <span className="mono text-[10px] font-extrabold text-[#111111]/70 uppercase tracking-wider">(Primary Language)</span>
        </div>

        {/* Remaining Framework / Tech Chips */}
        {stackChips.map((tech) => (
          <span
            key={tech}
            className="mono text-[12.5px] font-bold text-[#111111] bg-[#F9F8F5] border border-[#111111]/20 px-3 py-1.5 rounded-[8px]"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
});

export default TechStackSection;
