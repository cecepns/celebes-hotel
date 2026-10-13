import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  ArrowLeft,
  Bed,
  Calendar,
  Users,
  Send,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Select } from '@/components/common/Select';
import { Skeleton } from '@/components/common/Skeleton';
import toast from 'react-hot-toast';

export const Reservation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    guest_name: user?.name || '',
    guest_phone: user?.phone || '',
    room_type: '',
    check_in: new Date().toISOString().slice(0, 10),
    check_out: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    num_rooms: 1,
    num_guests: 2,
    notes: '',
  });

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await request.get(API_ENDPOINTS.ROOMS.PUBLIC);
        if (res.success && res.data && res.data.length > 0) {
          setRooms(res.data);
          setFormData((prev) => ({
            ...prev,
            room_type: prev.room_type || res.data[0].name,
          }));
        }
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.guest_name || !formData.guest_phone || !formData.check_in || !formData.check_out || !formData.room_type) {
      toast.error('Harap lengkapi semua kolom wajib.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.MEMBER.RESERVATIONS, formData);
      if (res.success && res.data?.whatsapp_url) {
        toast.success('Reservasi berhasil dicatat! Mengalihkan ke WhatsApp hotel...');
        setTimeout(() => {
          window.open(res.data.whatsapp_url, '_blank');
        }, 1000);
      } else {
        toast.success('Permintaan reservasi berhasil dikirim!');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal mengirim reservasi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Header */}
      <header className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-30">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-extrabold text-slate-800">Reservasi Kamar Hotel</h1>
          <p className="text-[10px] text-slate-400">Hotel Celebes Hasanuddin Makassar</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Room Types Showcase Cards */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider px-1">
            Pilihan Tipe Kamar
          </h3>

          {loadingRooms ? (
            <div className="space-y-2.5">
              <Skeleton className="h-20 w-full" count={3} />
            </div>
          ) : (
            <div className="space-y-2.5">
              {rooms.map((room) => {
                const isSelected = formData.room_type === room.name;

                return (
                  <div
                    key={room.id}
                    onClick={() => setFormData({ ...formData, room_type: room.name })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/50 border-red-500 ring-1 ring-red-500'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bed className={`w-4 h-4 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-800">{room.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-red-600">
                        Rp {Number(room.price).toLocaleString('id-ID')} / malam
                      </span>
                    </div>
                    {room.description && (
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {room.description}
                      </p>
                    )}
                    {room.facilities && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {room.facilities.split(',').map((f, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                          >
                            {f.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reservation Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Formulir Booking Kamar
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Tamu *</label>
            <input
              type="text"
              required
              value={formData.guest_name}
              onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
              placeholder="Masukkan nama lengkap"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP *</label>
            <input
              type="tel"
              required
              value={formData.guest_phone}
              onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
              placeholder="Contoh: 081212127688"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-in *</label>
              <input
                type="date"
                required
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-out *</label>
              <input
                type="date"
                required
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Kamar</label>
              <Select
                options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} Kamar` }))}
                value={formData.num_rooms}
                onChange={(opt) => setFormData({ ...formData, num_rooms: Number(opt.value) })}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Tamu</label>
              <Select
                options={[1, 2, 3, 4, 6, 8].map((n) => ({ value: n, label: `${n} Orang` }))}
                value={formData.num_guests}
                onChange={(opt) => setFormData({ ...formData, num_guests: Number(opt.value) })}
                isSearchable={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Contoh: Permintaan early check-in atau extra bed"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Menghubungkan...' : 'Kirim Reservasi ke WhatsApp Hotel'}
          </button>
        </form>
      </main>
    </div>
  );
};
