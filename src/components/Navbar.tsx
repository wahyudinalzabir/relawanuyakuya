import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, Menu, LogOut, ChevronDown, User, RefreshCw } from 'lucide-react';
import { PanLogo } from './PanLogo';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { currentUser, logout, canManageAdmins } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const getRoleBadge = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case 'Ketua DPC':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Ketua DPC
          </span>
        );
      case 'Korcam':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Korcam
          </span>
        );
      case 'Korkel':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Korkel (Kel. {currentUser.kelurahan_assigned})
          </span>
        );
      case 'KorWe':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            KorWe (RW {currentUser.rw_assigned})
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {currentUser.role}
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs h-16 flex items-center justify-between px-4 sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-hidden lg:hidden"
          title="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <PanLogo size="sm" variant="emblem" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-blue-950 text-base leading-tight">
                Sistem Pendataan Relawan <span className="text-blue-600">PAN</span>
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Jagakarsa
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">
              DPC Kecamatan Jagakarsa • Kota Jakarta Selatan
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Current User & Quick Switch / Logout */}
      <div className="flex items-center gap-3">
        {/* Wilayah Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Kecamatan: <strong>Jagakarsa</strong></span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            id="btn-user-profile-menu"
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div className="hidden md:block text-left pr-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-gray-900 leading-none">{currentUser?.name}</p>
              </div>
              <div className="mt-1">{getRoleBadge()}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
          </button>

          {showAccountMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-3 border-b border-gray-100 bg-slate-50/50 rounded-t-2xl">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Akun Masuk
                </p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">{currentUser?.name}</p>
                <p className="text-[11px] text-gray-500 font-mono">@{currentUser?.username || currentUser?.email}</p>
                <div className="mt-1.5">{getRoleBadge()}</div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    logout();
                    setShowAccountMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
