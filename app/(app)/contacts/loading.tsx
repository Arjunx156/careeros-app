import {
  CardGridSkeleton,
  PageHeaderSkeleton,
  LoadingRegion,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading contacts">
      <><PageHeaderSkeleton /><CardGridSkeleton /></>
    </LoadingRegion>
  );
}
