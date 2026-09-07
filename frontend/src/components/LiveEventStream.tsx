import type { FC } from 'react';
import type { LogLine } from '../lib/types';

interface LiveEventStreamProps {
  logs: LogLine[];
  maxEvents?: number;
  className?: string;
}

export const LiveEventStream: FC<LiveEventStreamProps> = ({
  logs = [],
  maxEvents = 8,
  className = '',
}) => {
  // Display latest maxEvents logs
  const displayLogs = logs.slice(-maxEvents);

  return (
    <div className={`p-5 sm:p-6 rounded-[20px] bg-white border-2 border-[#111111] shadow-hard space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3">
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] font-extrabold text-[#111111] uppercase tracking-wider">
            LIVE ANALYSIS SECURITY EVENT STREAM
          </span>
        </div>
        <div className="mono text-[10px] font-extrabold text-[#111111] bg-[#C8F31D] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111]">
          {logs.length} EVENTS LOGGED
        </div>
      </div>

      <div className="space-y-1.5 font-mono text-[11.5px]">
        {displayLogs.length === 0 ? (
          <div className="p-4 text-center text-[#525252] text-[11px]">
            Waiting for validation pipeline security events…
          </div>
        ) : (
          displayLogs.map((log, idx) => {
            const isOk = log.tone === 'ok';
            const isErr = log.tone === 'err';
            const isWarn = log.tone === 'warn';

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-[10px] border-2 flex items-center justify-between gap-3 transition-colors ${
                  isErr
                    ? 'bg-[#FEE2E2] border-[#111111] text-[#DC2626]'
                    : isWarn
                    ? 'bg-[#FEF3C7] border-[#111111] text-[#B45309]'
                    : isOk
                    ? 'bg-white border-[#111111]'
                    : 'bg-[#F7F5F0] border-[#111111]/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-[#525252] text-[10.5px] font-semibold shrink-0">
                    {log.time || '—'}
                  </span>
                  
                  {isOk ? (
                    <span className="text-[#111111] font-bold shrink-0">✓</span>
                  ) : isErr ? (
                    <span className="text-[#DC2626] font-bold shrink-0">✕</span>
                  ) : isWarn ? (
                    <span className="text-[#B45309] font-bold shrink-0">▲</span>
                  ) : (
                    <span className="text-[#111111] font-bold shrink-0">●</span>
                  )}

                  <span className="font-extrabold text-[#111111] uppercase shrink-0 text-[10px] bg-[#C8F31D] px-2 py-0.5 rounded-full border-[1.5px] border-[#111111]">
                    {log.source || 'ZORQEN'}
                  </span>

                  <span className="font-medium text-[#111111] truncate text-[11px]">
                    {log.text}
                  </span>
                </div>

                <span className="text-[9.5px] font-extrabold uppercase shrink-0 px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111] bg-white">
                  {isOk ? 'COMPLETED' : isErr ? 'FAILED' : isWarn ? 'WARNING' : 'ACTIVE'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LiveEventStream;
