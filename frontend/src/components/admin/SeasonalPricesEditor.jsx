import React from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Moon,
  PartyPopper,
  CheckCircle2,
} from 'lucide-react';

export const SeasonalPricesEditor = ({
  items = [],
  onChange,
  normalPrice = '',
}) => {
  const handleAddPreset = (type) => {
    if (type === 'ramadan') {
      onChange([
        ...items,
        {
          season_name: 'Bulan Ramadhan',
          start_date: '2027-02-18',
          end_date: '2027-03-20',
          price: normalPrice || '',
        },
      ]);
    } else if (type === 'new_year') {
      const year = new Date().getFullYear();
      onChange([
        ...items,
        {
          season_name: 'Malam Tahun Baru',
          start_date: `${year}-12-31`,
          end_date: `${year}-12-31`,
          price: normalPrice || '',
        },
      ]);
    } else {
      onChange([
        ...items,
        {
          season_name: '',
          start_date: '',
          end_date: '',
          price: '',
        },
      ]);
    }
  };

  const handleUpdate = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemove = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const isCurrentlyActive = (startDate, endDate) => {
    if (!startDate || !endDate) return false;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return todayStr >= startDate && todayStr <= endDate;
  };

  return (
    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Tarif Khusus Berdasarkan Rentang Tanggal</span>
            <span className="text-[10px] text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded font-medium">Opsional</span>
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tentukan harga khusus yang otomatis berlaku jika tamu check-in pada rentang tanggal tertentu (cth: Ramadhan, Tahun Baru).
          </p>
        </div>

        {/* Preset quick buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAddPreset('ramadan')}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold transition"
          >
            <Moon className="w-3 h-3 text-emerald-600" />
            <span>+ Ramadhan</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset('new_year')}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-semibold transition"
          >
            <PartyPopper className="w-3 h-3 text-purple-600" />
            <span>+ Thn Baru</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset('custom')}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition"
          >
            <Plus className="w-3 h-3 text-slate-500" />
            <span>+ Rentang Bebas</span>
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-4 px-3 border border-dashed border-slate-300 rounded-xl bg-white text-slate-400 text-xs">
          Belum ada tarif rentang tanggal khusus. Kamar akan selalu menggunakan tarif normal.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {items.map((item, idx) => {
            const activeNow = isCurrentlyActive(item.start_date, item.end_date);
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition ${
                  activeNow
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {item.season_name || `Rentang Tanggal #${idx + 1}`}
                    </span>
                    {activeNow && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5 text-amber-600" />
                        Aktif Hari Ini
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      value={item.season_name}
                      onChange={(e) => handleUpdate(idx, 'season_name', e.target.value)}
                      placeholder="Nama Periode (misal: Bulan Ramadhan 1448 H)"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Tgl Mulai</label>
                    <input
                      type="date"
                      required
                      value={item.start_date}
                      onChange={(e) => handleUpdate(idx, 'start_date', e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Tgl Berakhir</label>
                    <input
                      type="date"
                      required
                      value={item.end_date}
                      onChange={(e) => handleUpdate(idx, 'end_date', e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-slate-500 mb-0.5 flex items-center justify-between">
                      <span>Tarif Kamar / Malam (IDR)</span>
                      {item.price && !isNaN(item.price) && (
                        <span className="font-bold text-red-600 text-[11px]">
                          Rp {Number(item.price).toLocaleString('id-ID')}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.price}
                      onChange={(e) => handleUpdate(idx, 'price', e.target.value)}
                      placeholder="Contoh: 450000"
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
