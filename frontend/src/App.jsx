import React from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Member Components & Pages
import { BottomNav } from '@/components/common/BottomNav';
import { Home } from '@/pages/member/Home';
import { PointsDetail } from '@/pages/member/PointsDetail';
import { RewardsCatalog } from '@/pages/member/RewardsCatalog';
import { MyVouchers } from '@/pages/member/MyVouchers';
import { Missions } from '@/pages/member/Missions';
import { Transactions } from '@/pages/member/Transactions';
import { Reservation } from '@/pages/member/Reservation';
import { ContactUs } from '@/pages/member/ContactUs';
import { Profile } from '@/pages/member/Profile';

// Auth Pages
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';

// Admin Components & Pages
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { AdminMembers } from '@/pages/admin/Members';
import { AdminTransactions } from '@/pages/admin/Transactions';
import { AdminRewards } from '@/pages/admin/Rewards';
import { AdminMissions } from '@/pages/admin/Missions';
import { AdminRedemptions } from '@/pages/admin/Redemptions';
import { AdminReservations } from '@/pages/admin/Reservations';
import { AdminSettings } from '@/pages/admin/Settings';
import { AdminUsers } from '@/pages/admin/Users';
import { AdminRooms } from '@/pages/admin/Rooms';

// Member Shell Layout with Auth Guard (Redirects to /login if unauthenticated)
const ProtectedMemberRoute = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mobile-app-shell">
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

// Admin Guard Route
const ProtectedAdminRoute = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !['admin', 'staff', 'kasir'].includes(user?.role)) {
    return <Navigate to="/login" replace />;
  }

  return <AdminLayout />;
};

export default function App() {
  const location = useLocation();

  // Add background styling to body if on member page (mobile preview frame on large screen)
  React.useEffect(() => {
    if (!location.pathname.startsWith('/admin')) {
      document.body.classList.add('has-mobile-frame');
    } else {
      document.body.classList.remove('has-mobile-frame');
    }
  }, [location.pathname]);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e293b',
            color: '#fff',
            fontSize: '13px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Member Mobile App Routes */}
        <Route element={<ProtectedMemberRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/points-detail" element={<PointsDetail />} />
          <Route path="/rewards" element={<RewardsCatalog />} />
          <Route path="/my-vouchers" element={<MyVouchers />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin Panel Routes */}
        <Route path="/admin" element={<ProtectedAdminRoute />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="rooms" element={<AdminRooms />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="rewards" element={<AdminRewards />} />
          <Route path="missions" element={<AdminMissions />} />
          <Route path="vouchers" element={<AdminRedemptions />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
