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
  action:
    | 'UPLOAD_KTP'
    | 'CREATE_RELAWAN'
    | 'UPDATE_RELAWAN'
    | 'DELETE_RELAWAN'
    | 'EXPORT_DATA'
    | 'IMPORT_DATA'
    | 'RESTORE_RELAWAN'
    | 'LOGIN'
    | 'LOGOUT'
    | 'UPDATE_USER'
    | 'CHECKIN_EVENT'
    | 'CREATE_EVENT'
    | 'UPDATE_EVENT'
    | 'DELETE_EVENT'
    | 'UPDATE_ROLE'
    | 'REGISTER_EVENT';
  details: string;
  timestamp: string;
  target_id?: string;
}

export type ParticipantRole = 'PESERTA' | 'KORCAM' | 'KORKEL' | 'KorWe' | 'KORWE' | 'KORTPS';

export interface ParticipantRoleRecord {
  id: string;
  nik: string;
  nama: string;
  role: ParticipantRole;
  phone?: string;
  kelurahan?: string;
  rw?: string;
  assigned_by?: string;
  updated_at: string;
}

export type FormFieldType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'date'
  | 'time'
  | 'number'
  | 'email'
  | 'phone'
  | 'file_upload'
  | 'section';

export interface FormField {
  id: string;
  title: string;
  description?: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  validationRule?: string;
  mappedTo?:
    | 'nik'
    | 'nama'
    | 'tempat_lahir'
    | 'tanggal_lahir'
    | 'jenis_kelamin'
    | 'alamat'
    | 'rt'
    | 'rw'
    | 'kelurahan'
    | 'kecamatan'
    | 'agama'
    | 'status_perkawinan'
    | 'pekerjaan'
    | 'kewarganegaraan'
    | 'no_hp'
    | 'email';
}

export interface EventFormSettings {
  nik_validation_enabled: boolean;
  is_accepting_responses: boolean;
  max_participants?: number;
  registration_deadline?: string;
  confirmation_message?: string;
  allow_manual_input: boolean;
  allow_ktp_scan: boolean;
  google_sheet_url?: string;
  google_sheet_webhook_url?: string;
  google_sheet_name?: string;
}

export type StatusEvent = 'Akan Datang' | 'Berlangsung' | 'Selesai' | 'AKTIF' | 'DRAFT' | 'SELESAI';
export type StatusPendaftaran = 'Belum Dibuat' | 'Draft' | 'Belum Dibuka' | 'Dibuka' | 'Ditutup' | 'Kuota Penuh';

export interface EventItem {
  id: string;
  nama: string;
  deskripsi?: string;
  kategori?: string;
  poster_url?: string;
  tanggal: string;
  tanggal_display?: string;
  jam?: string;
  waktu_mulai?: string;
  waktu_selesai?: string;
  lokasi?: string;
  alamat?: string;
  kuota: number;
  status: StatusEvent;
  status_pendaftaran?: StatusPendaftaran;
  informasi_tambahan?: string;
  form_schema?: FormField[];
  form_settings?: EventFormSettings;
  created_at: string;
  updated_at?: string;
}

export type RegistrationSource = 'SCAN_KTP' | 'MANUAL';
export type RegistrationStatus = 'VALID' | 'DITOLAK' | 'MENUNGGU_VERIFIKASI' | 'DIBATALKAN';

export interface EventRegistration {
  id: string;
  event_id: string;
  nik: string;
  nama: string;
  nomor_hp?: string;
  alamat?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  role_snapshot: ParticipantRole;
  source_input: RegistrationSource;
  data_form: Record<string, any>;
  registration_time: string;
  status: RegistrationStatus;
  rejection_reason?: string;
  ktp_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EventDetailStats {
  kuota: number;
  totalPendaftar: number;
  pesertaValid: number;
  pesertaDitolak: number;
  sisaKuota: number;
  pendaftarHariIni: number;
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
