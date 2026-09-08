import React, { useState } from 'react';
import { Settings, Shield, Sparkles, Database, FileSpreadsheet, Server, Check, Copy } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [copiedEnv, setCopiedEnv] = useState(false);

  const envSample = `GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=production`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Pengaturan &amp; Panduan Sistem</h2>
        <p className="text-xs text-gray-500 mt-1">
          Dokumentasi teknis, konfigurasi API Gemini Vision, dan arsitektur Sistem Pendataan Relawan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gemini Vision Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>Konfigurasi Gemini Vision (OCR)</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Sistem menggunakan model <span className="font-bold text-gray-800">gemini-2.5-flash</span> melalui SDK resmi{' '}
            <span className="font-mono text-blue-600">@google/genai</span> di sisi server (backend). Kunci API tersimpan aman di server dan tidak pernah terpapar ke sisi browser (klien).
          </p>

          <div className="bg-slate-900 rounded-xl p-3 text-slate-200 text-xs font-mono relative">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800 text-[10px] text-slate-400">
              <span>.env</span>
              <button onClick={handleCopy} className="hover:text-white flex items-center gap-1 cursor-pointer">
                {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEnv ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <pre className="text-emerald-400">{envSample}</pre>
          </div>
        </div>

        {/* Database & Anti-Duplicate Rule */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Database className="w-5 h-5 text-blue-600" />
            <span>Integritas Database &amp; NIK Unik</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Setiap relawan memiliki pengenal unik berbasis <span className="font-bold text-gray-800">NIK (16 digit)</span>. Sistem secara otomatis melakukan validasi sebelum penyimpanan; jika NIK sudah pernah dicatat, sistem akan memblokir duplikasi dan mengarahkan operator ke tombol <span className="font-semibold text-rose-600">[Lihat Data Lama]</span>.
          </p>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
            <p className="font-bold">Karakteristik Data Relasional:</p>
            <p className="text-[11px]">Tabel Relawan terhubung hierarkis dengan Master Wilayah (Kecamatan → Kelurahan → RW → RT → TPS) dan tercatat di tabel Audit Log.</p>
          </div>
        </div>

        {/* Hak Akses Pengguna (RBAC) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Shield className="w-5 h-5 text-purple-600" />
            <span>Matriks Peran (Role-Based Access Control)</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
              <span className="font-bold text-purple-900">1. Super Admin:</span>
              <p className="text-gray-600 text-[11px] mt-0.5">Akses ke semua data relawan di seluruh wilayah, manajemen user, hapus data, dan ekspor penuh.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
              <span className="font-bold text-blue-900">2. Admin Kecamatan:</span>
              <p className="text-gray-600 text-[11px] mt-0.5">Akses terbatas hanya pada data relawan di kecamatan yang ditugaskan kepadanya.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <span className="font-bold text-emerald-900">3. Operator:</span>
              <p className="text-gray-600 text-[11px] mt-0.5">Khusus input scan KTP, verifikasi, dan entry data baru. Dilarang menghapus data atau mengelola user.</p>
            </div>
          </div>
        </div>

        {/* Google Sheets Export */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Ekspor Google Sheets (24 Kolom)</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Format file ekspor mencakup 24 kolom lengkap kependudukan dan penugasan relawan, kompatibel langsung dengan fungsi <span className="font-mono font-bold text-gray-800">File &gt; Import</span> pada Google Sheets maupun integrasi REST Webhook.
          </p>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-900">
            <p className="font-bold">Kecepatan &amp; Produktivitas Operator:</p>
            <p className="text-[11px] mt-0.5">Pencarian kilat berdasarkan NIK / Nama dan filter berjenjang otomatis memangkas waktu kerja di posko.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
