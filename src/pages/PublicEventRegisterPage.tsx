import React, { useState, useEffect } from 'react';
import {
  EventItem,
  FormField,
  EventFormSettings,
  ParticipantRole,
  KtpOcrData,
} from '../types';
import { api } from '../lib/api';
import {
  Calendar,
  Clock,
  MapPin,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Send,
  RefreshCw,
  Info,
  Check,
  FileText,
  Lock,
} from 'lucide-react';

interface PublicEventRegisterPageProps {
  eventId: string;
  onBackToApp?: () => void;
}

export const PublicEventRegisterPage: React.FC<PublicEventRegisterPageProps> = ({
  eventId,
  onBackToApp,
}) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration Form State
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [nomorHp, setNomorHp] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sourceInput, setSourceInput] = useState<'MANUAL' | 'OCR_KTP'>('MANUAL');
  const [ktpImagePreview, setKtpImagePreview] = useState<string | null>(null);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Realtime NIK Eligibility & Anti-Duplicate State (Pass 1)
  const [validatingNik, setValidatingNik] = useState(false);
  const [nikStatus, setNikStatus] = useState<{
    checked: boolean;
    eligible: boolean;
    role: ParticipantRole;
    message?: string;
    isDuplicate?: boolean;
    isQuotaFull?: boolean;
  } | null>(null);

  // Submit state (Pass 2)
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const res = await api.getEventById(eventId);
        if (res.success && res.event) {
          setEvent(res.event);
        } else {
          setErrorMessage('Kegiatan tidak ditemukan atau telah berakhir.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal memuat informasi kegiatan.');
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [eventId]);

  // Real-time NIK verification (Pass 1: Debounced lookup when NIK reaches 16 digits)
  useEffect(() => {
    const cleanNik = nik.replace(/\D/g, '');
    if (cleanNik.length === 16) {
      const timer = setTimeout(async () => {
        try {
          setValidatingNik(true);
          const res = await api.validateNikForEvent(eventId, cleanNik);
          setNikStatus({
            checked: true,
            eligible: res.eligible,
            role: res.role,
            message: res.message,
            isDuplicate: res.isDuplicate,
            isQuotaFull: res.isQuotaFull,
          });

          // If auto-fill relawan name is available and nama is empty
          if (res.existingRelawan && !nama.trim()) {
            setNama(res.existingRelawan.nama);
          }
        } catch (err: any) {
          console.error('Validation error:', err);
        } finally {
          setValidatingNik(false);
        }
      }, 400);

      return () => clearTimeout(timer);
    } else {
      setNikStatus(null);
    }
  }, [nik, eventId]);

  // Handle OCR KTP upload
  const handleKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setKtpImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setOcrLoading(true);
      setOcrError(null);
      const res = await api.scanKtp(file);

      if (res.success && res.data) {
        const d = res.data;
        setSourceInput('OCR_KTP');
        if (d.nik) setNik(d.nik);
        if (d.nama) setNama(d.nama);

        // Auto-fill fields in dynamic form that map to OCR
        const newFormVals = { ...formData };
        (event?.form_schema || []).forEach((field) => {
          if (field.mappedTo && d[field.mappedTo as keyof KtpOcrData]) {
            newFormVals[field.title] = d[field.mappedTo as keyof KtpOcrData];
          }
        });
        setFormData(newFormVals);
      }
    } catch (err: any) {
      setOcrError(
        'Foto KTP kurang jelas atau buram. Jangan khawatir, Anda tetap dapat mengisi data NIK dan Nama secara manual di formulir bawah.'
      );
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFormFieldChange = (title: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [title]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNik = nik.replace(/\D/g, '');

    if (cleanNik.length < 16) {
      alert('Nomor Induk Kependudukan (NIK) harus 16 digit angka.');
      return;
    }

    if (!nama.trim()) {
      alert('Nama lengkap wajib diisi.');
      return;
    }

    // Check required dynamic fields
    const missingRequired: string[] = [];
    (event?.form_schema || []).forEach((field) => {
      if (field.required && field.type !== 'section') {
        const val = formData[field.title];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          missingRequired.push(field.title);
        }
      }
    });

    if (missingRequired.length > 0) {
      alert(`Mohon lengkapi pertanyaan wajib berikut:\n- ${missingRequired.join('\n- ')}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.registerEvent(eventId, {
        nik: cleanNik,
        nama: nama.trim().toUpperCase(),
        nomor_hp: nomorHp.trim(),
        source_input: sourceInput,
        data_form: formData,
        ktp_image_url: ktpImagePreview || undefined,
      });

      if (res.success && res.registration) {
        setSubmitSuccess(res.registration);
      }
    } catch (err: any) {
      alert(err.message || 'Pendaftaran gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center text-slate-400 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          Memuat formulir pendaftaran kegiatan...
        </div>
      </div>
    );
  }

  if (errorMessage || !event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Informasi Kegiatan</h2>
          <p className="text-xs text-slate-400">{errorMessage || 'Kegiatan tidak ditemukan.'}</p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
            >
              Kembali ke Aplikasi Utama
            </button>
          )}
        </div>
      </div>
    );
  }

  // Check if event form is not yet published / draft
  const isNotPublished =
    event.status_pendaftaran === 'Belum Dibuat' ||
    event.status_pendaftaran === 'Draft' ||
    !event.form_schema ||
    event.form_schema.length === 0;

  if (isNotPublished) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-900/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white">{event.nama}</h2>
          <p className="text-xs text-amber-300 font-semibold">Formulir Pendaftaran Belum Diterbitkan</p>
          <p className="text-xs text-slate-400">
            Penyelenggara kegiatan masih menyusun pertanyaan pada formulir pendaftaran ini. Tautan belum dibuka untuk pendaftaran umum.
          </p>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Kembali ke Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Check if event is closed for responses
  const isClosed =
    event.status === 'SELESAI' ||
    event.status_pendaftaran === 'Ditutup' ||
    (event.form_settings && event.form_settings.is_accepting_responses === false);

  if (isClosed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-900/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white">{event.nama}</h2>
          <p className="text-xs text-amber-300 font-semibold">Pendaftaran Sedang Ditutup</p>
          <p className="text-xs text-slate-400">
            Formulir pendaftaran untuk kegiatan ini saat ini sudah ditutup oleh panitia penyelenggara.
          </p>
        </div>
      </div>
    );
  }

  // Registration Success Receipt View
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 py-10 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-extrabold rounded-full uppercase tracking-wider">
              Pendaftaran Berhasil Tervalidasi
            </span>
            <h2 className="text-xl font-black text-white mt-3">{event.nama}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {event.form_settings?.confirmation_message ||
                'Terima kasih telah mendaftar! Data Anda telah tercatat secara resmi dalam sistem pendaftaran kegiatan.'}
            </p>
          </div>

          {/* Receipt summary card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-left space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Nomor Registrasi:</span>
              <span className="font-mono font-bold text-blue-400">{submitSuccess.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Nama Peserta:</span>
              <span className="font-bold text-white">{submitSuccess.nama}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">NIK:</span>
              <span className="font-mono text-slate-300">
                {submitSuccess.nik.slice(0, 4)}********{submitSuccess.nik.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Role Peserta:</span>
              <span className="font-bold text-purple-300">{submitSuccess.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waktu Pendaftaran:</span>
              <span className="text-slate-300">
                {new Date(submitSuccess.waktu_pendaftaran).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            * Simpan nomor registrasi atau tangkapan layar ini saat tiba di lokasi untuk proses check-in kehadiran.
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setNik('');
                setNama('');
                setNomorHp('');
                setFormData({});
                setKtpImagePreview(null);
                setNikStatus(null);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Daftarkan Peserta Lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 flex justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Event Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-900/60 border border-blue-700/60 text-blue-300 text-xs font-bold rounded-full">
              Formulir Pendaftaran Resmi
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{event.nama}</h1>
            {event.deskripsi && <p className="text-xs text-slate-400 mt-2 leading-relaxed">{event.deskripsi}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>
                {new Date(event.tanggal).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{event.jam || '09:00'} WIB</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="truncate">{event.lokasi || 'Gedung / Tempat Acara'}</span>
            </div>
          </div>
        </div>

        {/* Scan KTP Box (Optional / AI Supported) */}
        {event.form_settings?.allow_ktp_scan !== false && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Scan Foto KTP (Otomatis Isi Data)
              </div>
              <span className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                Opsional / Bantuan AI
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Unggah foto KTP Anda agar NIK dan Nama lengkap terisi otomatis secara akurat.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <label className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-colors">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>{ocrLoading ? 'Memproses OCR...' : 'Ambil Foto / Pilih File KTP'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleKtpUpload}
                  disabled={ocrLoading}
                  className="hidden"
                />
              </label>

              {ktpImagePreview && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Foto KTP terlampir
                </span>
              )}
            </div>

            {ocrError && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{ocrError}</span>
              </div>
            )}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primary Identity Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Identitas Peserta (Validasi NIK)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Nomor Induk Kependudukan (NIK) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 16 digit NIK..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono tracking-wider focus:outline-hidden focus:border-blue-500"
                  required
                />
                {validatingNik && (
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-3" />
                )}
              </div>

              {/* Real-time Anti-Duplicate Feedback */}
              {nikStatus && nikStatus.checked && (
                <div
                  className={`mt-2 p-3 rounded-xl border text-xs font-medium ${
                    nikStatus.eligible
                      ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                      : 'bg-red-950/50 border-red-800/80 text-red-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {nikStatus.eligible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{nikStatus.message}</p>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Status Role Internal:{' '}
                        <strong className="uppercase underline">{nikStatus.role}</strong>{' '}
                        {['KORCAM', 'KORKEL', 'KORWE', 'KORTPS'].includes(nikStatus.role) &&
                          '(Koordinator/Petugas — Bebas Kuota & Anti-Duplikat)'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Nama Lengkap (Sesuai KTP) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value.toUpperCase())}
                placeholder="Contoh: AHMAD FAUZI"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Nomor WhatsApp / HP Aktif
              </label>
              <input
                type="text"
                value={nomorHp}
                onChange={(e) => setNomorHp(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Digunakan untuk konfirmasi kehadiran atau info pelaksanaan kegiatan.
              </p>
            </div>
          </div>

          {/* Dynamic Form Schema Questions */}
          {(event.form_schema || []).map((field) => {
            if (field.type === 'section') {
              return (
                <div key={field.id} className="pt-2">
                  <div className="bg-slate-900/60 border-l-4 border-blue-500 p-4 rounded-r-xl">
                    <h3 className="text-sm font-bold text-white">{field.title}</h3>
                    {field.description && <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>}
                  </div>
                </div>
              );
            }

            const val = formData[field.title] || '';

            return (
              <div key={field.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  {field.title} {field.required && <span className="text-red-400">*</span>}
                </label>
                {field.description && <p className="text-[11px] text-slate-400">{field.description}</p>}

                {['short_answer', 'number', 'email', 'phone', 'date', 'time'].includes(field.type) && (
                  <input
                    type={
                      field.type === 'number'
                        ? 'number'
                        : field.type === 'date'
                        ? 'date'
                        : field.type === 'time'
                        ? 'time'
                        : 'text'
                    }
                    value={val}
                    onChange={(e) => handleFormFieldChange(field.title, e.target.value)}
                    placeholder={field.placeholder || 'Ketik jawaban Anda...'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    required={field.required}
                  />
                )}

                {field.type === 'paragraph' && (
                  <textarea
                    rows={3}
                    value={val}
                    onChange={(e) => handleFormFieldChange(field.title, e.target.value)}
                    placeholder={field.placeholder || 'Ketik jawaban lengkap Anda...'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    required={field.required}
                  />
                )}

                {field.type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    {(field.options || ['Opsi 1']).map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name={field.id}
                          checked={val === opt}
                          onChange={() => handleFormFieldChange(field.title, opt)}
                          className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-300 font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkboxes' && (
                  <div className="space-y-2 pt-1">
                    {(field.options || ['Opsi 1']).map((opt, oIdx) => {
                      const currentArr = Array.isArray(val) ? val : [];
                      const isChecked = currentArr.includes(opt);
                      return (
                        <label key={oIdx} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleFormFieldChange(field.title, [...currentArr, opt]);
                              } else {
                                handleFormFieldChange(
                                  field.title,
                                  currentArr.filter((item: string) => item !== opt)
                                );
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded-sm focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-300 font-medium">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {field.type === 'dropdown' && (
                  <select
                    value={val}
                    onChange={(e) => handleFormFieldChange(field.title, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    required={field.required}
                  >
                    <option value="">Pilih salah satu...</option>
                    {(field.options || []).map((opt, oIdx) => (
                      <option key={oIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || (nikStatus?.checked && !nikStatus.eligible)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi & Menyimpan Pendaftaran...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Formulir Pendaftaran</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
