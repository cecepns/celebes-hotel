import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Download,
  Coins,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  QrCode,
  Clock,
  History,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import { exportToExcel } from '@/utils/excel';
import toast from 'react-hot-toast';

export const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Debounce search with 350ms
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 350);
  };

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Active items for forms
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    initial_points: 0,
  });

  // Fetch Members List
  const fetchMembers = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.MEMBERS.LIST, {
        page,
        limit,
        search: debouncedSearch,
        sort_by: sortBy,
        order,
      });
      if (res.success && res.data) {
        setMembers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Gagal mengambil data member');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1, pagination.limit);
  }, [debouncedSearch, sortBy, order]);

  // Handle Export to Excel
  const handleExportExcel = async () => {
    try {
      toast.loading('Menyiapkan file Excel...', { id: 'export-members' });
      const res = await request.get(API_ENDPOINTS.ADMIN.MEMBERS.EXPORT);
      if (res.success && res.data) {
        exportToExcel(res.data, 'data-member-celebes-hotel.xlsx', 'Data Member HCH');
        toast.success('Data member berhasil diekspor ke Excel!', { id: 'export-members' });
      } else {
        toast.error('Tidak ada data member untuk diekspor', { id: 'export-members' });
      }
    } catch (err) {
      toast.error('Gagal mengekspor data ke Excel', { id: 'export-members' });
    }
  };

  // Open Create
  const handleOpenCreate = () => {
    setFormState({
      name: '',
      phone: '',
      email: '',
      password: 'password123',
      initial_points: 0,
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name || !formState.phone) {
      toast.error('Nama dan nomor HP wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.MEMBERS.CREATE, formState);
      if (res.success) {
        toast.success(res.message || 'Member baru berhasil ditambahkan');
        setCreateModalOpen(false);
        fetchMembers(1, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menambahkan member');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (member) => {
    setSelectedMember(member);
    setFormState({
      name: member.name,
      phone: member.phone,
      email: member.email || '',
      password: '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      setSubmitting(true);
      const res = await request.put(
        API_ENDPOINTS.ADMIN.MEMBERS.UPDATE(selectedMember.id),
        formState
      );
      if (res.success) {
        toast.success('Data member berhasil diperbarui');
        setEditModalOpen(false);
        fetchMembers(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal memperbarui member');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Detail
  const handleOpenDetail = async (member) => {
    try {
      toast.loading('Memuat detail member...', { id: 'load-detail' });
      const res = await request.get(API_ENDPOINTS.ADMIN.MEMBERS.DETAIL(member.id));
      if (res.success && res.data) {
        setMemberDetail(res.data);
        setDetailModalOpen(true);
      }
      toast.dismiss('load-detail');
    } catch (err) {
      toast.error('Gagal memuat detail member', { id: 'load-detail' });
    }
  };

  // Open Delete
  const handleOpenDelete = (member) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMember) return;
    try {
      setSubmitting(true);
      const res = await request.delete(API_ENDPOINTS.ADMIN.MEMBERS.DELETE(selectedMember.id));
      if (res.success) {
        toast.success('Member berhasil dihapus');
        setDeleteDialogOpen(false);
        fetchMembers(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menghapus member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            Data Tamu / Member Royalti HCH
          </h2>
          <p className="text-xs text-slate-500">
            Daftar tamu terdaftar, status saldo poin aktif, dan riwayat transaksi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-200 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Member</span>
          </button>
        </div>
      </div>

      {/* Filter & Realtime Search Bar (Debounced 350ms) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari nama, nomor HP, atau kode member..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-bold whitespace-nowrap">Urutkan:</span>
            <Select
              className="w-40"
              size="sm"
              options={[
                { value: 'created_at', label: 'Tanggal Daftar' },
                { value: 'total_points', label: 'Poin Tertinggi' },
                { value: 'name', label: 'Nama (A-Z)' },
              ]}
              value={sortBy}
              onChange={(opt) => setSortBy(opt.value)}
              isSearchable={false}
            />
          </div>

          <Select
            className="w-44"
            size="sm"
            options={[
              { value: 'DESC', label: 'Terbaru / Terbesar' },
              { value: 'ASC', label: 'Terlama / Terkecil' },
            ]}
            value={order}
            onChange={(opt) => setOrder(opt.value)}
            isSearchable={false}
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">Kode Member</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">No. HP / WhatsApp</th>
                <th className="py-3 px-4">Total Poin</th>
                <th className="py-3 px-4">Tgl Bergabung</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-6">
                    <TableSkeleton rows={5} cols={6} />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8">
                    <EmptyState
                      icon={Users}
                      title="Data Member Tidak Ditemukan"
                      description="Tidak ada member yang cocok dengan pencarian Anda."
                    />
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-red-600 whitespace-nowrap">
                      {m.member_code}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{m.name}</div>
                      {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">{m.phone}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                        <Coins className="w-3.5 h-3.5 text-blue-600" />
                        {Number(m.total_points).toLocaleString('id-ID')} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(m)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                          title="Lihat Detail Saldo Poin"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(m)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                          title="Hapus Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Backend Pagination */}
        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchMembers(p, pagination.limit)}
          onLimitChange={(l) => fetchMembers(1, l)}
        />
      </div>

      {/* Modal Create Member */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah Member Baru"
        subtitle="Daftarkan tamu ke program Royalti Reward HCH"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              placeholder="Masukkan nama tamu"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP *</label>
            <input
              type="tel"
              required
              value={formState.phone}
              onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
              placeholder="Contoh: 081212127688"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email (Opsional)</label>
            <input
              type="email"
              value={formState.email}
              onChange={(e) => setFormState({ ...formState, email: e.target.value })}
              placeholder="email@tamu.com"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Awal</label>
            <input
              type="text"
              value={formState.password}
              onChange={(e) => setFormState({ ...formState, password: e.target.value })}
              placeholder="Default: password123"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bonus Poin Awal (Opsional)
            </label>
            <input
              type="number"
              min="0"
              value={formState.initial_points}
              onChange={(e) => setFormState({ ...formState, initial_points: Number(e.target.value) })}
              placeholder="0"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 transition disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Member */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Data Member"
        subtitle={`Perbarui data ${selectedMember?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP *</label>
            <input
              type="tel"
              required
              value={formState.phone}
              onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={formState.email}
              onChange={(e) => setFormState({ ...formState, email: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reset Password (Kosongkan jika tidak diganti)
            </label>
            <input
              type="password"
              value={formState.password}
              onChange={(e) => setFormState({ ...formState, password: e.target.value })}
              placeholder="Isi untuk ubah password"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 transition disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Perbarui Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Member (Shows Info & FIFO Ledger) */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Detail Member & Saldo Poin"
        subtitle={memberDetail?.name}
        maxWidth="max-w-2xl"
      >
        {memberDetail && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="p-4 bg-slate-900 rounded-2xl text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-300 font-mono">
                  {memberDetail.member_code}
                </div>
                <h3 className="text-base font-extrabold mt-0.5">{memberDetail.name}</h3>
                <p className="text-xs text-slate-400">{memberDetail.phone} • {memberDetail.email || 'Tanpa Email'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Poin Aktif</span>
                <div className="text-2xl font-black text-amber-400 flex items-center justify-end gap-1">
                  <Coins className="w-5 h-5" />
                  {Number(memberDetail.total_points).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* FIFO Ledger Batches */}
            <div>
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-red-600" />
                Daftar Perolehan & Masa Aktif Poin (365 Hari)
              </h4>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {!memberDetail.ledgers || memberDetail.ledgers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Belum ada ledger poin.</p>
                ) : (
                  memberDetail.ledgers.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{l.description}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Didapat: {new Date(l.earned_date).toLocaleDateString('id-ID')} • Expire:{' '}
                          {new Date(l.expiry_date).toLocaleDateString('id-ID')} ({l.days_left} hari lagi)
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-emerald-600">+{l.points_earned} pts</span>
                        <div className="text-[10px] text-slate-600 font-semibold">
                          Sisa: {l.points_remaining}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Member Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Member"
        message={`Apakah Anda yakin ingin menghapus data member "${selectedMember?.name}"? Semua riwayat poin dan transaksi member ini akan ikut terhapus.`}
        confirmText="Ya, Hapus Member"
        isLoading={submitting}
      />
    </div>
  );
};
