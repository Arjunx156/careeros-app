import {
  PageHeaderSkeleton,
  StatGridSkeleton,
  LoadingRegion,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading dashboard">
      <><PageHeaderSkeleton /><div className="space-y-6"><StatGridSkeleton /><StatGridSkeleton count={3} /></div></>
    </LoadingRegion>
  );
}
