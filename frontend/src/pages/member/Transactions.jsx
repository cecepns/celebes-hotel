import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  ArrowLeft,
  Receipt,
  Bed,
  Utensils,
  ShoppingBag,
  Shirt,
  Calendar,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';

export const Transactions = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchTransactions = async (page = 1, limit = 10) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await request.get(API_ENDPOINTS.MEMBER.TRANSACTIONS, {
        page,
        limit,
        category: categoryFilter,
      });
      if (res.success && res.data) {
        setTransactions(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1, pagination.limit);
  }, [categoryFilter, isAuthenticated]);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'kamar':
        return Bed;
      case 'fnb':
        return Utensils;
      case 'drugstore':
        return ShoppingBag;
      case 'laundry':
        return Shirt;
      default:
        return Receipt;
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
          <h1 className="text-sm font-extrabold text-slate-800">Riwayat Transaksi Tamu</h1>
          <p className="text-[10px] text-slate-400">Catatan Belanja & Perolehan Poin HCH</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'kamar', label: 'Menginap' },
            { id: 'fnb', label: 'F&B' },
            { id: 'drugstore', label: 'Drugstore' },
            { id: 'laundry', label: 'Laundry' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                categoryFilter === cat.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" count={4} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum Ada Transaksi"
            description="Riwayat transaksi kamar, F&B, drugstore, dan laundry Anda akan tercatat di sini."
          />
        ) : (
          <div className="space-y-2.5">
            {transactions.map((item) => {
              const Icon = getCategoryIcon(item.category);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {item.invoice_no}
                        </span>
                        <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        Rp {Number(item.amount).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.transaction_date).toLocaleDateString('id-ID', {
                          dateStyle: 'medium',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.status === 'pending' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 text-amber-700 text-[10px] font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                          Menunggu Approval
                        </span>
                        <span className="text-[10px] text-amber-600 font-semibold">
                          +{item.points_earned} pts (Tertunda)
                        </span>
                      </div>
                    ) : item.status === 'rejected' ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="inline-flex items-center gap-1 text-red-700 text-[10px] font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                          <XCircle className="w-3 h-3 text-red-500" />
                          Ditolak
                        </span>
                        {item.rejection_reason && (
                          <span className="text-[9px] text-red-500 max-w-[120px] truncate" title={item.rejection_reason}>
                            {item.rejection_reason}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-emerald-600 text-xs font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg">
                        <Coins className="w-3.5 h-3.5" />
                        +{item.points_earned} pts
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                pagination={pagination}
                onPageChange={(p) => fetchTransactions(p, pagination.limit)}
                onLimitChange={(l) => fetchTransactions(1, l)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};
