import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { processKtpWithGemini } from './server/ocr';
import { User, Relawan } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for KTP image base64 uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Helper middleware to extract current user
  const getUserFromRequest = (req: Request): User | null => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userId = authHeader.substring(7);
      const found = db.getUserById(userId);
      if (found) return found;
    }
    return null;
  };

  const requireAuthUser = (req: Request, res: Response): User | null => {
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

  // Bulk check NIKs for Excel Import Preview
  app.post('/api/relawan/check-bulk-nik', (req: Request, res: Response) => {
    try {
      const { niks } = req.body as { niks: string[] };
      if (!Array.isArray(niks)) {
        return res.status(400).json({ error: 'Data niks harus berupa array.' });
      }
      const existingMap: Record<string, { id: string; nama: string; id_relawan: string }> = {};
      for (const nik of niks) {
        if (!nik) continue;
        const cleanNik = String(nik).trim().replace(/\D/g, '');
        const found = db.checkNikExists(cleanNik);
        if (found) {
          existingMap[cleanNik] = { id: found.id, nama: found.nama, id_relawan: found.id_relawan };
        }
      }
      res.json({ success: true, existingMap });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk Import Relawan from Excel
  app.post('/api/relawan/bulk-import', (req: Request, res: Response) => {
    const currentUser = requireAuthUser(req, res);
    if (!currentUser) return;
    try {
      const { items } = req.body as { items: any[] };
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Tidak ada baris data untuk diimpor.' });
      }

      const result = db.bulkImportRelawan(items, currentUser);
      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
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

  // Relawan: Restore (Soft Delete Recovery)
  app.post('/api/relawan/:id/restore', (req: Request, res: Response) => {
    const currentUser = requireAuthUser(req, res);
    if (!currentUser) return;
    try {
      db.restoreRelawan(req.params.id, currentUser);
      res.json({ success: true, message: 'Data relawan berhasil dipulihkan.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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

  // --- Events & Attendance API Routes ---

  // Get all events with summary & detail stats
  app.get('/api/events', (req: Request, res: Response) => {
    try {
      const { status, search } = req.query as Record<string, string>;
      const events = db.getEventsWithDetailStats(status, search);
      res.json({ success: true, events });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create new event (Admin only)
  app.post('/api/events', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const { nama, tanggal, kuota } = req.body;
      if (!nama || !tanggal) {
        return res.status(400).json({ error: 'Nama event dan tanggal wajib diisi.' });
      }
      const newEvent = db.createEvent(req.body, user);
      res.status(201).json({ success: true, event: newEvent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get event by ID (Public / Admin)
  app.get('/api/events/:id', (req: Request, res: Response) => {
    try {
      const event = db.getEventById(req.params.id);
      if (!event) return res.status(404).json({ error: 'Event tidak ditemukan.' });
      const stats = db.getEventDetailStats(req.params.id);
      res.json({ success: true, event: { ...event, stats } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update event metadata (Admin only)
  app.put('/api/events/:id', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const updated = db.updateEvent(req.params.id, req.body, user);
      if (!updated) return res.status(404).json({ error: 'Event tidak ditemukan.' });
      res.json({ success: true, event: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete event (Admin only)
  app.delete('/api/events/:id', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const success = db.deleteEvent(req.params.id, user);
      if (!success) return res.status(404).json({ error: 'Event tidak ditemukan.' });
      res.json({ success: true, message: 'Event berhasil dihapus.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update event form schema and settings (Google Forms-like builder)
  app.put('/api/events/:id/form', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const { form_schema, form_settings, publish_status } = req.body;
      if (!Array.isArray(form_schema)) {
        return res.status(400).json({ error: 'form_schema harus berupa array pertanyaan.' });
      }
      const updated = db.updateEventForm(req.params.id, form_schema, form_settings, user, publish_status);
      if (!updated) return res.status(404).json({ error: 'Event tidak ditemukan.' });
      res.json({ success: true, event: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // CHECK 1: Real-time NIK Validation for public registration
  app.get('/api/events/:id/validate-nik', (req: Request, res: Response) => {
    try {
      const { nik } = req.query as Record<string, string>;
      if (!nik) {
        return res.status(400).json({ eligible: false, message: 'NIK harus diisi.' });
      }
      const result = db.checkNikEligibilityForRegistration(req.params.id, nik);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // CHECK 2: Submit Public Event Registration (enforces anti-duplicate & quota)
  app.post('/api/events/:id/register', async (req: Request, res: Response) => {
    try {
      const {
        nik,
        nama,
        nomor_hp,
        alamat,
        rt,
        rw,
        kelurahan,
        kecamatan,
        source_input,
        data_form,
        ktp_image_url,
      } = req.body;

      if (!nik || !nama) {
        return res.status(400).json({ success: false, error: 'NIK dan Nama Lengkap wajib diisi.' });
      }

      const result = db.submitEventRegistration(req.params.id, {
        nik,
        nama,
        nomor_hp,
        alamat,
        rt,
        rw,
        kelurahan,
        kecamatan,
        source_input: source_input || 'MANUAL',
        data_form: data_form || {},
        ktp_image_url,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          isDuplicate: result.isDuplicate,
        });
      }

      // Background Sync to Google Sheets Webhook if configured for this event
      const event = db.getEventById(req.params.id);
      if (event?.form_settings?.google_sheet_webhook_url && result.data) {
        const webhookUrl = event.form_settings.google_sheet_webhook_url;
        const reg = result.data;
        // Asynchronous non-blocking fire-and-forget to Google Sheets Webhook
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            event_id: event.id,
            event_name: event.nama,
            registration_id: reg.id,
            nik: `'${reg.nik}`,
            nama: reg.nama,
            nomor_hp: reg.nomor_hp || '',
            alamat: reg.alamat || '',
            rt: reg.rt || '',
            rw: reg.rw || '',
            kelurahan: reg.kelurahan || '',
            kecamatan: reg.kecamatan || 'Jagakarsa',
            role: reg.role_snapshot,
            status: reg.status,
            source: reg.source_input,
            data_form: reg.data_form,
          }),
        }).catch((err) => {
          console.error('[GoogleSheetWebhook] Failed to auto-send row to Google Sheets:', err.message);
        });
      }

      res.status(201).json({ success: true, registration: result.data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Google Sheets Feed / Live CSV Export (Usable directly with =IMPORTDATA in Google Sheets)
  app.get('/api/events/:id/export.csv', (req: Request, res: Response) => {
    try {
      const event = db.getEventById(req.params.id);
      if (!event) return res.status(404).send('Event not found');

      const { items } = db.getEventRegistrations(req.params.id, { limit: 10000 });

      const headers = [
        'Timestamp',
        'ID Registrasi',
        'Nama Lengkap',
        'NIK',
        'Alamat',
        'RT',
        'RW',
        'Kelurahan',
        'Kecamatan',
        'Nomor WhatsApp / HP',
        'Role Peserta',
        'Status Pendaftaran',
        'Metode Pendaftaran',
      ];

      const csvRows = items.map((r) => [
        `"${new Date(r.registration_time || r.created_at).toLocaleString('id-ID')}"`,
        `"${r.id}"`,
        `"${(r.nama || '').replace(/"/g, '""')}"`,
        `"'${r.nik}"`,
        `"${(r.alamat || r.data_form?.alamat || '').replace(/"/g, '""')}"`,
        `"${r.rt || r.data_form?.rt || ''}"`,
        `"${r.rw || r.data_form?.rw || ''}"`,
        `"${(r.kelurahan || r.data_form?.kelurahan || '').replace(/"/g, '""')}"`,
        `"${(r.kecamatan || r.data_form?.kecamatan || 'Jagakarsa').replace(/"/g, '""')}"`,
        `"${r.nomor_hp || ''}"`,
        `"${r.role_snapshot || 'PESERTA'}"`,
        `"${r.status}"`,
        `"${r.source_input}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="tanggapan_${event.nama.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`
      );
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(csvContent);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // Manual Trigger / Test Sync to Google Sheets
  app.post('/api/events/:id/sync-sheets', async (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;

    try {
      const event = db.getEventById(req.params.id);
      if (!event) return res.status(404).json({ error: 'Event tidak ditemukan.' });

      const webhookUrl = req.body.webhook_url || event.form_settings?.google_sheet_webhook_url;
      if (!webhookUrl) {
        return res.status(400).json({ error: 'URL Webhook Google Apps Script belum diisi.' });
      }

      const { items } = db.getEventRegistrations(req.params.id, { limit: 10000 });
      if (items.length === 0) {
        return res.json({
          success: true,
          syncedCount: 0,
          message: 'Belum ada data pendaftar untuk disinkronkan ke Google Sheet.',
        });
      }

      // Send payload to Webhook
      const payload = {
        action: 'BATCH_SYNC',
        event_id: event.id,
        event_name: event.nama,
        timestamp: new Date().toISOString(),
        total_rows: items.length,
        rows: items.map((r) => ({
          timestamp: new Date(r.registration_time || r.created_at).toLocaleString('id-ID'),
          registration_id: r.id,
          nik: `'${r.nik}`,
          nama: r.nama,
          nomor_hp: r.nomor_hp || '',
          alamat: r.alamat || r.data_form?.alamat || '',
          rt: r.rt || r.data_form?.rt || '',
          rw: r.rw || r.data_form?.rw || '',
          kelurahan: r.kelurahan || r.data_form?.kelurahan || '',
          kecamatan: r.kecamatan || r.data_form?.kecamatan || 'Jagakarsa',
          role: r.role_snapshot,
          status: r.status,
          source: r.source_input,
        })),
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      db.addAuditLog(
        'EXPORT_DATA',
        `Sinkronisasi ${items.length} data pendaftar event '${event.nama}' ke Google Sheet via Webhook.`,
        user,
        event.id
      );

      res.json({
        success: true,
        syncedCount: items.length,
        message: `Berhasil mengirim ${items.length} baris data pendaftar ke Google Sheet!`,
        webhookResponseStatus: response.status,
      });
    } catch (err: any) {
      res.status(500).json({ error: `Gagal sinkronisasi ke Google Sheet: ${err.message}` });
    }
  });

  // Get Registrations list for an Event (Admin only)
  app.get('/api/events/:id/registrations', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const { search, status, role, source, page, limit } = req.query as Record<string, string>;
      const result = db.getEventRegistrations(req.params.id, {
        search,
        status,
        role,
        source,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update registration status (Admin only: VALID / DITOLAK / etc)
  app.put('/api/registrations/:id/status', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const { status, rejection_reason } = req.body;
      if (!status) return res.status(400).json({ error: 'Status wajib diisi.' });

      const updated = db.updateRegistrationStatus(req.params.id, status, user, rejection_reason);
      if (!updated) return res.status(404).json({ error: 'Data pendaftaran tidak ditemukan.' });
      res.json({ success: true, registration: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Participant Roles Management (Admin only)
  app.get('/api/participant-roles', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const { search } = req.query as Record<string, string>;
      const roles = db.getParticipantRoles(search);
      res.json({ success: true, roles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/participant-roles', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;
    try {
      const { nik, nama, role, phone, kelurahan, rw } = req.body;
      if (!nik || !role) {
        return res.status(400).json({ error: 'NIK dan Role wajib diisi.' });
      }
      const record = db.setParticipantRole(nik, nama, role, user, { phone, kelurahan, rw });
      res.json({ success: true, roleRecord: record });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get attendance list for specific event
  app.get('/api/events/:id/kehadiran', (req: Request, res: Response) => {
    try {
      const event = db.getEventById(req.params.id);
      if (!event) return res.status(404).json({ error: 'Event tidak ditemukan.' });

      const { kelurahan, rw, rt, status, search } = req.query as Record<string, string>;
      const result = db.getKehadiranByEvent(req.params.id, {
        kelurahan,
        rw,
        rt,
        status,
        search,
      });

      res.json({
        success: true,
        event,
        items: result.items,
        stats: result.stats,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Record attendance check-in for event (volunteer or guest)
  app.post('/api/events/:id/checkin', (req: Request, res: Response) => {
    const user = requireAuthUser(req, res);
    if (!user) return;

    try {
      const {
        nik,
        nama,
        kecamatan,
        kelurahan,
        rw,
        rt,
        status_kehadiran,
        relawan_id,
        id_relawan,
        tps,
        ktp_image_url,
        catatan,
      } = req.body;

      if (!nik || !nama) {
        return res.status(400).json({ error: 'NIK dan Nama wajib diisi untuk check-in.' });
      }

      const checkInResult = db.recordCheckIn(
        req.params.id,
        {
          nik,
          nama,
          kecamatan,
          kelurahan,
          rw,
          rt,
          status_kehadiran: status_kehadiran || 'HADIR',
          relawan_id,
          id_relawan,
          tps,
          ktp_image_url,
          catatan,
        },
        user
      );

      if (checkInResult.isDuplicate) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: checkInResult.message,
          firstCheckIn: checkInResult.firstCheckIn,
        });
      }

      if (!checkInResult.success) {
        return res.status(400).json({
          success: false,
          error: checkInResult.message || 'Gagal melakukan check-in.',
        });
      }

      res.status(201).json({
        success: true,
        data: checkInResult.data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
