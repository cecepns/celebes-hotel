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
  Lock,
  AlertTriangle,
  Tag,
  CreditCard,
  Building,
} from 'lucide-react';
import { Select } from '@/components/common/Select';
import { Skeleton } from '@/components/common/Skeleton';
import toast from 'react-hot-toast';

export const Reservation = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

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
  const [closedDates, setClosedDates] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Keep guest_name and guest_phone locked to user profile if authenticated
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        guest_name: user.name || prev.guest_name,
        guest_phone: user.phone || prev.guest_phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingRooms(true);
        // Fetch rooms, settings, and closed dates
        const [roomsRes, settingsRes, closedRes] = await Promise.all([
          request.get(API_ENDPOINTS.ROOMS.PUBLIC),
          request.get(API_ENDPOINTS.SETTINGS.PUBLIC),
          request.get(API_ENDPOINTS.CLOSED_DATES.PUBLIC),
        ]);

        if (roomsRes.success && roomsRes.data) {
          setRooms(roomsRes.data);
          if (roomsRes.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              room_type: prev.room_type || roomsRes.data[0].name,
            }));
          }
        }

        if (settingsRes.success && settingsRes.data?.hch_member_discount_percent) {
          setDiscountPercent(parseFloat(settingsRes.data.hch_member_discount_percent) || 10);
        }

        if (closedRes.success && closedRes.data) {
          setClosedDates(closedRes.data);
        }
      } catch (err) {
        console.error('Failed to load reservation data:', err);
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchData();
  }, []);

  // Check if chosen dates hit any closed dates
  const checkDateConflict = () => {
    if (!formData.check_in || !formData.check_out) return null;
    for (const cd of closedDates) {
      const isOverlapping = !(formData.check_in >= cd.end_date || formData.check_out <= cd.start_date);
      if (isOverlapping) {
        return cd;
      }
    }
    return null;
  };

  const conflictDate = checkDateConflict();

  // Price Calculation
  const selectedRoomObj = rooms.find((r) => r.name === formData.room_type) || rooms[0];
  const roomPrice = selectedRoomObj ? parseFloat(selectedRoomObj.price) : 350000;
  const d1 = new Date(formData.check_in);
  const d2 = new Date(formData.check_out);
  const nights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
  const baseSubtotal = roomPrice * nights * (parseInt(formData.num_rooms) || 1);
  const discountAmount = Math.round(baseSubtotal * (discountPercent / 100));
  const finalTotalPrice = Math.max(0, baseSubtotal - discountAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.guest_name || !formData.guest_phone || !formData.check_in || !formData.check_out || !formData.room_type) {
      toast.error('Harap lengkapi semua kolom wajib.');
      return;
    }

    if (conflictDate) {
      toast.error(`Tanggal yang dipilih ditutup untuk booking: ${conflictDate.reason}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await request.post(API_ENDPOINTS.MEMBER.RESERVATIONS, formData);
      if (res.success && res.data?.whatsapp_url) {
        toast.success('Reservasi berhasil dicatat! Menghubungkan ke WhatsApp resepsionis...');
        setTimeout(() => {
          window.open(res.data.whatsapp_url, '_blank');
        }, 800);
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
      <header className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800">Reservasi Kamar</h1>
            <p className="text-[10px] text-slate-400">Hotel Celebes Hasanuddin Makassar</p>
          </div>
        </div>

        {/* Member Discount Pill */}
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-2xs">
          <Tag className="w-3.5 h-3.5 text-amber-600" />
          <span>Diskon {discountPercent}% HCH</span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* HCH Member Discount Promo Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10">
            <Building className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-200">
                Keuntungan Eksklusif Member HCH
              </p>
              <h2 className="text-sm font-black mt-0.5">
                Hemat {discountPercent}% Khusus Reservasi Aplikasi
              </h2>
              <p className="text-[11px] text-white/90 mt-1 leading-snug">
                Pemesanan kamar lewat website/aplikasi HCH otomatis mendapatkan potongan diskon {discountPercent}% sebelum pelunasan cashless.
              </p>
            </div>
          </div>
        </div>

        {/* Closed Dates Warning Banner if any active */}
        {closedDates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pemberitahuan Tanggal Reservasi Hotel:</span>
            </div>
            {closedDates.map((cd) => (
              <p key={cd.id} className="text-[11px] text-amber-800/90 pl-5">
                • {cd.start_date} s/d {cd.end_date}: <strong>{cd.reason}</strong> (Belum dibuka)
              </p>
            ))}
          </div>
        )}

        {/* Room Types Showcase Cards */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider px-1">
            Pilih Tipe Kamar
          </h3>

          {loadingRooms ? (
            <div className="space-y-2.5">
              <Skeleton className="h-20 w-full" count={3} />
            </div>
          ) : (
            <div className="space-y-2.5">
              {rooms.map((room) => {
                const isSelected = formData.room_type === room.name;
                const originalP = parseFloat(room.price);
                const discountedP = originalP - Math.round(originalP * (discountPercent / 100));

                return (
                  <div
                    key={room.id}
                    onClick={() => setFormData({ ...formData, room_type: room.name })}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/60 border-red-500 ring-2 ring-red-500/20 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Bed className={`w-4 h-4 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-900">{room.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-[10px] text-slate-400 line-through">
                            Rp {Number(originalP).toLocaleString('id-ID')}
                          </span>
                          <span className="text-xs font-extrabold text-red-600">
                            Rp {Number(discountedP).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          Diskon Member {discountPercent}%
                        </span>
                      </div>
                    </div>
                    {room.description && (
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {room.description}
                      </p>
                    )}
                    {room.facilities && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {room.facilities.split(',').map((f, i) => (
                          <span
                            key={i}
                            className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
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
            Detail Pemesanan
          </h3>

          {/* Guest Name (Auto-locked if logged in) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Nama Tamu *</label>
              {isAuthenticated && (
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200/60">
                  <Lock className="w-2.5 h-2.5" /> Terkunci otomatis sesuai akun member
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                readOnly={isAuthenticated}
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="Masukkan nama lengkap"
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none transition ${
                  isAuthenticated
                    ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium'
                    : 'border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
              {isAuthenticated && (
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              )}
            </div>
          </div>

          {/* Guest Phone (Auto-locked if logged in) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Nomor WhatsApp / HP *</label>
              {isAuthenticated && (
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200/60">
                  <Lock className="w-2.5 h-2.5" /> Terkunci otomatis sesuai registrasi
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="tel"
                required
                readOnly={isAuthenticated}
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="Contoh: 081212127688"
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none transition ${
                  isAuthenticated
                    ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium'
                    : 'border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
              {isAuthenticated && (
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              )}
            </div>
          </div>

          {/* Dates Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-in *</label>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                  conflictDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-out *</label>
              <input
                type="date"
                required
                min={formData.check_in || new Date().toISOString().slice(0, 10)}
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                  conflictDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
            </div>
          </div>

          {/* Conflict Warning */}
          {conflictDate && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Tanggal reservasi ini ditutup ({conflictDate.reason})</p>
                <p className="text-[11px] mt-0.5">
                  Periode {conflictDate.start_date} s/d {conflictDate.end_date} saat ini belum dibuka untuk pemesanan kamar. Silakan ganti tanggal lain.
                </p>
              </div>
            </div>
          )}

          {/* Rooms and Guests Count */}
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
                options={[1, 2, 3, 4, 6, 8, 10].map((n) => ({ value: n, label: `${n} Orang` }))}
                value={formData.num_guests}
                onChange={(opt) => setFormData({ ...formData, num_guests: Number(opt.value) })}
                isSearchable={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Contoh: Permintaan double bed, early check-in, atau late check-out"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Realtime Pricing Breakdown Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800 pb-1.5 border-b border-slate-200">
              <span>Ringkasan Estimasi Biaya</span>
              <span className="text-[10px] text-slate-500 font-normal">{nights} Malam • {formData.num_rooms} Kamar</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Harga Normal:</span>
              <span>Rp {Number(baseSubtotal).toLocaleString('id-ID')}</span>
            </div>

            <div className="flex items-center justify-between text-emerald-600 font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Diskon Aplikasi HCH ({discountPercent}%):
              </span>
              <span>-Rp {Number(discountAmount).toLocaleString('id-ID')}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-sm text-slate-900">
              <span>Total Pelunasan (Cashless):</span>
              <span className="text-red-600">Rp {Number(finalTotalPrice).toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Cashless Notice */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-900">
            <CreditCard className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Ketentuan Pembayaran Cashless:</p>
              <p className="text-emerald-800/90 leading-relaxed mt-0.5">
                Pemesanan melalui aplikasi HCH mewajibkan pembayaran pelunasan non-tunai (Transfer / QRIS) sebelum check-in. Resepsionis akan memberikan nomor rekening/QRIS resmi.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !!conflictDate}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Memproses Reservasi...' : 'Kirim Booking & Konfirmasi ke WhatsApp'}
          </button>
        </form>
      </main>
    </div>
  );
};
