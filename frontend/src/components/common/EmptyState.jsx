import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Tidak Ada Data',
  description = 'Belum ada data yang tersedia untuk ditampilkan.',
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 my-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
        <Icon className="h-7 w-7 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
