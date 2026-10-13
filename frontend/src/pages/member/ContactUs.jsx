import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Headset,
  Phone,
  MessageCircle,
  Instagram,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const ContactUs = () => {
  const navigate = useNavigate();

  const contacts = [
    {
      title: 'WhatsApp Resmi Reservasi',
      desc: '+62 821-8900-1285',
      sub: 'Respon cepat 24 jam untuk reservasi & loyalty reward',
      icon: MessageCircle,
      actionText: 'Chat WhatsApp',
      color: 'bg-emerald-500 text-white shadow-emerald-200',
      href: 'https://wa.me/6282189001285?text=Halo%20Hotel%20Celebes%20Hasanuddin%2C%20saya%20ingin%20bertanya%20mengenai%20layanan%20hotel.',
    },
    {
      title: 'Telepon Kantor Hotel',
      desc: '+62 411-3620-770',
      sub: 'Hubungi resepsionis meja depan 24 jam',
      icon: Phone,
      actionText: 'Panggil Telepon',
      color: 'bg-blue-600 text-white shadow-blue-200',
      href: 'tel:+624113620770',
    },
    {
      title: 'Instagram Resmi',
      desc: '@celebeshtl',
      sub: 'Ikuti update promo, event, dan giveaway',
      icon: Instagram,
      actionText: 'Buka Profil',
      color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-rose-200',
      href: 'https://instagram.com/celebeshtl',
    },
    {
      title: 'Lokasi Hotel',
      desc: 'Jl. Sultan Hasanuddin No. 2 Makassar',
      sub: 'Sulawesi Selatan 90111, Indonesia',
      icon: MapPin,
      actionText: 'Buka Google Maps',
      color: 'bg-red-600 text-white shadow-red-200',
      href: 'https://maps.google.com/?q=Hotel+Celebes+Hasanuddin+Makassar',
    },
  ];

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
          <h1 className="text-sm font-extrabold text-slate-800">Hubungi Kami (Contact Us)</h1>
          <p className="text-[10px] text-slate-400">Hotel Celebes Hasanuddin Makassar</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-2xl p-5 text-white shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-200">
              Layanan Bantuan Tamu
            </span>
            <h2 className="text-base font-extrabold mt-0.5">Hotel Celebes Hasanuddin</h2>
            <p className="text-xs text-red-100 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pelayanan Meja Depan 24 Jam
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <Headset className="w-6 h-6" />
          </div>
        </div>

        {/* Contact Items */}
        <div className="space-y-3">
          {contacts.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${c.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-slate-800">{c.title}</h3>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">{c.desc}</div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{c.sub}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center justify-center gap-1.5"
                  >
                    <span>{c.actionText}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
