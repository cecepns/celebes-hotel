import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  ArrowLeft,
  Trophy,
  Coins,
  CheckCircle2,
  Calendar,
  Sparkles,
  Crown,
  Flame,
  Star,
  Clock,
  Check,
} from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export const Missions = () => {
  const navigate = useNavigate();
  const { user, refreshProfile, isAuthenticated } = useAuth();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CORE');

  // Claim modal state
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [proofNote, setProofNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.MEMBER.MISSIONS);
      if (res.success && res.data) {
        setMissions(res.data);
      }
    } catch (err) {
      console.error('Failed to load missions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [isAuthenticated]);

  const filteredMissions = missions.filter((m) => m.type === activeTab);

  const handleOpenClaim = (mission) => {
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu untuk klaim misi');
      navigate('/login');
      return;
    }
    setSelectedMission(mission);
    setProofNote('');
    setClaimModalOpen(true);
  };

  const handleConfirmClaim = async () => {
    if (!selectedMission) return;
    try {
      setSubmitting(true);
      const res = await request.post(
        API_ENDPOINTS.MEMBER.CLAIM_MISSION(selectedMission.id),
        { proof_note: proofNote }
      );

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
        toast.success(res.message || 'Misi berhasil diklaim!');
        setClaimModalOpen(false);
        await refreshProfile();
        await fetchMissions();
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal klaim misi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Header */}
      <header className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800">Misi & Tantangan</h1>
            <p className="text-[10px] text-slate-400">Selesaikan Misi, Dapatkan Bonus Poin</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>{Number(user?.total_points || 0).toLocaleString('id-ID')}</span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Mission Type Tabs: CORE, MONTHLY, SEASONAL */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-200/60 p-1 rounded-xl">
          {[
            { id: 'CORE', label: 'Misi Utama (Core)' },
            { id: 'MONTHLY', label: 'Bulanan' },
            { id: 'SEASONAL', label: 'Seasonal' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 text-[11px] font-bold rounded-lg transition leading-tight ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Description Card */}
        <div className="p-3 bg-red-50/60 border border-red-100 rounded-xl text-[11px] text-red-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              {activeTab === 'CORE' && 'Misi utama berlaku sekali untuk setiap member.'}
              {activeTab === 'MONTHLY' && 'Misi bulanan akan diperbarui setiap awal bulan.'}
              {activeTab === 'SEASONAL' && 'Misi musiman sesuai event atau periode spesial.'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-red-600 bg-white px-2 py-0.5 rounded-full shadow-2xs">
            {filteredMissions.length} Misi
          </span>
        </div>

        {/* Missions List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" count={4} />
          </div>
        ) : filteredMissions.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Tidak Ada Misi"
            description="Belum ada misi aktif untuk kategori ini."
          />
        ) : (
          <div className="space-y-3">
            {filteredMissions.map((m) => {
              const isCompleted = m.is_completed;

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200/80 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {m.recurrence}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Selesai
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1.5">{m.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.requirement}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-extrabold">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />+{m.bonus_points} pts
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {isCompleted ? 'Poin telah ditambahkan ke akun' : 'Selesaikan syarat di atas'}
                    </span>
                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleOpenClaim(m)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs shadow-red-200 transition"
                      >
                        Klaim Reward
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Diklaim
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Claim Mission Modal */}
      <Modal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title="Klaim Bonus Misi"
        subtitle="Verifikasi penyelesaian misi Anda"
      >
        {selectedMission && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{selectedMission.title}</span>
                <span className="text-xs font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                  +{selectedMission.bonus_points} Poin
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedMission.requirement}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Keterangan (Opsional)
              </label>
              <textarea
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Contoh: Akun Instagram saya @budi_santoso atau No invoice kamar #INV-001"
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClaimModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClaim}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Klaim Poin Sekarang'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
