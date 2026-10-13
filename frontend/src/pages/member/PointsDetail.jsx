import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';

export const PointsDetail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await request.get(API_ENDPOINTS.MEMBER.POINTS_BREAKDOWN);
        if (res.success && res.data) {
          setLedgers(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch points breakdown:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, []);

  const totalActivePoints = ledgers
    .filter((l) => !l.is_expired)
    .reduce((acc, curr) => acc + (curr.points_remaining || 0), 0);

  const expiring30Days = ledgers
    .filter((l) => !l.is_expired && l.points_remaining > 0 && l.days_left >= 0 && l.days_left <= 30)
    .reduce((acc, curr) => acc + (curr.points_remaining || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Header */}
      <header className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-30">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-extrabold text-slate-800">Detail Poin & Masa Berlaku</h1>
          <p className="text-[10px] text-slate-400">Masa Aktif Poin 365 Hari</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Total Points Overview Banner */}
        <div className="bg-gradient-to-r from-[#003882] via-[#004ca8] to-[#005bbd] rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200 uppercase font-semibold">Total Poin Aktif</p>
              <h2 className="text-3xl font-extrabold mt-1 tracking-tight">
                {totalActivePoints.toLocaleString('id-ID')}{' '}
                <span className="text-sm font-medium text-blue-200">Point</span>
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            <span className="text-blue-100 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-red-300" />
              Expiring dalam 30 hari:
            </span>
            <span className="font-extrabold text-red-300 bg-red-950/40 px-2.5 py-0.5 rounded-full">
              {expiring30Days.toLocaleString('id-ID')} Poin
            </span>
          </div>
        </div>

        {/* Schedule of Points Batches */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-500" />
            Jadwal Kadaluarsa Poin Tamu
          </h3>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" count={3} />
            </div>
          ) : ledgers.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="Belum Ada Catatan Poin"
              description="Lakukan transaksi di kamar, resto, drugstore, atau selesaikan misi untuk mengumpulkan poin."
            />
          ) : (
            <div className="space-y-2.5">
              {ledgers.map((item) => {
                const isExpiringSoon =
                  !item.is_expired && item.points_remaining > 0 && item.days_left <= 30 && item.days_left >= 0;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl p-3.5 border transition-shadow ${
                      item.is_expired
                        ? 'border-slate-200 opacity-60 bg-slate-50'
                        : isExpiringSoon
                        ? 'border-red-200 ring-1 ring-red-100'
                        : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold ${
                              item.is_expired
                                ? 'text-slate-400'
                                : isExpiringSoon
                                ? 'text-red-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Didapat: {new Date(item.earned_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-extrabold ${
                            item.is_expired
                              ? 'text-slate-400'
                              : 'text-emerald-600'
                          }`}
                        >
                          +{item.points_earned} pts
                        </span>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Sisa: <span className="font-bold text-slate-700">{item.points_remaining}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Jatuh Tempo:{' '}
                        {new Date(item.expiry_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </span>

                      {item.is_expired ? (
                        <span className="font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Kadaluarsa
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                          Expire dlm {item.days_left} hari!
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Aktif ({item.days_left} hari lagi)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
