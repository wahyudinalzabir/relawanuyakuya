import React, { useState, useRef, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { KtpOcrData, Relawan, StatusRelawan } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Save,
  ShieldAlert,
  Loader2,
  Calendar,
  Building,
  MapPin,
  FileEdit,
  ScanLine,
  CheckCircle2,
  HelpCircle,
  Camera,
  Trash2,
} from 'lucide-react';
import { PanLogo } from '../components/PanLogo';

interface ScanKtpPageProps {
  initialMode?: 'scan' | 'manual';
  onSuccessSave: (relawan: Relawan) => void;
  onViewExisting: (relawan: Relawan) => void;
  onCancel: () => void;
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

// Specimen demo card images for fast testing
const SAMPLE_KTPS = [
  {
    name: 'KTP Contoh 1 (Jagakarsa)',
    previewTitle: 'Drs. Bambang Haryono (Jagakarsa)',
    nik: '3174091208750005',
    nama: 'BAMBANG HARYONO',
    tempatLahir: 'Jakarta',
    tanggalLahir: '12-08-1975',
    jenisKelamin: 'LAKI-LAKI',
    golDarah: 'O',
    alamat: 'JL. SIRSAK NO. 18 RT 002 RW 001',
    rt: '002',
    rw: '001',
    kelurahan: 'Jagakarsa',
    kecamatan: 'Jagakarsa',
    kabupatenKota: 'Kota Jakarta Selatan',
    provinsi: 'DKI Jakarta',
    agama: 'ISLAM',
    statusPerkawinan: 'KAWIN',
    pekerjaan: 'WIRASWASTA',
    kewarganegaraan: 'WNI',
  },
  {
    name: 'KTP Contoh 2 (Tanjung Barat)',
    previewTitle: 'Nurul Hidayati (Tanjung Barat)',
    nik: '3174095503930008',
    nama: 'NURUL HIDAYATI',
    tempatLahir: 'Bogor',
    tanggalLahir: '15-03-1993',
    jenisKelamin: 'PEREMPUAN',
    golDarah: 'B',
    alamat: 'JL. TANJUNG BARAT SELATAN NO. 22',
    rt: '001',
    rw: '002',
    kelurahan: 'Tanjung Barat',
    kecamatan: 'Jagakarsa',
    kabupatenKota: 'Kota Jakarta Selatan',
    provinsi: 'DKI Jakarta',
    agama: 'ISLAM',
    statusPerkawinan: 'KAWIN',
    pekerjaan: 'KARYAWAN SWASTA',
    kewarganegaraan: 'WNI',
  },
  {
    name: 'KTP Contoh 3 (Duplikat Test)',
    previewTitle: 'Muhammad Ilham Pratama (Sudah Terdaftar)',
    nik: '3174091506880001', // existing NIK in db
    nama: 'MUHAMMAD ILHAM PRATAMA',
    tempatLahir: 'Jakarta',
    tanggalLahir: '15-06-1988',
    jenisKelamin: 'LAKI-LAKI',
    golDarah: 'O',
    alamat: 'JL. TANJUNG BARAT RAYA NO. 45',
    rt: '001',
    rw: '001',
    kelurahan: 'Tanjung Barat',
    kecamatan: 'Jagakarsa',
    kabupatenKota: 'Kota Jakarta Selatan',
    provinsi: 'DKI Jakarta',
    agama: 'ISLAM',
    statusPerkawinan: 'KAWIN',
    pekerjaan: 'KARYAWAN SWASTA',
    kewarganegaraan: 'WNI',
  },
];

export const ScanKtpPage: React.FC<ScanKtpPageProps> = ({
  initialMode = 'scan',
  onSuccessSave,
  onViewExisting,
  onCancel,
  addToast,
}) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionalPhotoInputRef = useRef<HTMLInputElement>(null);

  // Active Tab Mode: 'scan' (Gemini Vision OCR) vs 'manual' (Manual Input Form)
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>(initialMode);

  // OCR Scan States
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingOcr, setLoadingOcr] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Verification step state (true when form is open for review or manual entry)
  const [isVerifying, setIsVerifying] = useState<boolean>(initialMode === 'manual');

  // Form Field Data (KTP attributes)
  const [formData, setFormData] = useState<KtpOcrData>({
    nik: '',
    nama: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'LAKI-LAKI',
    golongan_darah: '-',
    alamat: '',
    rt: '001',
    rw: '001',
    kelurahan: 'Jagakarsa',
    kecamatan: 'Jagakarsa',
    kabupaten_kota: 'Kota Jakarta Selatan',
    provinsi: 'DKI Jakarta',
    agama: 'ISLAM',
    status_perkawinan: 'KAWIN',
    pekerjaan: '',
    kewarganegaraan: 'WNI',
    lowConfidenceFields: [],
  });

  // Additional Volunteer fields
  const [idRelawan, setIdRelawan] = useState<string>('');
  const [tps, setTps] = useState<string>('TPS 001');
  const [statusRelawan, setStatusRelawan] = useState<StatusRelawan>('Aktif');
  const [koordinator, setKoordinator] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [tanggalInput, setTanggalInput] = useState<string>(new Date().toISOString().split('T')[0]);

  // Wilayah Hierarchy for Dropdowns
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    existingRelawan?: Relawan;
  }>({ isDuplicate: false });

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync when initialMode prop changes
  useEffect(() => {
    if (initialMode === 'manual') {
      setActiveTab('manual');
      setIsVerifying(true);
    }
  }, [initialMode]);

  // Load Wilayah hierarchy for convenient cascading selectors
  useEffect(() => {
    api.getWilayahHierarchy().then((res) => {
      setHierarchy(res.hierarchy || {});
    }).catch(console.error);
  }, []);

  // Generate ID Relawan preview
  useEffect(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    setIdRelawan(`REL-${year}-${rand}`);
  }, []);

  // Compute available Kelurahans based on selected Kecamatan
  const availableKelurahans = useMemo(() => {
    if (formData.kecamatan && hierarchy[formData.kecamatan]) {
      return Object.keys(hierarchy[formData.kecamatan]);
    }
    return [];
  }, [formData.kecamatan, hierarchy]);

  // Age calculation helper
  const calculatedAge = useMemo(() => {
    if (!formData.tanggal_lahir) return null;
    const parts = formData.tanggal_lahir.split('-');
    if (parts.length === 3) {
      // Formats: DD-MM-YYYY or YYYY-MM-DD
      let y = parseInt(parts[2], 10);
      let m = parseInt(parts[1], 10);
      let d = parseInt(parts[0], 10);
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }
      if (!isNaN(y) && y > 1900 && y <= new Date().getFullYear()) {
        const birthDate = new Date(y, m - 1, d);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
      }
    }
    return null;
  }, [formData.tanggal_lahir]);

  // Switch between Scan mode and Manual Input mode
  const handleSwitchMode = (mode: 'scan' | 'manual') => {
    setActiveTab(mode);
    setOcrError(null);
    if (mode === 'manual') {
      setIsVerifying(true);
      if (!formData.kecamatan && currentUser?.kecamatan_assigned) {
        setFormData((prev) => ({ ...prev, kecamatan: currentUser.kecamatan_assigned! }));
      }
    } else {
      // If switching to scan and no image uploaded yet, show dropzone
      if (!imagePreview) {
        setIsVerifying(false);
      }
    }
  };

  // Reset Form data to empty for brand new manual input
  const handleResetForm = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    setIdRelawan(`REL-${year}-${rand}`);
    setFormData({
      nik: '',
      nama: '',
      tempat_lahir: '',
      tanggal_lahir: '',
      jenis_kelamin: 'LAKI-LAKI',
      golongan_darah: '-',
      alamat: '',
      rt: '001',
      rw: '001',
      kelurahan: currentUser?.kecamatan_assigned ? 'Jagakarsa' : 'Jagakarsa',
      kecamatan: currentUser?.kecamatan_assigned || 'Jagakarsa',
      kabupaten_kota: 'Kota Jakarta Selatan',
      provinsi: 'DKI Jakarta',
      agama: 'ISLAM',
      status_perkawinan: 'KAWIN',
      pekerjaan: '',
      kewarganegaraan: 'WNI',
      lowConfidenceFields: [],
    });
    setTps('TPS 001');
    setStatusRelawan('Aktif');
    setKoordinator('');
    setKeterangan('');
    setImagePreview(null);
    setFile(null);
    setDuplicateWarning({ isDuplicate: false });
    addToast('info', 'Form Direset', 'Formulir input relawan telah dikosongkan.');
  };

  // Handle file select for Scan
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Handle optional photo upload in manual mode
  const handleOptionalPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        addToast('success', 'Foto Terlampir', 'Foto KTP / identitas relawan berhasil dilampirkan.');
      };
      reader.readAsDataURL(selected);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setOcrError('Format file tidak didukung. Harap upload file JPG, JPEG, PNG, atau WebP.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setOcrError('Ukuran file terlalu besar. Maksimal 10 MB.');
      return;
    }

    setOcrError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerOcr(base64, selectedFile.type);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Quick sample test
  const handleSelectSample = (sample: (typeof SAMPLE_KTPS)[0]) => {
    const svgKtp = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
        <rect width="600" height="380" rx="20" fill="#bae6fd" stroke="#004D9D" stroke-width="4"/>
        <rect x="15" y="15" width="570" height="350" rx="14" fill="#f0f9ff"/>
        <text x="300" y="45" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#004D9D" text-anchor="middle">PROVINSI DKI JAKARTA</text>
        <text x="300" y="68" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#004D9D" text-anchor="middle">KOTA JAKARTA SELATAN</text>
        
        <text x="30" y="105" font-family="monospace" font-size="20" font-weight="bold" fill="#0f172a">NIK          : ${sample.nik}</text>
        <text x="30" y="135" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Nama         : ${sample.nama}</text>
        <text x="30" y="160" font-family="Arial, sans-serif" font-size="13" fill="#334155">Tempat/Tgl Lahir : ${sample.tempatLahir}, ${sample.tanggalLahir}</text>
        <text x="30" y="185" font-family="Arial, sans-serif" font-size="13" fill="#334155">Jenis Kelamin    : ${sample.jenisKelamin}    Gol. Darah: ${sample.golDarah}</text>
        <text x="30" y="210" font-family="Arial, sans-serif" font-size="13" fill="#334155">Alamat           : ${sample.alamat}</text>
        <text x="60" y="232" font-family="Arial, sans-serif" font-size="13" fill="#334155">RT/RW        : ${sample.rt}/${sample.rw}</text>
        <text x="60" y="254" font-family="Arial, sans-serif" font-size="13" fill="#334155">Kel/Desa     : ${sample.kelurahan}</text>
        <text x="60" y="276" font-family="Arial, sans-serif" font-size="13" fill="#334155">Kecamatan    : ${sample.kecamatan}</text>
        <text x="30" y="300" font-family="Arial, sans-serif" font-size="13" fill="#334155">Agama        : ${sample.agama}</text>
        <text x="30" y="322" font-family="Arial, sans-serif" font-size="13" fill="#334155">Status Kawin : ${sample.statusPerkawinan}</text>
        <text x="30" y="344" font-family="Arial, sans-serif" font-size="13" fill="#334155">Pekerjaan    : ${sample.pekerjaan}</text>
        
        <rect x="460" y="95" width="115" height="150" rx="8" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="517" cy="140" r="30" fill="#64748b"/>
        <path d="M480 230 C480 185, 555 185, 555 230 Z" fill="#64748b"/>
        <text x="517" y="270" font-family="Arial, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">PAS FOTO</text>
      </svg>
    `;
    const base64Data = `data:image/svg+xml;base64,${btoa(svgKtp)}`;
    setImagePreview(base64Data);
    triggerOcr(base64Data, 'image/png');
  };

  // Trigger OCR with Gemini Vision
  const triggerOcr = async (base64: string, mimeType: string) => {
    setLoadingOcr(true);
    setOcrError(null);
    setDuplicateWarning({ isDuplicate: false });

    try {
      const res = await api.scanKtp(base64, mimeType);
      if (res.success && res.data) {
        setFormData(res.data);
        setIsVerifying(true);
        setActiveTab('scan');

        // Check duplicate
        if (res.duplicate?.isDuplicate) {
          setDuplicateWarning(res.duplicate);
          addToast(
            'warning',
            'Peringatan Duplikasi',
            `Data dengan NIK ${res.data.nik} sudah terdaftar sebelumnya atas nama ${res.duplicate.existingRelawan?.nama}.`
          );
        } else {
          addToast('success', 'OCR Berhasil', 'Data KTP berhasil dibaca oleh AI Gemini. Silakan verifikasi form sebelum menyimpan.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setOcrError(
        err.message ||
          'KTP tidak dapat dibaca oleh AI Gemini. Pastikan foto jelas, tidak buram, atau gunakan fitur Input Manual di bawah.'
      );
    } finally {
      setLoadingOcr(false);
    }
  };

  // Recheck NIK duplicate on field change
  const handleNikBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const nikVal = e.target.value.trim();
    if (nikVal.length >= 16) {
      try {
        const check = await api.checkNik(nikVal);
        if (check.exists && check.relawan) {
          setDuplicateWarning({ isDuplicate: true, existingRelawan: check.relawan });
          addToast(
            'warning',
            'Data Duplikat',
            `NIK ${nikVal} sudah terdaftar atas nama ${check.relawan.nama}.`
          );
        } else {
          setDuplicateWarning({ isDuplicate: false });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Handle Save
  const handleSaveData = async () => {
    if (!formData.nik || formData.nik.length < 16) {
      addToast('error', 'Validasi Gagal', 'NIK wajib 16 digit angka kependudukan.');
      return;
    }
    if (!formData.nama.trim()) {
      addToast('error', 'Validasi Gagal', 'Nama lengkap relawan wajib diisi.');
      return;
    }
    if (!formData.kecamatan) {
      addToast('error', 'Validasi Gagal', 'Kecamatan penugasan wajib diisi.');
      return;
    }
    if (!formData.kelurahan) {
      addToast('error', 'Validasi Gagal', 'Kelurahan penugasan wajib diisi.');
      return;
    }
    if (!tps) {
      addToast('error', 'Validasi Gagal', 'TPS wajib dipilih atau diisi.');
      return;
    }

    if (duplicateWarning.isDuplicate) {
      addToast(
        'error',
        'Penyimpanan Ditolak',
        'Data dengan NIK ini sudah terdaftar. Sistem mencegah duplikasi data relawan.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Relawan> = {
        nik: formData.nik,
        nama: formData.nama,
        tempat_lahir: formData.tempat_lahir,
        tanggal_lahir: formData.tanggal_lahir,
        jenis_kelamin: formData.jenis_kelamin,
        golongan_darah: formData.golongan_darah,
        alamat: formData.alamat,
        rt: formData.rt,
        rw: formData.rw,
        kelurahan: formData.kelurahan,
        kecamatan: formData.kecamatan,
        kabupaten_kota: formData.kabupaten_kota,
        provinsi: formData.provinsi,
        agama: formData.agama,
        status_perkawinan: formData.status_perkawinan,
        pekerjaan: formData.pekerjaan,
        kewarganegaraan: formData.kewarganegaraan,
        tps,
        status_relawan: statusRelawan,
        koordinator,
        keterangan,
        tanggal_input: tanggalInput,
        ktp_image_url: imagePreview || undefined,
      };

      const result = await api.createRelawan(payload);
      addToast(
        'success',
        'Berhasil Disimpan',
        `Relawan PAN ${result.relawan.nama} (${result.relawan.id_relawan}) berhasil ditambahkan ke database.`
      );
      onSuccessSave(result.relawan);
    } catch (err: any) {
      addToast('error', 'Gagal Menyimpan', err.message || 'Terjadi kesalahan pada server saat menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <PanLogo size="sm" variant="emblem" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-blue-950 tracking-tight">
                {activeTab === 'manual'
                  ? 'Input Data Relawan Secara Manual'
                  : isVerifying
                  ? 'Verifikasi Hasil Pembacaan KTP'
                  : 'Scan KTP Relawan (Partai PAN)'}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                {activeTab === 'manual' ? (
                  <>
                    <FileEdit className="w-3 h-3 text-blue-600" />
                    Input Manual
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    AI Gemini Vision
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {activeTab === 'manual'
                ? 'Solusi saat KTP fisik buram, rusak, atau tanpa foto. Formulir lengkap 24 kolom siap disimpan.'
                : isVerifying
                ? 'Pastikan hasil pembacaan OCR sesuai dengan KTP fisik sebelum menyimpan ke database.'
                : 'Pindai otomatis foto KTP dengan OCR Gemini Vision atau beralih ke form manual.'}
            </p>
          </div>
        </div>

        {/* Segmented Control / Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            id="tab-scan-ktp"
            type="button"
            onClick={() => handleSwitchMode('scan')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan KTP (AI)</span>
          </button>
          <button
            id="tab-manual-input"
            type="button"
            onClick={() => handleSwitchMode('manual')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Input Data Manual</span>
          </button>
        </div>
      </div>

      {/* Duplicate NIK Alert Banner */}
      {duplicateWarning.isDuplicate && duplicateWarning.existingRelawan && (
        <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-rose-950 animate-in fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-rose-900">
                Peringatan: Data dengan NIK ini sudah terdaftar!
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                NIK <span className="font-mono font-bold">{duplicateWarning.existingRelawan.nik}</span> telah tercatat atas nama{' '}
                <span className="font-bold">{duplicateWarning.existingRelawan.nama}</span> pada{' '}
                {duplicateWarning.existingRelawan.kecamatan}, TPS {duplicateWarning.existingRelawan.tps}.
              </p>
            </div>
          </div>
          <button
            id="btn-view-existing-relawan"
            type="button"
            onClick={() => onViewExisting(duplicateWarning.existingRelawan!)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap transition-colors cursor-pointer"
          >
            [Lihat Data Lama]
          </button>
        </div>
      )}

      {/* VIEW 1: UPLOAD BOX (When in 'scan' mode and not yet verifying) */}
      {activeTab === 'scan' && !isVerifying && (
        <div className="space-y-6">
          {/* Main Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
              loadingOcr
                ? 'border-blue-400 bg-blue-50/40 cursor-wait'
                : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 bg-white shadow-xs'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {loadingOcr ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin absolute inset-0" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900 text-base">AI Gemini sedang memindai KTP...</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Mengekstrak NIK, Nama, Tanggal Lahir, Alamat, dan status demografi secara otomatis.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-gray-900 text-lg">Unggah Foto KTP Relawan</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Tarik dan lepas foto KTP ke area ini, atau klik untuk memilih file dari perangkat Anda.
                  </p>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Format: JPG, JPEG, PNG, WebP (Maksimal 10 MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Direct Manual Entry Callout Banner if KTP cannot be scanned */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 shadow-xs">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-blue-950">
                  KTP Tidak Bisa Di-scan atau Foto Tidak Tersedia?
                </h4>
                <p className="text-xs text-blue-900/80 mt-0.5 max-w-xl">
                  Jika fisik KTP relawan buram, terkelupas, rusak, atau operator sedang menerima data via telepon/dokumen fisik, gunakan formulir <strong>Input Data Manual</strong>.
                </p>
              </div>
            </div>
            <button
              id="btn-switch-to-manual-from-dropzone"
              type="button"
              onClick={() => handleSwitchMode('manual')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <FileEdit className="w-4 h-4" />
              <span>Buka Form Input Manual</span>
            </button>
          </div>

          {/* OCR Error Notice with Immediate Fallback Button */}
          {ocrError && (
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-950 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs text-amber-900">KTP Tidak Dapat Terbaca Sempurna</h5>
                  <p className="text-xs text-amber-800 mt-0.5">{ocrError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setOcrError(null);
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-2 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Pilih Foto Lain
                </button>
                <button
                  id="btn-fallback-manual-on-error"
                  type="button"
                  onClick={() => handleSwitchMode('manual')}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Lanjut Input Manual</span>
                </button>
              </div>
            </div>
          )}

          {/* Instant Test Cards (Specimens) in Blue Theme */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-sm text-gray-900">Uji Coba Cepat (Contoh KTP Siap Pakai)</h4>
                <p className="text-xs text-gray-500">
                  Klik salah satu kartu contoh berikut untuk langsung menguji alur Gemini Vision OCR:
                </p>
              </div>
              <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                1-Klik Uji OCR
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {SAMPLE_KTPS.map((sample, idx) => (
                <button
                  key={idx}
                  id={`btn-sample-ktp-${idx}`}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                      {sample.name}
                    </span>
                    <FileImage className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{sample.nama}</p>
                  <p className="text-[11px] text-gray-500 mt-1 font-mono">NIK: {sample.nik}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Kec. {sample.kecamatan} • Kel. {sample.kelurahan}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: VERIFICATION & MANUAL ENTRY FORM */}
      {(isVerifying || activeTab === 'manual') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Photo Preview & Manual Guidance Box */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <FileImage className="w-4 h-4 text-blue-600" />
                  <span>{activeTab === 'manual' ? 'Lampiran Foto (Opsional)' : 'Foto Fisik KTP'}</span>
                </h3>
                {activeTab === 'manual' ? (
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Mode Manual
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Dipindai AI
                  </span>
                )}
              </div>

              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-blue-200 bg-slate-900 aspect-16/10 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Foto KTP Relawan"
                    className="object-contain w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFile(null);
                    }}
                    title="Hapus foto"
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => optionalPhotoInputRef.current?.click()}
                  className="aspect-16/10 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors"
                >
                  <Camera className="w-8 h-8 text-slate-400 mb-1" />
                  <p className="text-xs font-semibold text-slate-600">Unggah Foto Relawan / KTP</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Opsional: Klik untuk melampirkan foto jika ada
                  </p>
                </div>
              )}

              <input
                ref={optionalPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleOptionalPhotoChange}
                className="hidden"
              />

              {/* Guidance Info Card */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1.5 text-blue-950">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <PanLogo size="xs" variant="emblem" />
                  <span>Ketentuan Pendataan Relawan PAN</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-900/80">
                  {activeTab === 'manual'
                    ? 'Operator dapat memasukkan NIK dan identitas langsung tanpa scan. Pastikan NIK terdiri dari 16 digit angka resmi KTP.'
                    : 'Periksa kecocokan data OCR di form sebelah kanan dengan kartu KTP di atas. Koreksi bila ada huruf atau angka yang kurang tepat.'}
                </p>
                {calculatedAge !== null && (
                  <div className="pt-1.5 border-t border-blue-200/60 flex items-center justify-between text-[11px] font-semibold text-blue-900">
                    <span>Estimasi Usia Relawan:</span>
                    <span className="px-2 py-0.5 rounded bg-white text-blue-700 border border-blue-200 font-bold">
                      {calculatedAge} Tahun
                    </span>
                  </div>
                )}
              </div>

              {/* Secondary Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {activeTab === 'manual' ? (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Kosongkan Form Input
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (imagePreview) triggerOcr(imagePreview, 'image/jpeg');
                    }}
                    disabled={loadingOcr}
                    className="w-full py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pindai Ulang KTP</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSwitchMode(activeTab === 'manual' ? 'scan' : 'manual')}
                  className="w-full py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl transition-colors cursor-pointer"
                >
                  {activeTab === 'manual' ? 'Beralih ke Mode Scan KTP' : 'Beralih ke Input Manual'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Complete 24-Column Data Form */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
              {/* Section 1: Data Identitas KTP */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                      Data Kependudukan (KTP)
                    </h4>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {activeTab === 'manual' ? 'Isi manual sesuai fisik KTP' : 'Semua kolom dapat dikoreksi'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* NIK */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-800">
                        NIK (Nomor Induk Kependudukan) *
                      </label>
                      <span className={`text-[10px] font-mono ${formData.nik.length === 16 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        {formData.nik.length}/16 Digit
                      </span>
                    </div>
                    <input
                      id="input-ocr-nik"
                      type="text"
                      maxLength={16}
                      value={formData.nik}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                      onBlur={handleNikBlur}
                      className={`w-full font-mono text-sm p-2.5 rounded-xl border font-bold transition-all ${
                        duplicateWarning.isDuplicate
                          ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500'
                          : 'border-slate-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Masukkan 16 digit NIK"
                    />
                  </div>

                  {/* Nama */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-800 mb-1">Nama Lengkap *</label>
                    <input
                      id="input-ocr-nama"
                      type="text"
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value.toUpperCase() })}
                      placeholder="NAMA LENGKAP RELAWAN"
                      className="w-full font-bold uppercase text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Tempat Lahir */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={formData.tempat_lahir}
                      onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                      placeholder="Contoh: Jakarta"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tanggal Lahir */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-gray-700">Tanggal Lahir</label>
                      {calculatedAge !== null && (
                        <span className="text-[10px] text-blue-600 font-bold">
                          {calculatedAge} thn
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="DD-MM-YYYY (Contoh: 15-08-1988)"
                      value={formData.tanggal_lahir}
                      onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Jenis Kelamin *</label>
                    <select
                      value={formData.jenis_kelamin}
                      onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="LAKI-LAKI">LAKI-LAKI</option>
                      <option value="PEREMPUAN">PEREMPUAN</option>
                    </select>
                  </div>

                  {/* Golongan Darah */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Golongan Darah</label>
                    <select
                      value={formData.golongan_darah}
                      onChange={(e) => setFormData({ ...formData, golongan_darah: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="-">- (Tidak Tahu)</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>

                  {/* Alamat */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Alamat Jalan / Blok</label>
                    <input
                      type="text"
                      value={formData.alamat}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value.toUpperCase() })}
                      placeholder="JL. ... NO. ..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* RT & RW */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">RT (3 digit)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={formData.rt}
                      onChange={(e) => setFormData({ ...formData, rt: e.target.value.replace(/\D/g, '') })}
                      placeholder="001"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">RW (3 digit)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={formData.rw}
                      onChange={(e) => setFormData({ ...formData, rw: e.target.value.replace(/\D/g, '') })}
                      placeholder="001"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Kecamatan (Fixed Jagakarsa) */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Kecamatan *</label>
                    <div className="w-full text-xs p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-900 font-bold flex items-center justify-between">
                      <span>Jagakarsa</span>
                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-semibold">Tunggal</span>
                    </div>
                  </div>

                  {/* Kelurahan (Dropdown 6 Kelurahan Jagakarsa) */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Kelurahan / Desa *</label>
                    <select
                      value={formData.kelurahan}
                      disabled={Boolean(currentUser?.kelurahan_assigned)}
                      onChange={(e) => setFormData({ ...formData, kelurahan: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-600 font-medium"
                    >
                      {['Tanjung Barat', 'Lenteng Agung', 'Jagakarsa', 'Ciganjur', 'Srengseng Sawah', 'Cipedak'].map((kel) => (
                        <option key={kel} value={kel}>
                          Kel. {kel}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kab/Kota & Provinsi */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Kabupaten / Kota</label>
                    <input
                      type="text"
                      value={formData.kabupaten_kota}
                      onChange={(e) => setFormData({ ...formData, kabupaten_kota: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Provinsi</label>
                    <input
                      type="text"
                      value={formData.provinsi}
                      onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Agama & Status Perkawinan */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Agama</label>
                    <select
                      value={formData.agama}
                      onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="ISLAM">ISLAM</option>
                      <option value="KRISTEN">KRISTEN</option>
                      <option value="KATOLIK">KATOLIK</option>
                      <option value="HINDU">HINDU</option>
                      <option value="BUDDHA">BUDDHA</option>
                      <option value="KONGHUCU">KONGHUCU</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Status Perkawinan</label>
                    <select
                      value={formData.status_perkawinan}
                      onChange={(e) => setFormData({ ...formData, status_perkawinan: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="BELUM KAWIN">BELUM KAWIN</option>
                      <option value="KAWIN">KAWIN</option>
                      <option value="CERAI HIDUP">CERAI HIDUP</option>
                      <option value="CERAI MATI">CERAI MATI</option>
                    </select>
                  </div>

                  {/* Pekerjaan & Kewarganegaraan */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Pekerjaan</label>
                    <input
                      type="text"
                      value={formData.pekerjaan}
                      onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value.toUpperCase() })}
                      placeholder="KARYAWAN / WIRASWASTA / DLL"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Kewarganegaraan</label>
                    <input
                      type="text"
                      value={formData.kewarganegaraan}
                      onChange={(e) => setFormData({ ...formData, kewarganegaraan: e.target.value.toUpperCase() })}
                      placeholder="WNI"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Data Penugasan Relawan PAN */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                      Penugasan Relawan Partai PAN
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    TPS &amp; Lapangan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* ID Relawan (Auto Unique) */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">ID Relawan (Otomatis)</label>
                    <input
                      type="text"
                      disabled
                      value={idRelawan}
                      className="w-full font-mono text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold"
                    />
                  </div>

                  {/* TPS */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">TPS (Titik Tempat Pemilihan) *</label>
                    <input
                      id="input-relawan-tps"
                      type="text"
                      value={tps}
                      onChange={(e) => setTps(e.target.value)}
                      placeholder="Contoh: TPS 001"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status Relawan */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Status Keaktifan Relawan *</label>
                    <select
                      id="select-status-relawan"
                      value={statusRelawan}
                      onChange={(e) => setStatusRelawan(e.target.value as StatusRelawan)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Aktif">Aktif (Siap Ditugaskan)</option>
                      <option value="Pending">Pending (Menunggu Verifikasi)</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                  </div>

                  {/* Koordinator */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Koordinator Wilayah</label>
                    <input
                      type="text"
                      value={koordinator}
                      onChange={(e) => setKoordinator(e.target.value)}
                      placeholder="Nama Koordinator Lapangan"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tanggal Input */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Tanggal Entri Data</label>
                    <input
                      type="date"
                      value={tanggalInput}
                      onChange={(e) => setTanggalInput(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Operator Input */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Operator Penginput</label>
                    <input
                      type="text"
                      disabled
                      value={`${currentUser?.name || 'Operator'} (${currentUser?.role || ''})`}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-medium"
                    />
                  </div>

                  {/* Keterangan */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Keterangan Tambahan / Catatan Khusus</label>
                    <textarea
                      rows={2}
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Catatan keahlian khusus, nomor HP alternatif, atau alasan input manual (KTP fisik rusak)..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sistem otomatis memverifikasi keunikan NIK.</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifying(false);
                      setImagePreview(null);
                      setFile(null);
                      onCancel();
                    }}
                    className="flex-1 sm:flex-initial px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    id="btn-save-relawan-data"
                    type="button"
                    disabled={isSaving || duplicateWarning.isDuplicate}
                    onClick={handleSaveData}
                    className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                      duplicateWarning.isDuplicate
                        ? 'bg-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan ke Database...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Data Relawan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
