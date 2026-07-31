import { Skeleton } from "@/components/ui/skeleton";

/** Rows-shaped, so a table's arrival replaces like with like. */
export function ListSkeleton() {
  return (
    <div
      aria-hidden
      className="space-y-3 rounded-xl border px-4 py-3"
      data-testid="list-skeleton"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}
