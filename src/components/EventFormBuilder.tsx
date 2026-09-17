import React, { useState } from 'react';
import {
  FormField,
  FormFieldType,
  EventFormSettings,
  StatusPendaftaran,
} from '../types';
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings,
  Eye,
  Edit3,
  CheckSquare,
  List,
  AlignLeft,
  Type,
  Calendar,
  Clock,
  Hash,
  Mail,
  Phone,
  Upload,
  Layout,
  Link,
  Save,
  CheckCircle2,
  Library,
  Sparkles,
  Check,
  AlertTriangle,
  Globe,
  Lock,
  ExternalLink,
  Search,
  BookOpen,
} from 'lucide-react';

interface EventFormBuilderProps {
  fields: FormField[];
  settings: EventFormSettings;
  statusPendaftaran?: StatusPendaftaran;
  eventId: string;
  onChange: (fields: FormField[], settings: EventFormSettings) => void;
  onSave: (publishStatus?: StatusPendaftaran) => Promise<void> | void;
  onPublishToggle?: (newStatus: StatusPendaftaran) => Promise<void> | void;
  onNavigateToPublicRegister?: () => void;
  isSaving?: boolean;
}

const QUESTION_TYPES: { type: FormFieldType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'short_answer', label: 'Jawaban Singkat', icon: <Type className="w-4 h-4" />, desc: 'Teks satu baris' },
  { type: 'paragraph', label: 'Paragraf', icon: <AlignLeft className="w-4 h-4" />, desc: 'Teks panjang / alamat' },
  { type: 'multiple_choice', label: 'Pilihan Ganda', icon: <CheckSquare className="w-4 h-4" />, desc: 'Pilih satu opsi radio' },
  { type: 'checkboxes', label: 'Kotak Centang', icon: <CheckSquare className="w-4 h-4" />, desc: 'Pilih banyak opsi' },
  { type: 'dropdown', label: 'Dropdown', icon: <List className="w-4 h-4" />, desc: 'Menu pilihan dropdown' },
  { type: 'date', label: 'Tanggal', icon: <Calendar className="w-4 h-4" />, desc: 'Pemilih tanggal' },
  { type: 'time', label: 'Waktu', icon: <Clock className="w-4 h-4" />, desc: 'Pemilih jam' },
  { type: 'number', label: 'Angka', icon: <Hash className="w-4 h-4" />, desc: 'Input angka murni' },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, desc: 'Format alamat email' },
  { type: 'phone', label: 'Nomor HP / WhatsApp', icon: <Phone className="w-4 h-4" />, desc: 'Nomor telepon / WhatsApp' },
  { type: 'file_upload', label: 'Upload File / Dokumen', icon: <Upload className="w-4 h-4" />, desc: 'Unggah file pendukung' },
  { type: 'section', label: 'Bagian / Judul Bagian', icon: <Layout className="w-4 h-4" />, desc: 'Pemisah seksi formulir' },
];

const KTP_MAPPINGS = [
  { value: '', label: 'Tidak terhubung ke KTP (Input Bebas)' },
  { value: 'nama', label: 'Nama Lengkap (Auto-fill OCR KTP)' },
  { value: 'nik', label: 'NIK 16 Digit (Auto-fill OCR KTP)' },
  { value: 'no_hp', label: 'Nomor WhatsApp / HP' },
  { value: 'alamat', label: 'Alamat Lengkap (Auto-fill OCR KTP)' },
  { value: 'kelurahan', label: 'Kelurahan (Auto-fill OCR KTP)' },
  { value: 'rw', label: 'Nomor RW (Auto-fill OCR KTP)' },
  { value: 'rt', label: 'Nomor RT (Auto-fill OCR KTP)' },
  { value: 'tempat_lahir', label: 'Tempat Lahir' },
  { value: 'tanggal_lahir', label: 'Tanggal Lahir' },
  { value: 'jenis_kelamin', label: 'Jenis Kelamin' },
  { value: 'agama', label: 'Agama' },
  { value: 'pekerjaan', label: 'Pekerjaan' },
  { value: 'status_perkawinan', label: 'Status Perkawinan' },
];

interface PresetQuestion {
  id: string;
  category: 'KTP & Identitas' | 'Kontak' | 'Domisili Jagakarsa' | 'Logistik & Acara';
  title: string;
  description: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  mappedTo?: any;
}

const PRESET_LIBRARY: PresetQuestion[] = [
  // KTP & Identitas
  {
    id: 'preset_nik',
    category: 'KTP & Identitas',
    title: 'Nomor Induk Kependudukan (NIK)',
    description: '16 digit angka KTP resmi peserta.',
    type: 'short_answer',
    required: true,
    placeholder: '3174xxxxxxxxxxxx',
    mappedTo: 'nik',
  },
  {
    id: 'preset_nama',
    category: 'KTP & Identitas',
    title: 'Nama Lengkap (Sesuai KTP)',
    description: 'Nama lengkap tanpa singkatan.',
    type: 'short_answer',
    required: true,
    placeholder: 'Contoh: BUDI SANTOSO',
    mappedTo: 'nama',
  },
  {
    id: 'preset_tempat_lahir',
    category: 'KTP & Identitas',
    title: 'Tempat Lahir',
    description: 'Kota / Kabupaten tempat lahir sesuai KTP.',
    type: 'short_answer',
    required: false,
    placeholder: 'Contoh: Jakarta',
    mappedTo: 'tempat_lahir',
  },
  {
    id: 'preset_tanggal_lahir',
    category: 'KTP & Identitas',
    title: 'Tanggal Lahir',
    description: 'Tanggal lahir sesuai KTP.',
    type: 'date',
    required: false,
    mappedTo: 'tanggal_lahir',
  },
  {
    id: 'preset_gender',
    category: 'KTP & Identitas',
    title: 'Jenis Kelamin',
    description: 'Pilih jenis kelamin sesuai identitas.',
    type: 'multiple_choice',
    required: true,
    options: ['Laki-laki', 'Perempuan'],
    mappedTo: 'jenis_kelamin',
  },
  {
    id: 'preset_agama',
    category: 'KTP & Identitas',
    title: 'Agama',
    description: 'Agama peserta.',
    type: 'dropdown',
    required: false,
    options: ['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'],
    mappedTo: 'agama',
  },
  {
    id: 'preset_status_nikah',
    category: 'KTP & Identitas',
    title: 'Status Perkawinan',
    description: 'Status pernikahan saat ini.',
    type: 'dropdown',
    required: false,
    options: ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'],
    mappedTo: 'status_perkawinan',
  },

  // Kontak
  {
    id: 'preset_phone',
    category: 'Kontak',
    title: 'Nomor WhatsApp / HP Aktif',
    description: 'Digunakan untuk konfirmasi kehadiran & info acara.',
    type: 'phone',
    required: true,
    placeholder: '0812xxxxxxxx',
    mappedTo: 'no_hp',
  },
  {
    id: 'preset_email',
    category: 'Kontak',
    title: 'Alamat Email',
    description: 'Email aktif jika ingin menerima konfirmasi digital.',
    type: 'email',
    required: false,
    placeholder: 'nama@domain.com',
  },

  // Domisili Jagakarsa
  {
    id: 'preset_alamat',
    category: 'Domisili Jagakarsa',
    title: 'Alamat Lengkap Tempat Tinggal',
    description: 'Nama jalan, nomor rumah, atau patokan tempat tinggal.',
    type: 'paragraph',
    required: true,
    placeholder: 'Jl. ... No. ..., RT ... RW ...',
    mappedTo: 'alamat',
  },
  {
    id: 'preset_kelurahan',
    category: 'Domisili Jagakarsa',
    title: 'Kelurahan Domisili (Kec. Jagakarsa)',
    description: 'Pilih kelurahan domisili Anda.',
    type: 'dropdown',
    required: true,
    options: ['Jagakarsa', 'Cipedak', 'Lenteng Agung', 'Ciganjur', 'Srengseng Sawah', 'Tanjung Barat'],
    mappedTo: 'kelurahan',
  },
  {
    id: 'preset_rw',
    category: 'Domisili Jagakarsa',
    title: 'Nomor RW',
    description: 'Nomor Rukun Warga tempat tinggal.',
    type: 'short_answer',
    required: true,
    placeholder: 'Contoh: 001',
    mappedTo: 'rw',
  },
  {
    id: 'preset_rt',
    category: 'Domisili Jagakarsa',
    title: 'Nomor RT',
    description: 'Nomor Rukun Tetangga tempat tinggal.',
    type: 'short_answer',
    required: true,
    placeholder: 'Contoh: 005',
    mappedTo: 'rt',
  },
  {
    id: 'preset_tps',
    category: 'Domisili Jagakarsa',
    title: 'Nomor TPS',
    description: 'Tempat Pemungutan Suara terdaftar jika diketahui.',
    type: 'short_answer',
    required: false,
    placeholder: 'Contoh: TPS 024',
  },

  // Logistik & Acara
  {
    id: 'preset_kaos',
    category: 'Logistik & Acara',
    title: 'Ukuran Kaos / Baju Acara',
    description: 'Pilih ukuran kaos seragam yang sesuai.',
    type: 'multiple_choice',
    required: false,
    options: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  },
  {
    id: 'preset_pekerjaan',
    category: 'Logistik & Acara',
    title: 'Pekerjaan / Profesi Saat Ini',
    description: 'Profesi atau mata pencaharian peserta.',
    type: 'short_answer',
    required: false,
    placeholder: 'Wiraswasta, Karyawan, Ibu Rumah Tangga, dll',
    mappedTo: 'pekerjaan',
  },
  {
    id: 'preset_transport',
    category: 'Logistik & Acara',
    title: 'Moda Transportasi ke Lokasi Acara',
    description: 'Rencana transportasi menuju gedung acara.',
    type: 'dropdown',
    required: false,
    options: [
      'Sepeda Motor Pribadi',
      'Mobil Pribadi',
      'Bersama Rombongan RT / RW',
      'Transportasi Umum / Angkot',
      'Ojek Online',
    ],
  },
  {
    id: 'preset_catatan',
    category: 'Logistik & Acara',
    title: 'Catatan Khusus / Permintaan Peserta',
    description: 'Kebutuhan khusus seperti akses disabilitas atau kursi depan.',
    type: 'paragraph',
    required: false,
    placeholder: 'Ketik catatan bila ada...',
  },
  {
    id: 'preset_foto_ktp',
    category: 'Logistik & Acara',
    title: 'Upload Foto KTP / Dokumen Pendukung',
    description: 'Lampirkan foto KTP jika diperlukan verifikasi fisik.',
    type: 'file_upload',
    required: false,
  },
];

export const EventFormBuilder: React.FC<EventFormBuilderProps> = ({
  fields,
  settings,
  statusPendaftaran = 'Belum Dibuat',
  eventId,
  onChange,
  onSave,
  onPublishToggle,
  onNavigateToPublicRegister,
  isSaving = false,
}) => {
  const [activeTab, setActiveTab] = useState<'builder' | 'library' | 'settings' | 'preview'>('builder');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id || null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryFilterCategory, setLibraryFilterCategory] = useState<string>('Semua');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const isPublished = statusPendaftaran === 'Dibuka' && settings.is_accepting_responses;

  // Add individual custom field
  const handleAddField = (type: FormFieldType = 'short_answer') => {
    const newId = `q_${Date.now()}`;
    const newField: FormField = {
      id: newId,
      title: type === 'section' ? 'Bagian Baru' : 'Pertanyaan Baru',
      type,
      required: type !== 'section',
      placeholder: '',
      description: '',
      options: ['multiple_choice', 'checkboxes', 'dropdown'].includes(type) ? ['Opsi 1', 'Opsi 2'] : undefined,
    };
    const updated = [...fields, newField];
    onChange(updated, settings);
    setSelectedFieldId(newId);
    setActiveTab('builder');
  };

  // Add preset question from Library
  const handleAddPresetQuestion = (preset: PresetQuestion) => {
    // Check if question with same title already exists
    const exists = fields.some((f) => f.title.toLowerCase() === preset.title.toLowerCase());
    if (exists) {
      alert(`Pertanyaan "${preset.title}" sudah ada di dalam formulir.`);
      return;
    }

    const newField: FormField = {
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: preset.title,
      description: preset.description,
      type: preset.type,
      required: preset.required,
      options: preset.options ? [...preset.options] : undefined,
      placeholder: preset.placeholder || '',
      mappedTo: preset.mappedTo,
    };

    const updated = [...fields, newField];
    onChange(updated, settings);
    setSelectedFieldId(newField.id);
  };

  // Quick One-Click Template: Core standard volunteer registration package
  const handleApplyStandardPackage = () => {
    if (
      fields.length > 0 &&
      !confirm('Menerapkan paket standar akan menambahkan pertanyaan dasar (NIK, Nama, WA, Alamat, Kelurahan, RW, RT). Lanjutkan?')
    ) {
      return;
    }

    const coreTitles = [
      'Nomor Induk Kependudukan (NIK)',
      'Nama Lengkap (Sesuai KTP)',
      'Nomor WhatsApp / HP Aktif',
      'Alamat Lengkap Tempat Tinggal',
      'Kelurahan Domisili (Kec. Jagakarsa)',
      'Nomor RW',
      'Nomor RT',
    ];

    const newFieldsToAdd: FormField[] = [];
    coreTitles.forEach((t) => {
      const preset = PRESET_LIBRARY.find((p) => p.title === t);
      if (preset && !fields.some((f) => f.title.toLowerCase() === t.toLowerCase())) {
        newFieldsToAdd.push({
          id: `q_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          title: preset.title,
          description: preset.description,
          type: preset.type,
          required: preset.required,
          options: preset.options ? [...preset.options] : undefined,
          placeholder: preset.placeholder || '',
          mappedTo: preset.mappedTo,
        });
      }
    });

    const updated = [...fields, ...newFieldsToAdd];
    onChange(updated, settings);
    setShowLibraryModal(false);
    setActiveTab('builder');
  };

  const handleUpdateField = (id: string, partial: Partial<FormField>) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, ...partial } : f));
    onChange(updated, settings);
  };

  const handleDeleteField = (id: string) => {
    const updated = fields.filter((f) => f.id !== id);
    onChange(updated, settings);
    if (selectedFieldId === id) {
      setSelectedFieldId(updated[0]?.id || null);
    }
  };

  const handleDuplicateField = (field: FormField) => {
    const newId = `q_${Date.now()}`;
    const dup: FormField = {
      ...field,
      id: newId,
      title: `${field.title} (Salinan)`,
      options: field.options ? [...field.options] : undefined,
    };
    const idx = fields.findIndex((f) => f.id === field.id);
    const updated = [...fields];
    updated.splice(idx + 1, 0, dup);
    onChange(updated, settings);
    setSelectedFieldId(newId);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const updated = [...fields];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    onChange(updated, settings);
  };

  const handleAddOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const currentOptions = field.options || [];
    const newOptions = [...currentOptions, `Opsi ${currentOptions.length + 1}`];
    handleUpdateField(fieldId, { options: newOptions });
  };

  const handleUpdateOption = (fieldId: string, optIndex: number, val: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = [...field.options];
    newOptions[optIndex] = val;
    handleUpdateField(fieldId, { options: newOptions });
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    if (field.options.length <= 1) {
      alert('Pilihan ganda/dropdown harus memiliki minimal 1 opsi.');
      return;
    }
    const newOptions = field.options.filter((_, idx) => idx !== optIndex);
    handleUpdateField(fieldId, { options: newOptions });
  };

  const handlePublishNow = async () => {
    if (fields.length === 0) {
      alert('Mohon tambahkan minimal 1 pertanyaan terlebih dahulu sebelum menerbitkan formulir pendaftaran.');
      return;
    }

    if (
      confirm(
        'Apakah Anda yakin ingin MENERBITKAN Formulir Pendaftaran ini?\n\nSetelah diterbitkan, link pendaftaran publik akan aktif dan dapat diakses peserta.'
      )
    ) {
      await onSave('Dibuka');
    }
  };

  const handleUnpublishNow = async () => {
    if (
      confirm(
        'Apakah Anda ingin MENUTUP pendaftaran formulir ini?\n\nLink publik akan ditutup dan peserta tidak dapat mengirim respons baru.'
      )
    ) {
      await onSave('Ditutup');
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/events/${eventId}/register`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredPresets = PRESET_LIBRARY.filter((p) => {
    const matchCategory = libraryFilterCategory === 'Semua' || p.category === libraryFilterCategory;
    const matchSearch =
      !librarySearch.trim() ||
      p.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      p.description.toLowerCase().includes(librarySearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Publication Status & Action Bar */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isPublished
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isPublished
                    ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                    : 'bg-amber-900/80 text-amber-200 border border-amber-700'
                }`}
              >
                {isPublished ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    Formulir Diterbitkan (Link Aktif)
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Draft (Belum Diterbitkan — Link Tidak Aktif)
                  </>
                )}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                • {fields.length} Pertanyaan Disusun
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {isPublished
                ? 'Formulir saat ini sedang aktif menerima pendaftaran peserta dari masyarakat. Anda dapat menyalin link publik untuk disebarkan.'
                : 'Formulir belum dapat dibuka oleh peserta. Silakan pilih atau buat pertanyaan di bawah, lalu klik "Terbitkan Form Pendaftaran" agar link aktif.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isPublished ? (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  title="Salin Link Pendaftaran Publik"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Tersalin' : 'Salin Link Pendaftaran'}</span>
                </button>

                {onNavigateToPublicRegister && (
                  <button
                    type="button"
                    onClick={onNavigateToPublicRegister}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Form Publik</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleUnpublishNow}
                  disabled={isSaving}
                  className="px-3.5 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Tutup Pendaftaran</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSave()}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSave('Belum Dibuat')}
                  disabled={isSaving}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublishNow}
                  disabled={isSaving || fields.length === 0}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>{isSaving ? 'Memproses...' : 'Terbitkan Form Pendaftaran'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'builder'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Editor Formulir ({fields.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLibraryModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800/80 transition-colors"
          >
            <Library className="w-4 h-4 text-blue-400" />
            <span>Bank Pertanyaan Cepat</span>
            <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded-full font-bold">Pilih</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Form</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Pratinjau Publik</span>
          </button>
        </div>

        {/* Quick Add Custom Question Dropdown */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddField('short_answer')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Tambah Pertanyaan Kustom</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BUILDER */}
      {activeTab === 'builder' && (
        <div className="space-y-4">
          {/* If fields are empty: Friendly Onboarding Canvas */}
          {fields.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-6 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20 shadow-inner">
                <BookOpen className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-black text-white">Formulir Pendaftaran Belum Dibuat</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pilih pertanyaan yang ingin Anda sertakan dalam formulir pendaftaran kegiatan ini. Anda dapat memilih dari Bank Pertanyaan siap pakai atau membuat pertanyaan kustom.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <Library className="w-4 h-4" />
                  <span>Buka Bank Pertanyaan (Pilih Satuan)</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyStandardPackage}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Pasang Paket Standar (NIK, Nama, WA, Alamat, Kelurahan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddField('short_answer')}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Pertanyaan Kustom</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, idx) => {
                const isSelected = selectedFieldId === field.id;
                const isSection = field.type === 'section';

                return (
                  <div
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={`bg-slate-900 rounded-2xl border transition-all p-5 shadow-lg ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/5'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Field Header Controls */}
                    <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-blue-300 border border-slate-700">
                          {QUESTION_TYPES.find((t) => t.type === field.type)?.label || field.type}
                        </span>

                        {field.mappedTo && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <Link className="w-2.5 h-2.5" /> KTP: {field.mappedTo}
                          </span>
                        )}

                        {field.required && !isSection && (
                          <span className="text-red-400 text-xs font-bold">* Wajib</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(idx, 'up');
                          }}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800"
                          title="Pindah ke atas"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === fields.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(idx, 'down');
                          }}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800"
                          title="Pindah ke bawah"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateField(field);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                          title="Duplikasi pertanyaan"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(field.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
                          title="Hapus pertanyaan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Title & Type Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Judul Pertanyaan
                        </label>
                        <input
                          type="text"
                          value={field.title}
                          onChange={(e) => handleUpdateField(field.id, { title: e.target.value })}
                          placeholder="Ketik judul pertanyaan..."
                          className="w-full text-sm font-bold text-white bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Tipe Jawaban
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newType = e.target.value as FormFieldType;
                            const hasOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(newType);
                            handleUpdateField(field.id, {
                              type: newType,
                              options: hasOptions ? field.options || ['Opsi 1', 'Opsi 2'] : undefined,
                            });
                          }}
                          className="w-full text-xs font-semibold text-slate-200 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 focus:outline-hidden focus:border-blue-500"
                        >
                          {QUESTION_TYPES.map((t) => (
                            <option key={t.type} value={t.type}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Description & Placeholder */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Petunjuk / Keterangan Tambahan
                        </label>
                        <input
                          type="text"
                          value={field.description || ''}
                          onChange={(e) => handleUpdateField(field.id, { description: e.target.value })}
                          placeholder="Penjelasan untuk peserta (opsional)..."
                          className="w-full text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Teks Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                          placeholder="Contoh isian..."
                          className="w-full text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Choice Options for Radio / Checkbox / Dropdown */}
                    {['multiple_choice', 'checkboxes', 'dropdown'].includes(field.type) && (
                      <div className="mt-3 p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2.5">
                        <p className="text-xs font-bold text-slate-300">Pilihan Opsi Jawaban:</p>
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-5">{optIdx + 1}.</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(field.id, optIdx, e.target.value)}
                              className="flex-1 text-xs text-white bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-blue-500 font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(field.id, optIdx)}
                              className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors"
                              title="Hapus opsi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOption(field.id)}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Pilihan Opsi
                        </button>
                      </div>
                    )}

                    {/* Footer Settings for Question */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Link className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-slate-400">Tautkan ke Data KTP:</span>
                        <select
                          value={field.mappedTo || ''}
                          onChange={(e) => handleUpdateField(field.id, { mappedTo: e.target.value as any })}
                          className="text-xs bg-slate-950 text-blue-300 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden font-semibold"
                        >
                          {KTP_MAPPINGS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                            className="w-4 h-4 rounded-sm bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-200">Wajib Diisi (Required)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add More Section at Bottom */}
              <div className="p-4 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(true)}
                  className="px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Library className="w-4 h-4" />
                  <span>Pilih dari Bank Pertanyaan</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddField('short_answer')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Pertanyaan Kustom Baru</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            Pengaturan Validasi & Respon Formulir
          </h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={settings.is_accepting_responses}
                onChange={(e) => onChange(fields, { ...settings, is_accepting_responses: e.target.checked })}
                className="w-4 h-4 mt-1 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-white">Menerima Respons Pendaftaran</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Jika dinonaktifkan, formulir ditutup dan peserta tidak dapat mengirim data pendaftaran baru.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={settings.nik_validation_enabled}
                onChange={(e) => onChange(fields, { ...settings, nik_validation_enabled: e.target.checked })}
                className="w-4 h-4 mt-1 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-white">Validasi NIK Real-Time & Anti-Duplikat Dua Lapis</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Memeriksa keabsahan NIK dan membatasi pendaftaran berulang (Role KORCAM/KORKEL/KORWE/KORTPS otomatis bebas duplikat).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={settings.allow_ktp_scan}
                onChange={(e) => onChange(fields, { ...settings, allow_ktp_scan: e.target.checked })}
                className="w-4 h-4 mt-1 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-bold text-white">Aktifkan Fitur Scan KTP dengan AI Vision</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Menyediakan kotak upload foto KTP bagi calon peserta untuk pengisian otomatis.
                </p>
              </div>
            </label>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Pesan Konfirmasi Setelah Peserta Mendaftar
              </label>
              <textarea
                rows={3}
                value={settings.confirmation_message || ''}
                onChange={(e) => onChange(fields, { ...settings, confirmation_message: e.target.value })}
                placeholder="Terima kasih, pendaftaran Anda telah berhasil dicatat..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Pratinjau Tampilan Formulir Peserta</h3>
            </div>
            <span className="text-xs text-slate-400">Mode Simulasi Pengisian</span>
          </div>

          <div className="max-w-xl mx-auto space-y-4 pt-2">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs text-blue-400 font-bold">Identitas Pokok (Wajib)</span>
              <p className="text-xs text-slate-400 mt-1">
                Calon peserta selalu mengisi NIK 16 digit dan Nama Lengkap pada awal pengisian formulir.
              </p>
            </div>

            {fields.map((f, i) => (
              <div key={f.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  {f.title} {f.required && <span className="text-red-400">*</span>}
                </label>
                {f.description && <p className="text-[11px] text-slate-400">{f.description}</p>}

                {['short_answer', 'number', 'email', 'phone'].includes(f.type) && (
                  <input
                    type="text"
                    disabled
                    placeholder={f.placeholder || 'Jawaban singkat...'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 opacity-80"
                  />
                )}

                {f.type === 'paragraph' && (
                  <textarea
                    rows={2}
                    disabled
                    placeholder={f.placeholder || 'Jawaban panjang...'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 opacity-80"
                  />
                )}

                {f.type === 'multiple_choice' && (
                  <div className="space-y-1.5 pt-1">
                    {(f.options || []).map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-xs text-slate-400">
                        <input type="radio" disabled className="text-blue-600" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {f.type === 'checkboxes' && (
                  <div className="space-y-1.5 pt-1">
                    {(f.options || []).map((opt, oIdx) => (
                      <label key={oIdx} className="flex items-center gap-2 text-xs text-slate-400">
                        <input type="checkbox" disabled className="rounded-xs text-blue-600" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {f.type === 'dropdown' && (
                  <select disabled className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400">
                    <option>Pilih salah satu...</option>
                    {(f.options || []).map((opt, oIdx) => (
                      <option key={oIdx}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: BANK PERTANYAAN CEPAT (QUESTION PRESET PICKER) */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Library className="w-5 h-5 text-blue-400" />
                  Bank Pertanyaan Pendaftaran
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih pertanyaan yang ingin disertakan ke dalam formulir pendaftaran acara Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-bold"
              >
                Tutup
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Cari pertanyaan..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {['Semua', 'KTP & Identitas', 'Kontak', 'Domisili Jagakarsa', 'Logistik & Acara'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLibraryFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      libraryFilterCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">
                  Tersedia <strong className="text-white">{filteredPresets.length}</strong> pilihan pertanyaan
                </span>

                <button
                  type="button"
                  onClick={handleApplyStandardPackage}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Pasang Paket Standar Lengkap Sekaligus
                </button>
              </div>

              {filteredPresets.map((preset) => {
                const isAlreadyInForm = fields.some(
                  (f) => f.title.toLowerCase() === preset.title.toLowerCase()
                );

                return (
                  <div
                    key={preset.id}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{preset.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                          {preset.type}
                        </span>
                        {preset.mappedTo && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                            OCR KTP
                          </span>
                        )}
                        {preset.required && (
                          <span className="text-[10px] font-bold text-red-400">* Wajib</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{preset.description}</p>
                    </div>

                    <div>
                      {isAlreadyInForm ? (
                        <span className="px-3 py-1.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Sudah Ada
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddPresetQuestion(preset)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pilih</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Formulir saat ini memiliki <strong className="text-white">{fields.length}</strong> pertanyaan.
              </span>

              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Selesai Memilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
