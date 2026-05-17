import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

/**
 * Generic shimmer skeleton block. Pair with explicit width/height classes:
 * <SkeletonBlock className="h-6 w-24" />
 */
export function SkeletonBlock({ className }: Props) {
  return <div className={cn("skeleton rounded", className)} aria-hidden />;
}
