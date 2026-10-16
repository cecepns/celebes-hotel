import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/utils/api';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/common/Select';
import {
  Bed,
  Plus,
  Search,
  Trash2,
  Edit2,
  Users,
  Building,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ImageIcon,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminRooms = () => {
  // State Table & Filter
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    description: '',
    price: '',
    price_ramadan: '',
    price_new_year: '',
    capacity: 2,
    total_rooms: 10,
    facilities: '',
    is_active: 1,
    image: null,
    image_preview: null,
  };
  const [formData, setFormData] = useState(initialFormState);

  // Debounce search timer
  const searchTimeoutRef = useRef(null);

  // Fetch Rooms List
  const fetchRooms = useCallback(
    async (page = 1, limit = 10, searchTerm = search, status = statusFilter) => {
      setLoading(true);
      try {
        const res = await api.get(API_ENDPOINTS.ADMIN.ROOMS.LIST, {
          params: {
            page,
            limit,
            search: searchTerm,
            status,
          },
        });

        if (res.data?.success) {
          setRooms(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Gagal memuat data tipe kamar');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchRooms(1, pagination.limit, search, statusFilter);
  }, [statusFilter]);

  // Handle Realtime Debounce Search (300ms)
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchRooms(1, pagination.limit, val, statusFilter);
    }, 300);
  };

  // Handle Pagination
  const handlePageChange = (newPage) => {
    fetchRooms(newPage, pagination.limit, search, statusFilter);
  };

  const handleLimitChange = (newLimit) => {
    fetchRooms(1, newLimit, search, statusFilter);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (room) => {
    setSelectedRoom(room);
    setFormData({
      name: room.name || '',
      description: room.description || '',
      price: room.price || '',
      price_ramadan: room.price_ramadan || '',
      price_new_year: room.price_new_year || '',
      capacity: Number(room.capacity) || 2,
      total_rooms: Number(room.total_rooms) || 10,
      facilities: room.facilities || '',
      is_active: room.is_active ? 1 : 0,
      image: null,
      image_preview: room.image_url ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${room.image_url}` : null,
    });
    setEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (room) => {
    setSelectedRoom(room);
    setDeleteModalOpen(true);
  };

  // Handle Image File Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
        image_preview: URL.createObjectURL(file),
      }));
    }
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      toast.error('Nama tipe kamar dan tarif per malam wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('description', formData.description.trim());
      data.append('price', formData.price);
      data.append('price_ramadan', formData.price_ramadan || '');
      data.append('price_new_year', formData.price_new_year || '');
      data.append('capacity', formData.capacity);
      data.append('total_rooms', formData.total_rooms);
      data.append('facilities', formData.facilities.trim());
      data.append('is_active', formData.is_active);
      if (formData.image) {
        data.append('image', formData.image);
      }

      const res = await api.post(API_ENDPOINTS.ADMIN.ROOMS.CREATE, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Tipe kamar berhasil ditambahkan');
        setCreateModalOpen(false);
        fetchRooms(pagination.page, pagination.limit, search, statusFilter);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan tipe kamar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      toast.error('Nama tipe kamar dan tarif per malam wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('description', formData.description.trim());
      data.append('price', formData.price);
      data.append('price_ramadan', formData.price_ramadan || '');
      data.append('price_new_year', formData.price_new_year || '');
      data.append('capacity', formData.capacity);
      data.append('total_rooms', formData.total_rooms);
      data.append('facilities', formData.facilities.trim());
      data.append('is_active', formData.is_active);
      if (formData.image) {
        data.append('image', formData.image);
      }

      const res = await api.put(API_ENDPOINTS.ADMIN.ROOMS.UPDATE(selectedRoom.id), data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Data tipe kamar berhasil diperbarui');
        setEditModalOpen(false);
        fetchRooms(pagination.page, pagination.limit, search, statusFilter);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui tipe kamar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!selectedRoom) return;

    try {
      setSubmitting(true);
      const res = await api.delete(API_ENDPOINTS.ADMIN.ROOMS.DELETE(selectedRoom.id));
      if (res.data?.success) {
        toast.success(res.data.message || 'Tipe kamar berhasil dihapus');
        setDeleteModalOpen(false);
        fetchRooms(1, pagination.limit, search, statusFilter);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tipe kamar');
    } finally {
      setSubmitting(false);
    }
  };

  // Options for Capacity
  const capacityOptions = [
    { value: 1, label: '1 Tamu' },
    { value: 2, label: '2 Tamu' },
    { value: 3, label: '3 Tamu' },
    { value: 4, label: '4 Tamu' },
    { value: 5, label: '5 Tamu' },
    { value: 6, label: '6 Tamu' },
    { value: 8, label: '8 Tamu' },
  ];

  // Options for Status Filter
  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Nonaktif' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bed className="h-6 w-6 text-red-600" />
            Kelola Tipe Kamar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manajemen daftar kamar hotel, harga per malam, kapasitas tamu, dan fasilitas Hotel Celebes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-200 transition active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Tipe Kamar</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Realtime Debounced Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari nama kamar, fasilitas, atau deskripsi..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(opt) => setStatusFilter(opt.value)}
            isSearchable={false}
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => fetchRooms(pagination.page, pagination.limit, search, statusFilter)}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition flex items-center justify-center shrink-0"
          title="Segarkan Data"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[850px] whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Tipe Kamar</th>
                <th className="py-3 px-4">Tarif / Malam</th>
                <th className="py-3 px-4">Kapasitas</th>
                <th className="py-3 px-4">Jumlah Unit</th>
                <th className="py-3 px-4">Fasilitas</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      icon={Bed}
                      title="Belum Ada Tipe Kamar"
                      description="Data tipe kamar tidak ditemukan. Klik tombol Tambah Tipe Kamar untuk menambahkan kamar baru."
                    />
                  </td>
                </tr>
              ) : (
                rooms.map((room) => {
                  const isActive = Boolean(room.is_active);

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/60 transition">
                      {/* Name & Photo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {room.image_url ? (
                              <img
                                src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${room.image_url}`}
                                alt={room.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Bed className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{room.name}</div>
                            {room.description && (
                              <p className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">
                                {room.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <span className="font-extrabold text-slate-900">
                            Rp {Number(room.price).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">/ malam</span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1 text-[10px]">
                          {room.price_ramadan ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block w-fit">
                              🌙 Ramadhan: Rp {Number(room.price_ramadan).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">🌙 Ramadhan: Normal</span>
                          )}
                          {room.price_new_year ? (
                            <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block w-fit">
                              🎉 Thn Baru: Rp {Number(room.price_new_year).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">🎉 Thn Baru: Normal</span>
                          )}
                        </div>
                      </td>

                      {/* Capacity */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{room.capacity || 2} Orang</span>
                        </div>
                      </td>

                      {/* Total Units */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{room.total_rooms || 10} Unit</span>
                        </div>
                      </td>

                      {/* Facilities */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {room.facilities ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {room.facilities.split(',').slice(0, 3).map((f, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                              >
                                {f.trim()}
                              </span>
                            ))}
                            {room.facilities.split(',').length > 3 && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                +{room.facilities.split(',').length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-slate-400" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(room)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Edit Tipe Kamar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(room)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                            title="Hapus Tipe Kamar"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Pagination Controls */}
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      {/* Modal Create Room */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah Tipe Kamar Baru"
        subtitle="Daftarkan tipe kamar baru untuk reservasi tamu hotel"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Tipe Kamar *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Deluxe Room"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tarif / Malam (IDR) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Contoh: 350000"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>Tarif Ramadhan (IDR)</span>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal">🌙 Opsional</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.price_ramadan}
                onChange={(e) => setFormData({ ...formData, price_ramadan: e.target.value })}
                placeholder="Kosongkan jika sama dg normal"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>Tarif Tahun Baru (IDR)</span>
                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-normal">🎉 Opsional</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.price_new_year}
                onChange={(e) => setFormData({ ...formData, price_new_year: e.target.value })}
                placeholder="Kosongkan jika sama dg normal"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kapasitas Tamu
              </label>
              <Select
                options={capacityOptions}
                value={formData.capacity}
                onChange={(opt) => setFormData({ ...formData, capacity: Number(opt.value) })}
                isSearchable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Total Unit Kamar
              </label>
              <input
                type="number"
                min="1"
                value={formData.total_rooms}
                onChange={(e) => setFormData({ ...formData, total_rooms: Number(e.target.value) })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Kamar
              </label>
              <Select
                options={[
                  { value: 1, label: 'Aktif' },
                  { value: 0, label: 'Nonaktif' },
                ]}
                value={formData.is_active}
                onChange={(opt) => setFormData({ ...formData, is_active: Number(opt.value) })}
                isSearchable={false}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fasilitas Kamar (Pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={formData.facilities}
                onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                placeholder="AC, Smart TV, Wi-Fi, Hot Shower, City View"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Singkat
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi fasilitas dan keunggulan kamar..."
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Foto Kamar (Opsional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-medium text-slate-700 transition">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Pilih Gambar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {formData.image_preview && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={formData.image_preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Tipe Kamar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Room */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Tipe Kamar"
        subtitle={`Perbarui data ${selectedRoom?.name}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Tipe Kamar *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tarif / Malam (IDR) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>Tarif Ramadhan (IDR)</span>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal">🌙 Opsional</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.price_ramadan}
                onChange={(e) => setFormData({ ...formData, price_ramadan: e.target.value })}
                placeholder="Kosongkan jika sama dg normal"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>Tarif Tahun Baru (IDR)</span>
                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-normal">🎉 Opsional</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.price_new_year}
                onChange={(e) => setFormData({ ...formData, price_new_year: e.target.value })}
                placeholder="Kosongkan jika sama dg normal"
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kapasitas Tamu
              </label>
              <Select
                options={capacityOptions}
                value={formData.capacity}
                onChange={(opt) => setFormData({ ...formData, capacity: Number(opt.value) })}
                isSearchable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Total Unit Kamar
              </label>
              <input
                type="number"
                min="1"
                value={formData.total_rooms}
                onChange={(e) => setFormData({ ...formData, total_rooms: Number(e.target.value) })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Kamar
              </label>
              <Select
                options={[
                  { value: 1, label: 'Aktif' },
                  { value: 0, label: 'Nonaktif' },
                ]}
                value={formData.is_active}
                onChange={(opt) => setFormData({ ...formData, is_active: Number(opt.value) })}
                isSearchable={false}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fasilitas Kamar (Pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={formData.facilities}
                onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Singkat
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Foto Kamar
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-medium text-slate-700 transition">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Ubah Gambar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {formData.image_preview && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={formData.image_preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirm Delete */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Konfirmasi Hapus Kamar"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-2xl text-red-800 text-xs sm:text-sm">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Apakah Anda yakin ingin menghapus tipe kamar ini?</p>
              <p className="mt-1 text-slate-600">
                Tipe kamar <strong className="text-slate-900">{selectedRoom?.name}</strong> akan dihapus permanen dari daftar kamar hotel.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Menghapus...' : 'Ya, Hapus Kamar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
