import React, { useState, useEffect } from 'react';
import { ParticipantRole, ParticipantRoleRecord } from '../types';
import { api } from '../lib/api';
import {
  X,
  Search,
  ShieldCheck,
  UserPlus,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  MapPin,
} from 'lucide-react';

interface ParticipantRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ParticipantRoleModal: React.FC<ParticipantRoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [roles, setRoles] = useState<ParticipantRoleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form input state
  const [inputNik, setInputNik] = useState('');
  const [inputNama, setInputNama] = useState('');
  const [inputRole, setInputRole] = useState<ParticipantRole>('KORWE');
  const [inputPhone, setInputPhone] = useState('');
  const [inputKelurahan, setInputKelurahan] = useState('Jagakarsa');
  const [inputRw, setInputRw] = useState('');

  const loadRoles = async (query = '') => {
    try {
      setLoading(true);
      const res = await api.getParticipantRoles(query);
      if (res.success) {
        setRoles(res.roles);
      }
    } catch (err: any) {
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRoles(searchQuery);
    }
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNik = inputNik.replace(/\D/g, '');
    if (cleanNik.length < 16) {
      setFeedback({ type: 'error', message: 'NIK wajib 16 digit angka.' });
      return;
    }
    if (!inputNama.trim()) {
      setFeedback({ type: 'error', message: 'Nama lengkap wajib diisi.' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);
      const res = await api.setParticipantRole({
        nik: cleanNik,
        nama: inputNama.trim().toUpperCase(),
        role: inputRole,
        phone: inputPhone.trim(),
        kelurahan: inputKelurahan,
        rw: inputRw.replace(/\D/g, '').padStart(3, '0'),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Berhasil menetapkan role ${inputRole} untuk ${inputNama.toUpperCase()}.`,
        });
        // Reset form
        setInputNik('');
        setInputNama('');
        setInputPhone('');
        setInputRw('');
        loadRoles(searchQuery);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyimpan role.' });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickChangeRole = async (item: ParticipantRoleRecord, newRole: ParticipantRole) => {
    try {
      setSaving(true);
      const res = await api.setParticipantRole({
        nik: item.nik,
        nama: item.nama,
        role: newRole,
        phone: item.phone,
        kelurahan: item.kelurahan,
        rw: item.rw,
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Role untuk ${item.nama} diubah menjadi ${newRole}.`,
        });
        loadRoles(searchQuery);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Kelola Role Internal Peserta</h2>
              <p className="text-xs text-slate-400">
                Atur role KORCAM, KORKEL, KORWE, KORTPS untuk pengecualian (bypass) anti-duplikat event.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/40 border-red-800/60 text-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Form Tambah/Ubah Role */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              Tetapkan / Daftarkan Role Petugas
            </h3>

            <form onSubmit={handleSaveRole} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  Nomor Induk Kependudukan (NIK) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={inputNik}
                  onChange={(e) => setInputNik(e.target.value.replace(/\D/g, ''))}
                  placeholder="16 digit angka..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={inputNama}
                  onChange={(e) => setInputNama(e.target.value.toUpperCase())}
                  placeholder="Nama sesuai KTP..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Role Internal *</label>
                <select
                  value={inputRole}
                  onChange={(e) => setInputRole(e.target.value as ParticipantRole)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="KORCAM">KORCAM (Koordinator Kecamatan)</option>
                  <option value="KORKEL">KORKEL (Koordinator Kelurahan)</option>
                  <option value="KORWE">KORWE (Koordinator RW)</option>
                  <option value="KORTPS">KORTPS (Koordinator TPS)</option>
                  <option value="PESERTA">PESERTA (Warga Biasa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="0812xxxxxxxx..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Kelurahan Wilayah</label>
                <select
                  value={inputKelurahan}
                  onChange={(e) => setInputKelurahan(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Jagakarsa">Jagakarsa</option>
                  <option value="Cipedak">Cipedak</option>
                  <option value="Lenteng Agung">Lenteng Agung</option>
                  <option value="Ciganjur">Ciganjur</option>
                  <option value="Srengseng Sawah">Srengseng Sawah</option>
                  <option value="Tanjung Barat">Tanjung Barat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Nomor RW</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={3}
                    value={inputRw}
                    onChange={(e) => setInputRw(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* List Roles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Daftar Petugas Terdaftar ({roles.length})
              </h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari NIK / Nama / Role..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Memuat data role...</div>
            ) : roles.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-500">
                Belum ada data role khusus yang ditetapkan. Semua NIK yang tidak terdaftar otomatis berstatus{' '}
                <strong className="text-slate-300">PESERTA</strong>.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Nama & NIK</th>
                      <th className="px-3 py-3">Wilayah Tugas</th>
                      <th className="px-3 py-3">Role Saat Ini</th>
                      <th className="px-3 py-3">Ubah Role Cepat</th>
                      <th className="px-3 py-3 text-right">Diperbarui</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {roles.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{item.nama}</p>
                          <p className="font-mono text-slate-400 text-[11px] mt-0.5">
                            {item.nik.slice(0, 4)}************{item.nik.slice(-4)}
                          </p>
                          {item.phone && (
                            <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-500" /> {item.phone}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-300">
                          {item.kelurahan || item.rw ? (
                            <span>
                              {item.kelurahan} {item.rw ? `RW ${item.rw}` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.role === 'KORCAM'
                                ? 'bg-purple-900/50 text-purple-300 border border-purple-800/60'
                                : item.role === 'KORKEL'
                                ? 'bg-blue-900/50 text-blue-300 border border-blue-800/60'
                                : item.role === 'KORWE'
                                ? 'bg-teal-900/50 text-teal-300 border border-teal-800/60'
                                : item.role === 'KORTPS'
                                ? 'bg-amber-900/50 text-amber-300 border border-amber-800/60'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={item.role}
                            onChange={(e) => handleQuickChangeRole(item, e.target.value as ParticipantRole)}
                            disabled={saving}
                            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 focus:outline-hidden"
                          >
                            <option value="KORCAM">KORCAM</option>
                            <option value="KORKEL">KORKEL</option>
                            <option value="KORWE">KORWE</option>
                            <option value="KORTPS">KORTPS</option>
                            <option value="PESERTA">PESERTA (Biasa)</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 text-right text-[11px] text-slate-500">
                          {new Date(item.updated_at).toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>* Role internal disimpan permanen di backend dan tidak dapat dimanipulasi oleh browser publik.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
