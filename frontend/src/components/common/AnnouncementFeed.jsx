import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import {
  Megaphone,
  Sparkles,
  Info,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ChevronLeft,
  X,
  Volume2,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';

export const AnnouncementFeed = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchPublicAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await request.get(API_ENDPOINTS.PUBLIC.ANNOUNCEMENTS);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setAnnouncements(res.data);
        }
      } catch (err) {
        // Silent fail on public home widget
        console.error('Failed to load announcements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicAnnouncements();
  }, []);

  if (loading || announcements.length === 0 || isDismissed) {
    return null;
  }

  const current = announcements[currentIndex] || announcements[0];

  const getTypeStyle = (type) => {
    switch (type) {
      case 'promo':
        return {
          wrapper: 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border-emerald-500/40 text-white',
          badge: 'bg-emerald-500 text-white shadow-emerald-500/20',
          accent: 'text-emerald-300',
          icon: Sparkles,
        };
      case 'warning':
        return {
          wrapper: 'bg-gradient-to-r from-amber-950 via-orange-950 to-slate-900 border-amber-500/40 text-white',
          badge: 'bg-amber-500 text-slate-950 shadow-amber-500/20',
          accent: 'text-amber-300',
          icon: AlertTriangle,
        };
      case 'urgent':
        return {
          wrapper: 'bg-gradient-to-r from-rose-950 via-red-950 to-slate-900 border-red-500/40 text-white',
          badge: 'bg-red-600 text-white shadow-red-500/20',
          accent: 'text-red-300',
          icon: AlertCircle,
        };
      case 'info':
      default:
        return {
          wrapper: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-blue-500/40 text-white',
          badge: 'bg-blue-600 text-white shadow-blue-500/20',
          accent: 'text-blue-300',
          icon: Volume2,
        };
    }
  };

  const style = getTypeStyle(current.type);
  const IconComp = style.icon;

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleActionClick = (e, url) => {
    e.stopPropagation();
    if (!url) return;
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  return (
    <>
      <div
        onClick={() => setSelectedAnnouncement(current)}
        className={`relative overflow-hidden rounded-2xl border p-4 shadow-md transition hover:shadow-lg active:scale-[0.99] cursor-pointer ${style.wrapper}`}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${style.badge}`}
            >
              <Megaphone className="w-3 h-3" />
              <span>{current.badge || 'Pengumuman'}</span>
            </span>

            {announcements.length > 1 && (
              <span className="text-[10px] font-bold text-slate-400 bg-white/10 px-2 py-0.5 rounded-full">
                {currentIndex + 1} dari {announcements.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {announcements.length > 1 && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title="Pengumuman sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title="Pengumuman berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Tutup banner ini"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title and snippet */}
        <div className="mt-2.5 relative z-10 space-y-1">
          <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 line-clamp-1">
            <IconComp className={`w-4 h-4 shrink-0 ${style.accent}`} />
            <span>{current.title}</span>
          </h3>
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
            {current.content}
          </p>
        </div>

        {/* Footer info & CTA */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
          <span className="text-[10.5px] font-semibold text-slate-300 flex items-center gap-1">
            <span>Baca selengkapnya</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </span>

          {current.link_url && (
            <button
              type="button"
              onClick={(e) => handleActionClick(e, current.link_url)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-[11px] font-extrabold shadow-sm transition active:scale-95"
            >
              <span>{current.link_text || 'Buka Tautan'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* DETAIL MODAL FOR ANNOUNCEMENT */}
      <Modal
        isOpen={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.title || 'Pengumuman'}
        subtitle={`Hotel Celebes Hasanuddin Makassar • ${
          selectedAnnouncement?.created_at
            ? new Date(selectedAnnouncement.created_at).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Pemberitahuan Resmi'
        }`}
        maxWidth="max-w-lg"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            {/* Badge type pill */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 shadow-xs">
                <Megaphone className="w-3 h-3" />
                <span>{selectedAnnouncement.badge || 'Pengumuman Resmi'}</span>
              </span>
            </div>

            {/* Content text */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-line space-y-2">
              <p>{selectedAnnouncement.content}</p>
            </div>

            {/* Action CTA if present */}
            {selectedAnnouncement.link_url && (
              <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Ingin mengambil promo / penawaran ini?</span>
                  <span className="text-[11px] text-slate-500">Klik tombol di sebelah kanan untuk melanjutkan.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = selectedAnnouncement.link_url;
                    setSelectedAnnouncement(null);
                    if (url.startsWith('http')) {
                      window.open(url, '_blank');
                    } else {
                      navigate(url);
                    }
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition shrink-0 flex items-center gap-1.5"
                >
                  <span>{selectedAnnouncement.link_text || 'Lihat Sekarang'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
