import React from 'react';

export const Skeleton = ({ className = 'h-4 w-full', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-slate-200/80 animate-pulse rounded-lg ${className}`}
        />
      ))}
    </>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-4 bg-slate-200/70 animate-pulse rounded-md ${
                c === 0 ? 'w-1/4' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
