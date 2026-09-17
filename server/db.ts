import fs from 'fs';
import path from 'path';
import {
  User,
  WilayahItem,
  Relawan,
  AuditLog,
  DashboardStats,
  EventItem,
  KehadiranEvent,
  EventStats,
  StatusKehadiran,
  ParticipantRole,
  ParticipantRoleRecord,
  FormField,
  EventFormSettings,
  EventRegistration,
  RegistrationSource,
  RegistrationStatus,
  EventDetailStats,
  StatusEvent,
  StatusPendaftaran,
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUP_FILE = path.join(DATA_DIR, 'database.backup.json');

interface DatabaseSchema {
  users: User[];
  wilayah: WilayahItem[];
  relawan: Relawan[];
  audit_logs: AuditLog[];
  events?: EventItem[];
  kehadiran?: KehadiranEvent[];
  event_registrations?: EventRegistration[];
  participant_roles?: ParticipantRoleRecord[];
}

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export interface KelurahanWilayahConfig {
  name: string;
  totalRw: number;
  totalRt: number;
}

export const WILAYAH_CONFIG: KelurahanWilayahConfig[] = [
  { name: 'Jagakarsa', totalRw: 7, totalRt: 52 },
  { name: 'Cipedak', totalRw: 6, totalRt: 61 },
  { name: 'Lenteng Agung', totalRw: 10, totalRt: 114 },
  { name: 'Ciganjur', totalRw: 6, totalRt: 63 },
  { name: 'Srengseng Sawah', totalRw: 19, totalRt: 156 },
  { name: 'Tanjung Barat', totalRw: 6, totalRt: 66 },
];

export const KELURAHAN_JAGAKARSA = WILAYAH_CONFIG.map((w) => w.name);

export function generateWilayahJagakarsa(): WilayahItem[] {
  const wilayahList: WilayahItem[] = [];
  let wId = 1;

  for (const config of WILAYAH_CONFIG) {
    const kel = config.name;
    const totalRw = config.totalRw;
    const totalRt = config.totalRt;

    const baseRt = Math.floor(totalRt / totalRw);
    const remainderRt = totalRt % totalRw;

    for (let rwNum = 1; rwNum <= totalRw; rwNum++) {
      const rw = String(rwNum).padStart(3, '0');
      const rtCountForThisRw = rwNum <= remainderRt ? baseRt + 1 : baseRt;

      for (let rtNum = 1; rtNum <= rtCountForThisRw; rtNum++) {
        const rt = String(rtNum).padStart(3, '0');
        const tps = `TPS ${String(rtNum).padStart(3, '0')}`;
        wilayahList.push({
          id: `WIL-${wId++}`,
          provinsi: 'DKI Jakarta',
          kabupaten_kota: 'Kota Jakarta Selatan',
          kecamatan: 'Jagakarsa',
          kelurahan: kel,
          rw,
          rt,
          tps,
        });
      }
    }
  }

  return wilayahList;
}

function getInitialData(): DatabaseSchema {
  const wilayahList = generateWilayahJagakarsa();

  const users: User[] = [
    {
      id: 'USR-KORCAM-01',
      username: 'fitrinurbaiti',
      password: 'jagakarsajaya',
      name: 'Fitri Nurbaiti',
      email: 'fitrinurbaiti@pan-jagakarsa.id',
      role: 'Korcam',
      kecamatan_assigned: 'Jagakarsa',
      phone: '081312345678',
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
    },
    {
      id: 'USR-DPC-01',
      username: 'wahyudin',
      password: 'dpcjagakarsa1',
      name: 'Wahyudin',
      email: 'wahyudin@pan-jagakarsa.id',
      role: 'Ketua DPC',
      kecamatan_assigned: 'Jagakarsa',
      phone: '081298765432',
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
    },
  ];

  const relawan: Relawan[] = [];

  const auditLogs: AuditLog[] = [
    {
      id: 'LOG-INIT-01',
      user_id: 'USR-DPC-01',
      user_name: 'Wahyudin',
      user_role: 'Ketua DPC',
      action: 'LOGIN',
      details: 'Sistem Pendataan Relawan Kecamatan Jagakarsa (Partai PAN) resmi diaktifkan.',
      timestamp: new Date().toISOString(),
    },
  ];

  return {
    users,
    wilayah: wilayahList,
    relawan,
    audit_logs: auditLogs,
  };
}

export function getDefaultEventFormSchema(): FormField[] {
  return [
    {
      id: 'q_nama',
      title: 'Nama Lengkap (Sesuai KTP)',
      description: 'Isi nama lengkap Anda sesuai kartu identitas.',
      type: 'short_answer',
      required: true,
      placeholder: 'Contoh: BUDI SANTOSO',
      mappedTo: 'nama',
    },
    {
      id: 'q_nik',
      title: 'Nomor Induk Kependudukan (NIK)',
      description: '16 digit angka KTP.',
      type: 'short_answer',
      required: true,
      placeholder: '3174xxxxxxxxxxxx',
      mappedTo: 'nik',
    },
    {
      id: 'q_phone',
      title: 'Nomor Handphone / WhatsApp',
      description: 'Nomor aktif yang dapat dihubungi.',
      type: 'phone',
      required: true,
      placeholder: '0812xxxxxxxx',
      mappedTo: 'no_hp',
    },
    {
      id: 'q_alamat',
      title: 'Alamat Tempat Tinggal',
      description: 'Alamat jalan, nomor rumah, atau patokan.',
      type: 'paragraph',
      required: true,
      placeholder: 'Alamat lengkap...',
      mappedTo: 'alamat',
    },
    {
      id: 'q_kelurahan',
      title: 'Kelurahan',
      description: 'Pilih kelurahan domisili Anda di Kecamatan Jagakarsa.',
      type: 'dropdown',
      required: true,
      options: ['Jagakarsa', 'Cipedak', 'Lenteng Agung', 'Ciganjur', 'Srengseng Sawah', 'Tanjung Barat'],
      mappedTo: 'kelurahan',
    },
    {
      id: 'q_rw',
      title: 'Nomor RW',
      description: 'Contoh: 001, 002, dst.',
      type: 'short_answer',
      required: true,
      placeholder: '001',
      mappedTo: 'rw',
    },
    {
      id: 'q_rt',
      title: 'Nomor RT',
      description: 'Contoh: 001, 002, dst.',
      type: 'short_answer',
      required: true,
      placeholder: '001',
      mappedTo: 'rt',
    },
    {
      id: 'q_pekerjaan',
      title: 'Pekerjaan',
      description: 'Pekerjaan atau profesi saat ini.',
      type: 'short_answer',
      required: false,
      placeholder: 'Wiraswasta, Karyawan Swasta, dll',
      mappedTo: 'pekerjaan',
    },
  ];
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    ensureDataDirectory();
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(content);

        // Ensure collections exist
        if (!parsed.relawan) parsed.relawan = [];
        if (!parsed.users) parsed.users = [];
        if (!parsed.audit_logs) parsed.audit_logs = [];
        if (!parsed.events || parsed.events.length === 0) {
          parsed.events = [
            {
              id: 'EVT-BPJS-2026',
              nama: 'GIAT SOSIALISASI BPJS KESEHATAN',
              tanggal: '2026-09-12',
              tanggal_display: 'Sabtu, 12 September 2026',
              lokasi: 'Kecamatan Jagakarsa, Kota Jakarta Selatan',
              deskripsi: 'Sosialisasi Program Jaminan Kesehatan Nasional BPJS bersama Relawan Jagakarsa',
              status: 'Berlangsung',
              status_pendaftaran: 'Dibuka',
              kuota: 500,
              created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
            },
          ];
        }
        if (!parsed.kehadiran) parsed.kehadiran = [];
        if (!parsed.event_registrations) parsed.event_registrations = [];
        if (!parsed.participant_roles) parsed.participant_roles = [];

        // Upgrade events with schema & settings if not present
        for (const ev of parsed.events) {
          if (!ev.kuota) ev.kuota = 500;
          if (!ev.status) ev.status = 'Berlangsung';
          if (!ev.status_pendaftaran) ev.status_pendaftaran = 'Dibuka';
          if (!ev.form_schema || ev.form_schema.length === 0) {
            ev.form_schema = getDefaultEventFormSchema();
          }
          if (!ev.form_settings) {
            ev.form_settings = {
              nik_validation_enabled: true,
              is_accepting_responses: true,
              max_participants: ev.kuota || 500,
              confirmation_message: 'Terima kasih! Formulir pendaftaran Anda telah berhasil dikirim.',
              allow_manual_input: true,
              allow_ktp_scan: true,
            };
          }
        }

        // Check if wilayah is the official Jagakarsa 54 RW structure (54 RW, 6 Kelurahan)
        const distinctRW = new Set((parsed.wilayah || []).map((w: WilayahItem) => `${w.kelurahan}-${w.rw}`));
        if (distinctRW.size !== 54) {
          console.log(`[Database Migration] Safely updating wilayah structure to official Jagakarsa structure (54 RW, 6 Kelurahan)...`);
          parsed.wilayah = generateWilayahJagakarsa();
          this.saveData(parsed);
        }

        return parsed;
      }
    } catch (err) {
      console.error('Error loading database, resetting to clean Jagakarsa data:', err);
    }
    const initial = getInitialData();
    this.saveData(initial);
    return initial;
  }

  private saveData(dataToSave: DatabaseSchema = this.data) {
    try {
      ensureDataDirectory();
      const tmpFile = `${DB_FILE}.tmp`;
      const jsonStr = JSON.stringify(dataToSave, null, 2);
      fs.writeFileSync(tmpFile, jsonStr, 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);

      // Safe auto-backup
      try {
        fs.writeFileSync(BACKUP_FILE, jsonStr, 'utf-8');
      } catch (backupErr) {
        // Non-blocking
      }
    } catch (err) {
      console.error('Error writing to database:', err);
    }
  }

  // --- Audit Log ---
  public addAuditLog(
    action: AuditLog['action'],
    details: string,
    user: { id: string; name: string; role: string },
    target_id?: string
  ): AuditLog {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action,
      details,
      timestamp: new Date().toISOString(),
      target_id,
    };
    this.data.audit_logs.unshift(log);
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs.pop();
    }
    this.saveData();
    return log;
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return this.data.audit_logs.slice(0, limit);
  }

  // --- Users ---
  public getUsers(): User[] {
    // Return users without password for safety in UI
    return this.data.users.map(({ password, ...u }) => u as User);
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    const clean = username.trim().toLowerCase();
    return this.data.users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean)
    );
  }

  public validateLogin(username: string, password: string): User | null {
    const clean = username.trim().toLowerCase();
    const user = this.data.users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean)
    );
    if (!user) return null;
    if (user.password !== password) return null;
    return user;
  }

  public createUser(userData: Omit<User, 'id' | 'created_at'>, actor: User): User {
    const existing = this.getUserByUsername(userData.username);
    if (existing) {
      throw new Error(`Username '${userData.username}' sudah digunakan.`);
    }

    const id = `USR-${userData.role.toUpperCase().replace(/\s+/g, '')}-${Date.now().toString().slice(-4)}`;
    const newUser: User = {
      ...userData,
      id,
      kecamatan_assigned: 'Jagakarsa',
      created_at: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.saveData();
    this.addAuditLog(
      'UPDATE_USER',
      `Menambahkan admin/koordinator '${newUser.name}' (${newUser.role}) untuk ${
        newUser.kelurahan_assigned ? `Kel. ${newUser.kelurahan_assigned}` : 'Kecamatan Jagakarsa'
      }${newUser.rw_assigned ? ` - RW ${newUser.rw_assigned}` : ''}.`,
      actor,
      newUser.id
    );

    const { password, ...safeUser } = newUser;
    return safeUser as User;
  }

  public updateUser(id: string, userData: Partial<User>, actor: User): User | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    // Check if updating username and already taken
    if (userData.username && userData.username !== this.data.users[idx].username) {
      const existing = this.getUserByUsername(userData.username);
      if (existing && existing.id !== id) {
        throw new Error(`Username '${userData.username}' sudah digunakan.`);
      }
    }

    this.data.users[idx] = {
      ...this.data.users[idx],
      ...userData,
      kecamatan_assigned: 'Jagakarsa',
    };
    this.saveData();

    this.addAuditLog(
      'UPDATE_USER',
      `Memperbarui data akun '${this.data.users[idx].name}' (${this.data.users[idx].role}).`,
      actor,
      id
    );

    const { password, ...safeUser } = this.data.users[idx];
    return safeUser as User;
  }

  public deleteUser(id: string, actor: User): boolean {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;

    const targetUser = this.data.users[idx];
    if (targetUser.id === actor.id) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
    }
    if (actor.role === 'Korcam' && targetUser.role === 'Ketua DPC') {
      throw new Error('Korcam tidak memiliki otoritas menghapus akun Ketua DPC.');
    }

    const deleted = this.data.users.splice(idx, 1)[0];
    this.saveData();
    this.addAuditLog('UPDATE_USER', `Menghapus akun '${deleted.name}' (${deleted.role}).`, actor, id);
    return true;
  }

  // --- Wilayah ---
  public getWilayah(): WilayahItem[] {
    return this.data.wilayah;
  }

  public getWilayahHierarchy() {
    const hierarchy: Record<string, Record<string, Record<string, Record<string, string[]>>>> = {};
    for (const w of this.data.wilayah) {
      if (!hierarchy[w.kecamatan]) hierarchy[w.kecamatan] = {};
      if (!hierarchy[w.kecamatan][w.kelurahan]) hierarchy[w.kecamatan][w.kelurahan] = {};
      if (!hierarchy[w.kecamatan][w.kelurahan][w.rw]) hierarchy[w.kecamatan][w.kelurahan][w.rw] = {};
      if (!hierarchy[w.kecamatan][w.kelurahan][w.rw][w.rt]) hierarchy[w.kecamatan][w.kelurahan][w.rw][w.rt] = [];
      if (!hierarchy[w.kecamatan][w.kelurahan][w.rw][w.rt].includes(w.tps)) {
        hierarchy[w.kecamatan][w.kelurahan][w.rw][w.rt].push(w.tps);
      }
    }
    return hierarchy;
  }

  // --- Relawan ---
  public checkNikExists(nik: string, excludeId?: string): Relawan | undefined {
    const cleanNik = nik.trim().replace(/\D/g, '');
    return this.data.relawan.find(
      (r) => !r.is_deleted && r.nik.replace(/\D/g, '') === cleanNik && (!excludeId || r.id !== excludeId)
    );
  }

  public getNextRelawanId(): string {
    const currentYear = new Date().getFullYear();
    const count = this.data.relawan.length + 1;
    return `REL-JGK-${currentYear}-${String(count).padStart(5, '0')}`;
  }

  public getRelawanList(options: {
    search?: string;
    kecamatan?: string;
    kelurahan?: string;
    rw?: string;
    rt?: string;
    tps?: string;
    status_relawan?: string;
    currentUser?: User;
    page?: number;
    limit?: number;
    sortBy?: keyof Relawan;
    sortOrder?: 'asc' | 'desc';
    includeDeleted?: boolean;
  }): { items: Relawan[]; total: number; page: number; totalPages: number } {
    let list = [...this.data.relawan];

    // Filter out soft-deleted records unless explicitly requested
    if (!options.includeDeleted) {
      list = list.filter((r) => !r.is_deleted);
    }

    // Restrict strictly to Jagakarsa
    list = list.filter((r) => r.kecamatan.toLowerCase() === 'jagakarsa');

    // Role-based filtering
    if (options.currentUser) {
      if (options.currentUser.role === 'Korkel' && options.currentUser.kelurahan_assigned) {
        list = list.filter(
          (r) => r.kelurahan.toLowerCase() === options.currentUser!.kelurahan_assigned!.toLowerCase()
        );
      } else if (options.currentUser.role === 'KorWe' && options.currentUser.kelurahan_assigned) {
        list = list.filter(
          (r) =>
            r.kelurahan.toLowerCase() === options.currentUser!.kelurahan_assigned!.toLowerCase() &&
            (!options.currentUser!.rw_assigned || r.rw === options.currentUser!.rw_assigned)
        );
      }
    }

    if (options.kelurahan) {
      list = list.filter((r) => r.kelurahan.toLowerCase() === options.kelurahan!.toLowerCase());
    }
    if (options.rw) {
      list = list.filter((r) => r.rw === options.rw);
    }
    if (options.rt) {
      list = list.filter((r) => r.rt === options.rt);
    }
    if (options.tps) {
      list = list.filter((r) => r.tps.toLowerCase() === options.tps!.toLowerCase());
    }
    if (options.status_relawan) {
      list = list.filter((r) => r.status_relawan === options.status_relawan);
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.nama.toLowerCase().includes(q) ||
          r.nik.includes(q) ||
          r.id_relawan.toLowerCase().includes(q) ||
          r.kelurahan.toLowerCase().includes(q)
      );
    }

    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    list.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = list.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);

    return { items, total, page, totalPages };
  }

  public getRelawanById(id: string): Relawan | undefined {
    return this.data.relawan.find((r) => r.id === id || r.id_relawan === id);
  }

  public createRelawan(
    relawanData: Omit<Relawan, 'id' | 'id_relawan' | 'created_at' | 'updated_at'>,
    actor: User
  ): Relawan {
    const existing = this.checkNikExists(relawanData.nik);
    if (existing) {
      throw new Error(`Data dengan NIK ini sudah terdaftar atas nama ${existing.nama}.`);
    }

    // Role check for Korkel & KorWe
    if (actor.role === 'Korkel' && actor.kelurahan_assigned) {
      if (relawanData.kelurahan.toLowerCase() !== actor.kelurahan_assigned.toLowerCase()) {
        throw new Error(`Sebagai Korkel ${actor.kelurahan_assigned}, Anda hanya dapat menginput relawan di Kelurahan ${actor.kelurahan_assigned}.`);
      }
    }
    if (actor.role === 'KorWe' && actor.kelurahan_assigned) {
      if (
        relawanData.kelurahan.toLowerCase() !== actor.kelurahan_assigned.toLowerCase() ||
        (actor.rw_assigned && relawanData.rw !== actor.rw_assigned)
      ) {
        throw new Error(`Sebagai KorWe, Anda hanya dapat menginput relawan di Kelurahan ${actor.kelurahan_assigned} RW ${actor.rw_assigned}.`);
      }
    }

    const id = `REL-ID-${Date.now()}`;
    const id_relawan = this.getNextRelawanId();
    const now = new Date().toISOString();

    const newRelawan: Relawan = {
      ...relawanData,
      kecamatan: 'Jagakarsa',
      kabupaten_kota: 'Kota Jakarta Selatan',
      provinsi: 'DKI Jakarta',
      id,
      id_relawan,
      created_at: now,
      updated_at: now,
      operator_id: actor.id,
      operator_name: actor.name,
    };

    this.data.relawan.unshift(newRelawan);
    this.saveData();

    this.addAuditLog(
      'CREATE_RELAWAN',
      `Menambahkan relawan '${newRelawan.nama}' (NIK: ${newRelawan.nik}, ID: ${newRelawan.id_relawan}) pada Kel. ${newRelawan.kelurahan}, RW ${newRelawan.rw}, RT ${newRelawan.rt}, TPS ${newRelawan.tps}.`,
      actor,
      newRelawan.id
    );

    return newRelawan;
  }

  public updateRelawan(id: string, updates: Partial<Relawan>, actor: User): Relawan {
    const idx = this.data.relawan.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error('Data relawan tidak ditemukan.');
    }

    // Role checks
    if (actor.role === 'Korkel' && actor.kelurahan_assigned) {
      if (this.data.relawan[idx].kelurahan.toLowerCase() !== actor.kelurahan_assigned.toLowerCase()) {
        throw new Error('Anda hanya dapat mengedit relawan di kelurahan tugas Anda.');
      }
    }
    if (actor.role === 'KorWe' && actor.kelurahan_assigned) {
      if (
        this.data.relawan[idx].kelurahan.toLowerCase() !== actor.kelurahan_assigned.toLowerCase() ||
        (actor.rw_assigned && this.data.relawan[idx].rw !== actor.rw_assigned)
      ) {
        throw new Error('Anda hanya dapat mengedit relawan di RW tugas Anda.');
      }
    }

    if (updates.nik && updates.nik !== this.data.relawan[idx].nik) {
      const existing = this.checkNikExists(updates.nik, id);
      if (existing) {
        throw new Error(`Data dengan NIK ini sudah terdaftar atas nama ${existing.nama}.`);
      }
    }

    const updated: Relawan = {
      ...this.data.relawan[idx],
      ...updates,
      kecamatan: 'Jagakarsa',
      updated_at: new Date().toISOString(),
    };

    this.data.relawan[idx] = updated;
    this.saveData();

    this.addAuditLog(
      'UPDATE_RELAWAN',
      `Mengubah data relawan '${updated.nama}' (${updated.id_relawan}).`,
      actor,
      updated.id
    );

    return updated;
  }

  public deleteRelawan(id: string, actor: User): boolean {
    const idx = this.data.relawan.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error('Data relawan tidak ditemukan.');
    }

    if (actor.role === 'KorWe') {
      throw new Error('KorWe tidak memiliki izin untuk menghapus data relawan.');
    }

    if (actor.role === 'Korkel' && actor.kelurahan_assigned) {
      if (this.data.relawan[idx].kelurahan.toLowerCase() !== actor.kelurahan_assigned.toLowerCase()) {
        throw new Error('Anda hanya dapat menghapus data relawan di kelurahan Anda.');
      }
    }

    const target = this.data.relawan[idx];
    target.is_deleted = true;
    target.deleted_at = new Date().toISOString();
    target.deleted_by = actor.name;
    this.saveData();

    this.addAuditLog(
      'DELETE_RELAWAN',
      `Menghapus relawan '${target.nama}' (NIK: ${target.nik}, ID: ${target.id_relawan}) [Soft Delete].`,
      actor,
      id
    );

    return true;
  }

  public restoreRelawan(id: string, actor: User): boolean {
    const target = this.data.relawan.find((r) => r.id === id);
    if (!target) {
      throw new Error('Data relawan tidak ditemukan.');
    }

    target.is_deleted = false;
    delete target.deleted_at;
    delete target.deleted_by;
    this.saveData();

    this.addAuditLog(
      'RESTORE_RELAWAN',
      `Memulihkan kembali data relawan '${target.nama}' (NIK: ${target.nik}, ID: ${target.id_relawan}).`,
      actor,
      id
    );

    return true;
  }

  public bulkImportRelawan(
    items: Array<Omit<Relawan, 'id' | 'id_relawan' | 'created_at' | 'updated_at'>>,
    actor: User
  ): {
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
    importedItems: Relawan[];
  } {
    let importedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const importedItems: Relawan[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      if (!item.nik || !item.nama) {
        failedCount++;
        continue;
      }

      const cleanNik = item.nik.trim().replace(/\D/g, '');
      const existing = this.checkNikExists(cleanNik);
      if (existing) {
        duplicateCount++;
        continue;
      }

      const id = `REL-ID-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const id_relawan = this.getNextRelawanId();

      const newRelawan: Relawan = {
        id,
        id_relawan,
        nik: cleanNik,
        nama: item.nama.trim().toUpperCase(),
        tempat_lahir: item.tempat_lahir || '',
        tanggal_lahir: item.tanggal_lahir || '',
        jenis_kelamin: item.jenis_kelamin || 'LAKI-LAKI',
        golongan_darah: item.golongan_darah || '-',
        alamat: item.alamat || '',
        rt: item.rt ? String(item.rt).replace(/\D/g, '').padStart(3, '0') : '001',
        rw: item.rw ? String(item.rw).replace(/\D/g, '').padStart(3, '0') : '001',
        kelurahan: item.kelurahan || 'Jagakarsa',
        kecamatan: 'Jagakarsa',
        kabupaten_kota: 'Kota Jakarta Selatan',
        provinsi: 'DKI Jakarta',
        agama: item.agama || 'ISLAM',
        status_perkawinan: item.status_perkawinan || '-',
        pekerjaan: item.pekerjaan || '-',
        kewarganegaraan: item.kewarganegaraan || 'WNI',
        tps: item.tps || 'TPS 001',
        status_relawan: item.status_relawan || 'Aktif',
        koordinator: item.koordinator || actor.name,
        keterangan: item.keterangan || 'Diimpor dari file Excel',
        tanggal_input: now.slice(0, 10),
        operator_id: actor.id,
        operator_name: actor.name,
        no_hp: item.no_hp || '',
        email: item.email || '',
        sumber_data: 'Import Excel',
        created_at: now,
        updated_at: now,
      };

      this.data.relawan.unshift(newRelawan);
      importedItems.push(newRelawan);
      importedCount++;
    }

    if (importedCount > 0) {
      this.saveData();
      this.addAuditLog(
        'IMPORT_DATA',
        `Berhasil mengimpor ${importedCount} data relawan dari file Excel (${duplicateCount} duplikat dilewati, ${failedCount} bermasalah).`,
        actor
      );
    }

    return { importedCount, duplicateCount, failedCount, importedItems };
  }

  // --- Dashboard Stats ---
  public getDashboardStats(filters: {
    kelurahan?: string;
    rw?: string;
    rt?: string;
    tps?: string;
    status_relawan?: string;
    currentUser?: User;
  }): DashboardStats {
    let list = [...this.data.relawan].filter(
      (r) => !r.is_deleted && r.kecamatan.toLowerCase() === 'jagakarsa'
    );

    if (filters.currentUser) {
      if (filters.currentUser.role === 'Korkel' && filters.currentUser.kelurahan_assigned) {
        list = list.filter(
          (r) => r.kelurahan.toLowerCase() === filters.currentUser!.kelurahan_assigned!.toLowerCase()
        );
      } else if (filters.currentUser.role === 'KorWe' && filters.currentUser.kelurahan_assigned) {
        list = list.filter(
          (r) =>
            r.kelurahan.toLowerCase() === filters.currentUser!.kelurahan_assigned!.toLowerCase() &&
            (!filters.currentUser!.rw_assigned || r.rw === filters.currentUser!.rw_assigned)
        );
      }
    }

    if (filters.kelurahan) {
      list = list.filter((r) => r.kelurahan.toLowerCase() === filters.kelurahan!.toLowerCase());
    }
    if (filters.rw) {
      list = list.filter((r) => r.rw === filters.rw);
    }
    if (filters.rt) {
      list = list.filter((r) => r.rt === filters.rt);
    }
    if (filters.tps) {
      list = list.filter((r) => r.tps.toLowerCase() === filters.tps!.toLowerCase());
    }
    if (filters.status_relawan) {
      list = list.filter((r) => r.status_relawan === filters.status_relawan);
    }

    const totalRelawan = list.length;
    const relawanAktif = list.filter((r) => r.status_relawan === 'Aktif').length;
    const relawanTidakAktif = list.filter((r) => r.status_relawan === 'Tidak Aktif').length;
    const relawanPending = list.filter((r) => r.status_relawan === 'Pending').length;

    // Chart Data grouped by 6 Kelurahans of Jagakarsa
    const chartData = KELURAHAN_JAGAKARSA.map((kel) => {
      const kelList = list.filter((r) => r.kelurahan.toLowerCase() === kel.toLowerCase());
      return {
        kecamatan: kel, // used for x-axis in chart
        total: kelList.length,
        aktif: kelList.filter((r) => r.status_relawan === 'Aktif').length,
      };
    });

    // Table Data for the 6 Kelurahans
    const tableData = KELURAHAN_JAGAKARSA.map((kel) => {
      const kelList = list.filter((r) => r.kelurahan.toLowerCase() === kel.toLowerCase());
      const tpsSet = new Set(kelList.map((r) => r.tps));
      return {
        kecamatan: 'Jagakarsa',
        kelurahan: kel,
        relawanCount: kelList.length,
        tpsCount: tpsSet.size,
      };
    });

    const distinctRW = new Set(this.data.wilayah.map((w) => `${w.kelurahan}-${w.rw}`));
    const distinctRT = new Set(this.data.wilayah.map((w) => `${w.kelurahan}-${w.rw}-${w.rt}`));
    const distinctTPS = new Set(this.data.wilayah.map((w) => `${w.kelurahan}-${w.tps}`));

    return {
      totalRelawan,
      relawanAktif,
      relawanTidakAktif,
      relawanPending,
      totalKecamatan: 1, // Only Jagakarsa
      totalKelurahan: KELURAHAN_JAGAKARSA.length, // 6 Kelurahans
      totalRW: distinctRW.size || 36,
      totalRT: distinctRT.size || 144,
      totalTPS: distinctTPS.size || 150,
      chartData,
      tableData,
    };
  }

  // --- Reports Drill-Down ---
  public getDrilldownReport(params: {
    level: 'kecamatan' | 'kelurahan' | 'rw' | 'rt' | 'tps';
    kelurahan?: string;
    rw?: string;
    rt?: string;
    tps?: string;
    currentUser?: User;
  }) {
    let list = [...this.data.relawan].filter(
      (r) => !r.is_deleted && r.kecamatan.toLowerCase() === 'jagakarsa'
    );

    if (params.currentUser) {
      if (params.currentUser.role === 'Korkel' && params.currentUser.kelurahan_assigned) {
        list = list.filter(
          (r) => r.kelurahan.toLowerCase() === params.currentUser!.kelurahan_assigned!.toLowerCase()
        );
      } else if (params.currentUser.role === 'KorWe' && params.currentUser.kelurahan_assigned) {
        list = list.filter(
          (r) =>
            r.kelurahan.toLowerCase() === params.currentUser!.kelurahan_assigned!.toLowerCase() &&
            (!params.currentUser!.rw_assigned || r.rw === params.currentUser!.rw_assigned)
        );
      }
    }

    // Top Level: Show 6 Kelurahans of Jagakarsa
    if (params.level === 'kecamatan' || (params.level === 'kelurahan' && !params.kelurahan)) {
      const data = KELURAHAN_JAGAKARSA.map((kel) => {
        const kelList = list.filter((r) => r.kelurahan.toLowerCase() === kel.toLowerCase());
        return {
          name: kel,
          total: kelList.length,
          aktif: kelList.filter((r) => r.status_relawan === 'Aktif').length,
          tidakAktif: kelList.filter((r) => r.status_relawan === 'Tidak Aktif').length,
          pending: kelList.filter((r) => r.status_relawan === 'Pending').length,
        };
      });
      return { level: 'kelurahan', parent: 'Kecamatan Jagakarsa', data };
    }

    if (params.level === 'rw' && params.kelurahan) {
      const filtered = list.filter((r) => r.kelurahan.toLowerCase() === params.kelurahan!.toLowerCase());
      const map: Record<string, { name: string; total: number; aktif: number; tidakAktif: number; pending: number }> = {};

      // Seed RWs dynamically from official wilayah definition
      const officialRws = Array.from(
        new Set(
          this.data.wilayah
            .filter((w) => w.kelurahan.toLowerCase() === params.kelurahan!.toLowerCase())
            .map((w) => w.rw)
        )
      ).sort();

      for (const rw of officialRws) {
        const rwKey = `RW ${rw}`;
        map[rwKey] = { name: rwKey, total: 0, aktif: 0, tidakAktif: 0, pending: 0 };
      }

      for (const r of filtered) {
        const rwKey = `RW ${r.rw}`;
        if (!map[rwKey]) {
          map[rwKey] = { name: rwKey, total: 0, aktif: 0, tidakAktif: 0, pending: 0 };
        }
        map[rwKey].total += 1;
        if (r.status_relawan === 'Aktif') map[rwKey].aktif += 1;
        else if (r.status_relawan === 'Tidak Aktif') map[rwKey].tidakAktif += 1;
        else map[rwKey].pending += 1;
      }
      return { level: 'rw', parent: `Kec. Jagakarsa > Kel. ${params.kelurahan}`, data: Object.values(map) };
    }

    if (params.level === 'rt' && params.kelurahan && params.rw) {
      const cleanRw = params.rw.replace(/\D/g, '').padStart(3, '0');
      const filtered = list.filter(
        (r) => r.kelurahan.toLowerCase() === params.kelurahan!.toLowerCase() && r.rw === cleanRw
      );
      const map: Record<string, { name: string; total: number; aktif: number; tidakAktif: number; pending: number }> = {};

      // Seed RTs dynamically from official wilayah definition
      const officialRts = Array.from(
        new Set(
          this.data.wilayah
            .filter(
              (w) =>
                w.kelurahan.toLowerCase() === params.kelurahan!.toLowerCase() &&
                w.rw === cleanRw
            )
            .map((w) => w.rt)
        )
      ).sort();

      for (const rt of officialRts) {
        const rtKey = `RT ${rt}`;
        map[rtKey] = { name: rtKey, total: 0, aktif: 0, tidakAktif: 0, pending: 0 };
      }

      for (const r of filtered) {
        const rtKey = `RT ${r.rt}`;
        if (!map[rtKey]) {
          map[rtKey] = { name: rtKey, total: 0, aktif: 0, tidakAktif: 0, pending: 0 };
        }
        map[rtKey].total += 1;
        if (r.status_relawan === 'Aktif') map[rtKey].aktif += 1;
        else if (r.status_relawan === 'Tidak Aktif') map[rtKey].tidakAktif += 1;
        else map[rtKey].pending += 1;
      }
      return {
        level: 'rt',
        parent: `Kec. Jagakarsa > Kel. ${params.kelurahan} > RW ${cleanRw}`,
        data: Object.values(map),
      };
    }

    if (params.level === 'tps' && params.kelurahan && params.rw && params.rt) {
      const cleanRw = params.rw.replace(/\D/g, '').padStart(3, '0');
      const cleanRt = params.rt.replace(/\D/g, '').padStart(3, '0');
      const filtered = list.filter(
        (r) =>
          r.kelurahan.toLowerCase() === params.kelurahan!.toLowerCase() &&
          r.rw === cleanRw &&
          r.rt === cleanRt
      );
      const map: Record<string, { name: string; total: number; relawan: Relawan[] }> = {};
      for (const r of filtered) {
        if (!map[r.tps]) {
          map[r.tps] = { name: r.tps, total: 0, relawan: [] };
        }
        map[r.tps].total += 1;
        map[r.tps].relawan.push(r);
      }
      return {
        level: 'tps',
        parent: `Kec. Jagakarsa > Kel. ${params.kelurahan} > RW ${cleanRw} > RT ${cleanRt}`,
        data: Object.values(map),
      };
    }

    return { level: 'kelurahan', data: [] };
  }

  // --- Event & Kehadiran Methods ---

  public getEvents(): (EventItem & { stats: EventStats })[] {
    const events = this.data.events || [];
    const totalRelawanTerdaftar = this.data.relawan.filter(
      (r) => !r.is_deleted && r.status_relawan === 'Aktif'
    ).length;

    return events.map((event) => {
      const eventAttendance = (this.data.kehadiran || []).filter((k) => k.event_id === event.id);
      const totalSudahHadir = eventAttendance.filter((k) => k.status_kehadiran === 'HADIR').length;
      const totalPesertaTamu = eventAttendance.filter((k) => k.status_kehadiran === 'PESERTA TAMU').length;
      const totalBelumHadir = Math.max(0, totalRelawanTerdaftar - totalSudahHadir);

      return {
        ...event,
        stats: {
          totalRelawanTerdaftar,
          totalSudahHadir,
          totalBelumHadir,
          totalPesertaTamu,
        },
      };
    });
  }

  public getEventById(id: string): EventItem | undefined {
    return (this.data.events || []).find((e) => e.id === id);
  }

  public checkExistingKehadiran(eventId: string, nik: string): KehadiranEvent | undefined {
    const cleanNik = nik.trim().replace(/\D/g, '');
    return (this.data.kehadiran || []).find(
      (k) => k.event_id === eventId && k.nik.replace(/\D/g, '') === cleanNik
    );
  }

  public getKehadiranByEvent(
    eventId: string,
    options: {
      kelurahan?: string;
      rw?: string;
      rt?: string;
      status?: string;
      search?: string;
    } = {}
  ): { items: KehadiranEvent[]; stats: EventStats } {
    const allAttendance = (this.data.kehadiran || []).filter((k) => k.event_id === eventId);
    const totalRelawanTerdaftar = this.data.relawan.filter(
      (r) => !r.is_deleted && r.status_relawan === 'Aktif'
    ).length;
    const totalSudahHadir = allAttendance.filter((k) => k.status_kehadiran === 'HADIR').length;
    const totalPesertaTamu = allAttendance.filter((k) => k.status_kehadiran === 'PESERTA TAMU').length;
    const totalBelumHadir = Math.max(0, totalRelawanTerdaftar - totalSudahHadir);

    let filtered = [...allAttendance];

    if (options.kelurahan) {
      filtered = filtered.filter(
        (k) => k.kelurahan.toLowerCase() === options.kelurahan!.toLowerCase()
      );
    }
    if (options.rw) {
      const cleanRw = options.rw.replace(/\D/g, '').padStart(3, '0');
      filtered = filtered.filter((k) => k.rw === cleanRw);
    }
    if (options.rt) {
      const cleanRt = options.rt.replace(/\D/g, '').padStart(3, '0');
      filtered = filtered.filter((k) => k.rt === cleanRt);
    }
    if (options.status) {
      filtered = filtered.filter((k) => k.status_kehadiran === options.status);
    }
    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (k) =>
          k.nama.toLowerCase().includes(q) ||
          k.nik.includes(q) ||
          (k.id_relawan && k.id_relawan.toLowerCase().includes(q))
      );
    }

    // Sort by latest check-in first
    filtered.sort((a, b) => new Date(b.checkin_timestamp).getTime() - new Date(a.checkin_timestamp).getTime());

    return {
      items: filtered,
      stats: {
        totalRelawanTerdaftar,
        totalSudahHadir,
        totalBelumHadir,
        totalPesertaTamu,
      },
    };
  }

  public recordCheckIn(
    eventId: string,
    data: {
      nik: string;
      nama: string;
      kecamatan?: string;
      kelurahan?: string;
      rw?: string;
      rt?: string;
      status_kehadiran: StatusKehadiran;
      relawan_id?: string;
      id_relawan?: string;
      tps?: string;
      ktp_image_url?: string;
      catatan?: string;
    },
    actor: User
  ): { success: boolean; data?: KehadiranEvent; isDuplicate: boolean; firstCheckIn?: KehadiranEvent; message?: string } {
    const event = this.getEventById(eventId);
    if (!event) {
      return { success: false, isDuplicate: false, message: 'Event tidak ditemukan.' };
    }

    const cleanNik = data.nik.trim().replace(/\D/g, '');
    if (!cleanNik || cleanNik.length < 16) {
      return { success: false, isDuplicate: false, message: 'NIK wajib 16 digit angka kependudukan.' };
    }

    // CEGAH CHECK-IN GANDA:
    // Jika NIK yang sama discan kembali untuk event yang sama, JANGAN membuat record kehadiran baru.
    const existing = this.checkExistingKehadiran(eventId, cleanNik);
    if (existing) {
      return {
        success: false,
        isDuplicate: true,
        firstCheckIn: existing,
        message: `Relawan atas nama ${existing.nama} SUDAH CHECK-IN pada ${existing.tanggal_checkin} pukul ${existingCheckInTimeFormat(existing.waktu_checkin)}.`,
      };
    }

    if (!this.data.kehadiran) {
      this.data.kehadiran = [];
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const waktu_checkin = `${hours}:${minutes}:${seconds} WIB`;
    const tanggal_checkin = event.tanggal_display || 'Sabtu, 12 September 2026';

    const cleanRw = data.rw ? data.rw.replace(/\D/g, '').padStart(3, '0') : '-';
    const cleanRt = data.rt ? data.rt.replace(/\D/g, '').padStart(3, '0') : '-';

    const newAttendance: KehadiranEvent = {
      id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_id: eventId,
      event_name: event.nama,
      event_tanggal: event.tanggal_display,
      relawan_id: data.relawan_id,
      id_relawan: data.id_relawan,
      nik: cleanNik,
      nama: data.nama.trim().toUpperCase(),
      kecamatan: data.kecamatan || 'Jagakarsa',
      kelurahan: data.kelurahan || '-',
      rw: cleanRw,
      rt: cleanRt,
      tps: data.tps,
      status_kehadiran: data.status_kehadiran,
      waktu_checkin,
      tanggal_checkin,
      checkin_timestamp: now.toISOString(),
      operator_id: actor.id,
      operator_name: actor.name,
      ktp_image_url: data.ktp_image_url,
      catatan: data.catatan,
    };

    this.data.kehadiran.unshift(newAttendance);
    this.saveData();

    this.addAuditLog(
      'CHECKIN_EVENT',
      `Check-in [${newAttendance.status_kehadiran}] event '${event.nama}': ${newAttendance.nama} (NIK: ${newAttendance.nik.slice(0, 4)}************) pada ${waktu_checkin}.`,
      actor,
      newAttendance.id
    );

    return {
      success: true,
      data: newAttendance,
      isDuplicate: false,
    };
  }

  // --- NEW EVENT MANAGEMENT MODULE ---

  public getEventsWithDetailStats(statusFilter?: string, search?: string): (EventItem & { stats: EventDetailStats })[] {
    let events = [...(this.data.events || [])];

    if (statusFilter && statusFilter !== 'Semua') {
      events = events.filter((e) => e.status === statusFilter);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      events = events.filter(
        (e) =>
          e.nama.toLowerCase().includes(q) ||
          (e.deskripsi && e.deskripsi.toLowerCase().includes(q)) ||
          (e.lokasi && e.lokasi.toLowerCase().includes(q))
      );
    }

    return events.map((ev) => {
      const stats = this.getEventDetailStats(ev.id);
      return {
        ...ev,
        stats,
      };
    });
  }

  public getEventDetailStats(eventId: string): EventDetailStats {
    const event = (this.data.events || []).find((e) => e.id === eventId);
    const kuota = event?.kuota || 500;
    const registrations = (this.data.event_registrations || []).filter((r) => r.event_id === eventId);
    const totalPendaftar = registrations.length;
    const pesertaValid = registrations.filter((r) => r.status === 'VALID').length;
    const pesertaDitolak = registrations.filter((r) => r.status === 'DITOLAK').length;
    const sisaKuota = Math.max(0, kuota - pesertaValid);

    const todayStr = new Date().toISOString().slice(0, 10);
    const pendaftarHariIni = registrations.filter(
      (r) => r.created_at && r.created_at.slice(0, 10) === todayStr
    ).length;

    return {
      kuota,
      totalPendaftar,
      pesertaValid,
      pesertaDitolak,
      sisaKuota,
      pendaftarHariIni,
    };
  }

  public createEvent(data: Partial<EventItem>, actor: User): EventItem {
    if (!this.data.events) this.data.events = [];

    const kuota = typeof data.kuota === 'number' ? data.kuota : 500;
    const now = new Date();
    const id = `EVT-${Date.now().toString(36).toUpperCase()}`;

    // Format display date
    const dateObj = data.tanggal ? new Date(data.tanggal) : now;
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const tanggal_display =
      data.tanggal_display || dateObj.toLocaleDateString('id-ID', options);

    const newEvent: EventItem = {
      id,
      nama: data.nama ? data.nama.trim() : 'Event Baru',
      deskripsi: data.deskripsi || '',
      kategori: data.kategori || 'Sosialisasi',
      poster_url: data.poster_url || '',
      tanggal: data.tanggal || now.toISOString().slice(0, 10),
      tanggal_display,
      waktu_mulai: data.waktu_mulai || '08:00 WIB',
      waktu_selesai: data.waktu_selesai || '12:00 WIB',
      lokasi: data.lokasi || 'Kecamatan Jagakarsa',
      alamat: data.alamat || '',
      kuota,
      status: (data.status as StatusEvent) || 'Akan Datang',
      status_pendaftaran: (data.status_pendaftaran as StatusPendaftaran) || 'Dibuka',
      informasi_tambahan: data.informasi_tambahan || '',
      form_schema: data.form_schema && data.form_schema.length > 0 ? data.form_schema : getDefaultEventFormSchema(),
      form_settings: data.form_settings || {
        nik_validation_enabled: true,
        is_accepting_responses: true,
        max_participants: kuota,
        confirmation_message: 'Terima kasih, pendaftaran Anda telah berhasil dicatat.',
        allow_manual_input: true,
        allow_ktp_scan: true,
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.data.events.unshift(newEvent);
    this.saveData();

    this.addAuditLog(
      'CREATE_EVENT',
      `Membuat event baru: '${newEvent.nama}' (${newEvent.tanggal_display}) kuota: ${newEvent.kuota}.`,
      actor,
      newEvent.id
    );

    return newEvent;
  }

  public updateEvent(id: string, data: Partial<EventItem>, actor: User): EventItem | null {
    if (!this.data.events) return null;
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const current = this.data.events[idx];
    const updated: EventItem = {
      ...current,
      ...data,
      id: current.id, // Immutable ID
      updated_at: new Date().toISOString(),
    };

    this.data.events[idx] = updated;
    this.saveData();

    this.addAuditLog(
      'UPDATE_EVENT',
      `Memperbarui informasi event '${updated.nama}'.`,
      actor,
      id
    );

    return updated;
  }

  public deleteEvent(id: string, actor: User): boolean {
    if (!this.data.events) return false;
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    const deleted = this.data.events.splice(idx, 1)[0];
    this.saveData();

    this.addAuditLog('DELETE_EVENT', `Menghapus event '${deleted.nama}'.`, actor, id);
    return true;
  }

  public updateEventForm(
    id: string,
    form_schema: FormField[],
    form_settings: EventFormSettings,
    actor: User
  ): EventItem | null {
    if (!this.data.events) return null;
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    this.data.events[idx].form_schema = form_schema;
    this.data.events[idx].form_settings = form_settings;
    this.data.events[idx].updated_at = new Date().toISOString();

    this.saveData();

    this.addAuditLog(
      'UPDATE_EVENT',
      `Memperbarui skema Form Pendaftaran & Pengaturan event '${this.data.events[idx].nama}' (${form_schema.length} pertanyaan).`,
      actor,
      id
    );

    return this.data.events[idx];
  }

  // --- PARTICIPANT ROLE MANAGEMENT ---

  public getParticipantRoles(search?: string): ParticipantRoleRecord[] {
    if (!this.data.participant_roles) this.data.participant_roles = [];
    let list = [...this.data.participant_roles];

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const digits = search.replace(/\D/g, '');
      list = list.filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.nik.includes(digits || q) ||
          (p.phone && p.phone.includes(q)) ||
          p.role.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public getParticipantRoleByNik(nik: string): ParticipantRole {
    const cleanNik = (nik || '').trim().replace(/\D/g, '');
    if (!cleanNik) return 'PESERTA';

    // 1. Check explicit participant_roles table
    if (this.data.participant_roles) {
      const found = this.data.participant_roles.find((p) => p.nik.replace(/\D/g, '') === cleanNik);
      if (found && found.role) {
        // Standardize role casing
        const upper = found.role.toUpperCase();
        if (['KORCAM', 'KORKEL', 'KORWE', 'KORTPS', 'PESERTA'].includes(upper)) {
          return upper as ParticipantRole;
        }
      }
    }

    // 2. Default fallback is always PESERTA
    return 'PESERTA';
  }

  public setParticipantRole(
    nik: string,
    nama: string,
    role: ParticipantRole,
    actor: User,
    meta?: { phone?: string; kelurahan?: string; rw?: string }
  ): ParticipantRoleRecord {
    if (!this.data.participant_roles) this.data.participant_roles = [];
    const cleanNik = (nik || '').trim().replace(/\D/g, '');
    if (!cleanNik || cleanNik.length < 16) {
      throw new Error('NIK wajib 16 digit angka kependudukan.');
    }

    const validRoles: ParticipantRole[] = ['PESERTA', 'KORCAM', 'KORKEL', 'KORWE', 'KORTPS'];
    const standardRole = role.toUpperCase() as ParticipantRole;
    if (!validRoles.includes(standardRole)) {
      throw new Error(`Role '${role}' tidak valid. Pilihan: PESERTA, KORCAM, KORKEL, KORWE, KORTPS.`);
    }

    const idx = this.data.participant_roles.findIndex((p) => p.nik.replace(/\D/g, '') === cleanNik);
    const now = new Date().toISOString();

    let record: ParticipantRoleRecord;

    if (idx !== -1) {
      this.data.participant_roles[idx] = {
        ...this.data.participant_roles[idx],
        nama: nama ? nama.trim().toUpperCase() : this.data.participant_roles[idx].nama,
        role: standardRole,
        phone: meta?.phone ?? this.data.participant_roles[idx].phone,
        kelurahan: meta?.kelurahan ?? this.data.participant_roles[idx].kelurahan,
        rw: meta?.rw ?? this.data.participant_roles[idx].rw,
        assigned_by: actor.name,
        updated_at: now,
      };
      record = this.data.participant_roles[idx];
    } else {
      record = {
        id: `PR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nik: cleanNik,
        nama: nama ? nama.trim().toUpperCase() : 'WARGA',
        role: standardRole,
        phone: meta?.phone,
        kelurahan: meta?.kelurahan,
        rw: meta?.rw,
        assigned_by: actor.name,
        updated_at: now,
      };
      this.data.participant_roles.push(record);
    }

    this.saveData();

    this.addAuditLog(
      'UPDATE_ROLE',
      `Admin ${actor.name} mengubah role internal NIK ${cleanNik.slice(0, 4)}************ (${record.nama}) menjadi '${record.role}'.`,
      actor,
      record.id
    );

    return record;
  }

  // --- TWO-PASS NIK VALIDATION & REGISTRATION ENGINE ---

  /**
   * CHECK 1: Realtime lookup when participant enters or scans NIK.
   * Returns eligibility status, participant role, and clean informative message.
   */
  public checkNikEligibilityForRegistration(
    eventId: string,
    nik: string
  ): {
    eligible: boolean;
    role: ParticipantRole;
    message?: string;
    isDuplicate?: boolean;
    isQuotaFull?: boolean;
    existingRelawan?: { nama: string; kelurahan?: string; rw?: string; rt?: string };
  } {
    const event = this.getEventById(eventId);
    if (!event) {
      return { eligible: false, role: 'PESERTA', message: 'Event tidak ditemukan.' };
    }

    // 1. Check Event registration availability
    if (event.status_pendaftaran === 'Ditutup' || event.status === 'Selesai') {
      return { eligible: false, role: 'PESERTA', message: 'Pendaftaran untuk event ini sudah ditutup.' };
    }

    if (event.form_settings && event.form_settings.is_accepting_responses === false) {
      return { eligible: false, role: 'PESERTA', message: 'Formulir event ini sedang tidak menerima respons pendaftaran.' };
    }

    // 2. Check Quota
    const stats = this.getEventDetailStats(eventId);
    if (stats.sisaKuota <= 0) {
      return {
        eligible: false,
        role: 'PESERTA',
        isQuotaFull: true,
        message: 'Maaf, kuota pendaftaran untuk event ini sudah penuh.',
      };
    }

    const cleanNik = (nik || '').trim().replace(/\D/g, '');
    if (!cleanNik || cleanNik.length < 16) {
      return { eligible: false, role: 'PESERTA', message: 'NIK harus terdiri dari 16 digit angka.' };
    }

    // 3. Query Role directly from internal Database (never client-provided!)
    const role = this.getParticipantRoleByNik(cleanNik);

    // 4. If Role is KORCAM / KORKEL / KORWE / KORTPS -> Bypass Anti-Duplicate across events
    if (['KORCAM', 'KORKEL', 'KORWE', 'KORTPS'].includes(role)) {
      return {
        eligible: true,
        role,
        message: `NIK terverifikasi sebagai ${role}. Anda dapat melanjutkan pendaftaran.`,
      };
    }

    // 5. If Role is PESERTA -> Strict Anti-Duplicate against ALL history & existing database
    // A. Check if already registered in ANY event with VALID status
    const previousRegistration = (this.data.event_registrations || []).find(
      (r) => r.nik.replace(/\D/g, '') === cleanNik && r.status === 'VALID'
    );
    if (previousRegistration) {
      return {
        eligible: false,
        isDuplicate: true,
        role: 'PESERTA',
        message: 'Maaf, NIK Anda sudah pernah terdaftar pada kegiatan sebelumnya dan belum dapat digunakan untuk pendaftaran ini.',
      };
    }

    // B. Check if already registered in existing Relawan database
    const existingRelawan = this.checkNikExists(cleanNik);
    if (existingRelawan) {
      return {
        eligible: false,
        isDuplicate: true,
        role: 'PESERTA',
        existingRelawan: {
          nama: existingRelawan.nama,
          kelurahan: existingRelawan.kelurahan,
          rw: existingRelawan.rw,
          rt: existingRelawan.rt,
        },
        message: 'Maaf, NIK Anda sudah pernah terdaftar pada kegiatan sebelumnya dan belum dapat digunakan untuk pendaftaran ini.',
      };
    }

    // C. Check if in attendance records
    const previousAttendance = (this.data.kehadiran || []).find(
      (k) => k.nik.replace(/\D/g, '') === cleanNik
    );
    if (previousAttendance) {
      return {
        eligible: false,
        isDuplicate: true,
        role: 'PESERTA',
        message: 'Maaf, NIK Anda sudah pernah terdaftar pada kegiatan sebelumnya dan belum dapat digunakan untuk pendaftaran ini.',
      };
    }

    // Fresh eligible participant
    return {
      eligible: true,
      role: 'PESERTA',
      message: 'NIK valid dan belum pernah terdaftar. Silakan lanjutkan pengisian formulir.',
    };
  }

  /**
   * CHECK 2: Atomic backend validation on final SUBMIT.
   * Validates quota, re-checks role from DB, enforces anti-duplicate rules, and creates registration.
   */
  public submitEventRegistration(
    eventId: string,
    payload: {
      nik: string;
      nama: string;
      nomor_hp?: string;
      source_input: RegistrationSource;
      data_form: Record<string, any>;
      ktp_image_url?: string;
    }
  ): { success: boolean; data?: EventRegistration; error?: string; isDuplicate?: boolean } {
    const event = this.getEventById(eventId);
    if (!event) {
      return { success: false, error: 'Event tidak ditemukan.' };
    }

    if (event.status_pendaftaran === 'Ditutup' || event.status === 'Selesai') {
      return { success: false, error: 'Pendaftaran untuk event ini sudah ditutup.' };
    }

    if (event.form_settings && event.form_settings.is_accepting_responses === false) {
      return { success: false, error: 'Pendaftaran untuk event ini sedang tidak menerima respons.' };
    }

    const cleanNik = (payload.nik || '').trim().replace(/\D/g, '');
    if (!cleanNik || cleanNik.length < 16) {
      return { success: false, error: 'NIK wajib 16 digit angka kependudukan.' };
    }

    if (!payload.nama || !payload.nama.trim()) {
      return { success: false, error: 'Nama lengkap wajib diisi.' };
    }

    if (!this.data.event_registrations) {
      this.data.event_registrations = [];
    }

    // CRITICAL: Final Quota Verification right before writing
    const currentValidCount = this.data.event_registrations.filter(
      (r) => r.event_id === eventId && r.status === 'VALID'
    ).length;

    if (currentValidCount >= event.kuota) {
      event.status_pendaftaran = 'Kuota Penuh';
      this.saveData();
      return { success: false, error: 'Maaf, kuota pendaftaran untuk event ini sudah penuh.' };
    }

    // CRITICAL SECURITY: Fetch role from internal DATABASE, NEVER trust client
    const internalRole = this.getParticipantRoleByNik(cleanNik);

    // ANTI-DUPLICATE RULE:
    // If Role is PESERTA:
    if (internalRole === 'PESERTA') {
      // 1. Check if registered in ANY prior event with VALID status
      const existsInRegistrations = this.data.event_registrations.find(
        (r) => r.nik === cleanNik && r.status === 'VALID'
      );
      if (existsInRegistrations) {
        return {
          success: false,
          isDuplicate: true,
          error: 'Maaf, NIK Anda sudah pernah terdaftar pada kegiatan sebelumnya dan belum dapat digunakan untuk pendaftaran ini.',
        };
      }

      // 2. Check existing relawan database
      const existsInRelawan = this.checkNikExists(cleanNik);
      if (existsInRelawan) {
        return {
          success: false,
          isDuplicate: true,
          error: 'Maaf, NIK Anda sudah pernah terdaftar pada kegiatan sebelumnya dan belum dapat digunakan untuk pendaftaran ini.',
        };
      }

      // 3. Check existing kehadiran database
      const existsInKehadiran = (this.data.kehadiran || []).find(
        (k) => k.nik.replace(/\D/g, '') === cleanNik
      );
      if (existsInKehadiran) {
        return {
          success: false,
          isDuplicate: true,
          error: 'Maaf, NIK Anda sudah pernah terdaftar pada kegiatan sebelumnya dan belum dapat digunakan untuk pendaftaran ini.',
        };
      }
    }

    // If role is KORCAM / KORKEL / KORWE / KORTPS:
    // Still prevent duplicate registration within the EXACT SAME event if desired:
    const duplicateInSameEvent = this.data.event_registrations.find(
      (r) => r.event_id === eventId && r.nik === cleanNik && r.status === 'VALID'
    );
    if (duplicateInSameEvent) {
      return {
        success: false,
        isDuplicate: true,
        error: `Anda (${duplicateInSameEvent.nama}) sudah terdaftar pada kegiatan ini sebelumnya.`,
      };
    }

    const now = new Date();
    const newReg: EventRegistration = {
      id: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_id: eventId,
      nik: cleanNik,
      nama: payload.nama.trim().toUpperCase(),
      nomor_hp: payload.nomor_hp || '',
      role_snapshot: internalRole,
      source_input: payload.source_input || 'MANUAL',
      data_form: payload.data_form || {},
      registration_time: now.toISOString(),
      status: 'VALID',
      ktp_image_url: payload.ktp_image_url,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.data.event_registrations.unshift(newReg);

    // Update quota status if reached
    if (currentValidCount + 1 >= event.kuota) {
      event.status_pendaftaran = 'Kuota Penuh';
    }

    this.saveData();

    // Add Audit Log
    const dummyActor: User = {
      id: 'USR-PUBLIC-FORM',
      username: 'pendaftar',
      name: newReg.nama,
      role: 'Operator',
      kecamatan_assigned: 'Jagakarsa',
      created_at: now.toISOString(),
    };
    this.addAuditLog(
      'REGISTER_EVENT',
      `Pendaftaran event '${event.nama}' berhasil: ${newReg.nama} (NIK: ${newReg.nik.slice(0, 4)}************) [Role: ${newReg.role_snapshot}] via ${newReg.source_input}.`,
      dummyActor,
      newReg.id
    );

    return {
      success: true,
      data: newReg,
    };
  }

  public getEventRegistrations(
    eventId: string,
    options: {
      search?: string;
      status?: string;
      role?: string;
      source?: string;
      page?: number;
      limit?: number;
    } = {}
  ): { items: EventRegistration[]; total: number; stats: EventDetailStats } {
    const stats = this.getEventDetailStats(eventId);
    const all = (this.data.event_registrations || []).filter((r) => r.event_id === eventId);

    let filtered = [...all];

    if (options.status && options.status !== 'Semua') {
      filtered = filtered.filter((r) => r.status === options.status);
    }

    if (options.role && options.role !== 'Semua') {
      filtered = filtered.filter((r) => r.role_snapshot === options.role);
    }

    if (options.source && options.source !== 'Semua') {
      filtered = filtered.filter((r) => r.source_input === options.source);
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      const digits = options.search.replace(/\D/g, '');
      filtered = filtered.filter(
        (r) =>
          r.nama.toLowerCase().includes(q) ||
          r.nik.includes(digits || q) ||
          (r.nomor_hp && r.nomor_hp.includes(q))
      );
    }

    // Sort latest registration first
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filtered.length;
    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      items: paginated,
      total,
      stats,
    };
  }

  public updateRegistrationStatus(
    registrationId: string,
    status: RegistrationStatus,
    actor: User,
    rejection_reason?: string
  ): EventRegistration | null {
    if (!this.data.event_registrations) return null;
    const idx = this.data.event_registrations.findIndex((r) => r.id === registrationId);
    if (idx === -1) return null;

    this.data.event_registrations[idx].status = status;
    if (rejection_reason) {
      this.data.event_registrations[idx].rejection_reason = rejection_reason;
    }
    this.data.event_registrations[idx].updated_at = new Date().toISOString();

    this.saveData();

    this.addAuditLog(
      'UPDATE_EVENT',
      `Mengubah status pendaftaran '${this.data.event_registrations[idx].nama}' menjadi ${status}.`,
      actor,
      registrationId
    );

    return this.data.event_registrations[idx];
  }
}

function existingCheckInTimeFormat(timeStr: string): string {
  return timeStr || '';
}

export const db = new Database();
