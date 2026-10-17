import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Megaphone,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Filter,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import toast from 'react-hot-toast';

export const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [togglingId, setTogglingId] = useState(null);

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

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const initialForm = {
    title: '',
    content: '',
    type: 'promo',
    badge: 'Info Promo',
    link_url: '',
    link_text: '',
    is_active: 1,
    start_date: '',
    end_date: '',
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchAnnouncements = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.ANNOUNCEMENTS.LIST, {
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
      });
      if (res.success && res.data) {
        setAnnouncements(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      toast.error('Gagal mengambil data pengumuman');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements(1, pagination.limit);
  }, [debouncedSearch, statusFilter]);

  // Handle Quick Toggle Active / Nonaktif
  const handleToggleActive = async (item) => {
    try {
      setTogglingId(item.id);
      const res = await request.put(API_ENDPOINTS.ADMIN.ANNOUNCEMENTS.TOGGLE(item.id));
      if (res.success) {
        toast.success(res.message);
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, is_active: res.data?.is_active ?? (1 - a.is_active) } : a))
        );
      } else {
        toast.error(res.message || 'Gagal mengubah status pengumuman');
      }
    } catch (err) {
      toast.error('Gagal mengubah status pengumuman');
    } finally {
      setTogglingId(null);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData(initialForm);
    setCreateModalOpen(true);
  };

  // Submit Create Announcement
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Judul dan isi pengumuman wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.ANNOUNCEMENTS.CREATE, formData);
      if (res.success) {
        toast.success(res.message || 'Pengumuman berhasil diterbitkan!');
        setCreateModalOpen(false);
        fetchAnnouncements(1, pagination.limit);
      } else {
        toast.error(res.message || 'Gagal menyimpan pengumuman');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menyimpan pengumuman');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setSelectedAnnouncement(item);
    setFormData({
      title: item.title || '',
      content: item.content || '',
      type: item.type || 'info',
      badge: item.badge || '',
      link_url: item.link_url || '',
      link_text: item.link_text || '',
      is_active: item.is_active ? 1 : 0,
      start_date: item.start_date ? String(item.start_date).slice(0, 10) : '',
      end_date: item.end_date ? String(item.end_date).slice(0, 10) : '',
    });
    setEditModalOpen(true);
  };

  // Submit Edit Announcement
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Judul dan isi pengumuman wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const res = await request.put(
        API_ENDPOINTS.ADMIN.ANNOUNCEMENTS.UPDATE(selectedAnnouncement.id),
        formData
      );
      if (res.success) {
        toast.success(res.message || 'Pengumuman berhasil diperbarui!');
        setEditModalOpen(false);
        fetchAnnouncements(pagination.page, pagination.limit);
      } else {
        toast.error(res.message || 'Gagal memperbarui pengumuman');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal memperbarui pengumuman');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (item) => {
    setSelectedAnnouncement(item);
    setDeleteDialogOpen(true);
  };

  // Submit Delete Announcement
  const handleConfirmDelete = async () => {
    if (!selectedAnnouncement) return;
    try {
      setDeletingLoading(true);
      const res = await request.delete(
        API_ENDPOINTS.ADMIN.ANNOUNCEMENTS.DELETE(selectedAnnouncement.id)
      );
      if (res.success) {
        toast.success(res.message || 'Pengumuman berhasil dihapus');
        setDeleteDialogOpen(false);
        fetchAnnouncements(pagination.page, pagination.limit);
      } else {
        toast.error(res.message || 'Gagal menghapus pengumuman');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menghapus pengumuman');
    } finally {
      setDeletingLoading(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (item) => {
    setSelectedAnnouncement(item);
    setPreviewModalOpen(true);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'promo':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Promo / Diskon',
          icon: Sparkles,
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Pemberitahuan',
          icon: AlertTriangle,
        };
      case 'urgent':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Penting / Urgent',
          icon: AlertCircle,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Informasi',
          icon: Info,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-red-600" />
            Kelola Fitur Pengumuman
          </h2>
          <p className="text-xs text-slate-500">
            Terbitkan informasi penting, promo diskon kamar, dan broadcast pemberitahuan yang muncul di semua aplikasi user.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari judul, kata kunci isi, atau badge pengumuman..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <Select
            size="sm"
            className="w-36 text-xs"
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'active', label: 'Hanya Aktif' },
              { value: 'inactive', label: 'Hanya Nonaktif' },
            ]}
            value={statusFilter}
            onChange={(opt) => setStatusFilter(opt.value)}
            isSearchable={false}
          />
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-3.5 px-4">Pengumuman</th>
                <th className="py-3.5 px-4">Kategori & Badge</th>
                <th className="py-3.5 px-4">Cuplikan Isi</th>
                <th className="py-3.5 px-4">Tautan Aksi</th>
                <th className="py-3.5 px-4 text-center">Status Tayang</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12">
                    <EmptyState
                      icon={Megaphone}
                      title="Belum ada pengumuman"
                      description={
                        search || statusFilter !== 'all'
                          ? 'Tidak ada pengumuman yang sesuai dengan filter pencarian Anda.'
                          : 'Klik tombol "Buat Pengumuman Baru" untuk mempublikasikan pengumuman ke seluruh user.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                announcements.map((item) => {
                  const typeInfo = getTypeBadge(item.type);
                  const TypeIcon = typeInfo.icon;
                  const isTogglingThis = togglingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Judul */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{item.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            Dibuat: {new Date(item.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Tipe & Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.bg}`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            <span>{typeInfo.label}</span>
                          </span>
                          {item.badge && (
                            <span className="text-[9.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Snippet Isi */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 text-xs leading-relaxed">
                          {item.content}
                        </p>
                      </td>

                      {/* Link Aksi */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.link_url ? (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-bold">
                            <ExternalLink className="w-3 h-3" />
                            <span className="max-w-[120px] truncate">
                              {item.link_text || item.link_url}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status Aktif & Quick Toggle */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={isTogglingThis}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          } ${isTogglingThis ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={item.is_active ? 'Klik untuk Nonaktifkan' : 'Klik untuk Aktifkan'}
                        >
                          {item.is_active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Aktif (Tayang)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(item)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Pratinjau Tampilan User"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Ubah Pengumuman"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Hapus Pengumuman"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
          onPageChange={(p) => fetchAnnouncements(p, pagination.limit)}
          onLimitChange={(l) => fetchAnnouncements(1, l)}
        />
      </div>

      {/* MODAL 1: CREATE ANNOUNCEMENT */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Buat Pengumuman Baru"
        subtitle="Pengumuman aktif akan langsung tampil di beranda aplikasi seluruh user / member"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Pengumuman *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Promo Diskon 10% Khusus Reservasi Aplikasi HCH"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Pengumuman *
              </label>
              <Select
                size="md"
                options={[
                  { value: 'promo', label: 'Promo / Diskon (Hijau)' },
                  { value: 'info', label: 'Informasi Umum (Biru)' },
                  { value: 'warning', label: 'Pemberitahuan / Perhatian (Kuning)' },
                  { value: 'urgent', label: 'Penting / Urgent (Merah)' },
                ]}
                value={formData.type}
                onChange={(opt) => setFormData({ ...formData, type: opt.value })}
                isSearchable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teks Badge (Label Singkat)
              </label>
              <input
                type="text"
                placeholder="Contoh: Promo Spesial / Info Penting"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Isi Lengkap Pengumuman *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Tuliskan isi pengumuman secara jelas untuk dibaca oleh tamu..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tautan Aksi (Link URL)
              </label>
              <input
                type="text"
                placeholder="Contoh: /reservation atau https://..."
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Gunakan <strong>/reservation</strong> untuk langsung membuka halaman reservasi kamar.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teks Tombol Aksi
              </label>
              <input
                type="text"
                placeholder="Contoh: Pesan Kamar Sekarang"
                value={formData.link_text}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Status Publikasi</span>
              <span className="text-[11px] text-slate-500">
                {formData.is_active
                  ? 'Pengumuman akan langsung aktif & muncul ke seluruh user'
                  : 'Pengumuman tersimpan sebagai draf (tidak tampil)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: formData.is_active ? 0 : 1 })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                formData.is_active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {formData.is_active ? 'Status: Aktif' : 'Status: Nonaktif'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>{submitting ? 'Menerbitkan...' : 'Terbitkan Pengumuman'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT ANNOUNCEMENT */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Ubah Data Pengumuman"
        subtitle={`ID: #${selectedAnnouncement?.id} • Perbarui konten atau ubah status tayang`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Pengumuman *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Pengumuman *
              </label>
              <Select
                size="md"
                options={[
                  { value: 'promo', label: 'Promo / Diskon (Hijau)' },
                  { value: 'info', label: 'Informasi Umum (Biru)' },
                  { value: 'warning', label: 'Pemberitahuan / Perhatian (Kuning)' },
                  { value: 'urgent', label: 'Penting / Urgent (Merah)' },
                ]}
                value={formData.type}
                onChange={(opt) => setFormData({ ...formData, type: opt.value })}
                isSearchable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teks Badge (Label Singkat)
              </label>
              <input
                type="text"
                placeholder="Contoh: Promo Spesial / Info Penting"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Isi Lengkap Pengumuman *
            </label>
            <textarea
              required
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tautan Aksi (Link URL)
              </label>
              <input
                type="text"
                placeholder="Contoh: /reservation atau https://..."
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teks Tombol Aksi
              </label>
              <input
                type="text"
                placeholder="Contoh: Pesan Kamar Sekarang"
                value={formData.link_text}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Status Publikasi</span>
              <span className="text-[11px] text-slate-500">
                {formData.is_active
                  ? 'Pengumuman ini aktif & tampil ke seluruh user'
                  : 'Pengumuman dinonaktifkan (disembunyikan dari user)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: formData.is_active ? 0 : 1 })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                formData.is_active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {formData.is_active ? 'Status: Aktif' : 'Status: Nonaktif'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: PREVIEW TAMPILAN USER */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Pratinjau Tampilan Pengumuman (Sisi User)"
        subtitle="Berikut adalah visualisasi bagaimana pengumuman ini tampil di aplikasi tamu"
        maxWidth="max-w-md"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700/80 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {selectedAnnouncement.badge || 'Pemberitahuan'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(selectedAnnouncement.created_at).toLocaleDateString('id-ID')}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-white">
                  {selectedAnnouncement.title}
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line">
                  {selectedAnnouncement.content}
                </p>
              </div>

              {selectedAnnouncement.link_url && (
                <div className="pt-2 border-t border-slate-700/60">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs">
                    <span>{selectedAnnouncement.link_text || 'Lihat Selengkapnya'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM DIALOG DELETE */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengumuman?"
        message={`Apakah Anda yakin ingin menghapus pengumuman "${selectedAnnouncement?.title}"? Pengumuman yang dihapus tidak dapat dipulihkan.`}
        confirmText="Hapus Pengumuman"
        confirmVariant="danger"
        loading={deletingLoading}
      />
    </div>
  );
};
