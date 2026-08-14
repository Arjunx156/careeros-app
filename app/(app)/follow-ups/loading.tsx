import {
  PageHeaderSkeleton,
  TableSkeleton,
  LoadingRegion,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading follow ups">
      <><PageHeaderSkeleton /><TableSkeleton rows={5} /></>
    </LoadingRegion>
  );
}
