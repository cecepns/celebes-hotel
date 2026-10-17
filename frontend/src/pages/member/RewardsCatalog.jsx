import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  ArrowLeft,
  Gift,
  Coins,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Ticket,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export const RewardsCatalog = () => {
  const navigate = useNavigate();
  const { user, refreshProfile, isAuthenticated } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Redeem modal state
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [activeReward, setActiveReward] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'room', label: 'Kamar & Free Stay' },
    { id: 'fnb', label: 'F&B Resto' },
    { id: 'drugstore', label: 'Drugstore' },
    { id: 'laundry', label: 'Laundry' },
    { id: 'extra_bed', label: 'Extra Bed' },
  ];

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.MEMBER.REWARDS, {
        category: selectedCategory,
        search,
      });
      if (res.success && res.data) {
        setRewards(res.data);
      }
    } catch (err) {
      console.error('Failed to load rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRewards();
  };

  const handleOpenRedeem = (reward) => {
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu untuk klaim reward voucher');
      navigate('/login');
      return;
    }
    if (user?.status === 'suspended') {
      toast.error('Akun Anda saat ini sementara di-suspend oleh pihak hotel. Silakan hubungi pihak hotel via Contact Us.');
      return;
    }
    setActiveReward(reward);
    setRedeemModalOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!activeReward) return;
    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.MEMBER.REDEEM_REWARD, {
        reward_id: activeReward.id,
      });

      if (res.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        toast.success(res.message || 'Voucher berhasil diklaim!');
        setRedeemModalOpen(false);
        await refreshProfile();
        navigate('/my-vouchers');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal klaim reward');
    } finally {
      setSubmitting(false);
    }
  };

  const userPoints = user?.total_points || 0;

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
            <h1 className="text-sm font-extrabold text-slate-800">Katalog Reward Voucher</h1>
            <p className="text-[10px] text-slate-400">Tukar Poin HCH dengan Reward Spesial</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>{userPoints.toLocaleString('id-ID')}</span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari voucher (diskon, fnb, kamar, dll)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </form>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white shadow-xs shadow-red-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Rewards List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" count={4} />
          </div>
        ) : rewards.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Tidak Ada Voucher"
            description="Tidak ada voucher yang cocok dengan kriteria pencarian Anda."
          />
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => {
              const hasEnoughPoints = userPoints >= reward.points_required;

              return (
                <div
                  key={reward.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {reward.category.replace('_', ' ')}
                        </span>
                        {reward.stock > 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            Sisa: {reward.stock}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1.5 leading-snug">
                        {reward.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{reward.terms}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-xl text-xs font-extrabold">
                        <Coins className="w-3.5 h-3.5 text-red-600" />
                        {reward.points_required} pts
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Voucher Digital HCH</span>
                    <button
                      type="button"
                      onClick={() => handleOpenRedeem(reward)}
                      disabled={!hasEnoughPoints}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        hasEnoughPoints
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
                          : 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {hasEnoughPoints
                          ? 'Klaim Reward'
                          : `Kurang ${(reward.points_required - userPoints).toLocaleString('id-ID')} Poin`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <Modal
        isOpen={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        title="Klaim Reward Voucher"
        subtitle="Konfirmasi penukaran poin Anda"
      >
        {activeReward && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-sm font-extrabold text-slate-900">{activeReward.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{activeReward.terms}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Poin Anda Saat Ini:</span>
                <span className="font-bold text-slate-900">{userPoints} pts</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Poin Diperlukan:</span>
                <span className="font-bold text-red-600">-{activeReward.points_required} pts</span>
              </div>
              <div className="flex justify-between py-1 text-slate-800 font-bold">
                <span>Sisa Poin Setelah Klaim:</span>
                <span className="text-emerald-600 font-extrabold">
                  {userPoints - activeReward.points_required} pts
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center py-1">
              Voucher berlaku selama 30 hari sejak tanggal penukaran.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRedeemModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Ya, Tukarkan Poin'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
