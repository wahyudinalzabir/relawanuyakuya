import React, { useState, useEffect } from 'react';
import {
  EventItem,
  EventDetailStats,
  FormField,
  EventFormSettings,
  EventRegistration,
} from '../types';
import { api } from '../lib/api';
import { EventFormBuilder } from '../components/EventFormBuilder';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  Share2,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Eye,
  Edit,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  QrCode,
  Sparkles,
  Shield,
  Layers,
  FileText,
} from 'lucide-react';

interface EventDetailPageProps {
  eventId: string;
  onBack: () => void;
  onNavigateToCheckIn: (eventId: string) => void;
  onNavigateToPublicRegister: (eventId: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  onBack,
  onNavigateToCheckIn,
  onNavigateToPublicRegister,
}) => {
  const [event, setEvent] = useState<(EventItem & { stats?: EventDetailStats }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'form' | 'registrations'>('overview');
  const [copied, setCopied] = useState(false);

  // Form Builder state
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formSettings, setFormSettings] = useState<EventFormSettings>({
    nik_validation_enabled: true,
    allow_ktp_scan: true,
    allow_manual_input: true,
    is_accepting_responses: true,
  });
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSaveSuccess, setFormSaveSuccess] = useState(false);

  // Registrations state
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regSearch, setRegSearch] = useState('');
  const [regStatus, setRegStatus] = useState('');
  const [regRole, setRegRole] = useState('');
  const [selectedReg, setSelectedReg] = useState<EventRegistration | null>(null);

  // Edit Event metadata modal/state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editNama, setEditNama] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editJam, setEditJam] = useState('');
  const [editLokasi, setEditLokasi] = useState('');
  const [editDeskripsi, setEditDeskripsi] = useState('');
  const [editKuota, setEditKuota] = useState(0);
  const [editStatus, setEditStatus] = useState<'AKTIF' | 'DRAFT' | 'SELESAI'>('AKTIF');

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const res = await api.getEventById(eventId);
      if (res.success && res.event) {
        setEvent(res.event);
        setFormFields(res.event.form_schema || []);
        setFormSettings(
          res.event.form_settings || {
            nik_validation_enabled: true,
            allow_ktp_scan: true,
            allow_manual_input: true,
            is_accepting_responses: true,
          }
        );

        // Populate edit state
        setEditNama(res.event.nama);
        setEditTanggal(res.event.tanggal);
        setEditJam(res.event.jam || '09:00');
        setEditLokasi(res.event.lokasi || '');
        setEditDeskripsi(res.event.deskripsi || '');
        setEditKuota(res.event.kuota || 0);
        setEditStatus(res.event.status);
      }
    } catch (err: any) {
      console.error('Failed to fetch event detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setRegLoading(true);
      const res = await api.getEventRegistrations(eventId, {
        search: regSearch,
        status: regStatus,
        role: regRole,
      });
      if (res.success) {
        setRegistrations(res.items);
      }
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
    } finally {
      setRegLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations();
    }
  }, [activeTab, regSearch, regStatus, regRole]);

  const handleSaveForm = async () => {
    try {
      setIsSavingForm(true);
      setFormSaveSuccess(false);
      const res = await api.updateEventForm(eventId, formFields, formSettings);
      if (res.success) {
        setFormSaveSuccess(true);
        setTimeout(() => setFormSaveSuccess(false), 3000);
        fetchEventData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan perubahan form.');
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateEvent(eventId, {
        nama: editNama,
        tanggal: editTanggal,
        jam: editJam,
        lokasi: editLokasi,
        deskripsi: editDeskripsi,
        kuota: Number(editKuota) || 0,
        status: editStatus,
      });
      if (res.success) {
        setIsEditingMetadata(false);
        fetchEventData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui event.');
    }
  };

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/events/${eventId}/register`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUpdateRegStatus = async (regId: string, status: string) => {
    try {
      await api.updateRegistrationStatus(regId, status);
      fetchRegistrations();
      if (selectedReg && selectedReg.id === regId) {
        setSelectedReg({ ...selectedReg, status: status as any });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengupdate status.');
    }
  };

  const handleExportCsv = () => {
    if (registrations.length === 0) {
      alert('Tidak ada data peserta untuk diekspor.');
      return;
    }

    const headers = ['No', 'NIK', 'Nama Lengkap', 'Role', 'No HP', 'Waktu Pendaftaran', 'Metode Input', 'Status'];
    const rows = registrations.map((r, i) => [
      i + 1,
      `'${r.nik}`,
      r.nama,
      r.role,
      r.nomor_hp || '-',
      new Date(r.waktu_pendaftaran).toLocaleString('id-ID'),
      r.source_input,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `peserta_${event?.nama.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 text-xs">Memuat data kegiatan...</div>;
  }

  if (!event) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-red-400 font-bold">Event tidak ditemukan.</p>
        <button onClick={onBack} className="text-xs text-blue-400 underline">
          Kembali ke Daftar Event
        </button>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    event.status === 'AKTIF'
                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                      : event.status === 'SELESAI'
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-amber-950 border border-amber-800 text-amber-300'
                  }`}
                >
                  {event.status}
                </span>
                <span className="text-xs text-slate-400">ID: {event.id}</span>
              </div>
              <h1 className="text-xl font-black text-white mt-1">{event.nama}</h1>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyPublicLink}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Link Form'}
            </button>

            <button
              onClick={() => onNavigateToPublicRegister(event.id)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Form Publik
            </button>

            <button
              onClick={() => onNavigateToCheckIn(event.id)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Scan Check-In
            </button>

            <button
              onClick={() => setIsEditingMetadata(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Edit Data Event"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta details bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>
              {new Date(event.tanggal).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Pukul {event.jam || '09:00'} WIB</span>
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="w-4 h-4 text-red-400" />
            <span className="truncate">{event.lokasi || 'Lokasi belum diatur'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          Ringkasan & Metrik
        </button>

        <button
          onClick={() => setActiveTab('form')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'form'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          Form Builder Dinamis ({formFields.length} Pertanyaan)
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'registrations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          Data Peserta ({stats.total_registrations})
        </button>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Kapasitas Pendaftar</span>
              <p className="text-2xl font-black text-white mt-1">
                {stats.total_registrations} / {event.kuota > 0 ? event.kuota : 'Bebas'}
              </p>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {event.kuota > 0 ? `${stats.remaining_quota} kuota tersisa` : 'Tidak dibatasi kuota'}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Status Hadir di Lokasi</span>
              <p className="text-2xl font-black text-teal-400 mt-1">{stats.total_hadir}</p>
              <p className="text-xs text-slate-400 mt-3">
                Tingkat kehadiran: <strong className="text-white">{stats.attendance_percentage}%</strong>
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Pendaftaran Terverifikasi</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{stats.total_valid}</p>
              <p className="text-xs text-slate-400 mt-3">Tervalidasi NIK & Anti-duplikat</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Status Pendaftaran</span>
                <p className="text-sm font-bold text-white mt-1">
                  {formSettings.is_accepting_responses ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Menerima Respons
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Formulir Ditutup
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setFormSettings({
                    ...formSettings,
                    is_accepting_responses: !formSettings.is_accepting_responses,
                  });
                  handleSaveForm();
                }}
                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition-colors text-center"
              >
                {formSettings.is_accepting_responses ? 'Tutup Pendaftaran' : 'Buka Pendaftaran'}
              </button>
            </div>
          </div>

          {/* Link Pendaftaran & QR Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Tautan Pendaftaran Peserta (Form Publik)</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Bagikan tautan ini kepada calon peserta atau buat QR Code untuk dicetak pada poster / flyer.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/events/${eventId}/register`}
                    className="w-full md:w-96 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all"
                  />
                  <button
                    onClick={handleCopyPublicLink}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigateToCheckIn(eventId)}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Buka Scanner Check-In Kehadiran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Form Builder */}
      {activeTab === 'form' && (
        <div className="space-y-4">
          {formSaveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Konfigurasi pertanyaan formulir berhasil disimpan!</span>
            </div>
          )}

          <EventFormBuilder
            fields={formFields}
            settings={formSettings}
            onChange={(updatedFields, updatedSettings) => {
              setFormFields(updatedFields);
              setFormSettings(updatedSettings);
            }}
            onSave={handleSaveForm}
            isSaving={isSavingForm}
          />
        </div>
      )}

      {/* TAB 3: Registrations List */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Cari NIK / Nama peserta..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <select
                value={regStatus}
                onChange={(e) => setRegStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-hidden"
              >
                <option value="">Semua Status</option>
                <option value="VALID">VALID</option>
                <option value="PENDING">PENDING</option>
                <option value="HADIR">HADIR</option>
                <option value="DITOLAK">DITOLAK</option>
              </select>

              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-hidden"
              >
                <option value="">Semua Role</option>
                <option value="PESERTA">PESERTA</option>
                <option value="KORCAM">KORCAM</option>
                <option value="KORKEL">KORKEL</option>
                <option value="KORWE">KORWE</option>
                <option value="KORTPS">KORTPS</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Data Peserta (CSV)
              </button>
            </div>
          </div>

          {/* Table */}
          {regLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Memuat data peserta...</div>
          ) : registrations.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
              Belum ada pendaftaran yang masuk untuk kriteria ini.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Nama & NIK</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Nomor WhatsApp</th>
                    <th className="px-3 py-3">Metode Input</th>
                    <th className="px-3 py-3">Waktu Daftar</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">{reg.nama}</p>
                        <p className="font-mono text-slate-400 text-[11px] mt-0.5">
                          {reg.nik.slice(0, 4)}************{reg.nik.slice(-4)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            reg.role === 'KORCAM'
                              ? 'bg-purple-900/50 text-purple-300 border border-purple-800/60'
                              : reg.role === 'KORKEL'
                              ? 'bg-blue-900/50 text-blue-300 border border-blue-800/60'
                              : reg.role === 'KORWE'
                              ? 'bg-teal-900/50 text-teal-300 border border-teal-800/60'
                              : reg.role === 'KORTPS'
                              ? 'bg-amber-900/50 text-amber-300 border border-amber-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {reg.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300 font-mono text-[11px]">
                        {reg.nomor_hp || '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-[11px]">
                        {reg.source_input === 'OCR_KTP' ? (
                          <span className="text-blue-400 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> OCR KTP
                          </span>
                        ) : (
                          'MANUAL'
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-[11px]">
                        {new Date(reg.waktu_pendaftaran).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            reg.status === 'HADIR'
                              ? 'bg-teal-950 text-teal-300 border border-teal-800'
                              : reg.status === 'VALID'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : reg.status === 'DITOLAK'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => setSelectedReg(reg)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Jawaban Form
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Detail Jawaban Form Peserta */}
          {selectedReg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div>
                    <h3 className="text-sm font-bold text-white">Detail Formulir Pendaftaran Peserta</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedReg.nama} — {selectedReg.nik}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedReg(null)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Status update buttons */}
                  <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Ubah Status Pendaftaran:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateRegStatus(selectedReg.id, 'VALID')}
                        className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold rounded-md"
                      >
                        Setujui (VALID)
                      </button>
                      <button
                        onClick={() => handleUpdateRegStatus(selectedReg.id, 'DITOLAK')}
                        className="px-2.5 py-1 bg-red-900 hover:bg-red-800 text-red-200 text-xs font-semibold rounded-md"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Jawaban Pertanyaan Formulir:
                    </h4>

                    {Object.keys(selectedReg.data_form || {}).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Tidak ada jawaban kuesioner tambahan.</p>
                    ) : (
                      Object.entries(selectedReg.data_form).map(([key, val]) => (
                        <div key={key} className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                          <p className="text-xs font-bold text-slate-300">{key}</p>
                          <p className="text-xs text-white mt-1 whitespace-pre-wrap">
                            {Array.isArray(val) ? val.join(', ') : String(val || '-')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {isEditingMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white">Edit Informasi Kegiatan</h3>
              <button
                onClick={() => setIsEditingMetadata(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Kegiatan *</label>
                  <input
                    type="date"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Waktu</label>
                  <input
                    type="time"
                    value={editJam}
                    onChange={(e) => setEditJam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Lokasi Kegiatan</label>
                <input
                  type="text"
                  value={editLokasi}
                  onChange={(e) => setEditLokasi(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Batas Kuota Peserta</label>
                  <input
                    type="number"
                    min={0}
                    value={editKuota}
                    onChange={(e) => setEditKuota(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status Event</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="SELESAI">SELESAI</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMetadata(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
