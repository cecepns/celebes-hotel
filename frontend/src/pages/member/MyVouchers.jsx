import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Ticket,
  Calendar,
  CheckCircle2,
  Clock,
  QrCode,
  AlertCircle,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import toast from 'react-hot-toast';

export const MyVouchers = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal QR inspection
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const fetchVouchers = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.MEMBER.MY_VOUCHERS, {
        status: statusFilter,
      });
      if (res.success && res.data) {
        setVouchers(res.data);
      }
    } catch (err) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [statusFilter, isAuthenticated]);

  const handleShowQR = (voucher) => {
    setSelectedVoucher(voucher);
    setQrModalOpen(true);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Kode voucher berhasil disalin!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Header */}
      <header className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-30">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-extrabold text-slate-800">Voucher Saya</h1>
          <p className="text-[10px] text-slate-400">Tunjukkan Kode / QR ke Resepsionis</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'active', label: 'Aktif' },
            { id: 'used', label: 'Sudah Dipakai' },
            { id: 'expired', label: 'Expired' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vouchers List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" count={3} />
          </div>
        ) : vouchers.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Belum Ada Voucher"
            description="Anda belum memiliki voucher pada kategori ini. Tukarkan poin Anda di Katalog Reward."
            action={
              <button
                onClick={() => navigate('/rewards')}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow hover:bg-red-700 transition"
              >
                Lihat Katalog Reward
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {vouchers.map((vch) => {
              const isActive = vch.current_status === 'active';
              const isUsed = vch.current_status === 'used';
              const isExpired = vch.current_status === 'expired';

              return (
                <div
                  key={vch.id}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    isActive
                      ? 'border-red-200 shadow-sm'
                      : 'border-slate-200 opacity-70 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : isUsed
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isActive ? 'Siap Digunakan' : isUsed ? 'Sudah Digunakan' : 'Expired'}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {vch.reward_title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{vch.terms}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleShowQR(vch)}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition shrink-0"
                    >
                      <QrCode className="w-5 h-5 text-red-600" />
                    </button>
                  </div>

                  {/* Voucher Code Strip */}
                  <div className="mt-3 py-2 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                        Kode Voucher
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                        {vch.voucher_code}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(vch.voucher_code)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Salin
                    </button>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      Berlaku hingga:{' '}
                      <strong className="text-slate-600">
                        {new Date(vch.valid_until).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </strong>
                    </span>
                    {isActive && (
                      <button
                        onClick={() => handleShowQR(vch)}
                        className="text-red-600 font-bold hover:underline"
                      >
                        Buka QR &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* QR Code Presentation Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="QR Code Voucher"
        subtitle="Tunjukkan ke staf hotel saat check-in atau order"
      >
        {selectedVoucher && (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
              <QRCodeSVG
                value={selectedVoucher.voucher_code}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Kode Voucher
              </div>
              <div className="font-mono text-xl font-extrabold text-slate-900 tracking-widest mt-1">
                {selectedVoucher.voucher_code}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left w-full space-y-1">
              <p className="text-xs font-bold text-slate-800">{selectedVoucher.reward_title}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{selectedVoucher.terms}</p>
              <p className="text-[10px] text-amber-700 font-semibold pt-1">
                Masa Berlaku: {new Date(selectedVoucher.valid_until).toLocaleDateString('id-ID', { dateStyle: 'long' })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCode(selectedVoucher.voucher_code)}
              className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 hover:bg-red-700 transition"
            >
              Salin Kode Voucher
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
