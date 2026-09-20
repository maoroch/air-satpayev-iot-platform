import React from "react";
import { Skeleton } from "./Skeleton";

interface AlertsSkeletonProps {
  itemCount?: number;
}

export function AlertsSkeleton({ itemCount = 3 }: AlertsSkeletonProps) {
  return (
    <section className="rounded-2xl bg-white p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm mb-6 sm:mb-8 animate-in fade-in duration-200">
      <Skeleton className="h-5 sm:h-6 xl:h-7 w-72 rounded-md mb-5" />
      <div className="flex flex-col gap-3.5">
        {Array.from({ length: itemCount }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 rounded-xl gap-4 border border-gray-100 bg-gray-50/50"
          >
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 sm:h-5 w-44 sm:w-64 rounded-md mb-2" />
                <Skeleton className="h-3 sm:h-3.5 w-64 sm:w-96 max-w-full rounded-md" />
              </div>
            </div>
            <Skeleton className="h-9 w-28 rounded-xl shrink-0 self-end sm:self-center" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default AlertsSkeleton;
