import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { useAuth } from '@/context/AuthContext';
import {
  Receipt,
  Search,
  Plus,
  Download,
  Coins,
  Bed,
  Utensils,
  ShoppingBag,
  Shirt,
  Calendar,
  Calculator,
  User,
  Edit2,
  Trash2,
  Gift,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  Check,
  X,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select, DebouncedAsyncSelect } from '@/components/common/Select';
import { exportToExcel } from '@/utils/excel';
import toast from 'react-hot-toast';

export const AdminTransactions = () => {
  const { user, isSuperAdmin, isSupervisor, isReceptionist } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Dynamic system settings
  const [settings, setSettings] = useState({
    spending_unit_amount: '50000',
    points_per_unit: '5',
  });

  const fetchSettings = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.PUBLIC.SETTINGS);
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Debounce search
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
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedMemberOption, setSelectedMemberOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const categoryFilterOptions = [
    { value: 'all', label: 'Semua Kategori' },
    { value: 'kamar', label: 'Kamar / Menginap' },
    { value: 'fnb', label: 'F&B Restoran' },
    { value: 'drugstore', label: 'Drugstore' },
    { value: 'laundry', label: 'Laundry' },
    { value: 'lainnya', label: 'Lainnya' },
  ];

  const statusFilterOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu Approval' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
  ];

  const categoryOptions = [
    { value: 'kamar', label: 'Kamar / Menginap' },
    { value: 'fnb', label: 'F&B Restoran' },
    { value: 'drugstore', label: 'Drugstore' },
    { value: 'laundry', label: 'Laundry' },
    { value: 'lainnya', label: 'Lainnya' },
  ];

  // Form State for Create
  const [formData, setFormData] = useState({
    user_id: '',
    invoice_no: '',
    category: 'kamar',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Form State for Edit
  const [editData, setEditData] = useState({
    invoice_no: '',
    category: 'kamar',
    amount: '',
    transaction_date: '',
    notes: '',
  });

  // Form State for Manual Bonus
  const [bonusData, setBonusData] = useState({
    user_id: '',
    points: 10,
    notes: '',
  });

  // Fetch Transactions List
  const fetchTransactions = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.TRANSACTIONS.LIST, {
        page,
        limit,
        search: debouncedSearch,
        category: categoryFilter,
        status: statusFilter,
      });
      if (res.success && res.data) {
        setTransactions(res.data);
        setPagination(res.pagination);
        if (res.pending_count !== undefined) {
          setPendingCount(res.pending_count);
        }
      }
    } catch (err) {
      toast.error('Gagal mengambil data transaksi');
    } finally {
      setLoading(false);
    }
  };

  // Debounced API Member Search for AsyncSelect
  const loadMemberOptions = async (inputValue) => {
    try {
      const res = await request.get(API_ENDPOINTS.ADMIN.MEMBERS.LIST, {
        search: inputValue || '',
        limit: 20,
      });
      if (res.success && res.data) {
        return res.data.map((m) => ({
          value: m.id,
          label: `${m.name} (${m.member_code}) - ${m.phone}`,
          member: m,
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  useEffect(() => {
    fetchTransactions(1, pagination.limit);
  }, [debouncedSearch, categoryFilter, statusFilter]);

  const handleOpenCreate = () => {
    const randomInv = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setSelectedMemberOption(null);
    setFormData({
      user_id: '',
      invoice_no: randomInv,
      category: 'kamar',
      amount: '',
      transaction_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setSelectedTx(tx);
    setEditData({
      invoice_no: tx.invoice_no || '',
      category: tx.category || 'kamar',
      amount: tx.amount || '',
      transaction_date: tx.transaction_date ? tx.transaction_date.slice(0, 10) : '',
      notes: tx.notes || '',
    });
    setEditModalOpen(true);
  };

  const handleOpenReversal = (tx) => {
    setSelectedTx(tx);
    setReversalModalOpen(true);
  };

  const handleOpenApprove = (tx) => {
    setSelectedTx(tx);
    setApproveModalOpen(true);
  };

  const handleOpenReject = (tx) => {
    setSelectedTx(tx);
    setRejectionReason('Data transaksi tidak sesuai / belum diverifikasi');
    setRejectModalOpen(true);
  };

  const handleOpenBonus = () => {
    setSelectedMemberOption(null);
    setBonusData({
      user_id: '',
      points: isSupervisor ? 10 : 25,
      notes: '',
    });
    setBonusModalOpen(true);
  };

  // Point Calculation using dynamic settings!
  const numAmount = parseFloat(formData.amount) || 0;
  const unitAmount = Number(settings.spending_unit_amount) || 50000;
  const pointsPerUnit = Number(settings.points_per_unit) || 5;
  const calculatedPoints = Math.floor(numAmount / (unitAmount || 1)) * pointsPerUnit;
  const leftover = unitAmount > 0 ? numAmount % unitAmount : 0;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id || !formData.amount) {
      toast.error('Member dan nominal transaksi wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.TRANSACTIONS.CREATE, formData);
      if (res.success) {
        toast.success(res.message || 'Transaksi berhasil disimpan!');
        setCreateModalOpen(false);
        fetchTransactions(1, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    try {
      setSubmitting(true);
      const res = await request.put(API_ENDPOINTS.ADMIN.TRANSACTIONS.DETAIL(selectedTx.id), editData);
      if (res.success) {
        toast.success(res.message || 'Transaksi berhasil diperbarui');
        setEditModalOpen(false);
        fetchTransactions(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal mengubah transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReversalSubmit = async () => {
    if (!selectedTx) return;

    try {
      setSubmitting(true);
      const res = await request.delete(API_ENDPOINTS.ADMIN.TRANSACTIONS.DETAIL(selectedTx.id));
      if (res.success) {
        toast.success(res.message || 'Poin transaksi berhasil dibatalkan / reversal');
        setReversalModalOpen(false);
        fetchTransactions(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal membatalkan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBonusSubmit = async (e) => {
    e.preventDefault();
    if (!bonusData.user_id || !bonusData.points) {
      toast.error('Tamu dan jumlah poin wajib diisi');
      return;
    }

    if (isSupervisor && Number(bonusData.points) > 50) {
      toast.error('Supervisor hanya dapat memberikan maksimal 50 poin bonus per aksi');
      return;
    }

    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.TRANSACTIONS.MANUAL_BONUS, bonusData);
      if (res.success) {
        toast.success(res.message || 'Bonus poin manual berhasil ditambahkan!');
        setBonusModalOpen(false);
        fetchTransactions(1, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal memberikan bonus poin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSubmit = async () => {
    if (!selectedTx) return;
    try {
      setSubmitting(true);
      const res = await request.put(API_ENDPOINTS.ADMIN.TRANSACTIONS.APPROVE(selectedTx.id));
      if (res.success) {
        toast.success(res.message || 'Transaksi berhasil disetujui!');
        setApproveModalOpen(false);
        fetchTransactions(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menyetujui transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;
    try {
      setSubmitting(true);
      const res = await request.put(API_ENDPOINTS.ADMIN.TRANSACTIONS.REJECT(selectedTx.id), {
        reason: rejectionReason,
      });
      if (res.success) {
        toast.success(res.message || 'Transaksi berhasil ditolak');
        setRejectModalOpen(false);
        fetchTransactions(pagination.page, pagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menolak transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.loading('Menyiapkan file Excel transaksi...', { id: 'export-trans' });
      const res = await request.get(API_ENDPOINTS.ADMIN.TRANSACTIONS.EXPORT);
      if (res.success && res.data) {
        exportToExcel(res.data, 'data-transaksi-celebes-hotel.xlsx', 'Transaksi Tamu');
        toast.success('Data transaksi berhasil diekspor ke Excel!', { id: 'export-trans' });
      } else {
        toast.error('Tidak ada data transaksi untuk diekspor', { id: 'export-trans' });
      }
    } catch (err) {
      toast.error('Gagal mengekspor data ke Excel', { id: 'export-trans' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-600" />
            Input Transaksi & Penambahan Poin
          </h2>
          <p className="text-xs text-slate-500">
            Catat transaksi menginap, F&B, drugstore, laundry dan akumulasikan poin tamu secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          {/* Bonus Poin Manual: Supervisor (Terbatas max 50 pts) & Admin (Full) */}
          {(isSuperAdmin || isSupervisor) && (
            <button
              type="button"
              onClick={handleOpenBonus}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Gift className="w-4 h-4" />
              <span>Bonus Poin Manual</span>
            </button>
          )}

          {/* Input Transaksi: Receptionist, Supervisor, Admin all have permission */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-200 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Input Transaksi Baru</span>
          </button>
        </div>
      </div>

      {/* Role Notice Banner */}
      {isReceptionist && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Hak Akses Receptionist:</strong> Anda dapat mendaftarkan member baru dan menginput transaksi belanja/menginap. Transaksi yang Anda input memerlukan approval Supervisor atau Admin sebelum poin resmi aktif ke akun member.
          </span>
        </div>
      )}
      {isSupervisor && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Hak Akses Supervisor:</strong> Anda dapat menyetujui (approve) atau menolak transaksi resepsionis, mengedit data administrasi transaksi, melakukan reversal poin, dan memberikan bonus poin manual hingga maksimal 50 poin.
          </span>
        </div>
      )}

      {/* Pending Transactions Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-300/40 flex items-center justify-center text-amber-700 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-2">
                <span>{pendingCount} Transaksi Menunggu Approval SPV / Admin!</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Perlu Verifikasi
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                Transaksi yang diinput oleh staf Front Desk/Resepsionis ditahan sementara sampai disetujui agar poin resmi masuk ke akun tamu.
              </p>
            </div>
          </div>
          {statusFilter !== 'pending' && (
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0 flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Filter Pending ({pendingCount})</span>
            </button>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari invoice, nama tamu, atau no HP..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</span>
            <Select
              className="w-44"
              size="sm"
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(opt) => setStatusFilter(opt.value)}
              isSearchable={false}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Kategori:</span>
            <Select
              className="w-44"
              size="sm"
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={(opt) => setCategoryFilter(opt.value)}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">No. Invoice</th>
                <th className="py-3 px-4">Nama Tamu & Kode</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Total Belanja (IDR)</th>
                <th className="py-3 px-4">Poin Diperoleh</th>
                <th className="py-3 px-4">Status Approval</th>
                <th className="py-3 px-4">Tanggal Transaksi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-6">
                    <TableSkeleton rows={5} cols={8} />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8">
                    <EmptyState
                      icon={Receipt}
                      title="Tidak Ada Transaksi"
                      description="Belum ada transaksi yang tercatat pada filter ini."
                    />
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {t.invoice_no}
                      {t.notes && <div className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">{t.notes}</div>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{t.member_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {t.member_code} • {t.member_phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      Rp {Number(t.amount).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {t.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-xs">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          +{t.points_earned} pts (Tertunda)
                        </span>
                      ) : t.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg text-xs line-through">
                          <Coins className="w-3.5 h-3.5 text-rose-400" />
                          +{t.points_earned} pts
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-xs">
                          <Coins className="w-3.5 h-3.5" />
                          +{t.points_earned} pts
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {t.status === 'pending' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            Menunggu Approval
                          </span>
                          {t.creator_name && (
                            <div className="text-[10px] text-slate-400">
                              Oleh: <span className="font-semibold text-slate-600">{t.creator_name}</span> ({t.creator_role || 'staf'})
                            </div>
                          )}
                        </div>
                      ) : t.status === 'rejected' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Ditolak
                          </span>
                          {t.rejection_reason && (
                            <div className="text-[10px] text-rose-500 max-w-[150px] truncate" title={t.rejection_reason}>
                              {t.rejection_reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Disetujui
                          </span>
                          {t.approver_name && (
                            <div className="text-[10px] text-slate-400">
                              Acc: <span className="font-semibold text-slate-600">{t.approver_name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(t.transaction_date).toLocaleDateString('id-ID', {
                        dateStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {/* Actions according to matrix:
                          Receptionist: Cannot edit, cannot reversal
                          Supervisor: Can approve/reject, edit, reversal
                          Admin: Full rights */}
                      {isSuperAdmin || isSupervisor ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenApprove(t)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                title="Setujui Transaksi & Berikan Poin"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReject(t)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                title="Tolak Transaksi"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(t)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title={isSupervisor ? 'Edit Data Transaksi (Terbatas)' : 'Edit Transaksi'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReversal(t)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Batalkan / Reversal Poin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div>
                          {t.status === 'pending' ? (
                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Menunggu Review SPV
                            </span>
                          ) : t.status === 'rejected' ? (
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              Ditolak
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Poin Aktif
                            </span>
                          )}
                        </div>
                      )}
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
          onPageChange={(p) => fetchTransactions(p, pagination.limit)}
          onLimitChange={(l) => fetchTransactions(1, l)}
        />
      </div>

      {/* Modal Input Transaksi (Auto Points Preview using Dynamic Settings) */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Input Transaksi & Tambah Poin"
        subtitle="Sistem akan otomatis menghitung perolehan poin tamu sesuai pengaturan"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Tamu / Member * (Cari nama, kode, atau HP)
            </label>
            <DebouncedAsyncSelect
              placeholder="Ketik untuk mencari tamu..."
              loadOptions={loadMemberOptions}
              value={selectedMemberOption}
              onChange={(opt) => {
                setSelectedMemberOption(opt);
                setFormData({ ...formData, user_id: opt ? opt.value : '' });
              }}
              isClearable
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">No. Invoice *</label>
              <input
                type="text"
                required
                value={formData.invoice_no}
                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Transaksi *</label>
              <Select
                options={categoryOptions}
                value={formData.category}
                onChange={(opt) => setFormData({ ...formData, category: opt.value })}
                isSearchable={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nominal Transaksi (IDR) *
            </label>
            <input
              type="number"
              required
              min="1000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Contoh: 350000"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-slate-800"
            />
          </div>

          {/* Dynamic Live Calculation Preview Box */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-900">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                Simulasi Perolehan Poin Otomatis:
              </span>
              <span className="text-sm font-black text-red-600 bg-white px-2 py-0.5 rounded-lg border border-red-200 shadow-xs">
                +{calculatedPoints} Poin
              </span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Aturan aktif: Tiap kelipatan <strong>Rp {unitAmount.toLocaleString('id-ID')}</strong> mendapatkan <strong>{pointsPerUnit} poin</strong>.
              {numAmount > 0 && (
                <span>
                  {' '}
                  ({Math.floor(numAmount / unitAmount)} kelipatan &times; {pointsPerUnit} poin = {calculatedPoints} poin.
                  {leftover > 0 && ` Sisa Rp ${leftover.toLocaleString('id-ID')} belum mencapai batas kelipatan`}).
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tanggal Transaksi *
            </label>
            <input
              type="date"
              required
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          {/* Receptionist Notice */}
          {isReceptionist && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Catatan Resepsionis:</strong> Transaksi ini akan tersimpan dengan status <strong>Menunggu Approval</strong>. Poin (+{calculatedPoints} pts) baru akan aktif di akun tamu setelah disetujui oleh Supervisor atau Admin.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Contoh: Check-in Kamar Premier 301"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
              {submitting
                ? 'Menyimpan...'
                : isReceptionist
                ? 'Ajukan Transaksi (Menunggu Approval)'
                : 'Simpan & Tambah Poin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Transaksi (Role-Controlled) */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isSupervisor ? 'Edit Transaksi (Akses Supervisor)' : 'Edit Transaksi (Akses Admin)'}
        subtitle={
          isSupervisor
            ? 'Supervisor dapat mengubah nomor invoice, kategori, tanggal, dan catatan administrasi'
            : 'Admin memiliki wewenang penuh untuk memperbarui seluruh data transaksi'
        }
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">No. Invoice</label>
              <input
                type="text"
                required
                value={editData.invoice_no}
                onChange={(e) => setEditData({ ...editData, invoice_no: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
              <Select
                options={categoryOptions}
                value={editData.category}
                onChange={(opt) => setEditData({ ...editData, category: opt.value })}
                isSearchable={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nominal Transaksi (IDR) {isSupervisor && <span className="text-amber-600 font-normal">(Terkunci untuk Supervisor)</span>}
            </label>
            <input
              type="number"
              readOnly={isSupervisor}
              disabled={isSupervisor}
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              className={`w-full text-xs p-2.5 rounded-xl border font-bold ${
                isSupervisor
                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                  : 'border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
              }`}
            />
            {isSupervisor && (
              <p className="text-[10px] text-amber-600 mt-1">
                Perubahan nominal transaksi/poin hanya dapat dilakukan oleh Admin untuk menjaga integritas saldo.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
            <input
              type="date"
              required
              value={editData.transaction_date}
              onChange={(e) => setEditData({ ...editData, transaction_date: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Reversal / Pembatalan Poin */}
      <Modal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        title="Konfirmasi Reversal / Batalkan Poin"
        subtitle="Batalkan transaksi dan tarik kembali poin yang sudah diberikan kepada tamu"
        maxWidth="max-w-md"
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Peringatan Reversal Poin
              </div>
              <p className="text-[11px] leading-relaxed">
                Anda akan membatalkan transaksi <strong>{selectedTx.invoice_no}</strong> atas nama tamu{' '}
                <strong>{selectedTx.member_name}</strong>. Saldo poin tamu akan dikurangi sebanyak{' '}
                <strong>{selectedTx.points_earned} Poin</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-slate-800">{selectedTx.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-bold text-slate-800">Rp {Number(selectedTx.amount).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Poin Dibatalkan:</span>
                <span className="font-bold text-red-600">-{selectedTx.points_earned} pts</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReversalModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReversalSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Ya, Batalkan Poin'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Bonus Poin Manual */}
      <Modal
        isOpen={bonusModalOpen}
        onClose={() => setBonusModalOpen(false)}
        title="Berikan Bonus Poin Manual"
        subtitle={
          isSupervisor
            ? 'Supervisor dapat memberikan apresiasi bonus poin manual hingga maksimal 50 poin'
            : 'Admin dapat memberikan bonus poin manual tanpa batasan'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBonusSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Tamu / Member *
            </label>
            <DebouncedAsyncSelect
              placeholder="Ketik untuk mencari tamu..."
              loadOptions={loadMemberOptions}
              value={selectedMemberOption}
              onChange={(opt) => {
                setSelectedMemberOption(opt);
                setBonusData({ ...bonusData, user_id: opt ? opt.value : '' });
              }}
              isClearable
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Jumlah Poin Bonus *</span>
              {isSupervisor && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Maks. 50 Poin (Supervisor)
                </span>
              )}
            </label>
            <input
              type="number"
              required
              min="1"
              max={isSupervisor ? 50 : 10000}
              value={bonusData.points}
              onChange={(e) => setBonusData({ ...bonusData, points: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alasan / Catatan Bonus *
            </label>
            <textarea
              rows={2}
              required
              value={bonusData.notes}
              onChange={(e) => setBonusData({ ...bonusData, notes: e.target.value })}
              placeholder="Contoh: Apresiasi Ulang Tahun / Kompensasi Layanan Kamar"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setBonusModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Mengirim...' : 'Kirim Bonus Poin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Setujui / Approve Transaksi */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Setujui Transaksi & Berikan Poin"
        subtitle="Verifikasi transaksi resepsionis agar poin resmi masuk ke saldo member"
        maxWidth="max-w-md"
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Persetujuan Transaksi
              </div>
              <p className="text-[11px] leading-relaxed">
                Menyetujui transaksi ini akan langsung menambahkan saldo sebanyak{' '}
                <strong>+{selectedTx.points_earned} Poin</strong> ke akun tamu <strong>{selectedTx.member_name}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-mono font-bold text-slate-800">{selectedTx.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tamu:</span>
                <span className="font-bold text-slate-800">{selectedTx.member_name} ({selectedTx.member_code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal Belanja:</span>
                <span className="font-bold text-slate-800">Rp {Number(selectedTx.amount).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Poin Diberikan:</span>
                <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  +{selectedTx.points_earned} pts
                </span>
              </div>
              {selectedTx.creator_name && (
                <div className="flex justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Diinput Oleh:</span>
                  <span className="font-semibold text-slate-700">{selectedTx.creator_name} ({selectedTx.creator_role || 'Resepsionis'})</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Ya, Setujui & Tambah Poin'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Tolak / Reject Transaksi */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Tolak Transaksi"
        subtitle="Transaksi yang ditolak tidak akan memberikan poin kepada tamu"
        maxWidth="max-w-md"
      >
        {selectedTx && (
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Konfirmasi Penolakan Transaksi
              </div>
              <p className="text-[11px] leading-relaxed">
                Transaksi <strong>{selectedTx.invoice_no}</strong> sebesar Rp {Number(selectedTx.amount).toLocaleString('id-ID')} akan ditolak dan poin tidak akan masuk.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Penolakan *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Bukti invoice tidak valid / Transaksi dibatalkan tamu"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Menolak...' : 'Tolak Transaksi'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
