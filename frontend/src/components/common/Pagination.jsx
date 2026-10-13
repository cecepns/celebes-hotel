import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from '@/components/common/Select';

export const Pagination = ({
  pagination = { page: 1, limit: 10, total: 0, totalPages: 1 },
  onPageChange,
  onLimitChange,
  limits = [10, 25, 50, 100],
}) => {
  const { page, limit, total, totalPages } = pagination;

  // Calculate start & end records count
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 3) {
        start = 2;
        end = 4;
      } else if (page >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-slate-100 rounded-b-2xl">
      {/* Information & Limit Selector */}
      <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500">
        <span>
          Menampilkan <span className="font-semibold text-slate-800">{startItem}</span> -{' '}
          <span className="font-semibold text-slate-800">{endItem}</span> dari{' '}
          <span className="font-semibold text-slate-800">{total}</span> data
        </span>
        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">Baris:</span>
            <Select
              className="w-20"
              size="sm"
              options={limits.map((l) => ({ value: l, label: String(l) }))}
              value={limit}
              onChange={(opt) => onLimitChange(Number(opt.value))}
              isSearchable={false}
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-slate-400 text-sm">
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-lg transition ${
                  p === page
                    ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                    : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="Halaman Selanjutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
