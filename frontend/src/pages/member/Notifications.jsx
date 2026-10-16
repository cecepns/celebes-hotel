import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  Coins,
  Gift,
  Bed,
  CheckCheck,
  TrendingDown,
  TrendingUp,
  Sliders,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import toast from 'react-hot-toast';

export const Notifications = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const fetchNotifications = async (page = 1) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.MEMBER.NOTIFICATIONS.LIST, {
        page,
        limit: pagination.limit,
      });
      if (res.success && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.unread_count || 0);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, [isAuthenticated]);

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      const res = await request.put(API_ENDPOINTS.MEMBER.NOTIFICATIONS.MARK_READ(id));
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      setMarkingAll(true);
      const res = await request.put(API_ENDPOINTS.MEMBER.NOTIFICATIONS.MARK_ALL_READ);
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
        toast.success('Semua notifikasi ditandai telah dibaca');
      }
    } catch (err) {
      toast.error('Gagal menandai notifikasi');
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'point_in':
        return {
          icon: TrendingUp,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50 border-emerald-200',
        };
      case 'point_out':
        return {
          icon: TrendingDown,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 border-amber-200',
        };
      case 'point_adjustment':
        return {
          icon: Sliders,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50 border-indigo-200',
        };
      case 'reservation':
        return {
          icon: Bed,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
        };
      case 'reward':
        return {
          icon: Gift,
          color: 'text-rose-600',
          bgColor: 'bg-rose-50 border-rose-200',
        };
      default:
        return {
          icon: Bell,
          color: 'text-slate-600',
          bgColor: 'bg-slate-100 border-slate-200',
        };
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'points') return ['point_in', 'point_out', 'point_adjustment'].includes(item.type);
    if (filterType === 'reservation') return item.type === 'reservation';
    return item.type === filterType;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Top Header */}
      <header className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-600" />
              Notifikasi Akun
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                  {unreadCount} baru
                </span>
              )}
            </h1>
            <p className="text-[10px] text-slate-400">Poin masuk, terpotong & update reservasi</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Baca Semua</span>
          </button>
        )}
      </header>

      <main className="p-4 space-y-3.5">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'points', label: '💰 Mutasi Poin' },
            { id: 'reservation', label: '🛏️ Reservasi' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                filterType === pill.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" count={4} />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Belum Ada Notifikasi"
            description="Semua catatan perolehan poin, penggunaan voucher, dan update kamar akan muncul di sini."
          />
        ) : (
          <div className="space-y-2.5">
            {filteredNotifications.map((item) => {
              const iconMeta = getNotificationIcon(item.type);
              const IconComp = iconMeta.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id, item.is_read)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden ${
                    !item.is_read
                      ? 'border-red-200 ring-1 ring-red-100 shadow-xs bg-gradient-to-r from-red-50/20 to-white'
                      : 'border-slate-200/80 opacity-90'
                  }`}
                >
                  {!item.is_read && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${iconMeta.bgColor} ${iconMeta.color}`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        <span>
                          {new Date(item.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                        {!item.is_read && (
                          <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                            Belum Dibaca
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pt-2">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchNotifications(p)}
            />
          </div>
        )}
      </main>
    </div>
  );
};
