import React from "react";
import { Skeleton } from "./Skeleton";

interface TableSkeletonProps {
  rowCount?: number;
}

export function TableSkeleton({ rowCount = 6 }: TableSkeletonProps) {
  return (
    <section className="rounded-2xl bg-white p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm mb-6 sm:mb-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <Skeleton className="h-5 sm:h-6 xl:h-7 w-72 rounded-md mb-2" />
          <Skeleton className="h-3.5 sm:h-4 w-96 max-w-full rounded-md" />
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0">
        <table className="w-full text-left text-sm border-collapse min-w-[540px]">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400">
              <th className="py-3.5 px-4 sm:px-6">Время</th>
              <th className="py-3.5 px-4 sm:px-6">Температура</th>
              <th className="py-3.5 px-4 sm:px-6">Влажность</th>
              <th className="py-3.5 px-4 sm:px-6">Вентилятор</th>
              <th className="py-3.5 px-4 sm:px-6">Канал передачи</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: rowCount }).map((_, idx) => (
              <tr key={idx} className="transition-colors">
                <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                  <Skeleton className="h-4 w-32 rounded-md" />
                </td>
                <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                  <Skeleton className="h-4 w-16 rounded-md" />
                </td>
                <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                  <Skeleton className="h-4 w-16 rounded-md" />
                </td>
                <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                  <Skeleton className="h-5 w-20 rounded-md" />
                </td>
                <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                  <Skeleton className="h-5 w-24 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TableSkeleton;
