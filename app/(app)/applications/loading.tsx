import {
  PageHeaderSkeleton,
  TableSkeleton,
  LoadingRegion,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading applications">
      <><PageHeaderSkeleton /><TableSkeleton rows={8} /></>
    </LoadingRegion>
  );
}
