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
  CheckCircle2,
} from 'lucide-react';
import { Select } from '@/components/common/Select';
import toast from 'react-hot-toast';

export const AdminSettings = () => {
  const [settings, setSettings] = useState({
    points_per_unit: '5',
    spending_unit_amount: '50000',
    point_expiry_days: '365',
    reservation_mode: 'whatsapp',
    whatsapp_number: '6282189001285',
    hotel_name: 'Hotel Celebes Hasanuddin',
    hotel_tagline: 'Royalti Reward HCH',
    hotel_address: 'Jl. Sultan Hasanuddin No. 2 Makassar',
    hotel_phone: '+62411 3620770',
    instagram_username: 'celebeshtl',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-red-600" />
          Pengaturan Sistem Loyalty & Hotel
        </h2>
        <p className="text-xs text-slate-500">
          Konfigurasi rasio kelipatan poin, masa berlaku poin, WhatsApp hotel, dan reservasi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Point Calculation Rules */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Coins className="w-4 h-4 text-amber-500" />
            Konfigurasi Perolehan & Masa Aktif Poin
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Contoh: 5 poin (Rp 50rb = 5 poin) atau 1 poin (Rp 10rb = 1 poin)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Masa Berlaku Poin (Hari)
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="30"
                  value={settings.point_expiry_days}
                  onChange={(e) => setSettings({ ...settings, point_expiry_days: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Default: 365 hari (1 tahun dari tanggal perolehan transaksi)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mode Fitur Reservasi
              </label>
              <Select
                options={[
                  { value: 'whatsapp', label: 'Direct WhatsApp Resepsionis (Rekomendasi)' },
                  { value: 'system', label: 'Penyimpanan Database Internal Saja' },
                  { value: 'disabled', label: 'Nonaktifkan Sementara' },
                ]}
                value={settings.reservation_mode}
                onChange={(opt) => setSettings({ ...settings, reservation_mode: opt.value })}
                isSearchable={false}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Sesuai request client saat ini: redirect ke WhatsApp
              </p>
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline Program</label>
              <input
                type="text"
                value={settings.hotel_tagline}
                onChange={(e) => setSettings({ ...settings, hotel_tagline: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telepon Kantor</label>
              <input
                type="text"
                value={settings.hotel_phone}
                onChange={(e) => setSettings({ ...settings, hotel_phone: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Hotel</label>
              <input
                type="text"
                value={settings.hotel_address}
                onChange={(e) => setSettings({ ...settings, hotel_address: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
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
