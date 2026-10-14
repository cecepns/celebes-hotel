import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Bed,
  Headset,
  Coins,
  Gift,
  Trophy,
  Receipt,
  ChevronRight,
  Clock,
  Crown,
  Sparkles,
  Utensils,
  ShoppingBag,
  Shirt,
  CalendarCheck,
  ChevronDown,
  Info,
  ExternalLink,
  Building2,
} from 'lucide-react';

export const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({
    total_points: user?.total_points || 0,
    expiring_points_30d: 0,
  });
  const [settings, setSettings] = useState({
    spending_unit_amount: '50000',
    points_per_unit: '5',
    hch_member_discount_percent: '10',
    whatsapp_number: '6282189001285',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardAndSettings = async () => {
      try {
        const setRes = await request.get(API_ENDPOINTS.PUBLIC.SETTINGS);
        if (setRes.success && setRes.data) {
          setSettings(setRes.data);
        }

        if (isAuthenticated) {
          const dashRes = await request.get(API_ENDPOINTS.MEMBER.DASHBOARD);
          if (dashRes.success && dashRes.data) {
            setDashboard(dashRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardAndSettings();
  }, [isAuthenticated]);

  // Dynamic calculations
  const unitAmount = Number(settings.spending_unit_amount) || 50000;
  const pointsPerUnit = Number(settings.points_per_unit) || 5;
  const exampleAmount = 350000;
  const exampleUnits = Math.floor(exampleAmount / unitAmount);
  const examplePoints = exampleUnits * pointsPerUnit;
  const exampleLeftover = exampleAmount % unitAmount;

  // 6 Main Grid Menus matching flyer smartphone screen
  const menuButtons = [
    {
      id: 'reservation',
      title: 'Reservation',
      icon: Bed,
      color: 'text-indigo-900',
      bgColor: 'bg-indigo-50',
      to: '/reservation',
    },
    {
      id: 'contact',
      title: 'Contact Us',
      icon: Headset,
      color: 'text-indigo-900',
      bgColor: 'bg-indigo-50',
      to: '/contact-us',
    },
    {
      id: 'points',
      title: 'Poin Saya Saat Ini',
      icon: Coins,
      color: 'text-indigo-900',
      bgColor: 'bg-indigo-50',
      to: '/points-detail',
    },
    {
      id: 'rewards',
      title: 'List Reward',
      icon: Gift,
      color: 'text-indigo-900',
      bgColor: 'bg-indigo-50',
      to: '/rewards',
    },
    {
      id: 'missions',
      title: 'Mission Reward',
      icon: Trophy,
      color: 'text-indigo-900',
      bgColor: 'bg-indigo-50',
      to: '/missions',
    },
    {
      id: 'transactions',
      title: 'Riwayat Transaksi',
      icon: Receipt,
      color: 'text-indigo-900',
      bgColor: 'bg-indigo-50',
      to: '/transactions',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-24">
      {/* Top Header - Matches Flyer Header */}
      <header className="bg-white px-5 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <img src="/logo-hch.jpeg" alt="Celebes Hotel" className="h-9 w-auto object-contain rounded-md" />
        </div>
        <div className="text-right">
          <div className="text-[13px] font-extrabold text-slate-800 tracking-tight leading-none">
            Royalti <span className="text-slate-300">|</span> <span className="text-red-600">Reward HCH</span>
          </div>
          <div className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
            Hotel Celebes Hasanuddin
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Guest Greeting / Member Status */}
        {isAuthenticated ? (
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-xs text-slate-500">Selamat Datang,</p>
              <h2 className="text-base font-extrabold text-slate-800">{user?.name}</h2>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                {user?.member_code}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-md">
            <div>
              <p className="text-xs font-semibold text-red-100">Gabung Royalti Reward HCH</p>
              <p className="text-sm font-bold mt-0.5">Dapatkan Poin & Beragam Voucher</p>
            </div>
            <Link
              to="/login"
              className="px-3.5 py-1.5 bg-white text-red-600 text-xs font-bold rounded-xl shadow hover:bg-red-50 transition"
            >
              Masuk / Daftar
            </Link>
          </div>
        )}

        {/* ============================================================== */}
        {/* POINT CARD CONTAINER (Exact Visual Reproduction from Flyer)     */}
        {/* ============================================================== */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-blue-900/20 bg-white">
          {/* Top Section: Deep Blue Gradient Card with Crown & Current Points */}
          <button
            type="button"
            onClick={() => navigate('/points-detail')}
            className="w-full bg-gradient-to-r from-[#003882] via-[#004ca8] to-[#005bbd] p-5 text-white text-left relative overflow-hidden transition active:scale-[0.99]"
          >
            {/* Background subtle crown watermark */}
            <Crown className="absolute -right-3 -bottom-4 w-28 h-28 text-white/5 pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-900/30">
                  <Crown className="w-5 h-5 fill-white stroke-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-100 uppercase tracking-wide">
                    Poin Saya Saat Ini
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight mt-0.5 text-white flex items-baseline gap-1">
                    {Number(dashboard.total_points).toLocaleString('id-ID')}
                    <span className="text-xs font-medium text-blue-200">pts</span>
                  </div>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* Bottom Section: White Bar with Red Clock & Expiring Points */}
          <button
            type="button"
            onClick={() => navigate('/points-detail')}
            className="w-full bg-white px-5 py-3.5 border-t border-slate-100 text-left flex items-center justify-between hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700">Poin akan expire (30 hari)</div>
                <div className="text-xs font-bold text-red-600">
                  {Number(dashboard.expiring_points_30d).toLocaleString('id-ID')} Poin
                </div>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* 6 MAIN ACTION BUTTONS GRID (Exact 2x3 Grid from Flyer)         */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {menuButtons.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => navigate(btn.to)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col items-center justify-center text-center group active:scale-[0.98]"
              >
                <div className="w-13 h-13 rounded-2xl bg-indigo-50/80 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-900 mb-2.5 transition-colors">
                  <Icon className="w-7 h-7 stroke-[2]" />
                </div>
                <span className="text-xs font-bold text-slate-800 tracking-tight leading-snug group-hover:text-red-600 transition-colors">
                  {btn.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* BENEFIT KEANGGOTAAN (From Flyer Section)                       */}
        {/* ============================================================== */}
        <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Benefit Keanggotaan HCH
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Royalti Reward</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-slate-800">Kumpul Poin</div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Dapatkan poin dari transaksi Kamar, F&B, Drugstore & Laundry.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-slate-800">Tukar Reward</div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Poin khusus penukaran voucher reward (tidak dapat diuangkan / ditunaikan).
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-slate-800">Diskon Khusus APK</div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Diskon {settings.hch_member_discount_percent || 10}% saat reservasi via aplikasi HCH.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-slate-800">Masa Aktif 1 Tahun</div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Poin berlaku 1 tahun (365 hari) sejak transaksi.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* CARA MENDAPATKAN POINT & SIMULASI DINAMIS                      */}
        {/* ============================================================== */}
        <section className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-red-400 tracking-wider uppercase">
                Rumus Perolehan Poin
              </span>
              <h4 className="text-sm font-extrabold mt-0.5">
                Kelipatan Rp {unitAmount.toLocaleString('id-ID')} = {pointsPerUnit} Point
              </h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
            <div className="bg-white/10 p-2 rounded-xl">
              <Building2 className="w-4 h-4 mx-auto mb-1 text-blue-300" />
              <div className="text-[9px] sm:text-[10px] font-semibold">Menginap</div>
            </div>
            <div className="bg-white/10 p-2 rounded-xl">
              <Bed className="w-4 h-4 mx-auto mb-1 text-indigo-300" />
              <div className="text-[9px] sm:text-[10px] font-semibold whitespace-nowrap">Extra Bed</div>
            </div>
            <div className="bg-white/10 p-2 rounded-xl">
              <Utensils className="w-4 h-4 mx-auto mb-1 text-amber-300" />
              <div className="text-[9px] sm:text-[10px] font-semibold">F&B Resto</div>
            </div>
            <div className="bg-white/10 p-2 rounded-xl">
              <ShoppingBag className="w-4 h-4 mx-auto mb-1 text-emerald-300" />
              <div className="text-[9px] sm:text-[10px] font-semibold">Drugstore</div>
            </div>
            <div className="bg-white/10 p-2 rounded-xl">
              <Shirt className="w-4 h-4 mx-auto mb-1 text-cyan-300" />
              <div className="text-[9px] sm:text-[10px] font-semibold">Laundry</div>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 text-[11px] leading-relaxed text-slate-200 border border-white/10">
            <span className="font-bold text-white">Contoh: </span>
            Transaksi Rp {exampleAmount.toLocaleString('id-ID')} = {exampleUnits} kelipatan ({(exampleUnits * unitAmount).toLocaleString('id-ID')}) &times; {pointsPerUnit} point ={' '}
            <span className="text-amber-300 font-bold">{examplePoints} Point</span>.
            {exampleLeftover > 0 && ` Sisa Rp ${exampleLeftover.toLocaleString('id-ID')} belum mencapai batas kelipatan.`}
          </div>

          {/* Ketentuan: Poin Hanya untuk Reward & Tidak Dapat Ditunaikan */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-[11px] leading-relaxed">
            <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 uppercase tracking-wide text-[10px] block mb-0.5">
                Ketentuan Penukaran Poin:
              </span>
              Poin ini <strong>hanya berlaku untuk penukaran reward / voucher</strong> di katalog (seperti diskon kamar, F&B, drugstore, laundry, upgrade kamar, dan kamar gratis) serta <strong>tidak dapat diuangkan / ditunaikan</strong> dalam bentuk tunai.
            </div>
          </div>
        </section>

        {/* Hotel Location & Social Footer Box */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 text-center space-y-2">
          <p className="text-xs font-extrabold text-slate-800">Hotel Celebes Hasanuddin</p>
          <p className="text-[11px] text-slate-500">Jl. Sultan Hasanuddin No. 2 Makassar</p>
          <div className="flex items-center justify-center gap-4 pt-1">
            <a
              href="https://instagram.com/celebeshtl"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
            >
              @celebeshtl
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://wa.me/6282189001285"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              WA: +62821 8900 1285
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};
