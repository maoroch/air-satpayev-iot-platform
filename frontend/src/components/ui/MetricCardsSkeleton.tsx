import React from "react";
import { Skeleton } from "./Skeleton";

interface MetricCardsSkeletonProps {
  hiddenOnMobile?: boolean;
}

export function MetricCardsSkeleton({ hiddenOnMobile = false }: MetricCardsSkeletonProps) {
  return (
    <section
      className={`${
        hiddenOnMobile ? "hidden md:grid" : "grid"
      } grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-3.5 xl:gap-4.5 2xl:gap-6 mb-4 sm:mb-5 lg:mb-5 2xl:mb-8`}
    >
      {/* Card 1: Температура Skeleton */}
      <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl" />
        </div>
        <Skeleton className="h-7 sm:h-8 lg:h-8 xl:h-9 2xl:h-10 w-24 xl:w-28 rounded-lg mb-2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <div className="h-1 lg:h-1.5 bg-gray-100 rounded-full mt-3 lg:mt-3.5 2xl:mt-4 overflow-hidden">
          <Skeleton className="h-full w-2/3 rounded-full" />
        </div>
      </div>

      {/* Card 2: Влажность Skeleton */}
      <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl" />
        </div>
        <Skeleton className="h-7 sm:h-8 lg:h-8 xl:h-9 2xl:h-10 w-20 xl:w-24 rounded-lg mb-2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <div className="h-1 lg:h-1.5 bg-gray-100 rounded-full mt-3 lg:mt-3.5 2xl:mt-4 overflow-hidden">
          <Skeleton className="h-full w-1/2 rounded-full" />
        </div>
      </div>

      {/* Card 3: Ресурс фильтра HEPA Skeleton */}
      <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl" />
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <Skeleton className="h-7 sm:h-8 lg:h-8 xl:h-9 2xl:h-10 w-20 xl:w-24 rounded-lg" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-3 w-12 rounded-md" />
        </div>
        <div className="h-1 lg:h-1.5 bg-gray-100 rounded-full mt-3 lg:mt-3.5 2xl:mt-4 overflow-hidden">
          <Skeleton className="h-full w-4/5 rounded-full" />
        </div>
      </div>

      {/* Card 4: Состояние прибора Skeleton */}
      <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>
        <Skeleton className="h-8.5 lg:h-9 xl:h-9.5 2xl:h-10 w-full rounded-xl" />
      </div>
    </section>
  );
}

export default MetricCardsSkeleton;
