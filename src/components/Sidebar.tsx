import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ScanLine,
  FileEdit,
  MapPin,
  FileBarChart,
  FileSpreadsheet,
  UserCheck,
  History,
  Settings,
  X,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { PanLogo } from './PanLogo';

export type PageId =
  | 'dashboard'
  | 'event-management'
  | 'checkin-event'
  | 'relawan'
  | 'scan-ktp'
  | 'input-manual'
  | 'wilayah'
  | 'laporan'
  | 'export'
  | 'manajemen-user'
  | 'audit-log'
  | 'pengaturan';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage, isOpen, onClose }) => {
  const { canManageAdmins, currentUser } = useAuth();

  const navItems: { id: PageId; label: string; icon: React.ReactNode; requiresAdmin?: boolean; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'event-management',
      label: 'Event Management',
      icon: <CalendarCheck className="w-5 h-5" />,
      badge: 'Baru',
    },
    {
      id: 'checkin-event',
      label: 'Check-in Presensi',
      icon: <UserCheck className="w-5 h-5" />,
    },
    { id: 'relawan', label: 'Data Relawan', icon: <Users className="w-5 h-5" /> },
    { id: 'scan-ktp', label: 'Scan KTP (AI)', icon: <ScanLine className="w-5 h-5" /> },
    { id: 'input-manual', label: 'Input Manual', icon: <FileEdit className="w-5 h-5" /> },
    { id: 'wilayah', label: 'Wilayah Jagakarsa', icon: <MapPin className="w-5 h-5" /> },
    { id: 'laporan', label: 'Laporan Wilayah', icon: <FileBarChart className="w-5 h-5" /> },
    { id: 'export', label: 'Export Data', icon: <FileSpreadsheet className="w-5 h-5" /> },
    {
      id: 'manajemen-user',
      label: 'Kelola Korkel & KorWe',
      icon: <UserCheck className="w-5 h-5" />,
      requiresAdmin: true,
    },
    { id: 'audit-log', label: 'Log Aktivitas', icon: <History className="w-5 h-5" /> },
    { id: 'pengaturan', label: 'Pengaturan', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleNavClick = (page: PageId) => {
    onSelectPage(page);
    onClose();
  };

  const getScopeDescription = () => {
    if (!currentUser) return 'Wilayah Jagakarsa';
    if (currentUser.role === 'Ketua DPC' || currentUser.role === 'Korcam') {
      return 'Semua 6 Kelurahan di Jagakarsa';
    }
    if (currentUser.role === 'Korkel') {
      return `Kelurahan ${currentUser.kelurahan_assigned}`;
    }
    if (currentUser.role === 'KorWe') {
      return `RW ${currentUser.rw_assigned}, Kel. ${currentUser.kelurahan_assigned}`;
    }
    return 'Kecamatan Jagakarsa';
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header with PAN Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <PanLogo size="sm" variant="emblem" />
            <div>
              <p className="font-extrabold text-sm tracking-wide text-white">RELAWAN PAN</p>
              <p className="text-[10px] text-blue-300 font-medium">DPC Kec. Jagakarsa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Scope Box */}
        <div className="p-3 mx-3 my-3 rounded-xl bg-blue-950/40 border border-blue-900/50 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-blue-300 text-[10px] uppercase font-bold tracking-wider">
              {currentUser?.role || 'Pengguna'}
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="font-bold text-white mt-0.5 truncate">{currentUser?.name || 'Petugas'}</p>
          <div className="mt-1.5 pt-1.5 border-t border-blue-900/40 text-[11px] text-blue-200">
            <p className="text-[10px] text-blue-400/80 uppercase font-semibold">Cakupan Wilayah:</p>
            <p className="font-medium text-white/90 truncate">{getScopeDescription()}</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isAccessible = !item.requiresAdmin || canManageAdmins;
            const isActive = currentPage === item.id;

            if (!isAccessible) {
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-500 text-xs cursor-not-allowed opacity-40"
                  title="Hanya dapat diakses oleh Korcam & Ketua DPC"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[9px] uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                    Korcam
                  </span>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="font-semibold text-slate-200">Jagakarsa Siap Input</p>
          </div>
          <p className="mt-0.5 text-slate-400 text-[10px]">Data Terstruktur &amp; Anti-Duplikasi</p>
        </div>
      </aside>
    </>
  );
};
