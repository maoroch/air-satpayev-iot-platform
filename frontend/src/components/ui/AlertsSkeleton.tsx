import React from "react";
import { Skeleton } from "./Skeleton";

interface AlertsSkeletonProps {
  itemCount?: number;
}

export function AlertsSkeleton({ itemCount = 3 }: AlertsSkeletonProps) {
  return (
    <section className="rounded-2xl bg-white p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm mb-4 sm:mb-5 lg:mb-5 2xl:mb-8 animate-in fade-in duration-200">
      <Skeleton className="h-5 sm:h-6 lg:h-5 xl:h-6 2xl:h-7 w-64 sm:w-72 rounded-md mb-4 lg:mb-4 xl:mb-5 2xl:mb-6" />
      <div className="flex flex-col gap-3 sm:gap-3.5">
        {Array.from({ length: itemCount }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 sm:p-4 lg:p-3.5 xl:p-4 2xl:p-5 rounded-xl gap-3 sm:gap-4 border border-gray-100 bg-gray-50/50"
          >
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 sm:h-5 w-44 sm:w-64 rounded-md mb-1.5 sm:mb-2" />
                <Skeleton className="h-3 sm:h-3.5 w-60 sm:w-96 max-w-full rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 sm:h-9 w-24 sm:w-28 rounded-xl shrink-0 self-end sm:self-center" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default AlertsSkeleton;
