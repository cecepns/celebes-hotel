import React, { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { Lock, Phone, ArrowRight, Eye, EyeOff, Download, CheckCircle2, Share2, Sparkles } from "lucide-react";
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

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if launched as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("Aplikasi Royalti HCH berhasil dipasang di layar HP Anda!");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        toast.success("Memasang aplikasi Royalti HCH...");
      }
      setDeferredPrompt(null);
    } else {
      toast(
        (t) => (
          <div className="text-xs space-y-1">
            <p className="font-bold text-slate-900">Cara Memasang Aplikasi di HP:</p>
            <p className="text-slate-600 leading-relaxed">
              Buka menu browser Anda (titik tiga di kanan atas Chrome), lalu pilih <strong>"Install Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
            </p>
          </div>
        ),
        { icon: "📲", duration: 6000 }
      );
    }
  };

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
        {/* Header Logo: Kecil, background putih, tidak ter-stretch */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
            <img
              src="/logo-hch.jpeg"
              alt="Royalti Reward HCH"
              className="w-full h-full object-contain"
            />
          </div>
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
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
                className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
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
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {loading ? "Memproses..." : "Masuk Sekarang"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-5 text-center text-xs text-slate-500">
          Belum terdaftar sebagai member?{" "}
          <Link to="/register" className="text-red-600 font-bold hover:underline">
            Daftar Sekarang
          </Link>
        </div>
      </div>

      {/* Card Download / Install Aplikasi PWA: Logo Kecil, BG Putih, Tidak Ter-stretch */}
      <div className="w-full max-w-sm mt-4 bg-white rounded-3xl p-4 shadow-md border border-slate-200/80">
        <div className="flex items-center gap-3">
          {/* Logo PWA Kecil, Background Putih, Preserved Aspect Ratio (object-contain) */}
          <div className="w-12 h-12 bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src="/logo-hch.jpeg"
              alt="Logo PWA Royalti HCH"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-slate-900 truncate">Aplikasi Royalti HCH</h4>
              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 font-extrabold text-[9px] border border-red-200/70">
                PWA App
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Pasang langsung di layar HP tanpa perlu buka Play Store.
            </p>
          </div>
        </div>

        <div className="mt-3.5">
          {isInstalled ? (
            <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Aplikasi Sudah Terpasang di Layar HP</span>
            </div>
          ) : isIOS ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1.5 shadow-2xs">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Cara Pasang di iPhone / iPad:</span>
              </div>
              <p className="leading-relaxed text-slate-600 text-[11px]">
                1. Ketuk tombol <strong>Share</strong> (ikon kotak panah ke atas) di menu Safari.<br />
                2. Gulir ke bawah lalu pilih <strong>'Add to Home Screen'</strong> (Tambah ke Layar Utama).
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallPWA}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Download / Install Aplikasi HCH</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
