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
  PlusCircle,
  CalendarDays,
  Pencil,
  Trash2,
  Clock,
  MessageCircle,
  LogIn,
  Upload,
  Eye,
  Moon,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '@/utils/api';
import { Select } from '@/components/common/Select';
import { Skeleton } from '@/components/common/Skeleton';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import toast from 'react-hot-toast';

// Helper format DD Mon YYYY (e.g. 31 Des 2026)
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const formatDateID = (dateStr) => {
  if (!dateStr) return '-';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const day = parts[2];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    const monthName = MONTH_NAMES[monthIdx] || parts[1];
    return `${day} ${monthName} ${year}`;
  }
  return clean;
};

// Helper Media URL
const getMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  return `${base}${url}`;
};

// Helper: Calculate seasonal pricing matching backend rules
const calculateSeasonalPricing = (roomObj, checkIn, checkOut, numRooms = 1, discountPct = 0, settings = {}) => {
  if (!roomObj || !checkIn || !checkOut) {
    return {
      nights: 1,
      normalNights: 1,
      ramadanNights: 0,
      newYearNights: 0,
      customSeasonalNights: 0,
      customSeasonalNames: [],
      normalPrice: 350000,
      ramadanPrice: 350000,
      newYearPrice: 350000,
      baseSubtotal: 350000,
      discountAmount: 0,
      finalTotalPrice: 350000,
      dailyBreakdown: [],
    };
  }

  const normalPrice = parseFloat(roomObj.price) || 350000;
  const ramadanPrice = roomObj.price_ramadan !== null && roomObj.price_ramadan !== undefined && roomObj.price_ramadan !== ''
    ? parseFloat(roomObj.price_ramadan)
    : normalPrice;
  const newYearPrice = roomObj.price_new_year !== null && roomObj.price_new_year !== undefined && roomObj.price_new_year !== ''
    ? parseFloat(roomObj.price_new_year)
    : normalPrice;

  const ramadanStart = settings?.ramadan_start_date ? String(settings.ramadan_start_date).split('T')[0] : null;
  const ramadanEnd = settings?.ramadan_end_date ? String(settings.ramadan_end_date).split('T')[0] : null;
  const newYearDate = settings?.new_year_date ? String(settings.new_year_date).split('T')[0] : '12-31';

  const seasonalPrices = Array.isArray(roomObj.seasonal_prices) ? roomObj.seasonal_prices : [];

  const cleanCheckIn = String(checkIn).split('T')[0];
  const cleanCheckOut = String(checkOut).split('T')[0];

  let current = new Date(cleanCheckIn + 'T12:00:00');
  const end = new Date(cleanCheckOut + 'T12:00:00');

  let nights = 0;
  let baseTotalPerRoom = 0;
  let ramadanNights = 0;
  let newYearNights = 0;
  let customSeasonalNights = 0;
  let normalNights = 0;
  let customSeasonalNames = new Set();
  const dailyBreakdown = [];

  while (current < end) {
    nights++;
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const monthDay = `${mm}-${dd}`;

    // 1. Priority 1: Custom date range for this room
    const matchedSeason = seasonalPrices.find((sp) => {
      const spStart = String(sp.start_date).split('T')[0];
      const spEnd = String(sp.end_date).split('T')[0];
      return dateStr >= spStart && dateStr <= spEnd;
    });

    if (matchedSeason) {
      const spPrice = parseFloat(matchedSeason.price);
      baseTotalPerRoom += spPrice;
      customSeasonalNights++;
      customSeasonalNames.add(matchedSeason.season_name);
      if (
        matchedSeason.season_name.toLowerCase().includes('ramadan') ||
        matchedSeason.season_name.toLowerCase().includes('puasa')
      ) {
        ramadanNights++;
      } else if (matchedSeason.season_name.toLowerCase().includes('tahun baru')) {
        newYearNights++;
      }
      dailyBreakdown.push({ date: dateStr, price: spPrice, name: matchedSeason.season_name, type: 'custom_seasonal' });
    } else if (monthDay === '12-31' || dateStr === newYearDate) {
      baseTotalPerRoom += newYearPrice;
      newYearNights++;
      dailyBreakdown.push({ date: dateStr, price: newYearPrice, name: 'Malam Tahun Baru', type: 'new_year' });
    } else if (ramadanStart && ramadanEnd && dateStr >= ramadanStart && dateStr <= ramadanEnd) {
      baseTotalPerRoom += ramadanPrice;
      ramadanNights++;
      dailyBreakdown.push({ date: dateStr, price: ramPrice, name: 'Bulan Ramadhan', type: 'ramadan' });
    } else {
      baseTotalPerRoom += normalPrice;
      normalNights++;
      dailyBreakdown.push({ date: dateStr, price: normalPrice, name: 'Tarif Reguler', type: 'normal' });
    }
    current.setDate(current.getDate() + 1);
  }

  nights = Math.max(1, nights);
  if (baseTotalPerRoom === 0) baseTotalPerRoom = normalPrice * nights;
  const baseSubtotal = baseTotalPerRoom * (parseInt(numRooms) || 1);
  const discountAmount = Math.round(baseSubtotal * ((discountPct || 0) / 100));
  const finalTotalPrice = Math.max(0, baseSubtotal - discountAmount);

  return {
    nights,
    normalNights,
    ramadanNights,
    newYearNights,
    customSeasonalNights,
    customSeasonalNames: Array.from(customSeasonalNames),
    normalPrice,
    ramadanPrice,
    newYearPrice,
    baseSubtotal,
    discountAmount,
    finalTotalPrice,
    dailyBreakdown,
  };
};

export const Reservation = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Active Tab: 'new' (Booking Baru) or 'list' (Reservasi Saya)
  const [activeTab, setActiveTab] = useState('new');

  // New Booking Form State
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
  const [hotelSettings, setHotelSettings] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // My Reservations State
  const [myReservations, setMyReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    room_type: '',
    check_in: '',
    check_out: '',
    num_rooms: 1,
    num_guests: 2,
    notes: '',
  });

  // Delete Confirm Dialog State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Payment Proof Modal State
  const [uploadProofModalOpen, setUploadProofModalOpen] = useState(false);
  const [selectedReservationForProof, setSelectedReservationForProof] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [previewProofModalOpen, setPreviewProofModalOpen] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState(null);

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

  // Fetch rooms, settings, closed dates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingRooms(true);
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

        if (settingsRes.success && settingsRes.data) {
          setHotelSettings(settingsRes.data);
          if (settingsRes.data.hch_member_discount_percent !== undefined && settingsRes.data.hch_member_discount_percent !== null) {
            const parsed = parseFloat(settingsRes.data.hch_member_discount_percent);
            setDiscountPercent(isNaN(parsed) ? 10 : Math.max(0, Math.min(100, parsed)));
          }
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

  // Fetch Member's Reservations
  const fetchMyReservations = async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingReservations(true);
      const res = await request.get(API_ENDPOINTS.MEMBER.RESERVATIONS);
      if (res.success && res.data) {
        setMyReservations(res.data);
      }
    } catch (err) {
      console.warn('Failed to load member reservations:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyReservations();
    }
  }, [isAuthenticated]);

  // Check if chosen dates hit any closed dates for new booking
  const checkDateConflict = () => {
    if (!formData.check_in || !formData.check_out) return null;
    const cleanCheckIn = String(formData.check_in).split('T')[0];
    const cleanCheckOut = String(formData.check_out).split('T')[0];

    for (const cd of closedDates) {
      const cdStart = String(cd.start_date).split('T')[0];
      const cdEnd = String(cd.end_date).split('T')[0];
      const isOverlapping = !(cleanCheckIn >= cdEnd || cleanCheckOut <= cdStart);
      if (isOverlapping) {
        return cd;
      }
    }
    return null;
  };

  const conflictDate = checkDateConflict();

  // Price Calculation for New Booking (with Ramadan & New Year Rates)
  const selectedRoomObj = rooms.find((r) => r.name === formData.room_type) || rooms[0];
  const newBookingPricing = calculateSeasonalPricing(
    selectedRoomObj,
    formData.check_in,
    formData.check_out,
    formData.num_rooms,
    discountPercent,
    hotelSettings
  );
  const nights = newBookingPricing.nights;
  const baseSubtotal = newBookingPricing.baseSubtotal;
  const discountAmount = newBookingPricing.discountAmount;
  const finalTotalPrice = newBookingPricing.finalTotalPrice;

  // Price Calculation for Edit Modal (with Ramadan & New Year Rates)
  const editSelectedRoomObj = rooms.find((r) => r.name === editForm.room_type) || rooms[0];
  const editBookingPricing = calculateSeasonalPricing(
    editSelectedRoomObj,
    editForm.check_in,
    editForm.check_out,
    editForm.num_rooms,
    discountPercent,
    hotelSettings
  );
  const editNights = editBookingPricing.nights;
  const editBaseSubtotal = editBookingPricing.baseSubtotal;
  const editDiscountAmount = editBookingPricing.discountAmount;
  const editFinalPrice = editBookingPricing.finalTotalPrice;

  // Payment Proof Handlers
  const handleOpenUploadProof = (r) => {
    setSelectedReservationForProof(r);
    setProofFile(null);
    setProofPreview(null);
    setUploadProofModalOpen(true);
  };

  const handleProofFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!selectedReservationForProof || !proofFile) {
      toast.error('Silakan pilih file foto/gambar bukti transfer bank');
      return;
    }

    try {
      setUploadingProof(true);
      const data = new FormData();
      data.append('payment_proof', proofFile);

      const res = await api.post(
        API_ENDPOINTS.MEMBER.UPLOAD_PAYMENT_PROOF(selectedReservationForProof.id),
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (res.data?.success) {
        toast.success(res.data.message || 'Bukti transfer berhasil diunggah!');
        setUploadProofModalOpen(false);
        fetchMyReservations();
      } else {
        toast.error(res.data?.message || 'Gagal mengunggah bukti transfer');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah bukti transfer');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleOpenProofPreview = (proofUrl) => {
    setPreviewProofUrl(getMediaUrl(proofUrl));
    setPreviewProofModalOpen(true);
  };

  // Check if edit dates hit closed dates
  const checkEditDateConflict = () => {
    if (!editForm.check_in || !editForm.check_out) return null;
    const cleanCheckIn = String(editForm.check_in).split('T')[0];
    const cleanCheckOut = String(editForm.check_out).split('T')[0];

    for (const cd of closedDates) {
      const cdStart = String(cd.start_date).split('T')[0];
      const cdEnd = String(cd.end_date).split('T')[0];
      const isOverlapping = !(cleanCheckIn >= cdEnd || cleanCheckOut <= cdStart);
      if (isOverlapping) {
        return cd;
      }
    }
    return null;
  };

  const editConflictDate = checkEditDateConflict();

  // Submit New Booking
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
      if (res.success) {
        toast.success('Reservasi berhasil dicatat! Membuka WhatsApp resepsionis...');
        fetchMyReservations();
        setActiveTab('list');
        if (res.data?.whatsapp_url) {
          setTimeout(() => {
            window.open(res.data.whatsapp_url, '_blank');
          }, 800);
        }
      } else {
        toast.success('Permintaan reservasi berhasil dikirim!');
        fetchMyReservations();
        setActiveTab('list');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal mengirim reservasi');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (r) => {
    setEditingReservation(r);
    setEditForm({
      room_type: r.room_type || (rooms[0]?.name || ''),
      check_in: String(r.check_in).slice(0, 10),
      check_out: String(r.check_out).slice(0, 10),
      num_rooms: r.num_rooms || 1,
      num_guests: r.num_guests || 2,
      notes: r.notes || '',
    });
    setEditModalOpen(true);
  };

  // Submit Edit Reservation
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReservation) return;

    if (editConflictDate) {
      toast.error(`Tanggal yang dipilih ditutup untuk booking: ${editConflictDate.reason}`);
      return;
    }

    try {
      setSubmittingEdit(true);
      const res = await request.put(API_ENDPOINTS.MEMBER.RESERVATION_ITEM(editingReservation.id), editForm);
      if (res.success) {
        toast.success('Data reservasi berhasil diperbarui!');
        setEditModalOpen(false);
        fetchMyReservations();
        if (res.data?.whatsapp_url) {
          toast((t) => (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span>Kirim update ke WhatsApp Resepsionis?</span>
              <button
                onClick={() => {
                  window.open(res.data.whatsapp_url, '_blank');
                  toast.dismiss(t.id);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shrink-0"
              >
                Kirim WA
              </button>
            </div>
          ), { duration: 6000 });
        }
      } else {
        toast.error(res.message || 'Gagal mengubah data reservasi');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal memperbarui reservasi');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Delete Confirm Dialog
  const handleOpenDelete = (r) => {
    setReservationToDelete(r);
    setDeleteConfirmOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!reservationToDelete) return;
    try {
      setDeletingLoading(true);
      const res = await request.delete(API_ENDPOINTS.MEMBER.RESERVATION_ITEM(reservationToDelete.id));
      if (res.success) {
        toast.success('Reservasi berhasil dibatalkan / dihapus');
        setMyReservations((prev) => prev.filter((item) => item.id !== reservationToDelete.id));
        setDeleteConfirmOpen(false);
        setReservationToDelete(null);
      } else {
        toast.error(res.message || 'Gagal membatalkan reservasi');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal menghapus reservasi');
    } finally {
      setDeletingLoading(false);
    }
  };

  // Open WhatsApp Chat for an Existing Reservation
  const handleChatReceptionist = (r) => {
    const waNumber = hotelSettings.whatsapp_number || '6282189001285';
    const discountText = r.discount_percent > 0 ? ` (Hemat Diskon ${r.discount_percent}%)` : '';
    const waText = encodeURIComponent(
      `Halo Resepsionis Hotel Celebes Hasanuddin,\nSaya ingin konfirmasi status reservasi kamar saya:\n` +
      `- ID Booking: #HCH-${r.id}\n` +
      `- Nama Tamu: ${r.guest_name}\n` +
      `- Tipe Kamar: ${r.room_type} (${r.num_rooms} Kamar)\n` +
      `- Check-In: ${formatDateID(r.check_in)}\n` +
      `- Check-Out: ${formatDateID(r.check_out)}\n` +
      `- Total Pelunasan: Rp ${Number(r.total_price || 0).toLocaleString('id-ID')}${discountText}\n` +
      `- Status: ${r.status?.toUpperCase()}\n\n` +
      `Mohon informasinya mengenai ketersediaan dan nomor rekening/QRIS untuk pelunasan cashless. Terima kasih!`
    );
    window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank');
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
        {discountPercent > 0 ? (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-2xs">
            <Tag className="w-3.5 h-3.5 text-amber-600" />
            <span>Diskon {discountPercent}% HCH</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span>Tarif Resmi Hotel</span>
          </div>
        )}
      </header>

      <main className="p-4 space-y-4">
        {/* Navigation Tabs: Booking Baru vs Reservasi Saya */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'new'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bed className="w-3.5 h-3.5 text-red-600" />
            <span>Booking Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-red-600" />
            <span>Reservasi Saya</span>
            {myReservations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">
                {myReservations.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: BOOKING BARU */}
        {activeTab === 'new' && (
          <>
            {/* Promo Banner */}
            {discountPercent > 0 ? (
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
            ) : (
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute right-[-10px] top-[-10px] opacity-10">
                  <Building className="w-24 h-24" />
                </div>
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Reservasi Resmi Hotel Celebes Hasanuddin
                    </p>
                    <h2 className="text-sm font-black mt-0.5">
                      Jaminan Harga Resmi & Konfirmasi Cepat
                    </h2>
                    <p className="text-[11px] text-white/80 mt-1 leading-snug">
                      Pemesanan langsung terhubung ke resepsionis dengan pelunasan mudah via transfer bank/QRIS cashless sebelum check-in.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Closed Dates Warning Banner if any active */}
            {closedDates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pemberitahuan Tanggal Reservasi Hotel:</span>
                </div>
                {closedDates.map((cd) => (
                  <p key={cd.id} className="text-[11px] text-amber-800/90 pl-5">
                    • {formatDateID(cd.start_date)} s/d {formatDateID(cd.end_date)}: <strong>{cd.reason}</strong> (Belum dibuka)
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
                          {discountPercent > 0 ? (
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
                          ) : (
                            <div className="text-right">
                              <span className="text-xs font-extrabold text-slate-900">
                                Rp {Number(originalP).toLocaleString('id-ID')}
                              </span>
                              <p className="text-[9px] text-slate-400 font-medium">/ malam</p>
                            </div>
                          )}
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

                        {room.seasonal_prices && room.seasonal_prices.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                            {room.seasonal_prices.map((sp, idx) => {
                              const isRamadan =
                                sp.season_name.toLowerCase().includes('ramadan') ||
                                sp.season_name.toLowerCase().includes('puasa');
                              const isNewYear = sp.season_name.toLowerCase().includes('tahun baru');
                              return (
                                <span
                                  key={idx}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border ${
                                    isRamadan
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                      : isNewYear
                                      ? 'bg-purple-50 text-purple-800 border-purple-200/80'
                                      : 'bg-amber-50 text-amber-800 border-amber-200/80'
                                  }`}
                                >
                                  {isRamadan ? '🌙' : isNewYear ? '🎉' : '📅'} {sp.season_name} ({sp.start_date} ~ {sp.end_date}): Rp {Number(sp.price).toLocaleString('id-ID')}
                                </span>
                              );
                            })}
                          </div>
                        ) : (room.price_ramadan || room.price_new_year) ? (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                            {room.price_ramadan && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                                🌙 Ramadhan: Rp {Number(room.price_ramadan).toLocaleString('id-ID')}
                              </span>
                            )}
                            {room.price_new_year && (
                              <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200/80 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                                🎉 Thn Baru: Rp {Number(room.price_new_year).toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>
                        ) : null}
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

              {/* Guest Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Nama Tamu *</label>
                  {isAuthenticated && (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200/60">
                      <Lock className="w-2.5 h-2.5" /> Akun Member
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

              {/* Guest Phone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Nomor WhatsApp / HP *</label>
                  {isAuthenticated && (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200/60">
                      <Lock className="w-2.5 h-2.5" /> Terkunci otomatis
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
                      Periode {formatDateID(conflictDate.start_date)} s/d {formatDateID(conflictDate.end_date)} saat ini belum dibuka untuk pemesanan kamar. Silakan ganti tanggal lain.
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

                {/* Seasonal Rates Breakdown if applicable */}
                {(newBookingPricing.customSeasonalNights > 0 || newBookingPricing.ramadanNights > 0 || newBookingPricing.newYearNights > 0) && (
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] space-y-1.5 text-slate-700">
                    <p className="font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Rincian Tarif Berdasarkan Musim / Rentang Tanggal:
                    </p>
                    {newBookingPricing.normalNights > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>• {newBookingPricing.normalNights} Malam Reguler (@ Rp {Number(newBookingPricing.normalPrice).toLocaleString('id-ID')})</span>
                        <span>Rp {Number(newBookingPricing.normalPrice * newBookingPricing.normalNights * (parseInt(formData.num_rooms) || 1)).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {newBookingPricing.dailyBreakdown && newBookingPricing.dailyBreakdown.filter(d => d.type === 'custom_seasonal').length > 0 ? (
                      newBookingPricing.customSeasonalNames.map((name, sIdx) => {
                        const itemsOfThisSeason = newBookingPricing.dailyBreakdown.filter(d => d.type === 'custom_seasonal' && d.name === name);
                        const count = itemsOfThisSeason.length;
                        const unitPrice = itemsOfThisSeason[0]?.price || 0;
                        const sub = unitPrice * count * (parseInt(formData.num_rooms) || 1);
                        const isRamadan = name.toLowerCase().includes('ramadan') || name.toLowerCase().includes('puasa');
                        const isNewYear = name.toLowerCase().includes('tahun baru');

                        return (
                          <div key={sIdx} className={`flex justify-between font-medium ${isRamadan ? 'text-emerald-900' : isNewYear ? 'text-purple-900' : 'text-amber-900'}`}>
                            <span>• {isRamadan ? '🌙' : isNewYear ? '🎉' : '✨'} {count} Malam {name} (@ Rp {Number(unitPrice).toLocaleString('id-ID')})</span>
                            <span>Rp {Number(sub).toLocaleString('id-ID')}</span>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        {newBookingPricing.ramadanNights > 0 && (
                          <div className="flex justify-between text-amber-900 font-medium">
                            <span>• 🌙 {newBookingPricing.ramadanNights} Malam Ramadhan (@ Rp {Number(newBookingPricing.ramadanPrice).toLocaleString('id-ID')})</span>
                            <span>Rp {Number(newBookingPricing.ramadanPrice * newBookingPricing.ramadanNights * (parseInt(formData.num_rooms) || 1)).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        {newBookingPricing.newYearNights > 0 && (
                          <div className="flex justify-between text-purple-900 font-medium">
                            <span>• 🎉 {newBookingPricing.newYearNights} Malam Tahun Baru (@ Rp {Number(newBookingPricing.newYearPrice).toLocaleString('id-ID')})</span>
                            <span>Rp {Number(newBookingPricing.newYearPrice * newBookingPricing.newYearNights * (parseInt(formData.num_rooms) || 1)).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-600">
                  <span>{discountPercent > 0 ? 'Harga Kamar:' : 'Total Biaya Kamar:'}</span>
                  <span>Rp {Number(baseSubtotal).toLocaleString('id-ID')}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Diskon Aplikasi HCH ({discountPercent}%):
                    </span>
                    <span>-Rp {Number(discountAmount).toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-sm text-slate-900">
                  <span>Total Pelunasan (Cashless):</span>
                  <span className="text-red-600">Rp {Number(finalTotalPrice).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Rekening Transfer Bank Resmi Hotel */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-emerald-950 pb-1 border-b border-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Rekening Transfer Resmi Hotel</span>
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full">
                    {hotelSettings.payment_bank_name || 'Bank BCA'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                  <div>
                    <span className="text-[11px] text-emerald-800">Nomor Rekening:</span>
                    <span className="font-mono font-black text-sm text-emerald-950 ml-1.5 select-all">
                      {hotelSettings.payment_bank_account || '123-456-7890'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium">
                    a/n {hotelSettings.payment_account_name || 'Hotel Celebes Hasanuddin'}
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700/80 leading-relaxed pt-1">
                  Setelah booking dikirim, Anda dapat mengunggah bukti transfer bank di tab <strong>"Reservasi Saya"</strong> untuk verifikasi instan staf kami.
                </p>
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
          </>
        )}

        {/* TAB 2: RESERVASI SAYA (LIST, EDIT, DELETE) */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            {!isAuthenticated ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <LogIn className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-800">Masuk untuk Melihat Riwayat Reservasi</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Silakan login dengan akun member HCH Anda untuk melihat, mengubah jadwal, atau membatalkan pesanan kamar.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  Login Sekarang
                </button>
              </div>
            ) : loadingReservations ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" count={3} />
              </div>
            ) : myReservations.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <EmptyState
                  icon={CalendarDays}
                  title="Belum Ada Reservasi"
                  description="Anda belum memiliki riwayat pemesanan kamar aktif. Klik tombol di bawah untuk memesan kamar."
                  actionLabel="Booking Kamar Sekarang"
                  onAction={() => setActiveTab('new')}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {myReservations.map((r) => {
                  const checkIn = new Date(r.check_in);
                  const checkOut = new Date(r.check_out);
                  const itemNights = Math.max(1, Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 hover:border-slate-300 transition"
                    >
                      {/* Header Card */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-slate-900">#HCH-{r.id}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {new Date(r.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Payment Status Badge */}
                          {r.payment_status === 'paid' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Lunas
                            </span>
                          ) : r.payment_status === 'pending_verification' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Verifikasi Bukti
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              Belum Bayar
                            </span>
                          )}

                          {/* Reservation Status Badge */}
                          {r.status === 'confirmed' ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                              Dikonfirmasi
                            </span>
                          ) : r.status === 'cancelled' ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                              Menunggu
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Room & Dates Info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                              <Bed className="w-4 h-4 text-red-600 shrink-0" />
                              <span>{r.room_type}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {r.num_rooms} Kamar • {r.num_guests} Tamu • {itemNights} Malam
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-black text-red-600">
                              Rp {Number(r.total_price || 0).toLocaleString('id-ID')}
                            </div>
                            {Number(r.discount_percent) > 0 && (
                              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                Diskon {r.discount_percent}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {formatDateID(r.check_in)} s/d {formatDateID(r.check_out)}
                            </span>
                          </div>
                          {r.notes && (
                            <p className="text-[10px] text-slate-500 italic pl-5">
                              Catatan: "{r.notes}"
                            </p>
                          )}
                        </div>

                        {/* Payment Proof Card if attached */}
                        {r.payment_proof && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 cursor-pointer" onClick={() => handleOpenProofPreview(r.payment_proof)}>
                                <img
                                  src={getMediaUrl(r.payment_proof)}
                                  alt="Bukti Transfer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <span className="text-[11px] font-bold text-slate-800 block">Bukti Transfer Terlampir</span>
                                <span className="text-[10px] text-slate-400">
                                  {r.payment_status === 'paid' ? 'Sudah diverifikasi resepsionis' : 'Sedang diproses verifikasi'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenProofPreview(r.payment_proof)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Lihat</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Chat WA, Upload Proof, Edit, Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleChatReceptionist(r)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border border-emerald-200/70"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Chat WA</span>
                          </button>

                          {r.payment_status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => handleOpenUploadProof(r)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border border-blue-200/70"
                            >
                              <Upload className="w-3.5 h-3.5 text-blue-600" />
                              <span>{r.payment_proof ? 'Ganti Bukti' : 'Upload Bukti Bayar'}</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Tombol Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit</span>
                          </button>

                          {/* Tombol Delete / Batalkan */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(r)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 border border-red-200/70"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Batalkan</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL EDIT RESERVASI */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Reservasi (#HCH-${editingReservation?.id})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          {/* Room Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Kamar *</label>
            <Select
              options={rooms.map((rm) => ({
                value: rm.name,
                label: `${rm.name} - Rp ${Number(rm.price).toLocaleString('id-ID')}/mlm`,
              }))}
              value={editForm.room_type}
              onChange={(opt) => setEditForm({ ...editForm, room_type: opt.value })}
              isSearchable={false}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-in *</label>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={editForm.check_in}
                onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                  editConflictDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Check-out *</label>
              <input
                type="date"
                required
                min={editForm.check_in || new Date().toISOString().slice(0, 10)}
                value={editForm.check_out}
                onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none ${
                  editConflictDate ? 'border-red-500 bg-red-50/30' : 'border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
            </div>
          </div>

          {/* Conflict Warning */}
          {editConflictDate && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Tanggal ditutup ({editConflictDate.reason})</p>
                <p className="text-[11px] mt-0.5">
                  Periode {formatDateID(editConflictDate.start_date)} s/d {formatDateID(editConflictDate.end_date)} belum dibuka. Silakan pilih tanggal lain.
                </p>
              </div>
            </div>
          )}

          {/* Rooms and Guests */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Kamar</label>
              <Select
                options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} Kamar` }))}
                value={editForm.num_rooms}
                onChange={(opt) => setEditForm({ ...editForm, num_rooms: Number(opt.value) })}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Tamu</label>
              <Select
                options={[1, 2, 3, 4, 6, 8, 10].map((n) => ({ value: n, label: `${n} Orang` }))}
                value={editForm.num_guests}
                onChange={(opt) => setEditForm({ ...editForm, num_guests: Number(opt.value) })}
                isSearchable={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Contoh: Permintaan double bed, check-in malam, dll"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Realtime Pricing Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Estimasi {editNights} Malam • {editForm.num_rooms} Kamar:</span>
              <span className="font-semibold">Rp {Number(editBaseSubtotal).toLocaleString('id-ID')}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex items-center justify-between text-emerald-600 font-semibold">
                <span>Diskon Member HCH ({discountPercent}%):</span>
                <span>-Rp {Number(editDiscountAmount).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-black text-sm text-slate-900">
              <span>Total Pelunasan Baru:</span>
              <span className="text-red-600">Rp {Number(editFinalPrice).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingEdit || !!editConflictDate}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{submittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL UPLOAD BUKTI TRANSFER BANK */}
      <Modal
        isOpen={uploadProofModalOpen}
        onClose={() => setUploadProofModalOpen(false)}
        title={`Upload Bukti Transfer (#HCH-${selectedReservationForProof?.id})`}
        subtitle="Lampirkan foto struk / resi transfer pelunasan reservasi kamar"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitProof} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Tipe Kamar:</span>
              <span className="font-bold text-slate-800">{selectedReservationForProof?.room_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Biaya:</span>
              <span className="font-black text-red-600">
                Rp {Number(selectedReservationForProof?.total_price || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
              Transfer ke: <strong>{hotelSettings.payment_bank_name || 'Bank BCA'}</strong> • {hotelSettings.payment_bank_account || '123-456-7890'} (a/n {hotelSettings.payment_account_name || 'Hotel Celebes Hasanuddin'})
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Foto Bukti Transfer *
            </label>
            <input
              type="file"
              required
              accept="image/*"
              onChange={handleProofFileChange}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Format: JPG, JPEG, PNG, atau WebP (Maksimal 5MB).
            </p>
          </div>

          {proofPreview && (
            <div className="p-2 border border-slate-200 rounded-xl bg-slate-50">
              <p className="text-[10px] font-bold text-slate-500 mb-1">Pratinjau Foto:</p>
              <div className="max-h-48 rounded-lg overflow-hidden flex items-center justify-center bg-black/5">
                <img src={proofPreview} alt="Preview" className="max-h-48 object-contain rounded-lg" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUploadProofModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploadingProof || !proofFile}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingProof ? 'Mengunggah...' : 'Kirim Bukti Transfer'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL ZOOM PREVIEW BUKTI TRANSFER */}
      <Modal
        isOpen={previewProofModalOpen}
        onClose={() => setPreviewProofModalOpen(false)}
        title="Bukti Transfer Pembayaran"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center p-2 min-h-60 max-h-[70vh]">
            {previewProofUrl ? (
              <img
                src={previewProofUrl}
                alt="Bukti Transfer Zoom"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg"
              />
            ) : (
              <p className="text-xs text-slate-400">Bukti tidak ditemukan</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setPreviewProofModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DIALOG BATAL / HAPUS RESERVASI */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={deletingLoading}
        title="Batalkan Reservasi Kamar"
        message={`Apakah Anda yakin ingin membatalkan atau menghapus reservasi #${reservationToDelete?.id} (${reservationToDelete?.room_type}) untuk periode ${formatDateID(reservationToDelete?.check_in)} s/d ${formatDateID(reservationToDelete?.check_out)}?`}
        confirmText="Ya, Batalkan Reservasi"
        cancelText="Kembali"
        isDanger={true}
      />
    </div>
  );
};
