import React from "react";
import { Skeleton } from "./Skeleton";

interface AuditLogsSkeletonProps {
  rowCount?: number;
}

export function AuditLogsSkeleton({ rowCount = 5 }: AuditLogsSkeletonProps) {
  return (
    <section className="bg-white rounded-2xl p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm mb-4 sm:mb-5 lg:mb-5 2xl:mb-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-4 xl:mb-5 2xl:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5 sm:mb-2">
            <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-xl shrink-0" />
            <Skeleton className="h-5 sm:h-6 lg:h-5 xl:h-6 2xl:h-7 w-72 sm:w-80 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-3.5 sm:h-4 w-80 sm:w-96 max-w-full rounded-md" />
        </div>
      </div>

      {/* Rows Skeleton */}
      <div className="flex flex-col gap-2.5 sm:gap-3">
        {Array.from({ length: rowCount }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:px-4 sm:py-3 lg:p-3 xl:p-3.5 2xl:p-4 bg-gray-50/70 border border-gray-100 rounded-xl"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1">
              <Skeleton className="h-4 sm:h-5 w-20 sm:w-24 rounded-md shrink-0" />
              <Skeleton className="h-3.5 sm:h-4 w-3/5 rounded-md" />
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-end sm:self-auto">
              <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-28 rounded-md" />
              <Skeleton className="h-3.5 sm:h-4 w-16 sm:w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AuditLogsSkeleton;
