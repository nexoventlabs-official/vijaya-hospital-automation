import React from 'react';

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonText({ lines = 2, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3.5"
          style={{ width: i === lines - 1 && lines > 1 ? '65%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-feature flex items-center justify-between p-6">
          <div className="space-y-3 flex-1 pr-4">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-9 w-16 rounded-xl" />
          </div>
          <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="card-feature p-0 overflow-hidden border border-stage-gray/60 dark:border-edge">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f4f4f5]/60 dark:bg-dark-card/40 border-b border-edge/60">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-6 py-4 text-left">
                  <Skeleton className="h-4 w-20 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stage-gray/60 dark:divide-edge/40">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="hover:bg-control/20">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-6 py-4">
                    <Skeleton
                      className={`h-4 rounded ${
                        c === 0 ? 'w-24' : c === cols - 1 ? 'w-12 ml-auto' : 'w-32'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonDoctor({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-feature p-6 flex flex-col justify-between space-y-6">
          <div className="flex gap-4 items-start">
            <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-3.5 w-1/2 rounded" />
              <Skeleton className="h-6 w-20 rounded-full mt-2" />
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t border-stage-gray/60 dark:border-edge/50">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-stage-gray/60 dark:border-edge/50">
            <Skeleton className="h-6 w-16 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetails() {
  return (
    <div className="space-y-6">
      <div className="card-feature p-6 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-feature p-6 space-y-4">
            <Skeleton className="h-5 w-36 rounded-md mb-4" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between py-2 border-b border-stage-gray/40 dark:border-edge/40">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

