import React, { useState, useEffect } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Settings,
  Save,
  Coins,
  Clock,
  Phone,
  Building,
  Share2,
  Percent,
  Calculator,
  CalendarX,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Select } from '@/components/common/Select';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const AdminSettings = () => {
  const [settings, setSettings] = useState({
    points_per_unit: '5',
    spending_unit_amount: '50000',
    point_expiry_days: '365',
    reservation_mode: 'whatsapp',
    hch_member_discount_percent: '10',
    whatsapp_number: '6282189001285',
    hotel_name: 'Hotel Celebes Hasanuddin',
    hotel_tagline: 'Royalti Reward HCH',
    hotel_address: 'Jl. Sultan Hasanuddin No. 2 Makassar',
    hotel_phone: '+62411 3620770',
    instagram_username: 'celebeshtl',
    payment_bank_name: 'Bank BCA',
    payment_bank_account: '123-456-7890',
    payment_account_name: 'Hotel Celebes Hasanuddin',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulationAmount, setSimulationAmount] = useState('350000');
  const [simulationRoomPrice, setSimulationRoomPrice] = useState('500000');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.ADMIN.SETTINGS.GET);
      if (res.success && res.data) {
        const map = {};
        res.data.forEach((s) => {
          map[s.setting_key] = s.setting_value;
        });
        setSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      toast.error('Gagal mengambil pengaturan sistem');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = Object.keys(settings).map((key) => ({
        setting_key: key,
        setting_value: settings[key],
      }));

      const res = await request.put(API_ENDPOINTS.ADMIN.SETTINGS.UPDATE, {
        settings: payload,
      });

      if (res.success) {
        toast.success('Pengaturan sistem berhasil disimpan!');
      }
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  // Calculation simulation
  const numSpendUnit = Number(settings.spending_unit_amount) || 50000;
  const numPtsUnit = Number(settings.points_per_unit) || 5;
  const numSimSpend = Number(simulationAmount) || 0;
  const simPoints = Math.floor(numSimSpend / (numSpendUnit || 1)) * numPtsUnit;
  const simLeftover = numSpendUnit > 0 ? numSimSpend % numSpendUnit : 0;

  const numDiscountPct = Number(settings.hch_member_discount_percent) || 0;
  const numRoomPrice = Number(simulationRoomPrice) || 0;
  const simDiscountAmt = Math.round((numRoomPrice * numDiscountPct) / 100);
  const simFinalPrice = numRoomPrice - simDiscountAmt;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-600" />
            Pengaturan Sistem Loyalty & Hotel HCH
          </h2>
          <p className="text-xs text-slate-500">
            Konfigurasi rasio kelipatan poin, diskon aplikasi HCH, WhatsApp hotel, dan reservasi.
          </p>
        </div>

        <Link
          to="/admin/reservations"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition self-start sm:self-auto"
        >
          <CalendarX className="w-4 h-4 text-amber-600" />
          <span>Kelola Buka/Tutup Tgl Reservasi</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Point Calculation Rules */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Coins className="w-4 h-4 text-amber-500" />
            Konfigurasi Perolehan Poin & Diskon Reservasi HCH
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nominal Belanja Per Kelipatan (IDR)
              </label>
              <input
                type="number"
                required
                min="1000"
                value={settings.spending_unit_amount}
                onChange={(e) => setSettings({ ...settings, spending_unit_amount: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Contoh: Rp 50.000 atau Rp 10.000
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Poin Yang Diperoleh Per Kelipatan
              </label>
              <input
                type="number"
                required
                min="1"
                value={settings.points_per_unit}
                onChange={(e) => setSettings({ ...settings, points_per_unit: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Contoh: 1 poin (Rp 10rb = 1 poin) atau 5 poin (Rp 50rb = 5 poin)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-red-600" />
                Diskon Member Reservasi via Aplikasi HCH (%)
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={settings.hch_member_discount_percent}
                onChange={(e) => setSettings({ ...settings, hch_member_discount_percent: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-bold text-red-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Persentase diskon harga kamar untuk tamu yang melakukan reservasi lewat aplikasi HCH.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Masa Berlaku Poin (Hari)
              </label>
              <input
                type="number"
                required
                min="30"
                value={settings.point_expiry_days}
                onChange={(e) => setSettings({ ...settings, point_expiry_days: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Default: 365 hari (1 tahun dari tanggal perolehan transaksi)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mode Fitur Reservasi
              </label>
              <Select
                options={[
                  { value: 'whatsapp', label: 'Direct WhatsApp Resepsionis + Catat Database (Rekomendasi)' },
                  { value: 'system', label: 'Penyimpanan Database Internal Saja' },
                  { value: 'disabled', label: 'Nonaktifkan Sementara' },
                ]}
                value={settings.reservation_mode}
                onChange={(opt) => setSettings({ ...settings, reservation_mode: opt.value })}
                isSearchable={false}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tamu mengisi formulir reservasi di web/apk HCH, langsung otomatis terhubung ke WhatsApp resepsionis untuk konfirmasi & pelunasan cashless.
              </p>
            </div>
          </div>
        </div>

        {/* Live Calculation Simulation Box */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white border border-slate-700 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Live Preview & Simulasi Perhitungan
            </h3>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
              Otomatis Mengikuti Input Di Atas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Simulasi Poin */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  Tes Transaksi Tamu:
                </span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  +{simPoints} Poin
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Coba Masukkan Nominal Belanja (IDR):</label>
                <input
                  type="number"
                  value={simulationAmount}
                  onChange={(e) => setSimulationAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-[11px] text-slate-300 space-y-1">
                <p>
                  Aturan Aktif: Tiap <strong>Rp {numSpendUnit.toLocaleString('id-ID')}</strong> ={' '}
                  <strong className="text-amber-300">{numPtsUnit} Poin</strong>.
                </p>
                <p className="text-slate-400">
                  Perhitungan: Floor(Rp {numSimSpend.toLocaleString('id-ID')} / {numSpendUnit.toLocaleString('id-ID')}) &times; {numPtsUnit} ={' '}
                  <strong className="text-emerald-400">{simPoints} Poin</strong>.
                  {simLeftover > 0 && ` (Sisa Rp ${simLeftover.toLocaleString('id-ID')} belum genap kelipatan).`}
                </p>
              </div>
            </div>

            {/* Simulasi Diskon HCH */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-red-400" />
                  Tes Diskon Reservasi Kamar:
                </span>
                <span className="text-xs font-black text-red-400 bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-500/30">
                  Hemat Rp {simDiscountAmt.toLocaleString('id-ID')} ({numDiscountPct}%)
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Coba Masukkan Harga Kamar Normal (IDR):</label>
                <input
                  type="number"
                  value={simulationRoomPrice}
                  onChange={(e) => setSimulationRoomPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-[11px] text-slate-300 space-y-1">
                <p>
                  Diskon Khusus Aplikasi HCH: <strong className="text-red-300">{numDiscountPct}%</strong>.
                </p>
                <p className="text-slate-400">
                  Tamu Member hanya membayar:{' '}
                  <strong className="text-white">Rp {simFinalPrice.toLocaleString('id-ID')}</strong> (Sebelum check-in via cashless).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Hotel Contact Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-red-600" />
            Informasi Resmi Hotel & Layanan Tamu
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Hotel</label>
              <input
                type="text"
                value={settings.hotel_name}
                onChange={(e) => setSettings({ ...settings, hotel_name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline Program</label>
              <input
                type="text"
                value={settings.hotel_tagline}
                onChange={(e) => setSettings({ ...settings, hotel_tagline: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor WhatsApp Reservasi (Format: 62...)
              </label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telepon Kantor</label>
              <input
                type="text"
                value={settings.hotel_phone}
                onChange={(e) => setSettings({ ...settings, hotel_phone: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username Instagram
              </label>
              <input
                type="text"
                value={settings.instagram_username}
                onChange={(e) => setSettings({ ...settings, instagram_username: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Hotel</label>
              <input
                type="text"
                value={settings.hotel_address}
                onChange={(e) => setSettings({ ...settings, hotel_address: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Rekening Pembayaran Cashless Reservasi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Rekening Bank Pembayaran Cashless (Untuk Draf Pesan WhatsApp Reservasi)
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Informasi rekening resmi ini akan otomatis tercantum pada draf pesan WhatsApp saat staf resepsionis menekan tombol <strong>"Chat WA & Minta Pelunasan"</strong> di menu Reservasi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank</label>
              <input
                type="text"
                placeholder="Contoh: Bank BCA / Mandiri / BRI"
                value={settings.payment_bank_name || ''}
                onChange={(e) => setSettings({ ...settings, payment_bank_name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label>
              <input
                type="text"
                placeholder="Contoh: 123-456-7890"
                value={settings.payment_bank_account || ''}
                onChange={(e) => setSettings({ ...settings, payment_bank_account: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama Rekening (a/n)</label>
              <input
                type="text"
                placeholder="Contoh: Hotel Celebes Hasanuddin"
                value={settings.payment_account_name || ''}
                onChange={(e) => setSettings({ ...settings, payment_account_name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl text-xs text-emerald-950">
            <span className="font-extrabold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Pratinjau Teks Rekening di WhatsApp:
            </span>
            <div className="mt-1.5 font-mono text-xs bg-white p-2.5 rounded-lg border border-emerald-200 text-slate-800 shadow-2xs">
              {settings.payment_bank_name || 'Bank BCA'}: {settings.payment_bank_account || '123-456-7890'} a/n {settings.payment_account_name || 'Hotel Celebes Hasanuddin'}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
};
