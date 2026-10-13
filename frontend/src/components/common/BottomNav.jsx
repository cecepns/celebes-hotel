import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Headset, User, Ticket } from 'lucide-react';

export const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'Beranda',
      icon: Home,
      exact: true,
    },
    {
      to: '/my-vouchers',
      label: 'Voucher Saya',
      icon: Ticket,
    },
    {
      to: '/contact-us',
      label: 'Contact Us',
      icon: Headset,
    },
    {
      to: '/profile',
      label: 'Profil',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 max-w-[440px] mx-auto transition-all">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive ? 'text-red-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                )}
              </div>
              <span className="text-[11px] leading-tight tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
