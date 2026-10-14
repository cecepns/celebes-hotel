import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Edit3,
  Lock,
  LogOut,
  QrCode,
  Coins,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import toast from 'react-hot-toast';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser, isAdmin, isAuthenticated } = useAuth();

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    birth_date: user?.birth_date ? user.birth_date.slice(0, 10) : '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await request.put(API_ENDPOINTS.AUTH.PROFILE, editForm);
      if (res.success) {
        toast.success('Profil berhasil diperbarui');
        updateUser(editForm);
        setEditModalOpen(false);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal memperbarui profil');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    try {
      setSubmitting(true);
      const res = await request.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwordForm);
      if (res.success) {
        toast.success('Password berhasil diperbarui');
        setPasswordModalOpen(false);
        setPasswordForm({ oldPassword: '', newPassword: '' });
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal mengubah password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmLogout = () => {
    logout();
    toast.success('Anda telah keluar');
    setLogoutDialogOpen(false);
    navigate('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center pb-24">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Anda Belum Masuk</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Silakan masuk atau buat akun member untuk melihat kartu member, riwayat poin, dan voucher.
        </p>
        <Link
          to="/login"
          className="mt-5 px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs shadow-md shadow-red-200"
        >
          Masuk ke Akun
        </Link>
      </div>
    );
  }

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
            <h1 className="text-sm font-extrabold text-slate-800">Profil & Kartu Member</h1>
            <p className="text-[10px] text-slate-400">Hotel Celebes Hasanuddin Makassar</p>
          </div>
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="px-2.5 py-1 bg-slate-900 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </Link>
        )}
      </header>

      <main className="p-4 space-y-4">
        {/* ============================================================== */}
        {/* DIGITAL MEMBER CARD (Gold & Deep Blue VIP Look)                */}
        {/* ============================================================== */}
        <div className="relative rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl overflow-hidden border border-amber-500/30">
          {/* Card Glare & Pattern */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-radial from-amber-400/10 to-transparent pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Royalti Reward HCH
              </div>
              <div className="text-base font-extrabold tracking-wider mt-0.5">CELEBES HOTEL</div>
            </div>
            <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-slate-200 border border-white/20 uppercase">
              {user?.role === 'admin' ? 'Staff / Admin' : 'VIP Member'}
            </div>
          </div>

          {/* Member Name & Code */}
          <div className="mt-6 flex items-center justify-between relative z-10">
            <div>
              <div className="text-base font-black tracking-tight text-white">{user?.name}</div>
              <div className="font-mono text-xs text-amber-300 font-bold tracking-widest mt-0.5">
                {user?.member_code}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-1.5 rounded-xl shadow-md">
              <QRCodeSVG value={user?.member_code || 'HCH'} size={52} level="M" />
            </div>
          </div>

          {/* Card Footer: Points Balance */}
          <div className="mt-5 pt-3 border-t border-white/15 flex items-center justify-between relative z-10 text-xs">
            <span className="text-slate-300">Total Poin Aktif:</span>
            <span className="font-extrabold text-amber-400 text-sm flex items-center gap-1">
              <Coins className="w-4 h-4" />
              {Number(user?.total_points || 0).toLocaleString('id-ID')} Poin
            </span>
          </div>
        </div>

        {/* Member Information Details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Informasi Akun
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Nama Lengkap
              </span>
              <span className="font-bold text-slate-800">{user?.name}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                No. WhatsApp / HP
              </span>
              <span className="font-bold text-slate-800">{user?.phone}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Email
              </span>
              <span className="font-bold text-slate-800">{user?.email || '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Tanggal Lahir
              </span>
              <span className="font-bold text-slate-800">
                {user?.birth_date
                  ? new Date(user.birth_date).toLocaleDateString('id-ID', { dateStyle: 'long' })
                  : 'Belum diisi'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-2xl text-xs font-bold transition flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-2.5 text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk ke Dashboard Admin Panel</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditForm({
                name: user?.name || '',
                email: user?.email || '',
                birth_date: user?.birth_date ? user.birth_date.slice(0, 10) : '',
              });
              setEditModalOpen(true);
            }}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 p-3.5 rounded-2xl border border-slate-200/80 text-xs font-bold transition flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>Edit Nama, Email & Tanggal Lahir</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowOldPassword(false);
              setShowNewPassword(false);
              setPasswordModalOpen(true);
            }}
            className="w-full bg-white hover:bg-slate-50 text-slate-800 p-3.5 rounded-2xl border border-slate-200/80 text-xs font-bold transition flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Ganti Kata Sandi</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => setLogoutDialogOpen(true)}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 p-3.5 rounded-2xl border border-red-200 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Profil Tamu"
        subtitle="Perbarui identitas akun Anda"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="nama@email.com"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir</label>
            <input
              type="date"
              value={editForm.birth_date}
              onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Ganti Kata Sandi"
        subtitle="Amankan akun member Anda"
      >
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password Lama</label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                required
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                placeholder="Masukkan password saat ini"
                className="w-full text-xs p-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="w-full text-xs p-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Logout Confirm Dialog */}
      <ConfirmDialog
        isOpen={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Keluar dari Akun"
        message="Apakah Anda yakin ingin keluar dari aplikasi Royalti Reward HCH?"
        confirmText="Ya, Keluar"
        isDanger={false}
      />
    </div>
  );
};
