import {
  PageHeaderSkeleton,
  Skeleton,
  LoadingRegion,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading analytics">
      <><PageHeaderSkeleton /><div className="space-y-5"><div className="card p-6"><Skeleton className="h-52 w-full" /></div><div className="card p-6"><Skeleton className="h-40 w-full" /></div></div></>
    </LoadingRegion>
  );
}
