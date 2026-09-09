import express, { Request, Response } from 'express';
import { db } from './db';
import { processKtpWithGemini } from './ocr';
import { User, Relawan } from '../src/types';

export const app = express();

// Increase payload limit for KTP image base64 uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper middleware to extract current user
export const getUserFromRequest = (req: Request): User | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userId = authHeader.substring(7);
    const found = db.getUserById(userId);
    if (found) return found;
  }
  return null;
};

export const requireAuthUser = (req: Request, res: Response): User | null => {
  const user = getUserFromRequest(req);
  if (!user) {
    const defaultUser = db.getUserById('USR-DPC-01') || db.getUserById('USR-KORCAM-01') || db.getUsers()[0];
    if (defaultUser) return defaultUser;
    res.status(401).json({ error: 'Sesi telah berakhir, silakan login kembali.' });
    return null;
  }
  return user;
};

// --- API Routes ---

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    timestamp: new Date().toISOString(),
  });
});

// Auth: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const idStr = (username || email || '').trim();
    if (!idStr || !password) {
      return res.status(400).json({ error: 'Username dan kata sandi wajib diisi.' });
    }

    const user = db.validateLogin(idStr, password.trim());
    if (!user) {
      return res.status(401).json({
        error: 'Username atau kata sandi tidak cocok. Pastikan data login Anda benar.',
      });
    }

    db.addAuditLog('LOGIN', `Pengguna '${user.name}' (${user.role}) berhasil masuk ke sistem.`, user);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, token: user.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal melakukan otentikasi.' });
  }
});

// Auth: Me
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.json({ user: null });
  }
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Users Management (Accessible by Ketua DPC & Korcam)
app.get('/api/users', (req: Request, res: Response) => {
  const user = requireAuthUser(req, res);
  if (!user) return;
  if (user.role !== 'Ketua DPC' && user.role !== 'Korcam' && user.role !== 'Super Admin') {
    return res.status(403).json({
      error: 'Hanya Ketua DPC dan Korcam yang memiliki izin mengakses manajemen koordinator & admin.',
    });
  }
  res.json({ users: db.getUsers() });
});

app.post('/api/users', (req: Request, res: Response) => {
  const user = requireAuthUser(req, res);
  if (!user) return;
  if (user.role !== 'Ketua DPC' && user.role !== 'Korcam' && user.role !== 'Super Admin') {
    return res.status(403).json({
      error: 'Hanya Ketua DPC dan Korcam yang memiliki izin menambahkan admin/koordinator.',
    });
  }
  try {
    const { username, name, password, role, kelurahan_assigned, rw_assigned, phone } = req.body;
    if (!username || !name || !role || !password) {
      return res.status(400).json({ error: 'Username, nama lengkap, kata sandi, dan role wajib diisi.' });
    }

    if (role === 'Korkel' && !kelurahan_assigned) {
      return res.status(400).json({ error: 'Untuk role Korkel, Kelurahan tugas wajib dipilih.' });
    }
    if (role === 'KorWe' && (!kelurahan_assigned || !rw_assigned)) {
      return res.status(400).json({ error: 'Untuk role KorWe, Kelurahan dan RW tugas wajib ditentukan.' });
    }

    const cleanRw = rw_assigned ? rw_assigned.replace(/\D/g, '').padStart(3, '0') : undefined;

    const newUser = db.createUser(
      {
        username: username.trim().toLowerCase(),
        name: name.trim(),
        password: password.trim(),
        role,
        kecamatan_assigned: 'Jagakarsa',
        kelurahan_assigned,
        rw_assigned: cleanRw,
        phone,
      },
      user
    );
    res.status(201).json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const user = requireAuthUser(req, res);
  if (!user) return;
  if (user.role !== 'Ketua DPC' && user.role !== 'Korcam' && user.role !== 'Super Admin') {
    return res.status(403).json({
      error: 'Hanya Ketua DPC dan Korcam yang memiliki izin mengubah data koordinator.',
    });
  }
  try {
    const updated = db.updateUser(req.params.id, req.body, user);
    if (!updated) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const user = requireAuthUser(req, res);
  if (!user) return;
  if (user.role !== 'Ketua DPC' && user.role !== 'Korcam' && user.role !== 'Super Admin') {
    return res.status(403).json({
      error: 'Hanya Ketua DPC dan Korcam yang memiliki izin menghapus koordinator.',
    });
  }
  try {
    const ok = db.deleteUser(req.params.id, user);
    if (!ok) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// OCR KTP endpoint
app.post('/api/ocr-ktp', async (req: Request, res: Response) => {
  const currentUser = requireAuthUser(req, res);
  if (!currentUser) return;
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Foto KTP tidak disertakan.' });
    }

    // 1. Process with Gemini Vision
    const ocrResult = await processKtpWithGemini(imageBase64, mimeType || 'image/jpeg');

    // 2. Check for duplicate NIK
    let duplicateWarning: { isDuplicate: boolean; existingRelawan?: Relawan } = { isDuplicate: false };
    if (ocrResult.nik) {
      const existing = db.checkNikExists(ocrResult.nik);
      if (existing) {
        duplicateWarning = {
          isDuplicate: true,
          existingRelawan: existing,
        };
      }
    }

    // Add audit log for OCR upload
    db.addAuditLog(
      'UPLOAD_KTP',
      `Operator ${currentUser.name} memindai foto KTP ${ocrResult.nama ? `(Nama terdeteksi: ${ocrResult.nama})` : ''}.`,
      currentUser
    );

    res.json({
      success: true,
      data: ocrResult,
      duplicate: duplicateWarning,
    });
  } catch (err: any) {
    console.error('OCR error:', err);
    res.status(422).json({
      error:
        err.message ||
        'Data KTP belum dapat dibaca. Pastikan foto tidak buram, tidak miring, dan seluruh bagian KTP terlihat.',
    });
  }
});

// Check NIK existence
app.get('/api/relawan/check-nik/:nik', (req: Request, res: Response) => {
  const { nik } = req.params;
  const existing = db.checkNikExists(nik);
  if (existing) {
    return res.json({ exists: true, relawan: existing });
  }
  return res.json({ exists: false });
});

// Wilayah Hierarchy
app.get('/api/wilayah/hierarchy', (_req: Request, res: Response) => {
  const hierarchy = db.getWilayahHierarchy();
  res.json({ hierarchy });
});

// Dashboard Stats
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const currentUser = getUserFromRequest(req) || undefined;
  const { kelurahan, rw, rt, tps, status_relawan } = req.query as Record<string, string>;
  const stats = db.getDashboardStats({
    kelurahan,
    rw,
    rt,
    tps,
    status_relawan,
    currentUser,
  });
  res.json(stats);
});

// Reports Drill-down
app.get('/api/reports/drilldown', (req: Request, res: Response) => {
  const currentUser = getUserFromRequest(req) || undefined;
  const { level, kelurahan, rw, rt, tps } = req.query as Record<string, string>;
  const report = db.getDrilldownReport({
    level: (level as any) || 'kelurahan',
    kelurahan,
    rw,
    rt,
    tps,
    currentUser,
  });
  res.json(report);
});

// Relawan: List
app.get('/api/relawan', (req: Request, res: Response) => {
  const currentUser = getUserFromRequest(req) || undefined;
  const {
    search,
    kelurahan,
    rw,
    rt,
    tps,
    status_relawan,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query as Record<string, string>;

  const result = db.getRelawanList({
    search,
    kecamatan: 'Jagakarsa',
    kelurahan,
    rw,
    rt,
    tps,
    status_relawan,
    currentUser,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 10,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
  });

  res.json(result);
});

// Relawan: Detail
app.get('/api/relawan/:id', (req: Request, res: Response) => {
  const item = db.getRelawanById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Data relawan tidak ditemukan.' });
  res.json({ relawan: item });
});

// Relawan: Create
app.post('/api/relawan', (req: Request, res: Response) => {
  const currentUser = requireAuthUser(req, res);
  if (!currentUser) return;
  try {
    const body = req.body;
    if (!body.nik || !body.nama) {
      return res.status(400).json({ error: 'NIK dan Nama wajib diisi.' });
    }
    const newRelawan = db.createRelawan(body, currentUser);
    res.status(201).json({ success: true, relawan: newRelawan });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Relawan: Update
app.put('/api/relawan/:id', (req: Request, res: Response) => {
  const currentUser = requireAuthUser(req, res);
  if (!currentUser) return;
  try {
    const updated = db.updateRelawan(req.params.id, req.body, currentUser);
    res.json({ success: true, relawan: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Relawan: Delete
app.delete('/api/relawan/:id', (req: Request, res: Response) => {
  const currentUser = requireAuthUser(req, res);
  if (!currentUser) return;
  try {
    db.deleteRelawan(req.params.id, currentUser);
    res.json({ success: true, message: 'Relawan berhasil dihapus.' });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Audit Logs
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  const logs = db.getAuditLogs(100);
  res.json({ logs });
});

// Export to Google Sheets / CSV / JSON
app.post('/api/export/sheets', (req: Request, res: Response) => {
  const currentUser = requireAuthUser(req, res);
  if (!currentUser) return;
  try {
    const { filterType, filterValue, format } = req.body;

    const filterOpts: any = { currentUser, limit: 10000 };
    if (filterType === 'kelurahan') filterOpts.kelurahan = filterValue;
    if (filterType === 'rw') filterOpts.rw = filterValue;
    if (filterType === 'rt') filterOpts.rt = filterValue;
    if (filterType === 'tps') filterOpts.tps = filterValue;
    if (filterType === 'status') filterOpts.status_relawan = filterValue;

    const { items } = db.getRelawanList(filterOpts);

    const headers = [
      'ID Relawan',
      'NIK',
      'Nama',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Jenis Kelamin',
      'Golongan Darah',
      'Alamat',
      'RT',
      'RW',
      'Kelurahan',
      'Kecamatan',
      'Kabupaten/Kota',
      'Provinsi',
      'Agama',
      'Status Perkawinan',
      'Pekerjaan',
      'Kewarganegaraan',
      'TPS',
      'Status Relawan',
      'Koordinator',
      'Keterangan',
      'Tanggal Input',
      'Operator Input',
    ];

    const rows = items.map((r) => [
      r.id_relawan || '',
      `'${r.nik}`,
      r.nama || '',
      r.tempat_lahir || '',
      r.tanggal_lahir || '',
      r.jenis_kelamin || '',
      r.golongan_darah || '',
      r.alamat || '',
      r.rt || '',
      r.rw || '',
      r.kelurahan || '',
      r.kecamatan || '',
      r.kabupaten_kota || '',
      r.provinsi || '',
      r.agama || '',
      r.status_perkawinan || '',
      r.pekerjaan || '',
      r.kewarganegaraan || '',
      r.tps || '',
      r.status_relawan || '',
      r.koordinator || '',
      r.keterangan || '',
      r.tanggal_input || '',
      r.operator_name || r.operator_id || '',
    ]);

    db.addAuditLog(
      'EXPORT_DATA',
      `Export ${items.length} data relawan (Filter: ${filterType || 'Semua'} = ${filterValue || 'Semua'}) ke format ${format || 'Google Sheets / CSV'}.`,
      currentUser
    );

    res.json({
      success: true,
      totalExported: items.length,
      headers,
      rows,
      filterApplied: { filterType, filterValue },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
