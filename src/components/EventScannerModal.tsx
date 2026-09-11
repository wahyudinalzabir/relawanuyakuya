import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  UserPlus,
  ArrowRight,
  Sparkles,
  Info,
  X,
  FlipHorizontal,
} from 'lucide-react';
import { api } from '../lib/api';
import { EventItem, KehadiranEvent, Relawan } from '../types';

interface EventScannerModalProps {
  isOpen: boolean;
  event: EventItem;
  onClose: () => void;
  onSuccessCheckIn: (attendance: KehadiranEvent) => void;
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

type ScanStage =
  | 'camera' // Live camera or ready to upload
  | 'processing' // OCR in progress
  | 'ocr_error' // NIK unreadable
  | 'relawan_found' // Found in volunteer database, waiting for CONFIRM HADIR
  | 'already_checked_in' // Duplicate detected
  | 'not_found' // Not in volunteer db, offer guest registration
  | 'success'; // Check-in recorded

export const EventScannerModal: React.FC<EventScannerModalProps> = ({
  isOpen,
  event,
  onClose,
  onSuccessCheckIn,
  addToast,
}) => {
  const [stage, setStage] = useState<ScanStage>('camera');
  const [loading, setLoading] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Extracted/Parsed Data
  const [scannedNik, setScannedNik] = useState<string>('');
  const [scannedNama, setScannedNama] = useState<string>('');
  const [scannedWilayah, setScannedWilayah] = useState<{
    kecamatan: string;
    kelurahan: string;
    rw: string;
    rt: string;
  }>({ kecamatan: 'Jagakarsa', kelurahan: '', rw: '', rt: '' });

  // Matching Relawan (if registered)
  const [matchedRelawan, setMatchedRelawan] = useState<Relawan | null>(null);

  // Duplicate Check-In record (if already checked in)
  const [existingCheckIn, setExistingCheckIn] = useState<KehadiranEvent | null>(null);

  // Success result
  const [latestCheckIn, setLatestCheckIn] = useState<KehadiranEvent | null>(null);

  const [errorMessage, setErrorMessage] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      resetToCamera();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const resetToCamera = () => {
    setStage('camera');
    setCapturedImage(null);
    setScannedNik('');
    setScannedNama('');
    setMatchedRelawan(null);
    setExistingCheckIn(null);
    setLatestCheckIn(null);
    setErrorMessage('');
    startCamera();
  };

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Could not open camera:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const maskNik = (nik: string) => {
    if (!nik) return '----------------';
    const clean = nik.replace(/\D/g, '');
    if (clean.length <= 4) return clean;
    return `${clean.slice(0, 4)}${'*'.repeat(Math.max(0, clean.length - 4))}`;
  };

  // Capture frame from video
  const captureFrame = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      processOcrImage(base64);
    } catch (err: any) {
      addToast('error', 'Kamera Gagal', 'Gagal mengambil gambar dari kamera.');
    }
  };

  // Upload file fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      stopCamera();
      processOcrImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send image to existing OCR endpoint
  const processOcrImage = async (base64Data: string) => {
    setCapturedImage(base64Data);
    setStage('processing');
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.scanKtp(base64Data);

      if (!res.success || !res.data || !res.data.nik || res.data.nik.replace(/\D/g, '').length < 12) {
        setStage('ocr_error');
        setErrorMessage('NIK belum terbaca dengan jelas. Pastikan KTP berada di dalam bingkai dan pencahayaan cukup.');
        setLoading(false);
        return;
      }

      const cleanNik = res.data.nik.replace(/\D/g, '');
      const nama = (res.data.nama || '').trim();
      const kecamatan = res.data.kecamatan || 'Jagakarsa';
      const kelurahan = res.data.kelurahan || '';
      const rw = res.data.rw || '';
      const rt = res.data.rt || '';

      setScannedNik(cleanNik);
      setScannedNama(nama);
      setScannedWilayah({ kecamatan, kelurahan, rw, rt });

      // Check duplicate check-in in this event FIRST
      const existingAttendance = await api.getEventKehadiran(event.id, { search: cleanNik });
      const duplicateFound = existingAttendance.items.find(
        (item) => item.nik.replace(/\D/g, '') === cleanNik
      );

      if (duplicateFound) {
        setExistingCheckIn(duplicateFound);
        setStage('already_checked_in');
        setLoading(false);
        return;
      }

      // Check if NIK is registered in volunteer database
      const nikCheck = await api.checkNik(cleanNik);

      if (nikCheck.exists && nikCheck.relawan) {
        setMatchedRelawan(nikCheck.relawan);
        setStage('relawan_found');
      } else {
        setMatchedRelawan(null);
        setStage('not_found');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setStage('ocr_error');
      setErrorMessage(err.message || 'NIK belum terbaca. Silakan ulangi scan KTP.');
    } finally {
      setLoading(false);
    }
  };

  // Quick specimen tester (for preview / demo without physical KTP)
  const handleSimulateQuickScan = async (type: 'relawan_existing' | 'relawan_guest' | 'relawan_duplicate') => {
    setStage('processing');
    setLoading(true);
    stopCamera();

    setTimeout(async () => {
      try {
        if (type === 'relawan_existing') {
          // Fetch an existing volunteer from Jagakarsa to test live matching
          const res = await api.getRelawan({ limit: 1 });
          const sample = res.items[0];

          if (sample) {
            // Check if already checked in
            const existingAttendance = await api.getEventKehadiran(event.id, { search: sample.nik });
            const duplicateFound = existingAttendance.items.find(
              (item) => item.nik.replace(/\D/g, '') === sample.nik.replace(/\D/g, '')
            );

            if (duplicateFound) {
              setExistingCheckIn(duplicateFound);
              setStage('already_checked_in');
            } else {
              setScannedNik(sample.nik);
              setScannedNama(sample.nama);
              setScannedWilayah({
                kecamatan: sample.kecamatan,
                kelurahan: sample.kelurahan,
                rw: sample.rw,
                rt: sample.rt,
              });
              setMatchedRelawan(sample);
              setStage('relawan_found');
            }
          } else {
            // Fallback sample
            const nik = '3174091508820005';
            setScannedNik(nik);
            setScannedNama('BAMBANG PAMUNGKAS');
            setScannedWilayah({ kecamatan: 'Jagakarsa', kelurahan: 'Jagakarsa', rw: '002', rt: '004' });
            setMatchedRelawan(null);
            setStage('not_found');
          }
        } else if (type === 'relawan_guest') {
          // Non-registered guest
          const guestNik = `317409200${Math.floor(1000000 + Math.random() * 9000000)}`;
          setScannedNik(guestNik);
          setScannedNama('H. AHMAD FAUZI (WARGA JAGAKARSA)');
          setScannedWilayah({ kecamatan: 'Jagakarsa', kelurahan: 'Lenteng Agung', rw: '005', rt: '008' });
          setMatchedRelawan(null);
          setStage('not_found');
        } else if (type === 'relawan_duplicate') {
          // Fetch any existing checkin or create one to test duplicate check
          const existingAttendance = await api.getEventKehadiran(event.id);
          if (existingAttendance.items.length > 0) {
            const first = existingAttendance.items[0];
            setExistingCheckIn(first);
            setStage('already_checked_in');
          } else {
            // Check in someone first, then show duplicate
            addToast('info', 'Uji Coba Duplikat', 'Lakukan satu kali check-in terlebih dahulu untuk menguji proteksi duplikat.');
            resetToCamera();
          }
        }
      } catch (err: any) {
        addToast('error', 'Simulasi Gagal', err.message || 'Gagal menyiapkan data uji coba.');
        resetToCamera();
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  // Confirm attendance for verified volunteer
  const handleConfirmHadir = async () => {
    if (!matchedRelawan && !scannedNik) return;
    setLoading(true);

    try {
      const res = await api.checkInEvent(event.id, {
        nik: matchedRelawan?.nik || scannedNik,
        nama: matchedRelawan?.nama || scannedNama,
        kecamatan: matchedRelawan?.kecamatan || scannedWilayah.kecamatan,
        kelurahan: matchedRelawan?.kelurahan || scannedWilayah.kelurahan,
        rw: matchedRelawan?.rw || scannedWilayah.rw,
        rt: matchedRelawan?.rt || scannedWilayah.rt,
        status_kehadiran: 'HADIR',
        relawan_id: matchedRelawan?.id,
        id_relawan: matchedRelawan?.id_relawan,
        tps: matchedRelawan?.tps,
        ktp_image_url: matchedRelawan?.foto_ktp || capturedImage || undefined,
      });

      if (res.isDuplicate && res.firstCheckIn) {
        setExistingCheckIn(res.firstCheckIn);
        setStage('already_checked_in');
        return;
      }

      if (res.success && res.data) {
        setLatestCheckIn(res.data);
        setStage('success');
        onSuccessCheckIn(res.data);
        addToast('success', 'Check-in Berhasil', `Kehadiran ${res.data.nama} telah dicatat.`);
      } else {
        throw new Error(res.error || 'Gagal menyimpan kehadiran.');
      }
    } catch (err: any) {
      addToast('error', 'Gagal Check-in', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Record as Guest Attendee
  const handleCatatSebagaiPesertaTamu = async () => {
    if (!scannedNik || !scannedNama) {
      addToast('warning', 'Data Kurang', 'Nama dan NIK diperlukan untuk mencatat tamu.');
      return;
    }
    setLoading(true);

    try {
      const res = await api.checkInEvent(event.id, {
        nik: scannedNik,
        nama: scannedNama,
        kecamatan: scannedWilayah.kecamatan || 'Jagakarsa',
        kelurahan: scannedWilayah.kelurahan || 'Jagakarsa',
        rw: scannedWilayah.rw || '001',
        rt: scannedWilayah.rt || '001',
        status_kehadiran: 'PESERTA TAMU',
        ktp_image_url: capturedImage || undefined,
        catatan: 'Peserta tamu belum terdaftar di database relawan',
      });

      if (res.isDuplicate && res.firstCheckIn) {
        setExistingCheckIn(res.firstCheckIn);
        setStage('already_checked_in');
        return;
      }

      if (res.success && res.data) {
        setLatestCheckIn(res.data);
        setStage('success');
        onSuccessCheckIn(res.data);
        addToast('success', 'Peserta Tamu Tercatat', `${res.data.nama} berhasil dicatat sebagai Peserta Tamu.`);
      } else {
        throw new Error(res.error || 'Gagal mencatat peserta tamu.');
      }
    } catch (err: any) {
      addToast('error', 'Gagal Mencatat Tamu', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                CHECK-IN EVENT
              </span>
              <span className="text-xs text-slate-400">{event.tanggal_display}</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">{event.nama}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* STAGE 1: CAMERA SCANNER */}
          {stage === 'camera' && (
            <div className="space-y-4">
              {/* Video Camera Container */}
              <div className="relative w-full aspect-16/10 bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center shadow-inner">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-sm font-medium">Kamera tidak aktif atau izin belum diberikan.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Gunakan tombol Ambil Foto / Upload di bawah ini.
                    </p>
                  </div>
                )}

                {/* KTP Framing Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                  <div className="relative w-4/5 h-4/5 max-w-md border-2 border-dashed border-blue-400/70 rounded-xl flex flex-col justify-between p-3 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-blue-300 bg-slate-900/80 px-2.5 py-1 rounded-md backdrop-blur-xs w-max">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                      Posisikan KTP di Dalam Bingkai
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-blue-200/90 font-medium bg-slate-900/80 px-2.5 py-1 rounded-md inline-block backdrop-blur-xs">
                        Pastikan NIK 16 digit terlihat jelas dan tidak buram
                      </p>
                    </div>
                  </div>
                </div>

                {/* Camera controls overlay */}
                {cameraActive && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 border border-slate-700 backdrop-blur-xs transition-colors"
                    title="Ganti Kamera"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  id="btn-capture-ktp"
                  onClick={captureFrame}
                  disabled={!cameraActive}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto KTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Upload Foto KTP</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Fast Specimen Tester (Especially helpful in browser dev previews) */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Simulasi Uji Coba Cepat (Testing Preview):
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateQuickScan('relawan_existing')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    Uji Relawan Terdaftar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateQuickScan('relawan_guest')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    Uji Peserta Tamu
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateQuickScan('relawan_duplicate')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    Uji Cegah Check-in Ganda
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: PROCESSING OCR */}
          {stage === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-blue-400 absolute" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">AI Vision Sedang Membaca KTP...</h3>
                <p className="text-xs text-slate-400">
                  Mengekstrak 16 digit NIK dan memeriksa status relawan Jagakarsa
                </p>
              </div>
            </div>
          )}

          {/* STAGE 3: OCR ERROR */}
          {stage === 'ocr_error' && (
            <div className="py-6 space-y-5">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">NIK Belum Terbaca</h4>
                  <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                    {errorMessage || 'NIK belum terbaca. Silakan ulangi scan KTP.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-lg text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-slate-200">Tips pengambilan foto KTP:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                  <li>Posisikan KTP rata dan lurus di dalam garis bingkai.</li>
                  <li>Hindari pantulan cahaya kilat atau bayangan tebal pada angka NIK.</li>
                  <li>Pastikan lensa kamera dalam keadaan bersih dan fokus.</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetToCamera}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Ulang KTP</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: RELAWAN FOUND -> CONFIRM HADIR */}
          {stage === 'relawan_found' && matchedRelawan && (
            <div className="space-y-5">
              {/* Badge Data Relawan Ditemukan */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    DATA RELAWAN DITEMUKAN
                  </span>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Relawan resmi terverifikasi di Kecamatan Jagakarsa.
                  </p>
                </div>
              </div>

              {/* Detail Card Relawan */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-medium">Nama Lengkap</p>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {matchedRelawan.nama}
                    </h3>
                    <p className="text-xs font-mono text-blue-300">
                      ID: {matchedRelawan.id_relawan || '-'}
                    </p>
                  </div>
                  {matchedRelawan.foto_ktp ? (
                    <img
                      src={matchedRelawan.foto_ktp}
                      alt="Foto KTP"
                      className="w-24 h-16 object-cover rounded-lg border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-14 bg-slate-700/50 rounded-lg flex items-center justify-center text-[10px] text-slate-400 text-center p-1">
                      Foto KTP Tersimpan
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">NIK (Sensor):</span>
                    <p className="font-mono font-bold text-slate-200">{maskNik(matchedRelawan.nik)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Kelurahan:</span>
                    <p className="font-bold text-white">{matchedRelawan.kelurahan}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">RW / RT:</span>
                    <p className="font-bold text-white">
                      RW {matchedRelawan.rw} / RT {matchedRelawan.rt}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Kecamatan:</span>
                    <p className="font-bold text-white">{matchedRelawan.kecamatan}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">TPS:</span>
                    <p className="font-bold text-white">{matchedRelawan.tps || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Status Relawan:</span>
                    <p className="font-bold text-emerald-400">{matchedRelawan.status_relawan}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetToCamera}
                  disabled={loading}
                  className="order-2 sm:order-1 flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Batal / Scan Ulang
                </button>

                <button
                  type="button"
                  id="btn-confirm-hadir"
                  onClick={handleConfirmHadir}
                  disabled={loading}
                  className="order-1 sm:order-2 flex-2 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-colors disabled:opacity-50"
                >
                  <UserCheck className="w-5 h-5" />
                  <span>{loading ? 'Menyimpan Kehadiran...' : 'CONFIRM HADIR'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 5: ALREADY CHECKED IN (DUPLICATE GUARD) */}
          {stage === 'already_checked_in' && existingCheckIn && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-amber-500/20 text-amber-400 mb-1">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-amber-300">SUDAH CHECK-IN</h3>
                <p className="text-xs text-amber-200/90 max-w-md mx-auto">
                  Relawan ini sudah melakukan check-in pada event ini sebelumnya. Waktu check-in pertama dipertahankan dan tidak diubah.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Nama Relawan:</span>
                  <span className="font-bold text-white text-sm">{existingCheckIn.nama}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="text-slate-400">NIK:</span>
                  <span className="font-mono font-bold text-slate-300">{maskNik(existingCheckIn.nik)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Status Kehadiran:</span>
                  <span className="font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {existingCheckIn.status_kehadiran}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Tanggal Check-in:</span>
                  <span className="font-bold text-white">{existingCheckIn.tanggal_checkin}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Waktu Check-in Pertama:</span>
                  <span className="font-bold text-amber-300 text-sm">{existingCheckIn.waktu_checkin}</span>
                </div>
              </div>

              <button
                type="button"
                id="btn-scan-berikutnya-dup"
                onClick={resetToCamera}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-600/20"
              >
                <ArrowRight className="w-4 h-4" />
                <span>SCAN BERIKUTNYA</span>
              </button>
            </div>
          )}

          {/* STAGE 6: NOT FOUND IN VOLUNTEER DB -> GUEST OPTION */}
          {stage === 'not_found' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-300">DATA RELAWAN TIDAK DITEMUKAN</h4>
                  <p className="text-xs text-blue-200/90 mt-1 leading-relaxed">
                    NIK ini belum terdaftar di database relawan Jagakarsa. Data tidak dimasukkan ke database relawan. Anda dapat mencatatnya sebagai <strong>Peserta Tamu</strong> atau melakukan scan ulang.
                  </p>
                </div>
              </div>

              {/* Data KTP terbaca */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <p className="text-xs font-semibold text-slate-300">Data KTP Terbaca:</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Nama:</span>
                    <p className="font-bold text-white">{scannedNama || '(Nama belum terbaca)'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">NIK:</span>
                    <p className="font-mono font-bold text-blue-300">{maskNik(scannedNik)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Kelurahan:</span>
                    <p className="font-medium text-slate-200">{scannedWilayah.kelurahan || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Kecamatan:</span>
                    <p className="font-medium text-slate-200">{scannedWilayah.kecamatan || 'Jagakarsa'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">RW / RT:</span>
                    <p className="font-medium text-slate-200">
                      RW {scannedWilayah.rw || '-'} / RT {scannedWilayah.rt || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dual Action Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  id="btn-catat-tamu"
                  onClick={handleCatatSebagaiPesertaTamu}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/20 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>CATAT SEBAGAI PESERTA TAMU</span>
                </button>

                <button
                  type="button"
                  id="btn-scan-ulang-notfound"
                  onClick={resetToCamera}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>SCAN ULANG</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 7: SUCCESS CONFIRMATION */}
          {stage === 'success' && latestCheckIn && (
            <div className="py-4 space-y-5 text-center">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-1 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-emerald-400">CHECK-IN BERHASIL</h3>
                <p className="text-xs text-slate-300">
                  Kehadiran telah berhasil tersimpan ke sistem event.
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-left space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Nama:</span>
                  <span className="font-bold text-white text-sm">{latestCheckIn.nama}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      latestCheckIn.status_kehadiran === 'HADIR'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {latestCheckIn.status_kehadiran}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <span className="text-slate-400">Waktu Check-in:</span>
                  <span className="font-bold text-emerald-300">{latestCheckIn.waktu_checkin}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Event:</span>
                  <span className="font-medium text-slate-300 text-right truncate max-w-[200px]">
                    {latestCheckIn.event_name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-scan-berikutnya-succ"
                onClick={resetToCamera}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>SCAN KTP BERIKUTNYA</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
