import React, { useState, useEffect } from 'react';
import { EventItem, EventDetailStats } from '../types';
import { api } from '../lib/api';
import { ParticipantRoleModal } from '../components/ParticipantRoleModal';
import {
  Calendar,
  Plus,
  PlusCircle,
  Search,
  Users,
  CheckCircle,
  MapPin,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Edit2,
  Trash2,
  Settings,
  Shield,
  QrCode,
  Sparkles,
  ArrowRight,
  Filter,
  UserCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface EventManagementPageProps {
  onNavigateToDetail: (eventId: string, initialTab?: 'overview' | 'form' | 'registrations') => void;
  onNavigateToCheckIn: (eventId?: string) => void;
  onNavigateToPublicRegister: (eventId: string) => void;
}

export const EventManagementPage: React.FC<EventManagementPageProps> = ({
  onNavigateToDetail,
  onNavigateToCheckIn,
  onNavigateToPublicRegister,
}) => {
  const [events, setEvents] = useState<(EventItem & { stats: EventDetailStats })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<{ isOpen: boolean; event: EventItem | null }>({
    isOpen: false,
    event: null,
  });

  // Create form state
  const [newNama, setNewNama] = useState('');
  const [newTanggal, setNewTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [newJam, setNewJam] = useState('09:00');
  const [newLokasi, setNewLokasi] = useState('');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [newKuota, setNewKuota] = useState<number>(500);
  const [newStatus, setNewStatus] = useState<'AKTIF' | 'DRAFT' | 'SELESAI'>('AKTIF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getEvents({ status: statusFilter, search: searchQuery });
      if (res.success) {
        setEvents(res.events);
      }
    } catch (err: any) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [statusFilter, searchQuery]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      setCreateError('Nama kegiatan wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      setCreateError(null);
      const res = await api.createEvent({
        nama: newNama.trim(),
        tanggal: newTanggal,
        jam: newJam,
        lokasi: newLokasi.trim(),
        deskripsi: newDeskripsi.trim(),
        kuota: Number(newKuota) || 0,
        status: newStatus,
      });

      if (res.success && res.event) {
        setShowCreateModal(false);
        // Reset form
        setNewNama('');
        setNewLokasi('');
        setNewDeskripsi('');
        setNewKuota(500);
        await fetchEvents();
        // Redirect immediately to form builder tab so user can pick/create questions!
        onNavigateToDetail(res.event.id, 'form');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Gagal membuat event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus event "${nama}"? Semua data pendaftaran terkait akan ikut terhapus.`)) {
      return;
    }

    try {
      await api.deleteEvent(eventId);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus event.');
    }
  };

  const handleCopyPublicLink = (eventId: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    const isReady =
      targetEvent?.status_pendaftaran === 'Dibuka' &&
      targetEvent?.form_settings?.is_accepting_responses &&
      (targetEvent?.form_schema?.length || 0) > 0;

    if (!isReady) {
      alert(
        'Formulir pendaftaran untuk kegiatan ini belum diterbitkan (masih Draft / Belum Dibuat). Silakan buka "Buat Form Pendaftaran" terlebih dahulu untuk memilih atau membuat pertanyaan bagi peserta.'
      );
      return;
    }

    const url = `${window.location.origin}/events/${eventId}/register`;
    navigator.clipboard.writeText(url);
    setCopiedId(eventId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Overall aggregate stats
  const totalEvents = events.length;
  const activeEvents = events.filter((e) => e.status === 'AKTIF').length;
  const totalRegistrations = events.reduce((acc, curr) => acc + (curr.stats?.total_registrations || 0), 0);
  const totalAttended = events.reduce((acc, curr) => acc + (curr.stats?.total_hadir || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                Event Management Suite
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Anti-Duplicate Engine
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2 tracking-tight">
              Sistem Manajemen Event & Formulir Pendaftaran
            </h1>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl">
              Buat kegiatan, sesuaikan formulir Google Forms dinamis, validasi pendaftaran NIK 16 digit anti-duplikat,
              dan pantau kehadiran peserta secara realtime.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowRoleModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Shield className="w-4 h-4 text-purple-400" />
              Kelola Role Petugas
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buat Event Baru
            </button>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Kegiatan</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-black text-white mt-1">{totalEvents}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{activeEvents} kegiatan aktif</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Pendaftar</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-black text-white mt-1">{totalRegistrations.toLocaleString('id-ID')}</p>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">Tervalidasi anti-duplikat</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Kehadiran (Check-In)</span>
              <UserCheck className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-xl font-black text-white mt-1">{totalAttended.toLocaleString('id-ID')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Peserta hadir di lokasi</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Rata-rata Konversi</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-black text-white mt-1">
              {totalRegistrations > 0 ? `${Math.round((totalAttended / totalRegistrations) * 100)}%` : '0%'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Tingkat kehadiran peserta</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari event atau lokasi..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['', 'AKTIF', 'DRAFT', 'SELESAI'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === st ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === '' ? 'Semua' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Menampilkan <strong className="text-white">{events.length}</strong> event
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Memuat daftar kegiatan...</div>
      ) : events.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Belum Ada Event Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter
              ? 'Tidak ada kegiatan yang sesuai dengan kriteria pencarian Anda.'
              : 'Mulai kelola acara dengan membuat kegiatan pertama Anda sekarang.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Buat Event Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {events.map((event) => {
            const stats = event.stats || {
              total_registrations: 0,
              total_hadir: 0,
              total_valid: 0,
              quota: event.kuota || 0,
              remaining_quota: event.kuota || 0,
              attendance_percentage: 0,
            };

            const quotaPercent =
              event.kuota && event.kuota > 0
                ? Math.min(100, Math.round((stats.total_registrations / event.kuota) * 100))
                : 0;

            const isFormReady =
              event.status_pendaftaran === 'Dibuka' &&
              event.form_settings?.is_accepting_responses &&
              (event.form_schema?.length || 0) > 0;

            return (
              <div
                key={event.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            event.status === 'AKTIF'
                              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                              : event.status === 'SELESAI'
                              ? 'bg-slate-800 border border-slate-700 text-slate-300'
                              : 'bg-amber-950 border border-amber-800 text-amber-300'
                          }`}
                        >
                          {event.status}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isFormReady
                              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                              : 'bg-amber-950/80 border border-amber-800 text-amber-300'
                          }`}
                        >
                          {isFormReady ? 'Form Terbit' : 'Form Belum Dibuat'}
                        </span>

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {event.jam || '09:00'} WIB
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {event.nama}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onNavigateToDetail(event.id, 'form')}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Form Builder & Detail"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.nama)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info Meta */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-4">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {new Date(event.tanggal).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{event.lokasi || 'Lokasi Belum Diatur'}</span>
                    </div>
                  </div>

                  {/* Quota & Registration Progress */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Kapasitas & Kuota:</span>
                      <span className="font-bold text-white">
                        {stats.total_registrations} / {event.kuota > 0 ? event.kuota : '∞'} Pendaftar
                      </span>
                    </div>

                    {event.kuota > 0 && (
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            quotaPercent >= 95
                              ? 'bg-red-500'
                              : quotaPercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${quotaPercent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                      <span>
                        Kehadiran Check-In: <strong className="text-teal-400">{stats.total_hadir}</strong>
                      </span>
                      <span>
                        Sisa Kuota:{' '}
                        <strong className="text-slate-200">
                          {event.kuota > 0 ? Math.max(0, event.kuota - stats.total_registrations) : 'Tak Terbatas'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  {isFormReady ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyPublicLink(event.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Salin Link Form Pendaftaran Publik"
                      >
                        {copiedId === event.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onNavigateToPublicRegister(event.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Buka Formulir Pendaftaran Publik"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Form Publik</span>
                      </button>

                      <button
                        onClick={() => onNavigateToCheckIn(event.id)}
                        className="px-2.5 py-1.5 bg-teal-950 hover:bg-teal-900 border border-teal-800/60 text-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Buka Check-In Scanner Kehadiran"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Scan Check-In</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Link pendaftaran belum aktif
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!isFormReady && (
                      <button
                        onClick={() => onNavigateToDetail(event.id, 'form')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Buat Form Pendaftaran</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigateToDetail(event.id, 'overview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        isFormReady
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <span>{isFormReady ? 'Detail & Form' : 'Detail'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Buat Event Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Buat Kegiatan / Event Baru</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Sosialisasi Relawan & Warga Jagakarsa"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Kegiatan *</label>
                  <input
                    type="date"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Waktu Mulai</label>
                  <input
                    type="time"
                    value={newJam}
                    onChange={(e) => setNewJam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Lokasi / Gedung</label>
                <input
                  type="text"
                  value={newLokasi}
                  onChange={(e) => setNewLokasi(e.target.value)}
                  placeholder="Contoh: Gedung Serbaguna Jagakarsa, Lt. 2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Batas Kuota Peserta</label>
                  <input
                    type="number"
                    min={0}
                    value={newKuota}
                    onChange={(e) => setNewKuota(Number(e.target.value))}
                    placeholder="Contoh: 500 (0 = Bebas)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Isi 0 jika tidak ada batasan kuota.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status Awal</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="AKTIF">AKTIF (Siap Menerima Pendaftaran)</option>
                    <option value="DRAFT">DRAFT (Pendaftaran Ditutup Sementara)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Deskripsi Kegiatan</label>
                <textarea
                  rows={3}
                  value={newDeskripsi}
                  onChange={(e) => setNewDeskripsi(e.target.value)}
                  placeholder="Keterangan singkat mengenai agenda atau syarat peserta..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Langkah Berikutnya:</strong> Setelah klik tombol di bawah, Anda akan langsung membuka fitur <strong>Buat Form Pendaftaran</strong> untuk memilih pertanyaan standar atau membuat pertanyaan khusus sebelum form dapat diakses publik.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isSubmitting ? 'Membuat...' : 'Lanjut ke Buat Form Pendaftaran →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      <ParticipantRoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSuccess={() => fetchEvents()}
      />
    </div>
  );
};
