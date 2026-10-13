import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Gift,
  Search,
  Plus,
  Edit2,
  Trash2,
  Coins,
  CheckCircle2,
  XCircle,
  Tag,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import toast from 'react-hot-toast';

export const AdminRewards = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
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

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedReward, setSelectedReward] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'room',
    points_required: 50,
    terms: '',
    stock: -1,
    is_active: 1,
  });

  const fetchRewards = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.REWARDS.LIST, {
        page,
        limit,
        search: debouncedSearch,
        category: categoryFilter,
      });
      if (res.success && res.data) {
        setRewards(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Gagal mengambil data reward');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards(1, pagination.limit);
  }, [debouncedSearch, categoryFilter]);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      category: 'room',
      points_required: 50,
      terms: '',
      stock: -1,
      is_active: 1,
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.points_required) {
      toast.error('Judul reward dan jumlah poin wajib diisi');
      return;
    }
    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.REWARDS.CREATE, formData);
      if (res.success) {
        toast.success('Reward voucher baru berhasil ditambahkan');
        setCreateModalOpen(false);
        fetchRewards(1, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menambahkan reward');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (reward) => {
    setSelectedReward(reward);
    setFormData({
      title: reward.title,
      category: reward.category,
      points_required: reward.points_required,
      terms: reward.terms,
      stock: reward.stock,
      is_active: reward.is_active,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReward) return;
    try {
      setSubmitting(true);
      const res = await request.put(
        API_ENDPOINTS.ADMIN.REWARDS.UPDATE(selectedReward.id),
        formData
      );
      if (res.success) {
        toast.success('Reward voucher berhasil diperbarui');
        setEditModalOpen(false);
        fetchRewards(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal memperbarui reward');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (reward) => {
    setSelectedReward(reward);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedReward) return;
    try {
      setSubmitting(true);
      const res = await request.delete(API_ENDPOINTS.ADMIN.REWARDS.DELETE(selectedReward.id));
      if (res.success) {
        toast.success('Reward berhasil dihapus');
        setDeleteDialogOpen(false);
        fetchRewards(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menghapus reward');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="w-5 h-5 text-red-600" />
            Kelola Katalog Reward Voucher
          </h2>
          <p className="text-xs text-slate-500">
            Daftar 16 reward voucher resmi Hotel Celebes Hasanuddin untuk ditukarkan poin oleh tamu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-200 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Reward</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari judul reward atau ketentuan..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Kategori:</span>
          <Select
            className="w-48"
            size="sm"
            options={[
              { value: 'all', label: 'Semua Kategori' },
              { value: 'room', label: 'Kamar & Menginap' },
              { value: 'fnb', label: 'F&B Restoran' },
              { value: 'drugstore', label: 'Drugstore' },
              { value: 'laundry', label: 'Laundry' },
              { value: 'extra_bed', label: 'Extra Bed' },
            ]}
            value={categoryFilter}
            onChange={(opt) => setCategoryFilter(opt.value)}
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
                <th className="py-3 px-4">Nama Reward Voucher</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Poin Diperlukan</th>
                <th className="py-3 px-4">Ketentuan & Syarat</th>
                <th className="py-3 px-4 text-center">Status</th>
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
              ) : rewards.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8">
                    <EmptyState
                      icon={Gift}
                      title="Tidak Ada Reward"
                      description="Belum ada reward voucher yang cocok dengan filter."
                    />
                  </td>
                </tr>
              ) : (
                rewards.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{r.title}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {r.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                        <Coins className="w-3.5 h-3.5" />
                        {r.points_required} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs">{r.terms}</td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {r.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Reward"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(r)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                          title="Hapus Reward"
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

        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchRewards(p, pagination.limit)}
          onLimitChange={(l) => fetchRewards(1, l)}
        />
      </div>

      {/* Modal Create Reward */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah Reward Voucher"
        subtitle="Buat voucher baru untuk ditukar dengan poin"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Reward *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Free 1 nite Deluxe Room"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori *</label>
              <Select
                options={[
                  { value: 'room', label: 'Kamar & Menginap' },
                  { value: 'fnb', label: 'F&B Restoran' },
                  { value: 'drugstore', label: 'Drugstore' },
                  { value: 'laundry', label: 'Laundry' },
                  { value: 'extra_bed', label: 'Extra Bed' },
                  { value: 'other', label: 'Lainnya' },
                ]}
                value={formData.category}
                onChange={(opt) => setFormData({ ...formData, category: opt.value })}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Poin Diperlukan *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.points_required}
                onChange={(e) => setFormData({ ...formData, points_required: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Syarat & Ketentuan</label>
            <textarea
              rows={3}
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              placeholder="Contoh: Subject to availability, tidak berlaku untuk malam tahun baru"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {submitting ? 'Menyimpan...' : 'Simpan Reward'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Reward */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Reward Voucher"
        subtitle={selectedReward?.title}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Reward *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori *</label>
              <Select
                options={[
                  { value: 'room', label: 'Kamar & Menginap' },
                  { value: 'fnb', label: 'F&B Restoran' },
                  { value: 'drugstore', label: 'Drugstore' },
                  { value: 'laundry', label: 'Laundry' },
                  { value: 'extra_bed', label: 'Extra Bed' },
                  { value: 'other', label: 'Lainnya' },
                ]}
                value={formData.category}
                onChange={(opt) => setFormData({ ...formData, category: opt.value })}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Poin Diperlukan *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.points_required}
                onChange={(e) => setFormData({ ...formData, points_required: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Syarat & Ketentuan</label>
            <textarea
              rows={3}
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span>Aktifkan Reward di Katalog Tamu</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {submitting ? 'Menyimpan...' : 'Perbarui Reward'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Reward"
        message={`Apakah Anda yakin ingin menghapus reward "${selectedReward?.title}"?`}
        confirmText="Ya, Hapus"
        isLoading={submitting}
      />
    </div>
  );
};
