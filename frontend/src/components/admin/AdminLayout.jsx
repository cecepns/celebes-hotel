import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Receipt,
  Gift,
  Trophy,
  TicketCheck,
  CalendarDays,
  Bed,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/users', label: 'Manajemen User', icon: UserCog, roles: ['admin'] },
    { to: '/admin/members', label: 'Data Tamu / Member', icon: Users },
    { to: '/admin/rooms', label: 'Kelola Kamar', icon: Bed },
    { to: '/admin/reservations', label: 'Data Reservasi', icon: CalendarDays },
    { to: '/admin/transactions', label: 'Transaksi & Poin', icon: Receipt },
    { to: '/admin/rewards', label: 'Katalog Reward', icon: Gift },
    { to: '/admin/missions', label: 'Misi & Approval Klaim', icon: Trophy, roles: ['admin', 'supervisor'] },
    { to: '/admin/vouchers', label: 'Verifikasi Voucher', icon: TicketCheck },
    { to: '/admin/settings', label: 'Pengaturan Sistem', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Admin / Management';
    if (role === 'supervisor') return 'Supervisor';
    if (role === 'resepsionis' || role === 'kasir') return 'Receptionist / Kasir';
    return role || 'Staff';
  };

  const handleLogout = () => {
    logout();
    toast.success('Berhasil logout dari Admin Panel');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-hch.jpeg" alt="Celebes Hotel" className="h-10 w-10 object-cover bg-white rounded-xl shadow-xs" />
            <div>
              <p className="text-xs font-black tracking-wider text-amber-400">HOTEL CELEBES</p>
              <p className="text-[10px] text-slate-400 font-medium">Royalti Reward HCH</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition lg:hidden"
            title="Tutup Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current User Pill */}
        <div className="px-6 py-3.5 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-amber-400 font-semibold truncate">{getRoleLabel(user?.role)} • Online</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Menu Utama
          </div>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-900/40 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </NavLink>
            );
          })}

          <div className="pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Tampilan Member
          </div>
          <NavLink
            to="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-amber-300 hover:bg-slate-800 transition"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Lihat Tampilan Tamu</span>
          </NavLink>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-300 bg-red-950/40 border border-red-900/50 hover:bg-red-900/60 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden transition"
              aria-label="Toggle Sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs text-slate-400 font-medium">Sistem Pendataan Poin & Reservasi</span>
              <h1 className="text-sm font-bold text-slate-800">Hotel Celebes Hasanuddin Makassar</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition border border-red-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Web Tamu</span>
            </NavLink>
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {user?.name ? user.name.charAt(0) : 'A'}
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
