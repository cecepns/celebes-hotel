import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  TicketCheck,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  Tag,
  User,
  Calendar,
  AlertCircle,
  Camera,
  Coins,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import { VoucherScannerModal } from '@/components/admin/VoucherScannerModal';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export const AdminRedemptions = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 350);
  };

  // Direct code verify & Scanner input
  const [inputCode, setInputCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [targetVoucherCode, setTargetVoucherCode] = useState('');
  const [targetVoucher, setTargetVoucher] = useState(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVouchers = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.VOUCHERS.LIST, {
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
      });
      if (res.success && res.data) {
        setVouchers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Gagal mengambil data voucher');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers(1, pagination.limit);
  }, [debouncedSearch, statusFilter]);

  // Inspect & Verify Voucher Prompt
  const handleInspectAndVerify = async (code, defaultNote = '') => {
    const cleanCode = code?.trim().toUpperCase();
    if (!cleanCode) return;

    setTargetVoucherCode(cleanCode);
    setVerifyNotes(defaultNote || 'Diverifikasi oleh staf meja depan Hotel Celebes');
    setTargetVoucher(null);
    setVerifyModalOpen(true);

    try {
      setCheckingVoucher(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.VOUCHERS.CHECK(cleanCode));
      if (res.success && res.data) {
        setTargetVoucher(res.data);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Kode voucher tidak ditemukan dalam sistem');
    } finally {
      setCheckingVoucher(false);
    }
  };

  // QR Scan Callback
  const handleScanSuccess = (decodedCode) => {
    setScannerOpen(false);
    toast.success(`QR Terdeteksi: ${decodedCode}`);
    handleInspectAndVerify(decodedCode, 'Diverifikasi via Scan Kamera QR');
  };

  // Confirm Redeem
  const handleConfirmVerify = async () => {
    if (!targetVoucherCode) return;
    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.VOUCHERS.VERIFY, {
        voucher_code: targetVoucherCode,
        used_notes: verifyNotes,
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
        toast.success(res.message || 'Voucher berhasil diverifikasi & digunakan!');
        setVerifyModalOpen(false);
        setInputCode('');
        fetchVouchers(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal verifikasi voucher');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <TicketCheck className="w-5 h-5 text-red-600" />
          Verifikasi & Riwayat Klaim Voucher Tamu
        </h2>
        <p className="text-xs text-slate-500">
          Scan QR voucher tamu atau masukkan kode voucher saat check-in, makan di resto, atau laundry.
        </p>
      </div>

      {/* Quick Verification & QR Scan Desk Box */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 rounded-2xl text-white shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Kasir / Resepsionis Desk
          </span>
          <h3 className="text-base font-extrabold mt-0.5">Verifikasi Voucher Tamu</h3>
          <p className="text-xs text-slate-300 mt-1">
            Gunakan kamera untuk scan QR code atau ketik kode voucher untuk memvalidasi penggunaan reward.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Scan QR Button */}
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/40 transition flex items-center gap-2 whitespace-nowrap active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR Voucher</span>
          </button>

          {/* Manual Code Input & Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="HCH-VCH-XXXXXX"
              className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              disabled={!inputCode.trim()}
              onClick={() => handleInspectAndVerify(inputCode.trim())}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md shadow-red-900/40 transition whitespace-nowrap"
            >
              Cek / Verifikasi
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari kode voucher, nama tamu, atau reward..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</span>
          <Select
            className="w-48"
            size="sm"
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'active', label: 'Aktif (Siap Pakai)' },
              { value: 'used', label: 'Sudah Digunakan' },
              { value: 'expired', label: 'Expired' },
            ]}
            value={statusFilter}
            onChange={(opt) => setStatusFilter(opt.value)}
            isSearchable={false}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Kode Voucher</th>
                <th className="py-3 px-4">Nama Tamu & HP</th>
                <th className="py-3 px-4">Reward Yang Diklaim</th>
                <th className="py-3 px-4">Poin Terpotong</th>
                <th className="py-3 px-4">Masa Berlaku</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-6">
                    <TableSkeleton rows={5} cols={7} />
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8">
                    <EmptyState
                      icon={TicketCheck}
                      title="Tidak Ada Voucher"
                      description="Belum ada catatan voucher klaim yang cocok dengan filter pencarian."
                    />
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const isActive = v.status === 'active';
                  const isUsed = v.status === 'used';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {v.voucher_code}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{v.member_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {v.member_code} • {v.member_phone}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {v.reward_title}
                      </td>
                      <td className="py-3 px-4 font-bold text-red-600 whitespace-nowrap">-{v.points_used} pts</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(v.valid_until).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : isUsed
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {v.status === 'active' ? 'Aktif' : v.status === 'used' ? 'Digunakan' : 'Expired'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => handleInspectAndVerify(v.voucher_code)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                          >
                            Tandai Digunakan
                          </button>
                        ) : isUsed ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Digunakan ({new Date(v.used_at).toLocaleDateString('id-ID')})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Expired</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchVouchers(p, pagination.limit)}
          onLimitChange={(l) => fetchVouchers(1, l)}
        />
      </div>

      {/* Verify & Inspect Detail Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Verifikasi Voucher Tamu"
        subtitle={`Kode: ${targetVoucherCode}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {checkingVoucher ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-2">
              <div className="h-6 w-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Memeriksa keabsahan kode voucher di database...</p>
            </div>
          ) : targetVoucher ? (
            <div className="space-y-3">
              {/* Voucher Detail Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                    {targetVoucher.voucher_code}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      targetVoucher.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : targetVoucher.status === 'used'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    {targetVoucher.status === 'active'
                      ? '✓ Siap Digunakan'
                      : targetVoucher.status === 'used'
                      ? 'Sudah Digunakan'
                      : 'Expired'}
                  </span>
                </div>

                <div className="border-t border-slate-200/80 pt-2.5 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Pemilik Voucher:</span>
                    <strong className="text-slate-800">
                      {targetVoucher.member_name} ({targetVoucher.member_code})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>No. Telepon:</span>
                    <span className="text-slate-700">{targetVoucher.member_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reward Voucher:</span>
                    <strong className="text-red-600">{targetVoucher.reward_title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Poin Terpotong:</span>
                    <span className="font-bold text-slate-800">{targetVoucher.points_used} Pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Berlaku Sampai:</span>
                    <span className="text-slate-700">
                      {new Date(targetVoucher.valid_until).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Warning if Already Used */}
              {targetVoucher.status === 'used' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">Voucher Tidak Dapat Dipakai Lagi!</strong>
                    <span>
                      Voucher ini sudah pernah diverifikasi pada{' '}
                      {new Date(targetVoucher.used_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      {targetVoucher.used_notes ? ` (Catatan: ${targetVoucher.used_notes})` : ''}.
                    </span>
                  </div>
                </div>
              )}

              {/* Input Notes (only if active) */}
              {targetVoucher.status === 'active' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Penggunaan (Resepsionis / Kasir)
                  </label>
                  <textarea
                    rows={2}
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    placeholder="Contoh: Digunakan untuk diskon resto Bill #108 atau check-in kamar"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Kode voucher {targetVoucherCode} tidak ditemukan di sistem.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setVerifyModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              {targetVoucher?.status === 'active' ? 'Batal' : 'Tutup'}
            </button>
            {targetVoucher?.status === 'active' && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmVerify}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? 'Memproses...' : 'Terapkan & Gunakan Voucher'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* QR Code Scanner Camera Modal */}
      <VoucherScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
