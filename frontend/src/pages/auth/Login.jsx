import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { Lock, Phone, ArrowRight, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  if (!authLoading && isAuthenticated) {
    if (["admin", "supervisor", "resepsionis", "kasir", "staff"].includes(user?.role)) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Nomor HP/Email dan password wajib diisi");
      return;
    }

    try {
      setLoading(true);
      const res = await request.post(API_ENDPOINTS.AUTH.LOGIN, {
        identifier,
        password,
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        toast.success(`Selamat datang, ${res.data.user.name}!`);
        if (["admin", "supervisor", "resepsionis", "kasir", "staff"].includes(res.data.user.role)) {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Gagal login, periksa data Anda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <img src="/logo-hch.jpeg" alt="Royalti Reward HCH" className="h-16 mx-auto object-contain mb-3 rounded-2xl shadow-sm" />
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Masuk ke Akun</h2>
          <p className="text-xs text-slate-500 mt-0.5">Program Royalti Reward HCH</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor WhatsApp / HP / Kode Member
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: 081212127688 atau HCH-88219"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 transition"
                title={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk Sekarang"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Belum terdaftar sebagai member?{" "}
          <Link to="/register" className="text-red-600 font-bold hover:underline">
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
};
