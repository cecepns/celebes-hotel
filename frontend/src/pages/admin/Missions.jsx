import React, { useState, useEffect, useRef } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { useAuth } from '@/context/AuthContext';
import {
  Trophy,
  Search,
  Plus,
  Edit2,
  Trash2,
  Coins,
  Sparkles,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  ShieldAlert,
  Info,
  Bed,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Select } from '@/components/common/Select';
import toast from 'react-hot-toast';

export const AdminMissions = () => {
  const { isSuperAdmin, isSupervisor, isReceptionist } = useAuth();
  const [activeTab, setActiveTab] = useState('claims'); // 'claims' or 'missions'

  // --- CLAIMS APPROVAL STATE ---
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsSearch, setClaimsSearch] = useState('');
  const [debouncedClaimsSearch, setDebouncedClaimsSearch] = useState('');
  const [claimsStatusFilter, setClaimsStatusFilter] = useState('pending');
  const [claimsPagination, setClaimsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [pendingCount, setPendingCount] = useState(0);

  // Reject Claim Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingId, setApprovingId] = useState(null);

  // --- MISSIONS LIST STATE ---
  const [missions, setMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionsSearch, setMissionsSearch] = useState('');
  const [debouncedMissionsSearch, setDebouncedMissionsSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [missionsPagination, setMissionsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Missions Modals
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

  // Debounce search refs
  const claimsSearchTimeout = useRef(null);
  const handleClaimsSearchChange = (e) => {
    const val = e.target.value;
    setClaimsSearch(val);
    if (claimsSearchTimeout.current) clearTimeout(claimsSearchTimeout.current);
    claimsSearchTimeout.current = setTimeout(() => {
      setDebouncedClaimsSearch(val);
    }, 350);
  };

  const missionsSearchTimeout = useRef(null);
  const handleMissionsSearchChange = (e) => {
    const val = e.target.value;
    setMissionsSearch(val);
    if (missionsSearchTimeout.current) clearTimeout(missionsSearchTimeout.current);
    missionsSearchTimeout.current = setTimeout(() => {
      setDebouncedMissionsSearch(val);
    }, 350);
  };

  // Fetch Claims
  const fetchClaims = async (page = 1, limit = 10) => {
    try {
      setClaimsLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.MISSIONS.CLAIMS, {
        page,
        limit,
        search: debouncedClaimsSearch,
        status: claimsStatusFilter,
      });
      if (res.success && res.data) {
        setClaims(res.data);
        setClaimsPagination(res.pagination);
        if (claimsStatusFilter === 'pending') {
          setPendingCount(res.pagination.total);
        }
      }
    } catch (err) {
      toast.error('Gagal mengambil daftar klaim misi tamu');
    } finally {
      setClaimsLoading(false);
    }
  };

  // Fetch Missions
  const fetchMissions = async (page = 1, limit = 10) => {
    try {
      setMissionsLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.MISSIONS.LIST, {
        page,
        limit,
        search: debouncedMissionsSearch,
        type: typeFilter,
      });
      if (res.success && res.data) {
        setMissions(res.data);
        setMissionsPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Gagal mengambil data misi');
    } finally {
      setMissionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'claims') {
      fetchClaims(1, claimsPagination.limit);
    } else {
      fetchMissions(1, missionsPagination.limit);
    }
  }, [activeTab, debouncedClaimsSearch, claimsStatusFilter, debouncedMissionsSearch, typeFilter]);

  // Handle Approve Claim
  const handleApproveClaim = async (claim) => {
    try {
      setApprovingId(claim.id);
      const res = await request.post(API_ENDPOINTS.ADMIN.MISSIONS.APPROVE_CLAIM(claim.id));
      if (res.success) {
        toast.success(res.message || 'Klaim misi berhasil disetujui!');
        fetchClaims(claimsPagination.page, claimsPagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menyetujui klaim');
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Reject Claim
  const handleOpenReject = (claim) => {
    setSelectedClaim(claim);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;

    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.ADMIN.MISSIONS.REJECT_CLAIM(selectedClaim.id), {
        reason: rejectReason || 'Persyaratan misi belum terpenuhi atau bukti tidak valid',
      });
      if (res.success) {
        toast.success(res.message || 'Klaim misi telah ditolak');
        setRejectModalOpen(false);
        fetchClaims(claimsPagination.page, claimsPagination.limit);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menolak klaim');
    } finally {
      setSubmitting(false);
    }
  };

  // Mission CRUD
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
        fetchMissions(1, missionsPagination.limit);
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
        fetchMissions(missionsPagination.page, missionsPagination.limit);
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
        fetchMissions(missionsPagination.page, missionsPagination.limit);
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
            Approval & Kelola Misi Royalti Reward HCH
          </h2>
          <p className="text-xs text-slate-500">
            Setujui klaim misi tamu dan kelola 28 misi tantangan Hotel Celebes Hasanuddin.
          </p>
        </div>

        {activeTab === 'missions' && isSuperAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-200 transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Misi</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'claims'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Approval Klaim Misi Tamu</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-600 text-white">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('missions')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'missions'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Daftar & Konfigurasi Misi</span>
        </button>
      </div>

      {/* TAB 1: CLAIMS APPROVAL */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={claimsSearch}
                onChange={handleClaimsSearchChange}
                placeholder="Cari tamu, misi, kamar..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status Klaim:</span>
              <Select
                className="w-44"
                size="sm"
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'pending', label: 'Menunggu Approval' },
                  { value: 'approved', label: 'Disetujui' },
                  { value: 'rejected', label: 'Ditolak' },
                ]}
                value={claimsStatusFilter}
                onChange={(opt) => setClaimsStatusFilter(opt.value)}
                isSearchable={false}
              />
            </div>
          </div>

          {/* Claims Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 whitespace-nowrap">
                  <tr>
                    <th className="py-3 px-4">Tamu & No. Kamar</th>
                    <th className="py-3 px-4">Misi Yang Diklaim</th>
                    <th className="py-3 px-4">Catatan Klaim Tamu</th>
                    <th className="py-3 px-4">Tanggal Pengajuan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claimsLoading ? (
                    <tr>
                      <td colSpan="6" className="py-6">
                        <TableSkeleton rows={5} cols={6} />
                      </td>
                    </tr>
                  ) : claims.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8">
                        <EmptyState
                          icon={CheckCircle}
                          title="Tidak Ada Klaim Misi"
                          description="Belum ada klaim misi dari tamu yang cocok dengan filter."
                        />
                      </td>
                    </tr>
                  ) : (
                    claims.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{c.member_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.member_code} • {c.member_phone}
                          </div>
                          {c.room_number && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200/60">
                              <Bed className="w-3 h-3 text-amber-600" />
                              Kamar No. {c.room_number}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{c.mission_title}</div>
                          <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg text-[10px] mt-0.5">
                            <Coins className="w-3 h-3" />
                            +{c.bonus_points} pts
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-700 font-medium leading-relaxed">
                            {c.claim_note || c.proof_note || c.notes || <span className="text-slate-400 italic">Tidak ada catatan</span>}
                          </div>
                          {c.admin_note && (
                            <div className="text-[10px] text-slate-500 mt-1 italic">
                              Catatan Admin: {c.admin_note}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {(() => {
                            const dateVal = c.created_at || c.claimed_at || c.awarded_at;
                            if (!dateVal) return '-';
                            const d = new Date(dateVal);
                            return isNaN(d.getTime())
                              ? String(dateVal).slice(0, 16)
                              : d.toLocaleString('id-ID', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                });
                          })()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> Menunggu Approval
                            </span>
                          )}
                          {c.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3" /> Disetujui
                            </span>
                          )}
                          {c.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3" /> Ditolak
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {c.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={approvingId === c.id}
                                onClick={() => handleApproveClaim(c)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Setujui (+{c.bonus_points} pts)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReject(c)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Selesai Diproses</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              pagination={claimsPagination}
              onPageChange={(p) => fetchClaims(p, claimsPagination.limit)}
              onLimitChange={(l) => fetchClaims(1, l)}
            />
          </div>
        </div>
      )}

      {/* TAB 2: MISSIONS CONFIGURATION */}
      {activeTab === 'missions' && (
        <div className="space-y-4">
          {!isSuperAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Informasi Akses:</strong> Pembuatan, pengubahan, dan penghapusan master misi hanya dapat dilakukan oleh Admin. Receptionist dan Supervisor dapat memproses approval klaim misi tamu.
              </span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={missionsSearch}
                onChange={handleMissionsSearchChange}
                placeholder="Cari judul misi atau syarat..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
                    {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missionsLoading ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 6 : 5} className="py-6">
                        <TableSkeleton rows={5} cols={isSuperAdmin ? 6 : 5} />
                      </td>
                    </tr>
                  ) : missions.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 6 : 5} className="py-8">
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
                        {isSuperAdmin && (
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
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              pagination={missionsPagination}
              onPageChange={(p) => fetchMissions(p, missionsPagination.limit)}
              onLimitChange={(l) => fetchMissions(1, l)}
            />
          </div>
        </div>
      )}

      {/* Modal Reject Claim */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Tolak Klaim Misi Tamu"
        subtitle={selectedClaim ? `Misi: ${selectedClaim.mission_title} - Tamu: ${selectedClaim.member_name}` : ''}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alasan Penolakan Klaim *
            </label>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Tanggal menginap sudah lewat atau kamar belum check in..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
              {submitting ? 'Memproses...' : 'Tolak Klaim Misi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Create Mission (Admin Only) */}
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
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
              {submitting ? 'Menyimpan...' : 'Simpan Misi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Mission (Admin Only) */}
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
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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

      {/* Delete Dialog (Admin Only) */}
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
