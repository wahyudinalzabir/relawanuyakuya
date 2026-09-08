import fs from 'fs';
import path from 'path';
import { User, WilayahItem, Relawan, AuditLog, DashboardStats } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

interface DatabaseSchema {
  users: User[];
  wilayah: WilayahItem[];
  relawan: Relawan[];
  audit_logs: AuditLog[];
}

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export const KELURAHAN_JAGAKARSA = [
  'Tanjung Barat',
  'Lenteng Agung',
  'Jagakarsa',
  'Ciganjur',
  'Srengseng Sawah',
  'Cipedak',
];

function getInitialData(): DatabaseSchema {
  const wilayahList: WilayahItem[] = [];
  let wId = 1;

  for (const kel of KELURAHAN_JAGAKARSA) {
    for (let rwNum = 1; rwNum <= 6; rwNum++) {
      const rw = String(rwNum).padStart(3, '0');
      for (let rtNum = 1; rtNum <= 4; rtNum++) {
        const rt = String(rtNum).padStart(3, '0');
        for (let tpsNum = 1; tpsNum <= 4; tpsNum++) {
          const tps = `TPS ${String(tpsNum).padStart(3, '0')}`;
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
  }

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
        const parsed = JSON.parse(content);
        // Ensure that if database was from previous multi-district version, reset it cleanly
        const hasOnlyJagakarsa =
          parsed.wilayah &&
          parsed.wilayah.length > 0 &&
          parsed.wilayah.every((w: WilayahItem) => w.kecamatan === 'Jagakarsa');
        const hasNewUsers =
          parsed.users &&
          parsed.users.some(
            (u: User) => u.username === 'fitrinurbaiti' || u.username === 'wahyudin'
          );

        if (hasOnlyJagakarsa && hasNewUsers) {
          return parsed;
        }
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
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
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
      (r) => r.nik.replace(/\D/g, '') === cleanNik && (!excludeId || r.id !== excludeId)
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
  }): { items: Relawan[]; total: number; page: number; totalPages: number } {
    let list = [...this.data.relawan];

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

    const deleted = this.data.relawan.splice(idx, 1)[0];
    this.saveData();

    this.addAuditLog(
      'DELETE_RELAWAN',
      `Menghapus relawan '${deleted.nama}' (NIK: ${deleted.nik}, ID: ${deleted.id_relawan}).`,
      actor,
      id
    );

    return true;
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
    let list = [...this.data.relawan].filter((r) => r.kecamatan.toLowerCase() === 'jagakarsa');

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
    let list = [...this.data.relawan].filter((r) => r.kecamatan.toLowerCase() === 'jagakarsa');

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
    if (params.level === 'kecamatan' || params.level === 'kelurahan' && !params.kelurahan) {
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
      
      // Seed default RWs
      for (let i = 1; i <= 6; i++) {
        const rwKey = `RW ${String(i).padStart(3, '0')}`;
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
      
      for (let i = 1; i <= 4; i++) {
        const rtKey = `RT ${String(i).padStart(3, '0')}`;
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
}

export const db = new Database();
