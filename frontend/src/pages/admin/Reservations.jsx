import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
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
} from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import toast from 'react-hot-toast';

export const AdminReservations = () => {
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

  useEffect(() => {
    fetchReservations(1, pagination.limit);
  }, [debouncedSearch, statusFilter]);

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
    const text = encodeURIComponent(
      `Halo ${r.guest_name},\nKami dari Manajemen Hotel Celebes Hasanuddin Makassar mengonfirmasi reservasi kamar ${r.room_type} untuk periode ${r.check_in} s/d ${r.check_out}.\nApakah ada permintaan khusus yang perlu kami siapkan?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-red-600" />
          Data Permintaan Reservasi Kamar
        </h2>
        <p className="text-xs text-slate-500">
          Kelola booking kamar yang masuk dari tamu web dan hubungi via WhatsApp untuk konfirmasi.
        </p>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari nama tamu, nomor HP, atau tipe kamar..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">Nama Tamu & HP</th>
                <th className="py-3 px-4">Tipe Kamar</th>
                <th className="py-3 px-4">Periode Menginap</th>
                <th className="py-3 px-4">Jumlah</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi Hubungi</th>
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
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{r.room_type}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div>
                        {new Date(r.check_in).toLocaleDateString('id-ID')} s/d{' '}
                        {new Date(r.check_out).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {r.num_rooms} Kamar • {r.num_guests} Tamu
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat WA</span>
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
    </div>
  );
};
