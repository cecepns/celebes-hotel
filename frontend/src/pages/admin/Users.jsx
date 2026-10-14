import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/utils/api';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/common/Select';
import {
  UserCog,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Store,
  Trash2,
  Edit2,
  Lock,
  Phone,
  Mail,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();

  // State Table & Filter
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'resepsionis',
  });

  // Debounce search timer
  const searchTimeoutRef = useRef(null);

  // Fetch Users List
  const fetchUsers = useCallback(
    async (page = 1, limit = 10, searchTerm = search, role = roleFilter) => {
      setLoading(true);
      try {
        const res = await api.get(API_ENDPOINTS.ADMIN.USERS.LIST, {
          params: {
            page,
            limit,
            search: searchTerm,
            role,
          },
        });

        if (res.data?.success) {
          setUsers(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Gagal memuat data user');
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter]
  );

  useEffect(() => {
    fetchUsers(1, pagination.limit, search, roleFilter);
  }, [roleFilter]);

  // Handle Realtime Debounce Search (300ms)
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers(1, pagination.limit, val, roleFilter);
    }, 350);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setShowPassword(false);
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'resepsionis',
    });
    setCreateModalOpen(true);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.password || !formData.role) {
      return toast.error('Mohon lengkapi semua bidang wajib!');
    }

    setSubmitting(true);
    try {
      const res = await api.post(API_ENDPOINTS.ADMIN.USERS.CREATE, formData);
      if (res.data?.success) {
        toast.success(res.data.message || 'User staf berhasil ditambahkan');
        setCreateModalOpen(false);
        fetchUsers(1, pagination.limit);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan user');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setShowPassword(false);
    setFormData({
      name: u.name,
      phone: u.phone,
      email: u.email || '',
      password: '', // leave empty if not changing
      role: u.role,
    });
    setEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.role) {
      return toast.error('Mohon lengkapi semua bidang wajib!');
    }

    setSubmitting(true);
    try {
      const res = await api.put(
        API_ENDPOINTS.ADMIN.USERS.UPDATE(selectedUser.id),
        formData
      );
      if (res.data?.success) {
        toast.success(res.data.message || 'User berhasil diperbarui');
        setEditModalOpen(false);
        fetchUsers(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui user');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirm Modal
  const handleOpenDelete = (u) => {
    setSelectedUser(u);
    setDeleteModalOpen(true);
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await api.delete(
        API_ENDPOINTS.ADMIN.USERS.DELETE(selectedUser.id)
      );
      if (res.data?.success) {
        toast.success(res.data.message || 'User berhasil dihapus');
        setDeleteModalOpen(false);
        fetchUsers(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus user');
    } finally {
      setSubmitting(false);
    }
  };

  const roleFilterOptions = [
    { value: 'all', label: 'Semua Role' },
    { value: 'admin', label: 'Administrator' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'resepsionis', label: 'Resepsionis / Kasir' },
  ];

  const roleFormOptions = [
    { value: 'resepsionis', label: 'Resepsionis / Kasir (Input Transaksi & Member)' },
    { value: 'supervisor', label: 'Supervisor (Approval Misi, Reversal & Laporan)' },
    { value: 'admin', label: 'Administrator (Akses Penuh Sistem)' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCog className="w-6 h-6 text-red-600" />
            Manajemen User & Hak Akses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola 4 level role: Administrator, Supervisor, Resepsionis/Kasir, dan Member
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-red-200"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Realtime Debounced Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari nama, HP, email, kode..."
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition font-medium"
          />
        </div>

        {/* Role Filter */}
        <div className="w-full md:w-64 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter:</span>
          <Select
            className="flex-1"
            size="sm"
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(selected) => setRoleFilter(selected.value)}
            isSearchable={false}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">Kode ID</th>
                <th className="py-3 px-4">Nama User</th>
                <th className="py-3 px-4">No. HP / WhatsApp</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Role / Jabatan</th>
                <th className="py-3 px-4">Tgl Dibuat</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8">
                    <EmptyState
                      icon={UserCog}
                      title="User Tidak Ditemukan"
                      description="Belum ada user yang cocok dengan pencarian atau filter Anda."
                    />
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isAdmin = u.role === 'admin';
                  const isSpv = u.role === 'supervisor';
                  const isReception = ['resepsionis', 'kasir', 'staff'].includes(u.role);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {u.member_code}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {u.name}
                          {isSelf && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-md">
                              Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {u.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {u.email || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isAdmin
                              ? 'bg-red-100 text-red-700'
                              : isSpv
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isAdmin ? (
                            <Shield className="w-3 h-3" />
                          ) : isSpv ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <Store className="w-3 h-3" />
                          )}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('id-ID', {
                          dateStyle: 'medium',
                        })}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleOpenDelete(u)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition disabled:opacity-30 disabled:hover:bg-transparent"
                            title={isSelf ? 'Tidak dapat menghapus akun Anda sendiri' : 'Hapus User'}
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

        {/* Backend Pagination */}
        <Pagination
          pagination={pagination}
          onPageChange={(p) => fetchUsers(p, pagination.limit)}
          onLimitChange={(l) => fetchUsers(1, l)}
        />
      </div>

      {/* Modal Create User */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah User Baru"
        subtitle="Buat akun staf, resepsionis, supervisor, atau administrator baru"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Role / Jabatan *
            </label>
            <Select
              options={roleFormOptions}
              value={formData.role}
              onChange={(selected) => setFormData({ ...formData, role: selected.value })}
              isSearchable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Andi Pratama"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor WhatsApp / HP *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contoh: 08123456789"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email (Opsional)</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@celebeshotel.com"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Buat password login user"
                className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
              {submitting ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit User */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Data User"
        subtitle={selectedUser?.name}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Role / Jabatan *
            </label>
            <Select
              options={roleFormOptions}
              value={formData.role}
              onChange={(selected) => setFormData({ ...formData, role: selected.value })}
              isSearchable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor WhatsApp / HP *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reset Password (Kosongkan jika tidak diubah)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Masukkan password baru jika ingin mengubah"
                className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
              {submitting ? 'Menyimpan...' : 'Perbarui User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirm Delete */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Konfirmasi Hapus User"
        subtitle="Tindakan ini tidak dapat dibatalkan"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              Apakah Anda yakin ingin menghapus user{' '}
              <span className="font-bold">{selectedUser?.name}</span> ({selectedUser?.role})? Akun ini tidak akan bisa login lagi ke sistem.
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteSubmit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 transition disabled:opacity-50"
            >
              {submitting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
