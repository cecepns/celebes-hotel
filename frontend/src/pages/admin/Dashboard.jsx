import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Users,
  Coins,
  Ticket,
  Receipt,
  TrendingUp,
  Clock,
  PlusCircle,
  Download,
  Calendar,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { exportToExcel } from '@/utils/excel';
import toast from 'react-hot-toast';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.DASHBOARD);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleExportMembersExcel = async () => {
    try {
      toast.loading('Menyiapkan file Excel...', { id: 'export-dl' });
      const res = await request.get(API_ENDPOINTS.ADMIN.MEMBERS.EXPORT);
      if (res.success && res.data) {
        exportToExcel(res.data, 'data-member-celebes-hotel.xlsx', 'Data Member HCH');
        toast.success('File Excel member berhasil diunduh!', { id: 'export-dl' });
      } else {
        toast.error('Tidak ada data member untuk diekspor', { id: 'export-dl' });
      }
    } catch (err) {
      toast.error('Gagal mengekspor data ke Excel', { id: 'export-dl' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" /> Panel Pengelola Loyalty Program
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Royalti Reward HCH — Celebes Hotel
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Sistem loyalitas tamu, katalog voucher reward, reservasi, dan kelola kamar Hotel Celebes Hasanuddin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/transactions')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/40 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Transaksi Poin</span>
          </button>
          <button
            onClick={handleExportMembersExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/40 transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel Member</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tamu / Member
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                Number(data?.total_members || 0).toLocaleString('id-ID')
              )}
            </h3>
            <Link
              to="/admin/members"
              className="text-[11px] font-bold text-red-600 hover:underline inline-flex items-center gap-0.5 mt-2"
            >
              Lihat Semua Member &rarr;
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Active Points */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Poin Aktif Beredar
            </p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                `${Number(data?.total_active_points || 0).toLocaleString('id-ID')} pts`
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">Masa aktif 365 hari</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring Soon (30d) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Poin Expire (30 Hari)
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                `${Number(data?.expiring_points_30d || 0).toLocaleString('id-ID')} pts`
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-2">Jatuh tempo dlm 1 bulan</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Total Redeemed Points */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Poin Ditukarkan (Claim)
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                `${Number(data?.total_redeemed_points || 0).toLocaleString('id-ID')} pts`
              )}
            </h3>
            <Link
              to="/admin/vouchers"
              className="text-[11px] font-bold text-emerald-600 hover:underline inline-flex items-center gap-0.5 mt-2"
            >
              Cek Klaim Voucher &rarr;
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Transactions & Recent Redemptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-red-600" />
              Transaksi & Penambahan Poin Terbaru
            </h3>
            <Link to="/admin/transactions" className="text-xs font-bold text-red-600 hover:underline">
              Kelola Semua
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 whitespace-nowrap">
                <tr>
                  <th className="py-2.5 px-3">Tamu</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Nominal</th>
                  <th className="py-2.5 px-3 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-4 text-center">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ) : !data?.recent_transactions || data.recent_transactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">
                      Belum ada transaksi yang tercatat.
                    </td>
                  </tr>
                ) : (
                  data.recent_transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{t.member_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.member_code}</div>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-600 whitespace-nowrap">
                        {t.category}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        Rp {Number(t.amount).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 whitespace-nowrap">
                        +{t.points_earned}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Redemptions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-600" />
              Klaim Voucher Tamu Terbaru
            </h3>
            <Link to="/admin/vouchers" className="text-xs font-bold text-red-600 hover:underline">
              Verifikasi Voucher
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 whitespace-nowrap">
                <tr>
                  <th className="py-2.5 px-3">Kode & Tamu</th>
                  <th className="py-2.5 px-3">Reward Voucher</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-4 text-center">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ) : !data?.recent_redemptions || data.recent_redemptions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">
                      Belum ada penukaran voucher.
                    </td>
                  </tr>
                ) : (
                  data.recent_redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800">{r.voucher_code}</div>
                        <div className="text-[10px] text-slate-500">{r.member_name}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap max-w-[150px] truncate" title={r.reward_title}>
                        {r.reward_title}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : r.status === 'used'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-red-600 whitespace-nowrap">
                        -{r.points_used}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
