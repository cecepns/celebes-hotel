import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Lock,
  Phone,
  User,
  Mail,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Register = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  if (!authLoading && isAuthenticated) {
    if (user?.role === 'admin' || user?.role === 'staff') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.password) {
      toast.error('Nama, no WhatsApp, dan password wajib diisi');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    try {
      setLoading(true);
      const res = await request.post(API_ENDPOINTS.AUTH.REGISTER, formData);
      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        toast.success(res.message || 'Registrasi member berhasil!');
        navigate('/');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Gagal registrasi member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Celebes Hotel" className="h-10 mx-auto object-contain mb-3" />
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Daftar Member Baru</h2>
          <p className="text-xs text-slate-500 mt-0.5">Program Royalti Reward HCH</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama sesuai KTP"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP *</label>
            <div className="relative">
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contoh: 081212127688"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email (Opsional)</label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nama@email.com"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi *</label>
            <div className="relative">
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? 'Mendaftarkan...' : 'Daftar Member HCH'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Sudah memiliki akun member?{' '}
          <Link to="/login" className="text-red-600 font-bold hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
};
