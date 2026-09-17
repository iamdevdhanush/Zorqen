/**
 * ZORQEN — Skeleton Loader Components
 * Used during async data fetching to prevent layout shift and
 * communicate progress clearly. No spinners, no empty divs.
 */

/** Repository card skeleton — matches RepositoryCard layout exactly */
export function RepoCardSkeleton() {
  return (
    <div className="p-5 lg:p-6 rounded-[20px] bg-white border-2 border-[#E8E6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[80px]">
      {/* Left: icon + details */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="skeleton w-5 h-5 rounded-[4px] shrink-0" />
        <div className="space-y-2 flex-1 max-w-[320px]">
          <div className="skeleton skeleton-text w-[200px]" />
          <div className="skeleton skeleton-text w-[140px] h-[11px]" />
        </div>
      </div>

      {/* Right: score + arrow */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="space-y-1.5 text-right">
          <div className="skeleton skeleton-text w-[60px] h-[11px] ml-auto" />
          <div className="skeleton w-[40px] h-[22px] rounded-[6px] ml-auto" />
        </div>
        <div className="skeleton w-[38px] h-[38px] rounded-[10px] shrink-0" />
      </div>
    </div>
  );
}

/** Three stacked repo card skeletons with staggered animation */
export function RepoListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
          <RepoCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Finding row skeleton */
export function FindingRowSkeleton() {
  return (
    <div className="rounded-[20px] bg-white border-2 border-[#E8E6DF] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[80px]">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="skeleton w-[56px] h-[22px] rounded-full" />
          <div className="skeleton skeleton-text w-[260px]" />
        </div>
        <div className="skeleton skeleton-text w-[180px] h-[11px]" />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="skeleton w-[70px] h-[22px] rounded-full" />
        <div className="skeleton w-[80px] h-[36px] rounded-[12px]" />
      </div>
    </div>
  );
}

/** Assessment row skeleton */
export function AssessmentRowSkeleton() {
  return (
    <div className="p-4 rounded-[16px] bg-white border-2 border-[#E8E6DF] space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton skeleton-text w-[80px]" />
        <div className="skeleton w-[60px] h-[22px] rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="skeleton skeleton-text w-[140px]" />
        <div className="skeleton skeleton-text w-[60px] h-[11px]" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-[#E8E6DF]">
        <div className="skeleton skeleton-text w-[80px] h-[11px]" />
        <div className="skeleton skeleton-text w-[60px] h-[11px]" />
      </div>
    </div>
  );
}

/** Overview metric card skeleton */
export function MetricCardSkeleton() {
  return (
    <div className="skeleton-card space-y-3">
      <div className="skeleton skeleton-text w-[80px] h-[11px]" />
      <div className="skeleton w-[100px] h-[48px] rounded-[8px]" />
      <div className="skeleton skeleton-text w-[60px] h-[22px] rounded-full" />
    </div>
  );
}
