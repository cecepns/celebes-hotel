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
      });
      if (res.success && res.data) {
        setTransactions(res.data);
        setPagination(res.pagination);
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
  }, [debouncedSearch, categoryFilter]);

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
            <strong>Hak Akses Receptionist:</strong> Anda dapat mendaftarkan member baru dan menginput transaksi eligible. Edit transaksi dan reversal poin membutuhkan wewenang Supervisor atau Admin.
          </span>
        </div>
      )}
      {isSupervisor && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Hak Akses Supervisor:</strong> Anda dapat mengedit data administrasi transaksi, melakukan reversal pembatalan poin, dan memberikan bonus poin manual hingga maksimal 50 poin.
          </span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari invoice, nama tamu, atau no HP..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Kategori:</span>
          <Select
            className="w-48"
            size="sm"
            options={categoryFilterOptions}
            value={categoryFilter}
            onChange={(opt) => setCategoryFilter(opt.value)}
            isSearchable={false}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 whitespace-nowrap">
              <tr>
                <th className="py-3 px-4">No. Invoice</th>
                <th className="py-3 px-4">Nama Tamu & Kode</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Total Belanja (IDR)</th>
                <th className="py-3 px-4">Poin Diperoleh</th>
                <th className="py-3 px-4">Tanggal Transaksi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-6">
                    <TableSkeleton rows={5} cols={7} />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8">
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
                      <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                        <Coins className="w-3.5 h-3.5" />
                        +{t.points_earned} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(t.transaction_date).toLocaleDateString('id-ID', {
                        dateStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {/* Actions according to matrix:
                          Receptionist: Cannot edit, cannot reversal
                          Supervisor: Limited edit, reversal allowed
                          Admin: Full edit, reversal allowed */}
                      {isSuperAdmin || isSupervisor ? (
                        <div className="flex items-center justify-end gap-1.5">
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
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">
                          Tercatat
                        </span>
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
              {submitting ? 'Menyimpan...' : 'Simpan & Tambah Poin'}
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
    </div>
  );
};
