import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { useAuth } from '@/context/AuthContext';
import {
  CalendarDays,
  Search,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Bed,
  Users,
  Calendar,
  CalendarX,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Percent,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import toast from 'react-hot-toast';

export const AdminReservations = () => {
  const { isSuperAdmin } = useAuth();
  const [reservations, setReservations] = useState([]);
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

  // Blackout / Closed Dates State & Modal
  const [closedDatesModalOpen, setClosedDatesModalOpen] = useState(false);
  const [closedDates, setClosedDates] = useState([]);
  const [closedDatesLoading, setClosedDatesLoading] = useState(false);
  const [newClosedDate, setNewClosedDate] = useState({
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [addingClosedDate, setAddingClosedDate] = useState(false);

  // Cashless Bank Account Settings for WhatsApp Draft
  const [bankSettings, setBankSettings] = useState({
    payment_bank_name: 'Bank BCA',
    payment_bank_account: '123-456-7890',
    payment_account_name: 'Hotel Celebes Hasanuddin',
  });

  // Helper format DD-MM-YYYY (e.g. 20-11-2026)
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '-';
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return clean;
  };

  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 350);
  };

  const fetchReservations = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.RESERVATIONS.LIST, {
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
      });
      if (res.success && res.data) {
        setReservations(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Gagal mengambil data reservasi');
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedDates = async () => {
    try {
      setClosedDatesLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.CLOSED_DATES.LIST);
      if (res.success && res.data) {
        setClosedDates(res.data);
      }
    } catch (err) {
      console.warn('Failed to load closed dates:', err);
    } finally {
      setClosedDatesLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations(1, pagination.limit);
    // Fetch public bank settings for WhatsApp draft
    request.get(API_ENDPOINTS.SETTINGS.PUBLIC).then((res) => {
      if (res.success && res.data) {
        setBankSettings({
          payment_bank_name: res.data.payment_bank_name || 'Bank BCA',
          payment_bank_account: res.data.payment_bank_account || '123-456-7890',
          payment_account_name: res.data.payment_account_name || 'Hotel Celebes Hasanuddin',
        });
      }
    }).catch(() => {});
  }, [debouncedSearch, statusFilter]);

  const handleOpenClosedDates = () => {
    fetchClosedDates();
    setNewClosedDate({
      start_date: '',
      end_date: '',
      reason: '',
    });
    setClosedDatesModalOpen(true);
  };

  const handleAddClosedDate = async (e) => {
    e.preventDefault();
    if (!newClosedDate.reason || !newClosedDate.start_date || !newClosedDate.end_date) {
      toast.error('Harap isi alasan, tanggal mulai, dan tanggal selesai');
      return;
    }

    try {
      setAddingClosedDate(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.CLOSED_DATES.CREATE, {
        start_date: newClosedDate.start_date,
        end_date: newClosedDate.end_date,
        reason: newClosedDate.reason,
        is_closed: 1,
      });
      if (res.success) {
        toast.success(res.message || 'Tanggal reservasi berhasil ditutup');
        setNewClosedDate({ start_date: '', end_date: '', reason: '' });
        fetchClosedDates();
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menutup tanggal reservasi');
    } finally {
      setAddingClosedDate(false);
    }
  };

  const handleToggleClosedDate = async (id) => {
    try {
      const res = await request.put(API_ENDPOINTS.ADMIN.CLOSED_DATES.TOGGLE(id));
      if (res.success) {
        toast.success(res.message);
        fetchClosedDates();
      }
    } catch (err) {
      toast.error('Gagal mengubah status tanggal');
    }
  };

  const handleDeleteClosedDate = async (id) => {
    try {
      const res = await request.delete(API_ENDPOINTS.ADMIN.CLOSED_DATES.DELETE(id));
      if (res.success) {
        toast.success(res.message || 'Tanggal reservasi telah dibuka kembali');
        fetchClosedDates();
      }
    } catch (err) {
      toast.error('Gagal menghapus penutupan tanggal');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await request.put(API_ENDPOINTS.ADMIN.RESERVATIONS.UPDATE(id), { status });
      if (res.success) {
        toast.success(`Status reservasi diubah menjadi "${status}"`);
        fetchReservations(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error('Gagal memperbarui status reservasi');
    }
  };

  const handleChatGuest = (r) => {
    const cleanPhone = r.guest_phone.replace(/^0/, '62').replace(/[^\d]/g, '');
    const priceText = r.total_price ? `Rp ${Number(r.total_price).toLocaleString('id-ID')}` : '-';
    const discountText = r.discount_percent > 0 ? ` (Sudah termasuk Diskon Member HCH ${r.discount_percent}%)` : '';
    const checkInFormatted = formatDateDMY(r.check_in);
    const checkOutFormatted = formatDateDMY(r.check_out);
    const bankText = `${bankSettings.payment_bank_name || 'Bank BCA'}: ${bankSettings.payment_bank_account || '123-456-7890'} a/n ${bankSettings.payment_account_name || 'Hotel Celebes Hasanuddin'}`;

    const text = encodeURIComponent(
      `Halo ${r.guest_name},\n` +
      `Kami dari Resepsionis Hotel Celebes Hasanuddin Makassar mengonfirmasi reservasi kamar ${r.room_type} untuk periode ${checkInFormatted} s/d ${checkOutFormatted} via aplikasi HCH.\n\n` +
      `Detail Pemesanan:\n` +
      `- Jumlah Kamar: ${r.num_rooms}\n` +
      `- Jumlah Tamu: ${r.num_guests}\n` +
      `- Total Pembayaran Cashless: ${priceText}${discountText}\n\n` +
      `Untuk mengonfirmasi dan mengamankan kamar Anda, mohon lakukan pelunasan cashless via transfer sebelum check-in ke rekening resmi kami:\n` +
      `${bankText}\n\n` +
      `Terima kasih atas kepercayaannya!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-red-600" />
            Data Permintaan Reservasi Kamar
          </h2>
          <p className="text-xs text-slate-500">
            Kelola booking kamar yang masuk dari tamu aplikasi HCH dan hubungi via WhatsApp untuk konfirmasi pelunasan cashless.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenClosedDates}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <CalendarX className="w-4 h-4 text-amber-400" />
          <span>Buka / Tutup Tanggal Reservasi</span>
        </button>
      </div>

      {/* Banner Panduan Blokir Tanggal Reservasi */}
      <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
            <CalendarX className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Lokasi Blokir Tanggal Reservasi (Blackout Dates)
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-extrabold text-[10px]">
                Fitur Aktif
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Ingin menutup/memblokir tanggal reservasi (misal: <strong>Malam Tahun Baru</strong>, renovasi, atau belum ada harga resmi)? Klik tombol di samping untuk menambah atau menghapus periode tanggal tertutup.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenClosedDates}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-2 shrink-0 self-start md:self-auto active:scale-95"
        >
          <CalendarX className="w-4 h-4 text-amber-400" />
          <span>Kelola Tanggal Tertutup ➔</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari nama tamu, nomor HP, atau tipe kamar..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</span>
          <Select
            className="w-56"
            size="sm"
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'inquiry', label: 'Menunggu Konfirmasi (Inquiry)' },
              { value: 'confirmed', label: 'Dikonfirmasi (Confirmed)' },
              { value: 'cancelled', label: 'Dibatalkan (Cancelled)' },
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
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">Nama Tamu & HP</th>
                <th className="py-3 px-4">Tipe Kamar</th>
                <th className="py-3 px-4">Periode Menginap</th>
                <th className="py-3 px-4">Harga & Diskon HCH</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi Hubungi (Cashless)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-6">
                    <TableSkeleton rows={5} cols={6} />
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8">
                    <EmptyState
                      icon={CalendarDays}
                      title="Tidak Ada Reservasi"
                      description="Belum ada data reservasi kamar pada filter ini."
                    />
                  </td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{r.guest_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.guest_phone}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[9px] border border-red-200">
                        {r.source === 'hch_app' ? 'Aplikasi HCH Member' : 'Web Booking'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{r.room_type}</div>
                      <div className="text-[10px] text-slate-400">
                        {r.num_rooms} Kamar • {r.num_guests} Tamu
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        {formatDateDMY(r.check_in)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        s/d {formatDateDMY(r.check_out)}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.total_price ? (
                        <div>
                          <div className="font-bold text-slate-900">
                            Rp {Number(r.total_price).toLocaleString('id-ID')}
                          </div>
                          {Number(r.discount_percent) > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <Percent className="w-3 h-3" />
                              Hemat {r.discount_percent}% (Rp {Number(r.discount_amount || 0).toLocaleString('id-ID')})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Konfirmasi WA</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap min-w-[130px]">
                      <Select
                        size="sm"
                        className="w-32 mx-auto text-left"
                        options={[
                          { value: 'inquiry', label: 'Inquiry' },
                          { value: 'confirmed', label: 'Confirmed' },
                          { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        value={r.status}
                        onChange={(opt) => handleUpdateStatus(r.id, opt.value)}
                        isSearchable={false}
                      />
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleChatGuest(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat WA & Minta Pelunasan</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchReservations(p, pagination.limit)}
          onLimitChange={(l) => fetchReservations(1, l)}
        />
      </div>

      {/* Modal Buka / Tutup Tanggal Reservasi (Blackout Dates) */}
      <Modal
        isOpen={closedDatesModalOpen}
        onClose={() => setClosedDatesModalOpen(false)}
        title="Buka / Tutup Tanggal Reservasi (Blackout Dates)"
        subtitle="Kunci tanggal tertentu agar tidak dapat dibooking oleh tamu (misal: Malam Tahun Baru / High Season)"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Form Tutup Tanggal Baru */}
          <form onSubmit={handleAddClosedDate} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-red-600" />
              Tutup Periode Tanggal Baru
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alasan / Nama Acara Penutupan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Malam Tahun Baru 2027 (Belum ada harga resmi)"
                  value={newClosedDate.reason}
                  onChange={(e) => setNewClosedDate({ ...newClosedDate, reason: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mulai Ditutup (Check-in) *
                </label>
                <input
                  type="date"
                  required
                  value={newClosedDate.start_date}
                  onChange={(e) => setNewClosedDate({ ...newClosedDate, start_date: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Selesai Ditutup (Check-out) *
                </label>
                <input
                  type="date"
                  required
                  value={newClosedDate.end_date}
                  onChange={(e) => setNewClosedDate({ ...newClosedDate, end_date: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingClosedDate}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <CalendarX className="w-3.5 h-3.5" />
                  <span>{addingClosedDate ? 'Menyimpan...' : 'Kunci Tanggal'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* List Blackout Dates */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800">
              Daftar Tanggal Yang Saat Ini Ditutup:
            </h4>

            {closedDatesLoading ? (
              <div className="py-4 text-center text-xs text-slate-400">Memuat data tanggal...</div>
            ) : closedDates.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-200">
                Belum ada tanggal yang ditutup. Semua tanggal dapat dibooking secara normal.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {closedDates.map((item) => (
                  <div key={item.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CalendarX className="w-3.5 h-3.5 text-red-600" />
                        <span>{item.reason}</span>
                        {!item.is_closed && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            (Dibuka Kembali)
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Periode: {new Date(item.start_date).toLocaleDateString('id-ID')} s/d {new Date(item.end_date).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleClosedDate(item.id)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          item.is_closed
                            ? 'text-red-700 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                        title={item.is_closed ? 'Buka tanggal ini' : 'Tutup kembali tanggal ini'}
                      >
                        {item.is_closed ? <ToggleRight className="w-4 h-4 text-red-600" /> : <ToggleLeft className="w-4 h-4 text-emerald-600" />}
                        <span>{item.is_closed ? 'Tutup Aktif' : 'Terbuka'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClosedDate(item.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                        title="Hapus penutupan tanggal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setClosedDatesModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Tutup Modal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
