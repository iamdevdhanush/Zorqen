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
    <div className="p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4">
      <div className="flex items-center justify-between border-b-2 border-[#111111]/15 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 stroke-[2] text-[#111111]" />
          <h3 className="text-metadata text-[11px]">
            DETECTED TECH STACK
          </h3>
        </div>
        {dependenciesCount != null && (
          <span className="mono text-[11px] font-bold text-[#111111] bg-[#F7F5F0] px-3 py-1 rounded-full border-[1.5px] border-[#111111]">
            {dependenciesCount} Dependencies Scanned
          </span>
        )}
      </div>

      {/* Primary Language & Tech Chips in Responsive Wrap */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Primary Language Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8F31D] border-[1.5px] border-[#111111]">
          <span className="mono text-[13px] font-extrabold text-[#111111]">{primaryLanguage}</span>
          <span className="mono text-[10px] font-extrabold text-[#111111]/70 uppercase tracking-wider">(Primary Language)</span>
        </div>

        {/* Remaining Framework / Tech Chips */}
        {stackChips.map((tech) => (
          <span
            key={tech}
            className="mono text-[12.5px] font-bold text-[#111111] bg-[#F7F5F0] border-[1.5px] border-[#111111] px-3 py-1.5 rounded-full"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
});

export default TechStackSection;
