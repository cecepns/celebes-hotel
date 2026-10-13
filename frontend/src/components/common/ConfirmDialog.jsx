import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Hapus',
  message = 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.',
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  isLoading = false,
  isDanger = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-md border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
