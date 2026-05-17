import { SkeletonBlock } from "@/components/ui/skeleton-block";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pt-2">
      <SkeletonBlock className="h-4 w-32" />

      {/* Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-9 w-32" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
          <div className="space-y-2 text-right">
            <SkeletonBlock className="ml-auto h-8 w-28" />
            <SkeletonBlock className="ml-auto h-3 w-16" />
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass flex flex-col gap-2 rounded-xl p-4">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-6 w-20" />
            <SkeletonBlock className="h-3 w-10" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass h-[440px] rounded-2xl" />

      {/* AI + analyst */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass h-56 rounded-2xl lg:col-span-2" />
        <div className="glass h-56 rounded-2xl" />
      </div>

      {/* Financials grid */}
      <div className="glass h-96 rounded-2xl" />
    </div>
  );
}
