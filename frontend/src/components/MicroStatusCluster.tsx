import type { FC } from 'react';

interface MicroStatusClusterProps {
  status?: string;
  githubConnected?: boolean;
  repoConnected?: boolean;
  className?: string;
}

export const MicroStatusCluster: FC<MicroStatusClusterProps> = ({
  status = 'RUNNING',
  githubConnected = true,
  repoConnected = true,
  className = '',
}) => {
  const isRunning = status === 'RUNNING' || status === 'IDLE';
  const isFailed = status === 'FAILED';

  return (
    <div className={`p-3.5 rounded-[14px] bg-white border-2 border-[#111111] shadow-hard flex flex-wrap items-center justify-between gap-3 text-mono text-[10.5px] ${className}`}>
      <div className="flex items-center gap-4 flex-wrap">
        {/* ENGINE */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-[#525252] uppercase">ENGINE</span>
          <span className="text-[#111111] bg-[#C8F31D] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111] font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            ONLINE
          </span>
        </div>

        {/* REPOSITORY */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-[#525252] uppercase">REPOSITORY</span>
          <span className={`px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111] font-extrabold flex items-center gap-1 ${
            repoConnected || githubConnected ? 'bg-[#F7F5F0] text-[#111111]' : 'bg-[#FEE2E2] text-[#DC2626]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${repoConnected || githubConnected ? 'bg-[#111111]' : 'bg-[#DC2626]'}`} />
            {repoConnected || githubConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {/* ANALYSIS */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-[#525252] uppercase">ANALYSIS</span>
          <span className={`px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111] font-extrabold flex items-center gap-1 ${
            isRunning
              ? 'bg-[#C8F31D] text-[#111111]'
              : isFailed
              ? 'bg-[#FEE2E2] text-[#DC2626]'
              : 'bg-[#F7F5F0] text-[#111111]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isFailed ? 'bg-[#DC2626]' : 'bg-[#111111]'}`} />
            {isRunning ? 'ACTIVE' : isFailed ? 'FAILED' : 'COMPLETED'}
          </span>
        </div>

        {/* DATABASE */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-[#525252] uppercase">DATABASE</span>
          <span className="text-[#111111] bg-[#F7F5F0] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111] font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            READY
          </span>
        </div>

        {/* AI ENGINE */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-[#525252] uppercase">AI ENGINE</span>
          <span className="text-[#111111] bg-[#F7F5F0] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111] font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            {isRunning ? 'PROCESSING' : 'READY'}
          </span>
        </div>
      </div>

      <div className="mono text-[10px] text-[#666666] font-bold">
        ZORQEN VALIDATION PROTOCOL v1.0
      </div>
    </div>
  );
};

export default MicroStatusCluster;
