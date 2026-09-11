import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  CalendarCheck,
  Camera,
  Download,
  Users,
  UserCheck,
  Clock,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../lib/api';
import { EventItem, KehadiranEvent, EventStats } from '../types';
import { EventScannerModal } from '../components/EventScannerModal';

interface EventCheckInPageProps {
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const EventCheckInPage: React.FC<EventCheckInPageProps> = ({ addToast }) => {
  const [events, setEvents] = useState<(EventItem & { stats: EventStats })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('EVT-BPJS-2026');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Attendance data
  const [attendanceList, setAttendanceList] = useState<KehadiranEvent[]>([]);
  const [stats, setStats] = useState<EventStats>({
    totalRelawanTerdaftar: 0,
    totalSudahHadir: 0,
    totalBelumHadir: 0,
    totalPesertaTamu: 0,
  });

  // Filters
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>('');
  const [selectedRw, setSelectedRw] = useState<string>('');
  const [selectedRt, setSelectedRt] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Hierarchy for dropdowns
  const [hierarchy, setHierarchy] = useState<Record<string, Record<string, Record<string, string[]>>>>({});

  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || {
      id: 'EVT-BPJS-2026',
      nama: 'GIAT SOSIALISASI BPJS KESEHATAN',
      tanggal: '2026-09-12',
      tanggal_display: 'Sabtu, 12 September 2026',
      lokasi: 'Kecamatan Jagakarsa, Kota Jakarta Selatan',
      status: 'Berlangsung',
      created_at: new Date().toISOString(),
    };
  }, [events, selectedEventId]);

  // Load Initial Data
  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Load Events
      const evRes = await api.getEvents();
      if (evRes.events && evRes.events.length > 0) {
        setEvents(evRes.events);
        if (!selectedEventId) {
          setSelectedEventId(evRes.events[0].id);
        }
      }

      // 2. Load Attendance for current event
      const currentId = selectedEventId || 'EVT-BPJS-2026';
      const attRes = await api.getEventKehadiran(currentId, {
        kelurahan: selectedKelurahan,
        rw: selectedRw,
        rt: selectedRt,
        status: selectedStatus,
        search: searchQuery,
      });

      setAttendanceList(attRes.items || []);
      setStats(attRes.stats || {
        totalRelawanTerdaftar: 0,
        totalSudahHadir: 0,
        totalBelumHadir: 0,
        totalPesertaTamu: 0,
      });
    } catch (err: any) {
      console.error('Error loading event data:', err);
      addToast('error', 'Gagal Memuat Data', err.message || 'Tidak dapat memuat data kehadiran event.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    api.getWilayahHierarchy().then((res) => {
      setHierarchy(res.hierarchy || {});
    }).catch(console.error);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedEventId, selectedKelurahan, selectedRw, selectedRt, selectedStatus]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper mask NIK
  const maskNik = (nik: string) => {
    if (!nik) return '-';
    const clean = nik.replace(/\D/g, '');
    if (clean.length <= 4) return clean;
    return `${clean.slice(0, 4)}${'*'.repeat(Math.max(0, clean.length - 4))}`;
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (attendanceList.length === 0) {
      addToast('warning', 'Data Kosong', 'Belum ada data kehadiran untuk diekspor.');
      return;
    }

    try {
      const exportRows = attendanceList.map((item, index) => ({
        No: index + 1,
        'ID Kehadiran': item.id,
        'Nama Peserta': item.nama,
        'NIK (Tersensor)': maskNik(item.nik),
        'ID Relawan': item.id_relawan || '-',
        'Status Kehadiran': item.status_kehadiran,
        Kecamatan: item.kecamatan,
        Kelurahan: item.kelurahan,
        RW: item.rw,
        RT: item.rt,
        TPS: item.tps || '-',
        'Waktu Check-in': item.waktu_checkin,
        'Tanggal Check-in': item.tanggal_checkin,
        'Petugas Operator': item.operator_name || '-',
        Catatan: item.catatan || '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kehadiran Event');

      const fileName = `Daftar_Hadir_${activeEvent.nama.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      addToast('success', 'Export Berhasil', `File ${fileName} berhasil diunduh.`);
    } catch (err: any) {
      addToast('error', 'Export Gagal', err.message || 'Gagal menghasilkan file Excel.');
    }
  };

  const handleCheckInSuccess = (_newAttendance: KehadiranEvent) => {
    // Reload attendance list to update stats and table realtime
    loadData();
  };

  const kelurahanList = Object.keys(hierarchy);
  const rwList = selectedKelurahan && hierarchy[selectedKelurahan] ? Object.keys(hierarchy[selectedKelurahan]) : [];
  const rtList =
    selectedKelurahan && selectedRw && hierarchy[selectedKelurahan]?.[selectedRw]
      ? Object.keys(hierarchy[selectedKelurahan][selectedRw])
      : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner Event */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-xl border border-blue-700/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wider shadow-sm">
                <CalendarCheck className="w-3.5 h-3.5" />
                EVENT UTAMA
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-700/70 text-blue-100 border border-blue-500/40">
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                {activeEvent.tanggal_display}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
              {activeEvent.nama}
            </h1>
            <p className="flex items-center gap-2 text-sm text-blue-200/90">
              <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{activeEvent.lokasi || 'Kecamatan Jagakarsa, Kota Jakarta Selatan'}</span>
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="btn-open-scan-ktp-event"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/30 transition-all transform active:scale-95"
            >
              <Camera className="w-5 h-5 text-slate-950" />
              <span>Scan KTP untuk Check-in</span>
            </button>

            <button
              type="button"
              id="btn-export-excel-event"
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-blue-950/70 hover:bg-blue-900 border border-blue-400/30 text-white font-semibold text-sm transition-colors"
              title="Download Format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-3.5 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-400/30 text-blue-200 hover:text-white transition-colors"
              title="Muat Ulang Data Kehadiran"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Kartu KPI Kehadiran Event */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Relawan Terdaftar */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Relawan Terdaftar
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">
            {stats.totalRelawanTerdaftar.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400">Data relawan aktif di Jagakarsa</p>
        </div>

        {/* Total Sudah Hadir */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Total Sudah Hadir
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">
            {stats.totalSudahHadir.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-emerald-200/70">
            {stats.totalRelawanTerdaftar > 0
              ? `${Math.round((stats.totalSudahHadir / stats.totalRelawanTerdaftar) * 100)}% dari relawan terdaftar`
              : 'Relawan check-in'}
          </p>
        </div>

        {/* Total Belum Hadir */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Total Belum Hadir
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">
            {stats.totalBelumHadir.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400">Menunggu kehadiran di lokasi</p>
        </div>

        {/* Total Peserta Tamu */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Total Peserta Tamu
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-300">
            {stats.totalPesertaTamu.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400">Tamu non-relawan tercatat</p>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            Filter Data Kehadiran
          </div>
          {(selectedKelurahan || selectedRw || selectedRt || selectedStatus || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedKelurahan('');
                setSelectedRw('');
                setSelectedRt('');
                setSelectedStatus('');
                setSearchQuery('');
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari Nama / NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Kelurahan */}
          <div>
            <select
              value={selectedKelurahan}
              onChange={(e) => {
                setSelectedKelurahan(e.target.value);
                setSelectedRw('');
                setSelectedRt('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Semua Kelurahan (Jagakarsa)</option>
              {kelurahanList.map((k) => (
                <option key={k} value={k}>
                  Kel. {k}
                </option>
              ))}
            </select>
          </div>

          {/* Filter RW */}
          <div>
            <select
              value={selectedRw}
              onChange={(e) => {
                setSelectedRw(e.target.value);
                setSelectedRt('');
              }}
              disabled={!selectedKelurahan}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-40"
            >
              <option value="">Semua RW</option>
              {rwList.map((rw) => (
                <option key={rw} value={rw}>
                  RW {rw}
                </option>
              ))}
            </select>
          </div>

          {/* Filter RT */}
          <div>
            <select
              value={selectedRt}
              onChange={(e) => setSelectedRt(e.target.value)}
              disabled={!selectedRw}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-40"
            >
              <option value="">Semua RT</option>
              {rtList.map((rt) => (
                <option key={rt} value={rt}>
                  RT {rt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Semua Status Kehadiran</option>
              <option value="HADIR">HADIR (Relawan Terdaftar)</option>
              <option value="PESERTA TAMU">PESERTA TAMU (Warga)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Kehadiran Realtime */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Daftar Kehadiran Event</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {attendanceList.length} Orang
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Urutan terbaru check-in di lokasi acara
            </p>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <th className="px-4 py-3">Nama Lengkap</th>
                <th className="px-4 py-3">NIK (Privasi)</th>
                <th className="px-4 py-3">Domisili Wilayah</th>
                <th className="px-4 py-3">Waktu Check-in</th>
                <th className="px-4 py-3 text-center">Status Kehadiran</th>
                <th className="px-4 py-3">Petugas Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Memuat data kehadiran...</span>
                    </div>
                  </td>
                </tr>
              ) : attendanceList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2 text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="font-semibold text-slate-300">Belum Ada Data Kehadiran</p>
                      <p className="text-xs text-slate-500">
                        Klik tombol <strong>"Scan KTP untuk Check-in"</strong> di atas untuk mulai mencatat kehadiran relawan atau tamu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                attendanceList.map((item, index) => {
                  const isGuest = item.status_kehadiran === 'PESERTA TAMU';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-center text-slate-500 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Nama & ID */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white tracking-wide">{item.nama}</div>
                        {item.id_relawan ? (
                          <div className="text-[10px] font-mono text-blue-400">{item.id_relawan}</div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">Peserta Non-Relawan</div>
                        )}
                      </td>

                      {/* NIK Masked */}
                      <td className="px-4 py-3.5 font-mono text-slate-300 text-[11px]">
                        {maskNik(item.nik)}
                      </td>

                      {/* Wilayah */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-200">
                          Kel. {item.kelurahan || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          RW {item.rw || '-'} / RT {item.rt || '-'}
                          {item.tps && item.tps !== '-' ? ` • TPS ${item.tps}` : ''}
                        </div>
                      </td>

                      {/* Waktu Check-in */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">{item.waktu_checkin}</div>
                        <div className="text-[10px] text-slate-500">{item.tanggal_checkin}</div>
                      </td>

                      {/* Status Kehadiran */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isGuest
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isGuest ? <UserPlus className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {item.status_kehadiran}
                        </span>
                      </td>

                      {/* Operator */}
                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {item.operator_name || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Scanner KTP */}
      <EventScannerModal
        isOpen={isScannerOpen}
        event={activeEvent}
        onClose={() => setIsScannerOpen(false)}
        onSuccessCheckIn={handleCheckInSuccess}
        addToast={addToast}
      />
    </div>
  );
};
