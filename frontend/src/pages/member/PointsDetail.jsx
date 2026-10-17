import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  ArrowLeft,
  Coins,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  History,
  Info,
  Sliders,
  AlertCircle,
  Ticket,
  MinusCircle,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';

export const PointsDetail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({
    total_active_points: 0,
    expiring_30_days: 0,
    total_redeemed_points: 0,
  });
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'in', 'voucher', 'adjust_expired'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        setLoading(true);
        const res = await request.get(API_ENDPOINTS.MEMBER.POINTS_BREAKDOWN);
        if (res.success) {
          setLedgers(res.data || []);
          setHistory(res.history || []);
          if (res.summary) {
            setSummary(res.summary);
          }
        }
      } catch (err) {
        console.error('Failed to fetch points breakdown:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, []);

  const totalActivePoints = summary.total_active_points || 0;
  const expiring30Days = summary.expiring_30_days || 0;
  const totalRedeemed = summary.total_redeemed_points || 0;

  // Filtered history list based on tab
  const filteredHistory = history.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'in') return item.points > 0;
    if (activeTab === 'voucher') return item.type === 'voucher_usage';
    if (activeTab === 'adjust_expired') {
      return (
        item.type === 'adjustment_deduct' ||
        item.type === 'adjustment_add' ||
        item.is_expired === 1 ||
        item.source_type === 'adjustment'
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Header */}
      <header className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800">History & Mutasi Poin</h1>
            <p className="text-[10px] text-slate-400">Poin Masuk, Pemakaian Voucher & Masa Berlaku</p>
          </div>
        </div>
        <Link
          to="/my-vouchers"
          className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Voucher Saya</span>
        </Link>
      </header>

      <main className="p-4 space-y-4">
        {/* Total Points Overview Banner */}
        <div className="bg-gradient-to-br from-[#003882] via-[#004ca8] to-[#005bbd] rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200 uppercase font-semibold">Total Poin Aktif Anda</p>
              <h2 className="text-3xl font-black mt-1 tracking-tight">
                {totalActivePoints.toLocaleString('id-ID')}{' '}
                <span className="text-sm font-medium text-blue-200">Point</span>
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 shadow-inner">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-[10px] text-blue-200 block">Total Dipakai (Voucher):</span>
              <span className="font-extrabold text-amber-300 text-sm">
                {totalRedeemed.toLocaleString('id-ID')} Pts
              </span>
            </div>
            <div className="bg-red-950/40 border border-red-400/30 rounded-xl p-2.5">
              <span className="text-[10px] text-red-200 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-300" />
                Expire &lt; 30 Hari:
              </span>
              <span className="font-extrabold text-red-300 text-sm">
                {expiring30Days.toLocaleString('id-ID')} Pts
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Riwayat ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('in')}
            className={`px-3 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'in'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Poin Masuk (+)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voucher')}
            className={`px-3 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'voucher'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Pemakaian Voucher (-)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adjust_expired')}
            className={`px-3 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'adjust_expired'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Koreksi & Expire</span>
          </button>
        </div>

        {/* Catatan Transparansi GM */}
        <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-950">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-blue-900">Transparansi Poin:</strong> Setiap pengurangan poin saat penukaran voucher, koreksi penyesuaian oleh hotel, serta masa kadaluarsa (365 hari) tercatat lengkap di bawah ini.
          </p>
        </div>

        {/* Mutasi List Content */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" count={4} />
            </div>
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="Belum Ada Catatan Pada Kategori Ini"
              description="Mutasi poin masuk atau pemakaian voucher Anda akan ditampilkan di sini."
            />
          ) : (
            filteredHistory.map((item) => {
              const isVoucher = item.type === 'voucher_usage';
              const isDeduct = item.points < 0;
              const isAdjustment =
                item.type === 'adjustment_deduct' || item.type === 'adjustment_add';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border transition-shadow shadow-xs space-y-2.5 ${
                    isVoucher
                      ? 'border-rose-100 hover:border-rose-200'
                      : isAdjustment
                      ? 'border-purple-100 hover:border-purple-200'
                      : item.is_expired
                      ? 'border-slate-200 opacity-70 bg-slate-50'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Icon, Title & Points */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isVoucher
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : isAdjustment
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : item.points > 0
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isVoucher ? (
                          <Ticket className="w-5 h-5" />
                        ) : isAdjustment ? (
                          <Sliders className="w-5 h-5" />
                        ) : isDeduct ? (
                          <MinusCircle className="w-5 h-5" />
                        ) : (
                          <Coins className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">
                          {item.title}
                        </h4>

                        {/* Special Details for Voucher Usage */}
                        {isVoucher && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              Kode: #{item.voucher_code}
                            </span>
                            {item.status === 'used' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Sudah Digunakan di Hotel
                              </span>
                            ) : item.status === 'expired' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                Voucher Kadaluarsa
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                Voucher Aktif (Belum Dipakai)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Special Details for Adjustment */}
                        {isAdjustment && (
                          <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                            Koreksi & Penyesuaian Saldo Resmi oleh Manajemen Hotel
                          </div>
                        )}

                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(item.date).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Point Amount Pill */}
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl shadow-xs ${
                          item.points < 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {item.points > 0 ? `+${item.points}` : item.points} Point
                      </span>
                    </div>
                  </div>

                  {/* Bottom Extra Information */}
                  {isVoucher ? (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {item.status === 'used' && item.used_at
                          ? `Digunakan pada: ${new Date(item.used_at).toLocaleDateString('id-ID')}`
                          : `Berlaku hingga: ${new Date(item.valid_until).toLocaleDateString('id-ID')}`}
                      </span>
                      <Link
                        to="/my-vouchers"
                        className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1 text-[11px]"
                      >
                        <span>Lihat Voucher</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : item.expiry_date ? (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Jatuh Tempo: {new Date(item.expiry_date).toLocaleDateString('id-ID')}
                      </span>
                      {item.is_expired ? (
                        <span className="font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Poin Kadaluarsa
                        </span>
                      ) : item.days_left <= 30 ? (
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                          Expire dlm {item.days_left} hari!
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Sisa: {item.points_remaining} pts ({item.days_left} hari)
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Syarat & Ketentuan Umum */}
        <div className="p-4 bg-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1.5 border border-slate-200/80">
          <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-slate-600" />
            Ketentuan Poin Royalti HCH
          </h5>
          <ul className="list-disc list-inside space-y-1 text-slate-500 leading-relaxed">
            <li>Poin dihitung otomatis dari transaksi kamar, F&B, drugstore, dan laundry.</li>
            <li>Poin berlaku selama 365 hari sejak tanggal transaksi dicatat.</li>
            <li>Poin yang sudah ditukarkan menjadi voucher tidak dapat dikembalikan / diuangkan.</li>
            <li>Jika ada selisih atau pertanyaan mengenai riwayat poin, silakan hubungi resepsionis via menu Contact Us.</li>
          </ul>
        </div>
      </main>
    </div>
  );
};
