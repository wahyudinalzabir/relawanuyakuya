import React from 'react';
import { Relawan } from '../types';
import {
  X,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  Edit,
  Printer,
  BadgeCheck,
  AlertCircle,
  Clock,
  Briefcase,
  Heart,
  FileText,
} from 'lucide-react';

interface RelawanDetailModalProps {
  isOpen: boolean;
  relawan: Relawan | null;
  onClose: () => void;
  onEdit?: (relawan: Relawan) => void;
}

export const RelawanDetailModal: React.FC<RelawanDetailModalProps> = ({
  isOpen,
  relawan,
  onClose,
  onEdit,
}) => {
  if (!isOpen || !relawan) return null;

  // Calculate age if tanggal_lahir is valid
  let ageString = '';
  if (relawan.tanggal_lahir) {
    const parts = relawan.tanggal_lahir.split(/[-/]/);
    let birthDate: Date | null = null;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        birthDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      } else if (parts[2].length === 4) {
        birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    if (birthDate && !isNaN(birthDate.getTime())) {
      const diffYears = Math.floor(
        (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (diffYears > 0 && diffYears < 120) {
        ageString = `(${diffYears} tahun)`;
      }
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = (relawan.no_hp || '').replace(/\D/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}`
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 font-black text-xl">
              {relawan.nama.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">{relawan.nama}</h2>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                    relawan.status_relawan === 'Aktif'
                      ? 'bg-emerald-500 text-white'
                      : relawan.status_relawan === 'Tidak Aktif'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-400 text-gray-950'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {relawan.status_relawan}
                </span>
              </div>
              <p className="text-blue-200 text-xs font-mono mt-0.5">
                ID: {relawan.id_relawan} • NIK: {relawan.nik}
              </p>
              <p className="text-blue-300 text-xs mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Kel. {relawan.kelurahan}, RW {relawan.rw}, RT {relawan.rt} • {relawan.tps}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700">
          {/* Kontak & Komunikasi */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-500 text-[11px]">Nomor Handphone / WhatsApp</p>
                <p className="font-bold text-sm text-gray-900 font-mono">
                  {relawan.no_hp || 'Belum dicatat'}
                </p>
              </div>
            </div>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Chat WhatsApp</span>
              </a>
            )}
          </div>

          {/* Section: Data Identitas KTP */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Data Identitas Kependudukan (KTP)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <div>
                <span className="text-gray-400 block text-[11px]">Nomor Induk Kependudukan</span>
                <span className="font-mono font-bold text-gray-900 text-xs">{relawan.nik}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Tempat &amp; Tanggal Lahir</span>
                <span className="font-semibold text-gray-900">
                  {relawan.tempat_lahir || '-'}, {relawan.tanggal_lahir || '-'} {ageString}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Jenis Kelamin</span>
                <span className="font-semibold text-gray-900">{relawan.jenis_kelamin}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Golongan Darah</span>
                <span className="font-semibold text-gray-900">{relawan.golongan_darah || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Agama</span>
                <span className="font-semibold text-gray-900">{relawan.agama || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Status Perkawinan</span>
                <span className="font-semibold text-gray-900">{relawan.status_perkawinan || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Pekerjaan</span>
                <span className="font-semibold text-gray-900">{relawan.pekerjaan || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Kewarganegaraan</span>
                <span className="font-semibold text-gray-900">{relawan.kewarganegaraan || 'WNI'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Sumber Entri Data</span>
                <span className="font-semibold text-gray-900">
                  {relawan.sumber_data || 'Manual / OCR KTP'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Domisili & Wilayah Jagakarsa */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Wilayah Penugasan &amp; TPS</span>
            </h4>
            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
              <div>
                <span className="text-gray-400 block text-[11px]">Alamat Lengkap KTP / Domisili:</span>
                <p className="font-medium text-gray-900 mt-0.5 leading-relaxed">
                  {relawan.alamat || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200/60">
                <div className="p-2.5 bg-white rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[10px]">Kecamatan</span>
                  <span className="font-bold text-gray-900">{relawan.kecamatan}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[10px]">Kelurahan</span>
                  <span className="font-bold text-gray-900">{relawan.kelurahan}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[10px]">RW / RT</span>
                  <span className="font-bold text-gray-900">
                    RW {relawan.rw} / RT {relawan.rt}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[10px]">TPS</span>
                  <span className="font-bold text-blue-700">{relawan.tps}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Koordinasi & Keterangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Koordinator &amp; Petugas Input</span>
              </h5>
              <div className="space-y-1.5">
                <div>
                  <span className="text-gray-400 block text-[11px]">Nama Koordinator:</span>
                  <span className="font-semibold text-gray-900">{relawan.koordinator || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Operator Input:</span>
                  <span className="font-medium text-gray-700">
                    {relawan.operator_name || relawan.operator_id || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Tanggal Input Data:</span>
                  <span className="font-medium text-gray-700">{relawan.tanggal_input}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Catatan &amp; Keterangan</span>
              </h5>
              <p className="text-gray-600 italic leading-relaxed">
                {relawan.keterangan || 'Tidak ada catatan tambahan.'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs hover:bg-white flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Profil</span>
          </button>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(relawan);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Data Relawan</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
