import React, { useState } from 'react';
import {
  FormField,
  FormFieldType,
  EventFormSettings,
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
  HelpCircle,
  Link,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface EventFormBuilderProps {
  fields: FormField[];
  settings: EventFormSettings;
  onChange: (fields: FormField[], settings: EventFormSettings) => void;
  onSave: () => void;
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

export const EventFormBuilder: React.FC<EventFormBuilderProps> = ({
  fields,
  settings,
  onChange,
  onSave,
  isSaving = false,
}) => {
  const [activeTab, setActiveTab] = useState<'builder' | 'settings' | 'preview'>('builder');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id || null);

  const handleAddField = (type: FormFieldType = 'short_answer') => {
    const newId = `q_${Date.now()}`;
    const newField: FormField = {
      id: newId,
      title: type === 'section' ? 'Bagian Baru' : 'Pertanyaan Tanpa Judul',
      type,
      required: type !== 'section',
      placeholder: '',
      description: '',
      options: ['multiple_choice', 'checkboxes', 'dropdown'].includes(type) ? ['Opsi 1', 'Opsi 2'] : undefined,
    };
    const updated = [...fields, newField];
    onChange(updated, settings);
    setSelectedFieldId(newId);
  };

  const handleUpdateField = (id: string, partial: Partial<FormField>) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, ...partial } : f));
    onChange(updated, settings);
  };

  const handleDeleteField = (id: string) => {
    if (fields.length <= 1) {
      alert('Formulir harus memiliki minimal 1 pertanyaan.');
      return;
    }
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
    const opts = field.options || [];
    handleUpdateField(fieldId, {
      options: [...opts, `Opsi ${opts.length + 1}`],
    });
  };

  const handleUpdateOption = (fieldId: string, optIndex: number, val: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const opts = [...field.options];
    opts[optIndex] = val;
    handleUpdateField(fieldId, { options: opts });
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    if (field.options.length <= 1) return;
    const opts = field.options.filter((_, idx) => idx !== optIndex);
    handleUpdateField(fieldId, { options: opts });
  };

  const handleSettingsChange = (partial: Partial<EventFormSettings>) => {
    onChange(fields, { ...settings, ...partial });
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Builder Top Bar */}
      <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'builder'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editor Pertanyaan ({fields.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Pengaturan Form
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Pratinjau Publik
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Form'}
          </button>
        </div>
      </div>

      {/* Tab: Builder */}
      {activeTab === 'builder' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Form Builder Dinamis</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rancang formulir pendaftaran bebas seperti Google Forms. Data otomatis tersimpan per event.
              </p>
            </div>
            <div className="relative group">
              <button
                type="button"
                onClick={() => handleAddField('short_answer')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Pertanyaan
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {fields.map((field, idx) => {
              const isSelected = selectedFieldId === field.id;
              const typeInfo = QUESTION_TYPES.find((t) => t.type === field.type) || QUESTION_TYPES[0];

              if (field.type === 'section') {
                return (
                  <div
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={`p-5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/30'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                        <Layout className="w-4 h-4" />
                        Pemisah Bagian #{idx + 1}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(idx, 'up');
                          }}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Geser ke atas"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(idx, 'down');
                          }}
                          disabled={idx === fields.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Geser ke bawah"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(field.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300 ml-1"
                          title="Hapus Bagian"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={field.title}
                      onChange={(e) => handleUpdateField(field.id, { title: e.target.value })}
                      placeholder="Judul Bagian..."
                      className="w-full text-base font-bold text-white bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 focus:outline-hidden focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) => handleUpdateField(field.id, { description: e.target.value })}
                      placeholder="Deskripsi singkat bagian ini (opsional)..."
                      className="w-full text-xs text-slate-300 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 mt-2 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                );
              }

              return (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`p-5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-slate-800/50 ring-1 ring-blue-500/30'
                      : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {typeInfo.icon}
                        <span className="font-semibold text-slate-300">{typeInfo.label}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                        title="Geser ke atas"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(idx, 'down');
                        }}
                        disabled={idx === fields.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                        title="Geser ke bawah"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateField(field);
                        }}
                        className="p-1 text-slate-400 hover:text-white ml-1"
                        title="Duplikat pertanyaan"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 ml-1"
                        title="Hapus pertanyaan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Title & Type Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={field.title}
                        onChange={(e) => handleUpdateField(field.id, { title: e.target.value })}
                        placeholder="Tuliskan pertanyaan formulir..."
                        className="w-full text-sm font-semibold text-white bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div>
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
                        className="w-full text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-hidden focus:border-blue-500"
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
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) => handleUpdateField(field.id, { description: e.target.value })}
                      placeholder="Bantuan/keterangan tambahan untuk peserta (opsional)..."
                      className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={field.placeholder || ''}
                      onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                      placeholder="Teks placeholder petunjuk..."
                      className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {/* Options management for choice types */}
                  {['multiple_choice', 'checkboxes', 'dropdown'].includes(field.type) && (
                    <div className="mt-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                      <p className="text-xs font-bold text-slate-300">Pilihan Opsi Jawaban:</p>
                      {(field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-4">{optIdx + 1}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(field.id, optIdx, e.target.value)}
                            className="flex-1 text-xs text-white bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(field.id, optIdx)}
                            className="p-1 text-slate-400 hover:text-red-400"
                            title="Hapus opsi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddOption(field.id)}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                      >
                        <Plus className="w-3 h-3" /> Tambah Opsi Jawaban
                      </button>
                    </div>
                  )}

                  {/* Footer Settings for Question */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Link className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400">Integrasi KTP:</span>
                      <select
                        value={field.mappedTo || ''}
                        onChange={(e) => handleUpdateField(field.id, { mappedTo: e.target.value as any })}
                        className="text-xs bg-slate-900 text-blue-300 border border-slate-700 rounded-md px-2 py-1 focus:outline-hidden"
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
                          className="w-4 h-4 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-slate-300">Wajib Diisi (Required)</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => handleAddField('short_answer')}
              className="px-4 py-2.5 border border-dashed border-slate-700 hover:border-blue-500 text-slate-300 hover:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Pertanyaan Baru
            </button>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-white">Pengaturan Formulir & Validasi</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola mekanisme keamanan, validasi NIK anti-duplikat, dan batas kuota peserta.
            </p>
          </div>

          <div className="space-y-4">
            {/* Status Menerima Respons */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Buka / Terima Pendaftaran</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jika dinonaktifkan, link pendaftaran publik akan menampilkan bahwa formulir sedang ditutup.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_accepting_responses}
                  onChange={(e) => handleSettingsChange({ is_accepting_responses: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Validasi NIK Anti Duplikat */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">Validasi Anti-Duplikat NIK</p>
                  <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 text-[10px] font-bold rounded-full">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mencegah NIK yang sama mendaftar lebih dari satu kali lintas kegiatan (Role KORCAM/KORKEL/KORWE/KORTPS otomatis di-bypass).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.nik_validation_enabled}
                  onChange={(e) => handleSettingsChange({ nik_validation_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Scan KTP vs Manual Input Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Izinkan Scan / Upload KTP (AI)</p>
                  <p className="text-xs text-slate-400 mt-0.5">Peserta dapat menggunakan kamera atau upload foto KTP.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_ktp_scan}
                  onChange={(e) => handleSettingsChange({ allow_ktp_scan: e.target.checked })}
                  className="w-5 h-5 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Izinkan Input Manual</p>
                  <p className="text-xs text-slate-400 mt-0.5">Peserta dapat mengisi langsung jika tidak ingin scan KTP.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_manual_input}
                  onChange={(e) => handleSettingsChange({ allow_manual_input: e.target.checked })}
                  className="w-5 h-5 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Pesan Konfirmasi */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800">
              <label className="block text-sm font-bold text-white mb-1">
                Pesan Konfirmasi Setelah Berhasil Mendaftar
              </label>
              <textarea
                rows={3}
                value={settings.confirmation_message || ''}
                onChange={(e) => handleSettingsChange({ confirmation_message: e.target.value })}
                placeholder="Pesan ucapan terima kasih untuk peserta..."
                className="w-full text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Preview */}
      {activeTab === 'preview' && (
        <div className="p-6">
          <div className="max-w-2xl mx-auto bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="px-2.5 py-1 bg-blue-900/60 text-blue-300 text-xs font-bold rounded-full">
                Pratinjau Tampilan Peserta
              </span>
              <h2 className="text-xl font-extrabold text-white mt-3">Formulir Pendaftaran</h2>
              <p className="text-xs text-slate-400 mt-1">
                Isi data berikut dengan benar untuk mengikuti kegiatan.
              </p>
            </div>

            <div className="space-y-4">
              {fields.map((f, i) => {
                if (f.type === 'section') {
                  return (
                    <div key={f.id} className="pt-4 border-t border-slate-800">
                      <h4 className="text-base font-bold text-blue-400">{f.title}</h4>
                      {f.description && <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>}
                    </div>
                  );
                }

                return (
                  <div key={f.id} className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      {f.title} {f.required && <span className="text-red-400">*</span>}
                    </label>
                    {f.description && <p className="text-[11px] text-slate-400">{f.description}</p>}

                    {['short_answer', 'number', 'email', 'phone', 'date', 'time'].includes(f.type) && (
                      <input
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        placeholder={f.placeholder || 'Jawaban Anda...'}
                        disabled
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                      />
                    )}

                    {f.type === 'paragraph' && (
                      <textarea
                        rows={2}
                        placeholder={f.placeholder || 'Jawaban panjang Anda...'}
                        disabled
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 cursor-not-allowed"
                      />
                    )}

                    {['multiple_choice', 'checkboxes'].includes(f.type) && (
                      <div className="space-y-1.5 pt-1">
                        {(f.options || ['Opsi 1']).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type={f.type === 'multiple_choice' ? 'radio' : 'checkbox'}
                              disabled
                              className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700"
                            />
                            <span className="text-xs text-slate-300">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {f.type === 'dropdown' && (
                      <select
                        disabled
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                      >
                        <option>Pilih salah satu...</option>
                        {(f.options || []).map((opt, oIdx) => (
                          <option key={oIdx}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {f.type === 'file_upload' && (
                      <div className="border border-dashed border-slate-800 rounded-lg p-4 text-center text-xs text-slate-500">
                        Klik atau seret file ke sini untuk mengunggah
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                disabled
                className="px-5 py-2.5 bg-blue-600/40 text-white/50 rounded-lg text-xs font-bold cursor-not-allowed"
              >
                Kirim Pendaftaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
