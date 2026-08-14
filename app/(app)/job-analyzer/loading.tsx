import {
  PageHeaderSkeleton,
  Skeleton,
  LoadingRegion,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading job analyzer">
      <><PageHeaderSkeleton /><div className="grid gap-5 lg:grid-cols-2"><div className="card p-6"><Skeleton className="h-64 w-full" /></div><div className="card p-6"><Skeleton className="h-64 w-full" /></div></div></>
    </LoadingRegion>
  );
}
