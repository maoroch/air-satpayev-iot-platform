import React from "react";
import { Skeleton } from "./Skeleton";

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm mb-4 sm:mb-5 lg:mb-5 2xl:mb-8 animate-in fade-in duration-200">
      {/* Chart Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 lg:mb-4 xl:mb-5 2xl:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl" />
          <div>
            <Skeleton className="h-4 sm:h-5 lg:h-5 xl:h-6 w-52 sm:w-64 rounded-md mb-1.5" />
            <Skeleton className="h-3 sm:h-3.5 xl:h-4 w-64 sm:w-72 rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-2.5 h-2.5 rounded-full" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-2.5 h-2.5 rounded-full" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
          </div>
          {/* Segmented Filter Pills */}
          <div className="inline-flex items-center bg-gray-100/90 p-1 rounded-xl gap-1">
            <Skeleton className="h-6 sm:h-7 w-20 sm:w-24 rounded-lg" />
            <Skeleton className="h-6 sm:h-7 w-20 sm:w-24 rounded-lg" />
            <Skeleton className="h-6 sm:h-7 w-20 sm:w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* SVG / Chart Grid Area Skeleton */}
      <div className="relative w-full h-[240px] sm:h-[280px] lg:h-[290px] xl:h-[320px] 2xl:h-[380px] flex flex-col justify-between py-4 px-2">
        {/* Horizontal grid lines with simulated tick labels */}
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="flex items-center gap-3 w-full">
            <Skeleton className="h-2.5 w-7 rounded-sm shrink-0" />
            <div className="h-px bg-gray-100 flex-1" />
            <Skeleton className="h-2.5 w-7 rounded-sm shrink-0" />
          </div>
        ))}

        {/* Pulsing simulated wave shape overlay */}
        <div className="absolute inset-x-12 inset-y-6 flex items-center justify-center pointer-events-none">
          <svg className="w-full h-full opacity-30 text-blue-300" preserveAspectRatio="none" viewBox="0 0 400 150">
            <path
              d="M0,100 C80,40 160,130 240,70 C320,20 360,90 400,60 L400,150 L0,150 Z"
              fill="currentColor"
            />
            <path
              d="M0,100 C80,40 160,130 240,70 C320,20 360,90 400,60"
              fill="none"
              stroke="#0071e3"
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default ChartSkeleton;
