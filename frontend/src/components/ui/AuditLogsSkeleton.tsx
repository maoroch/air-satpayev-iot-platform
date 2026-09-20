import React from "react";
import { Skeleton } from "./Skeleton";

interface AuditLogsSkeletonProps {
  rowCount?: number;
}

export function AuditLogsSkeleton({ rowCount = 5 }: AuditLogsSkeletonProps) {
  return (
    <section className="bg-white rounded-2xl p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm mb-6 sm:mb-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
            <Skeleton className="h-5 sm:h-6 xl:h-7 w-80 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-3.5 sm:h-4 w-96 max-w-full rounded-md" />
        </div>
      </div>

      {/* Rows Skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: rowCount }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-5 sm:py-4 bg-gray-50/70 border border-gray-100 rounded-xl"
          >
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-5 sm:h-6 w-24 rounded-md shrink-0" />
              <Skeleton className="h-4 sm:h-5 w-3/5 rounded-md" />
            </div>
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AuditLogsSkeleton;
