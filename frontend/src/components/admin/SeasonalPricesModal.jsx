import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { api } from '@/utils/api';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  Moon,
  PartyPopper,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SeasonalPricesModal = ({ isOpen, onClose, room, onSuccess }) => {
  const [seasonalList, setSeasonalList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (room && isOpen) {
      if (room.seasonal_prices && Array.isArray(room.seasonal_prices)) {
        // Deep copy
        setSeasonalList(
          room.seasonal_prices.map((sp) => ({
            id: sp.id || null,
            season_name: sp.season_name || '',
            start_date: sp.start_date ? String(sp.start_date).split('T')[0] : '',
            end_date: sp.end_date ? String(sp.end_date).split('T')[0] : '',
            price: sp.price || '',
          }))
        );
      } else {
        setSeasonalList([]);
      }
    }
  }, [room, isOpen]);

  // Quick preset helper
  const handleAddPreset = (type) => {
    if (type === 'ramadan') {
      setSeasonalList((prev) => [
        ...prev,
        {
          season_name: 'Bulan Ramadhan',
          start_date: '2027-02-18',
          end_date: '2027-03-20',
          price: room?.price_ramadan || room?.price || '',
        },
      ]);
    } else if (type === 'new_year') {
      const year = new Date().getFullYear();
      setSeasonalList((prev) => [
        ...prev,
        {
          season_name: 'Malam Tahun Baru',
          start_date: `${year}-12-31`,
          end_date: `${year}-12-31`,
          price: room?.price_new_year || room?.price || '',
        },
      ]);
    } else {
      setSeasonalList((prev) => [
        ...prev,
        {
          season_name: '',
          start_date: '',
          end_date: '',
          price: '',
        },
      ]);
    }
  };

  const handleUpdateItem = (index, field, value) => {
    setSeasonalList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    setSeasonalList((prev) => prev.filter((_, i) => i !== index));
  };

  // Check if today falls in range
  const isCurrentlyActive = (startDate, endDate) => {
    if (!startDate || !endDate) return false;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return todayStr >= startDate && todayStr <= endDate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!room?.id) return;

    // Validation
    for (let i = 0; i < seasonalList.length; i++) {
      const item = seasonalList[i];
      if (!item.season_name.trim()) {
        toast.error(`Baris #${i + 1}: Nama periode wajib diisi`);
        return;
      }
      if (!item.start_date || !item.end_date) {
        toast.error(`Baris #${i + 1} (${item.season_name}): Tanggal mulai & berakhir wajib diisi`);
        return;
      }
      if (item.start_date > item.end_date) {
        toast.error(`Baris #${i + 1} (${item.season_name}): Tanggal mulai tidak boleh melebihi tanggal berakhir`);
        return;
      }
      if (!item.price || isNaN(item.price) || parseFloat(item.price) <= 0) {
        toast.error(`Baris #${i + 1} (${item.season_name}): Tarif per malam harus berupa angka positif`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await api.put(API_ENDPOINTS.ADMIN.ROOMS.SEASONAL_PRICES(room.id), {
        seasonal_prices: seasonalList,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Tarif rentang tanggal berhasil disimpan');
        if (onSuccess) {
          onSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan tarif rentang tanggal');
    } finally {
      setSubmitting(false);
    }
  };

  if (!room) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atur Harga Rentang Tanggal"
      subtitle={`Tipe Kamar: ${room.name} — Tarif Normal: Rp ${Number(room.price || 0).toLocaleString('id-ID')} / malam`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Banner */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Ketentuan Harga Berdasarkan Rentang Tanggal:</p>
            <p className="text-amber-800 leading-relaxed">
              Jika tamu melakukan reservasi atau check-in pada rentang tanggal yang telah Anda tentukan di bawah ini (misalnya bulan Ramadhan atau libur tahun baru), maka harga kamar akan otomatis menggunakan harga khusus tersebut untuk setiap malam yang bersangkutan.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Tambah Cepat:
          </span>
          <button
            type="button"
            onClick={() => handleAddPreset('ramadan')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition active:scale-95"
          >
            <Moon className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Ramadhan (Feb - Mar 2027)</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset('new_year')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold transition active:scale-95"
          >
            <PartyPopper className="w-3.5 h-3.5 text-purple-600" />
            <span>+ Malam Tahun Baru (31 Des)</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset('custom')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Rentang Bebas</span>
          </button>
        </div>

        {/* List of Seasonal Prices */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {seasonalList.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Belum Ada Tarif Rentang Tanggal</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Kamar ini saat ini hanya menggunakan tarif normal sebesar Rp {Number(room.price || 0).toLocaleString('id-ID')} / malam untuk semua tanggal.
              </p>
              <button
                type="button"
                onClick={() => handleAddPreset('custom')}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rentang Tanggal</span>
              </button>
            </div>
          ) : (
            seasonalList.map((item, idx) => {
              const activeNow = isCurrentlyActive(item.start_date, item.end_date);
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition ${
                    activeNow
                      ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/20'
                      : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.season_name || 'Rentang Tanggal Khusus'}
                      </span>
                      {activeNow && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-amber-600" />
                          Aktif Hari Ini
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {/* Season Name */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                        Nama Periode / Acara *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.season_name}
                        onChange={(e) => handleUpdateItem(idx, 'season_name', e.target.value)}
                        placeholder="Contoh: Bulan Ramadhan, Libur Nataru, High Season"
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>

                    {/* Start Date */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                        Tanggal Mulai *
                      </label>
                      <input
                        type="date"
                        required
                        value={item.start_date}
                        onChange={(e) => handleUpdateItem(idx, 'start_date', e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>

                    {/* End Date */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                        Tanggal Berakhir *
                      </label>
                      <input
                        type="date"
                        required
                        value={item.end_date}
                        onChange={(e) => handleUpdateItem(idx, 'end_date', e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>

                    {/* Price */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5 flex items-center justify-between">
                        <span>Tarif Kamar / Malam (IDR) *</span>
                        {item.price && !isNaN(item.price) && (
                          <span className="text-red-600 font-extrabold">
                            Rp {Number(item.price).toLocaleString('id-ID')}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(idx, 'price', e.target.value)}
                        placeholder="Contoh: 450000"
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Semua Tanggal Khusus'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
