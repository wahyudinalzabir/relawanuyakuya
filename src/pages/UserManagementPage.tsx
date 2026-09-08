import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  UserCheck,
  Plus,
  Shield,
  Trash2,
  Building,
  Lock,
  X,
  AlertCircle,
  Phone,
  UserPlus,
  MapPin,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

const KELURAHAN_JAGAKARSA = [
  'Tanjung Barat',
  'Lenteng Agung',
  'Jagakarsa',
  'Ciganjur',
  'Srengseng Sawah',
  'Cipedak',
];

interface UserManagementPageProps {
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ addToast }) => {
  const { currentUser, canManageAdmins, isKetuaDpc, isKorcam } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New user form state
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Korkel' | 'KorWe'>('Korkel');
  const [kelurahanAssigned, setKelurahanAssigned] = useState(KELURAHAN_JAGAKARSA[0]);
  const [rwAssigned, setRwAssigned] = useState('001');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err: any) {
      addToast('error', 'Gagal Memuat Daftar Admin', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageAdmins) {
      loadUsers();
    }
  }, [canManageAdmins]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim() || !password.trim()) {
      addToast('warning', 'Data Belum Lengkap', 'Username, Nama, dan Kata Sandi wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createUser({
        username: username.trim().toLowerCase(),
        name: name.trim(),
        password: password.trim(),
        role,
        kelurahan_assigned: kelurahanAssigned,
        rw_assigned: role === 'KorWe' ? rwAssigned.padStart(3, '0') : undefined,
        phone: phone.trim() || undefined,
      });

      addToast(
        'success',
        'Admin Berhasil Ditambahkan',
        `Akun ${role} atas nama '${name}' (${username}) siap digunakan untuk login.`
      );

      setShowAddModal(false);
      setUsername('');
      setName('');
      setPassword('');
      setPhone('');
      loadUsers();
    } catch (err: any) {
      addToast('error', 'Gagal Menambahkan Admin', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string, userRole: string) => {
    if (id === currentUser?.id) {
      addToast('warning', 'Tidak Diizinkan', 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }

    if (!window.confirm(`Hapus akun ${userRole} '${userName}'? Akun ini tidak akan dapat login lagi.`)) {
      return;
    }

    try {
      await api.deleteUser(id);
      addToast('success', 'Akun Dihapus', `Akun '${userName}' berhasil dihapus dari sistem.`);
      loadUsers();
    } catch (err: any) {
      addToast('error', 'Gagal Menghapus Akun', err.message);
    }
  };

  if (!canManageAdmins) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="font-bold text-gray-900 text-base">Akses Khusus Korcam &amp; Ketua DPC</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Halaman penambahan admin Korkel (Koordinator Kelurahan) dan KorWe (Koordinator RW) hanya dapat diakses oleh Koordinator Kecamatan (Korcam) dan Ketua DPC Jagakarsa.
        </p>
      </div>
    );
  }

  // Count badges
  const totalKorkel = users.filter((u) => u.role === 'Korkel').length;
  const totalKorWe = users.filter((u) => u.role === 'KorWe').length;
  const totalPimpinan = users.filter((u) => u.role === 'Ketua DPC' || u.role === 'Korcam').length;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Manajemen Admin &amp; Koordinator Jagakarsa
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Kecamatan Jagakarsa
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fitur khusus <strong>Korcam</strong> dan <strong>Ketua DPC</strong> untuk menambah dan mengelola akun admin <strong>Korkel</strong> (Koordinator Kelurahan) dan <strong>KorWe</strong> (Koordinator RW).
          </p>
        </div>

        <button
          id="btn-tambah-admin"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Korkel / KorWe</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Pimpinan Wilayah</p>
            <p className="text-lg font-black text-gray-900">{totalPimpinan}</p>
            <p className="text-[10px] text-gray-400">Ketua DPC &amp; Korcam</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Admin Korkel</p>
            <p className="text-lg font-black text-gray-900">{totalKorkel}</p>
            <p className="text-[10px] text-gray-400">Koordinator Kelurahan</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Admin KorWe</p>
            <p className="text-lg font-black text-gray-900">{totalKorWe}</p>
            <p className="text-[10px] text-gray-400">Koordinator RW</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Total Akun Admin</p>
            <p className="text-lg font-black text-gray-900">{users.length}</p>
            <p className="text-[10px] text-gray-400">Siap Input &amp; Pantau Data</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900">Daftar Akun Koordinator &amp; Admin Jagakarsa</h3>
          <span className="text-xs text-gray-500">{users.length} akun terdaftar</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs">Memuat daftar akun...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">Belum ada akun terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Nama &amp; Username</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Wilayah Tugas</th>
                  <th className="py-3 px-4">No. Telepon</th>
                  <th className="py-3 px-4">Status Akses</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isMainLeader = u.username === 'fitrinurbaiti' || u.username === 'wahyudin';

                  return (
                    <tr key={u.id} className={`hover:bg-gray-50/70 transition-colors ${isSelf ? 'bg-blue-50/30' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900">{u.name}</p>
                              {isSelf && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-gray-400">user: {u.username || u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            u.role === 'Ketua DPC'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : u.role === 'Korcam'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : u.role === 'Korkel'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role === 'Korcam'
                            ? 'Korcam (Koordinator Kecamatan)'
                            : u.role === 'Ketua DPC'
                            ? 'Ketua DPC Jagakarsa'
                            : u.role === 'Korkel'
                            ? 'Korkel (Koordinator Kelurahan)'
                            : 'KorWe (Koordinator RW)'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'Ketua DPC' || u.role === 'Korcam' ? (
                          <div className="text-gray-900 font-medium">
                            <span className="text-blue-600 font-bold">Kecamatan Jagakarsa</span>
                            <p className="text-[11px] text-gray-400">Semua 6 Kelurahan, RW, RT, TPS</p>
                          </div>
                        ) : u.role === 'Korkel' ? (
                          <div className="text-gray-900 font-medium">
                            <span className="text-emerald-700 font-bold">Kelurahan {u.kelurahan_assigned}</span>
                            <p className="text-[11px] text-gray-400">Kec. Jagakarsa</p>
                          </div>
                        ) : (
                          <div className="text-gray-900 font-medium">
                            <span className="text-amber-800 font-bold">
                              Kel. {u.kelurahan_assigned} - RW {u.rw_assigned}
                            </span>
                            <p className="text-[11px] text-gray-400">Kec. Jagakarsa</p>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {u.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isMainLeader ? (
                          <span className="text-[11px] text-gray-400 italic">Akun Utama</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name, u.role)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Admin Korkel / KorWe */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900">Tambah Admin Baru</h3>
                <p className="text-xs text-gray-500">Pilih Koordinator Kelurahan (Korkel) atau Koordinator RW (KorWe)</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Role Switcher */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Tipe Penugasan (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('Korkel')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      role === 'Korkel'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Korkel (Kelurahan)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('KorWe')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      role === 'KorWe'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>KorWe (Koordinator RW)</span>
                  </button>
                </div>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Lengkap Koordinator *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Muhammad Syarif"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Username Akun *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Contoh: korkel_ciganjur"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Kata Sandi (Password) *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kata sandi login"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Wilayah Assignment */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Penugasan Wilayah Jagakarsa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Kelurahan Tugas *
                    </label>
                    <select
                      value={kelurahanAssigned}
                      onChange={(e) => setKelurahanAssigned(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    >
                      {KELURAHAN_JAGAKARSA.map((kel) => (
                        <option key={kel} value={kel}>
                          Kel. {kel}
                        </option>
                      ))}
                    </select>
                  </div>

                  {role === 'KorWe' && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Nomor RW Tugas *
                      </label>
                      <select
                        value={rwAssigned}
                        onChange={(e) => setRwAssigned(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(3, '0')).map((rw) => (
                          <option key={rw} value={rw}>
                            RW {rw}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Nomor Telepon / Kontak */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nomor WhatsApp / HP (Opsional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Akun Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
