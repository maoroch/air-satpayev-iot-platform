import React from "react";
import { Skeleton } from "./Skeleton";

export function DiagnosticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-200">
      {/* Top 2 Boxes: Hardware Specs & Server Services */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 xl:gap-6">
        {/* Box 1: Hardware Specs Skeleton */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
            <Skeleton className="h-5 sm:h-6 xl:h-7 w-56 rounded-md" />
          </div>
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Box 2: Server Services Skeleton */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
            <Skeleton className="h-5 sm:h-6 xl:h-7 w-60 rounded-md" />
          </div>
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Box 3: System Thresholds & Settings Skeleton */}
      <section className="bg-white rounded-2xl p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm">
        <div className="mb-6">
          <Skeleton className="h-5 sm:h-6 xl:h-7 w-80 rounded-md mb-2" />
          <Skeleton className="h-3.5 sm:h-4 w-96 max-w-full rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/40 flex flex-col gap-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </section>
    </div>
  );
}

export default DiagnosticsSkeleton;
