import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Trophy,
  Search,
  Plus,
  Edit2,
  Trash2,
  Coins,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import toast from 'react-hot-toast';

export const AdminMissions = () => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
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

  const [selectedMission, setSelectedMission] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: 'CORE',
    bonus_points: 5,
    requirement: '',
    recurrence: 'Sekali',
    is_active: 1,
  });

  const fetchMissions = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.MISSIONS.LIST, {
        page,
        limit,
        search: debouncedSearch,
        type: typeFilter,
      });
      if (res.success && res.data) {
        setMissions(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Gagal mengambil data misi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions(1, pagination.limit);
  }, [debouncedSearch, typeFilter]);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      type: 'CORE',
      bonus_points: 5,
      requirement: '',
      recurrence: 'Sekali',
      is_active: 1,
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.bonus_points) {
      toast.error('Judul misi dan bonus poin wajib diisi');
      return;
    }
    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.MISSIONS.CREATE, formData);
      if (res.success) {
        toast.success('Misi baru berhasil ditambahkan');
        setCreateModalOpen(false);
        fetchMissions(1, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menambahkan misi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (mission) => {
    setSelectedMission(mission);
    setFormData({
      title: mission.title,
      type: mission.type,
      bonus_points: mission.bonus_points,
      requirement: mission.requirement,
      recurrence: mission.recurrence,
      is_active: mission.is_active,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMission) return;
    try {
      setSubmitting(true);
      const res = await request.put(
        API_ENDPOINTS.ADMIN.MISSIONS.UPDATE(selectedMission.id),
        formData
      );
      if (res.success) {
        toast.success('Misi berhasil diperbarui');
        setEditModalOpen(false);
        fetchMissions(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal memperbarui misi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (mission) => {
    setSelectedMission(mission);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMission) return;
    try {
      setSubmitting(true);
      const res = await request.delete(API_ENDPOINTS.ADMIN.MISSIONS.DELETE(selectedMission.id));
      if (res.success) {
        toast.success('Misi berhasil dihapus');
        setDeleteDialogOpen(false);
        fetchMissions(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menghapus misi');
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
            <Trophy className="w-5 h-5 text-red-600" />
            Kelola Misi Reward (Core, Monthly & Seasonal)
          </h2>
          <p className="text-xs text-slate-500">
            Daftar 28 misi tantangan Hotel Celebes Hasanuddin untuk memberikan bonus poin ke tamu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-200 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Misi</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari judul misi atau syarat..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Tipe Misi:</span>
          <Select
            className="w-52"
            size="sm"
            options={[
              { value: 'all', label: 'Semua Tipe Misi' },
              { value: 'CORE', label: 'CORE (Misi Utama)' },
              { value: 'MONTHLY', label: 'MONTHLY (Bulanan)' },
              { value: 'SEASONAL', label: 'SEASONAL (Musiman)' },
            ]}
            value={typeFilter}
            onChange={(opt) => setTypeFilter(opt.value)}
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
                <th className="py-3 px-4">Nama Misi</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4">Bonus Poin</th>
                <th className="py-3 px-4">Syarat Penyelesaian</th>
                <th className="py-3 px-4">Perulangan</th>
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
              ) : missions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8">
                    <EmptyState
                      icon={Trophy}
                      title="Tidak Ada Misi"
                      description="Belum ada misi yang cocok dengan filter."
                    />
                  </td>
                </tr>
              ) : (
                missions.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{m.title}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type === 'CORE'
                            ? 'bg-red-100 text-red-700'
                            : m.type === 'MONTHLY'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        <Coins className="w-3.5 h-3.5" />+{m.bonus_points} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{m.requirement}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">{m.recurrence}</td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Misi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(m)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                          title="Hapus Misi"
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
          onPageChange={(p) => fetchMissions(p, pagination.limit)}
          onLimitChange={(l) => fetchMissions(1, l)}
        />
      </div>

      {/* Modal Create Mission */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah Misi Baru"
        subtitle="Buat tantangan loyalty poin baru untuk tamu"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Misi *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Good Reviewer"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Misi *</label>
              <Select
                options={[
                  { value: 'CORE', label: 'CORE (Misi Utama)' },
                  { value: 'MONTHLY', label: 'MONTHLY (Bulanan)' },
                  { value: 'SEASONAL', label: 'SEASONAL (Musiman)' },
                ]}
                value={formData.type}
                onChange={(opt) => setFormData({ ...formData, type: opt.value })}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bonus Poin *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.bonus_points}
                onChange={(e) => setFormData({ ...formData, bonus_points: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Aturan Perulangan
            </label>
            <input
              type="text"
              value={formData.recurrence}
              onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
              placeholder="Contoh: Sekali, Refresh tiap bulan, Sesuai Periode"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Syarat Penyelesaian Misi *
            </label>
            <textarea
              rows={3}
              required
              value={formData.requirement}
              onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              placeholder="Contoh: Memberikan penilaian bintang 5 di Google Review Hotel Celebes"
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
              {submitting ? 'Menyimpan...' : 'Simpan Misi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Mission */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Data Misi"
        subtitle={selectedMission?.title}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Misi *</label>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Misi *</label>
              <Select
                options={[
                  { value: 'CORE', label: 'CORE (Misi Utama)' },
                  { value: 'MONTHLY', label: 'MONTHLY (Bulanan)' },
                  { value: 'SEASONAL', label: 'SEASONAL (Musiman)' },
                ]}
                value={formData.type}
                onChange={(opt) => setFormData({ ...formData, type: opt.value })}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bonus Poin *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.bonus_points}
                onChange={(e) => setFormData({ ...formData, bonus_points: Number(e.target.value) })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Aturan Perulangan
            </label>
            <input
              type="text"
              value={formData.recurrence}
              onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Syarat Penyelesaian Misi *
            </label>
            <textarea
              rows={3}
              required
              value={formData.requirement}
              onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
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
              {submitting ? 'Menyimpan...' : 'Perbarui Misi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Misi"
        message={`Apakah Anda yakin ingin menghapus misi "${selectedMission?.title}"?`}
        confirmText="Ya, Hapus"
        isLoading={submitting}
      />
    </div>
  );
};
