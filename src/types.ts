export type UserRole = 'Ketua DPC' | 'Korcam' | 'Korkel' | 'KorWe' | 'Super Admin' | 'Operator';

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  password?: string;
  kecamatan_assigned: string;
  kelurahan_assigned?: string;
  rw_assigned?: string;
  phone?: string;
  created_at: string;
}

export interface WilayahItem {
  id: string;
  provinsi: string;
  kabupaten_kota: string;
  kecamatan: string;
  kelurahan: string;
  rw: string;
  rt: string;
  tps: string;
}

export type StatusRelawan = 'Aktif' | 'Tidak Aktif' | 'Pending';

export interface Relawan {
  id: string;
  id_relawan: string;
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  golongan_darah: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  agama: string;
  status_perkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  tps: string;
  status_relawan: StatusRelawan;
  koordinator: string;
  keterangan: string;
  tanggal_input: string;
  operator_id: string;
  operator_name?: string;
  ktp_image_url?: string;
  no_hp?: string;
  email?: string;
  sumber_data?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface KtpOcrData {
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  golongan_darah: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  agama: string;
  status_perkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  lowConfidenceFields?: string[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: 'UPLOAD_KTP' | 'CREATE_RELAWAN' | 'UPDATE_RELAWAN' | 'DELETE_RELAWAN' | 'EXPORT_DATA' | 'IMPORT_DATA' | 'RESTORE_RELAWAN' | 'LOGIN' | 'LOGOUT' | 'UPDATE_USER' | 'CHECKIN_EVENT';
  details: string;
  timestamp: string;
  target_id?: string;
}

export interface EventItem {
  id: string;
  nama: string;
  tanggal: string;
  tanggal_display: string;
  lokasi?: string;
  deskripsi?: string;
  status: 'Akan Datang' | 'Berlangsung' | 'Selesai';
  created_at: string;
}

export type StatusKehadiran = 'HADIR' | 'PESERTA TAMU';

export interface KehadiranEvent {
  id: string;
  event_id: string;
  event_name: string;
  event_tanggal: string;
  relawan_id?: string;
  id_relawan?: string;
  nik: string;
  nama: string;
  kecamatan: string;
  kelurahan: string;
  rw: string;
  rt: string;
  tps?: string;
  status_kehadiran: StatusKehadiran;
  waktu_checkin: string; // e.g. "09:42:15"
  tanggal_checkin: string; // e.g. "12 September 2026"
  checkin_timestamp: string; // ISO string
  operator_id: string;
  operator_name: string;
  ktp_image_url?: string;
  catatan?: string;
}

export interface EventStats {
  totalRelawanTerdaftar: number;
  totalSudahHadir: number;
  totalBelumHadir: number;
  totalPesertaTamu: number;
}

export interface DashboardStats {
  totalRelawan: number;
  relawanAktif: number;
  relawanTidakAktif: number;
  relawanPending: number;
  totalKecamatan: number;
  totalKelurahan: number;
  totalRW: number;
  totalRT: number;
  totalTPS: number;
  chartData: {
    kecamatan: string;
    total: number;
    aktif: number;
  }[];
  tableData: {
    kecamatan: string;
    kelurahan: string;
    relawanCount: number;
    tpsCount: number;
  }[];
}
