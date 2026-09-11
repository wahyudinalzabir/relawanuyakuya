import React, { useState, useRef } from 'react';
import { api } from '../lib/api';
import { parseExcelFile, guessFieldMapping, RELAWAN_FIELDS } from '../lib/excelHelper';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

interface ParsedRowResult {
  rowIndex: number;
  data: Record<string, string>;
  status: 'new' | 'duplicate' | 'invalid';
  reason?: string;
  existingName?: string;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  addToast,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({}); // fieldKey -> excelHeader
  const [validationResults, setValidationResults] = useState<ParsedRowResult[]>([]);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'duplicate' | 'invalid'>('all');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    newCount: number;
    duplicateCount: number;
    invalidCount: number;
    importedCount: number;
    failedCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setFieldMapping({});
    setValidationResults([]);
    setImportSummary(null);
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (
      !selectedFile.name.endsWith('.xlsx') &&
      !selectedFile.name.endsWith('.xls') &&
      !selectedFile.name.endsWith('.csv')
    ) {
      addToast('error', 'Format File Tidak Didukung', 'Silakan unggah file dengan format .xlsx atau .xls.');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const parsed = parseExcelFile(buffer);
      setFile(selectedFile);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Auto-guess column mappings
      const initialMapping: Record<string, string> = {};
      parsed.headers.forEach((h) => {
        const guessed = guessFieldMapping(h);
        if (guessed && !initialMapping[guessed]) {
          initialMapping[guessed] = h;
        }
      });
      setFieldMapping(initialMapping);
      setStep('mapping');
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal Membaca File', err.message || 'File Excel rusak atau tidak dapat dibaca.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Proceed from Mapping to Preview & Validation
  const handleProceedToPreview = async () => {
    // Check required fields
    if (!fieldMapping['nik']) {
      addToast('error', 'Mapping Kolom Kurang', 'Kolom untuk NIK wajib ditentukan.');
      return;
    }
    if (!fieldMapping['nama']) {
      addToast('error', 'Mapping Kolom Kurang', 'Kolom untuk Nama Lengkap wajib ditentukan.');
      return;
    }

    setLoadingCheck(true);
    setStep('preview');

    try {
      // 1. Extract NIKs from rows to check in database
      const nikHeader = fieldMapping['nik'];
      const allNiks = rawRows.map((r) => String(r[nikHeader] || '').trim().replace(/\D/g, ''));
      const uniqueNiks: string[] = Array.from(new Set(allNiks.filter((n) => n.length > 0)));

      // Call bulk-check API
      const checkRes = await api.checkBulkNik(uniqueNiks);
      const existingMap = checkRes.existingMap || {};

      // 2. Validate each row
      const seenNisInFile = new Set<string>();
      const results: ParsedRowResult[] = [];

      rawRows.forEach((r, idx) => {
        const rowMapped: Record<string, string> = {};
        Object.entries(fieldMapping).forEach(([fieldKey, excelHeader]) => {
          const headerKey = String(excelHeader);
          rowMapped[fieldKey] = r[headerKey] !== undefined ? String(r[headerKey]).trim() : '';
        });

        const rawNik = String(rowMapped['nik'] || '').trim().replace(/\D/g, '');
        const rawNama = String(rowMapped['nama'] || '').trim();

        // Validation rule 1: Missing Nama
        if (!rawNama) {
          results.push({
            rowIndex: r._rowIndex || idx + 2,
            data: rowMapped,
            status: 'invalid',
            reason: 'Nama lengkap kosong pada baris ini.',
          });
          return;
        }

        // Validation rule 2: Missing or Invalid NIK
        if (!rawNik) {
          results.push({
            rowIndex: r._rowIndex || idx + 2,
            data: rowMapped,
            status: 'invalid',
            reason: 'NIK kosong atau tidak mengandung angka.',
          });
          return;
        }

        if (rawNik.length !== 16) {
          results.push({
            rowIndex: r._rowIndex || idx + 2,
            data: rowMapped,
            status: 'invalid',
            reason: `Panjang NIK tidak 16 digit (${rawNik.length} digit ditemukan).`,
          });
          return;
        }

        // Validation rule 3: Duplicate in current uploaded file
        if (seenNisInFile.has(rawNik)) {
          results.push({
            rowIndex: r._rowIndex || idx + 2,
            data: rowMapped,
            status: 'duplicate',
            reason: 'NIK ganda dalam file Excel yang diunggah.',
          });
          return;
        }
        seenNisInFile.add(rawNik);

        // Validation rule 4: Already exists in database
        if (existingMap[rawNik]) {
          results.push({
            rowIndex: r._rowIndex || idx + 2,
            data: rowMapped,
            status: 'duplicate',
            reason: `Sudah terdaftar atas nama ${existingMap[rawNik].nama} (${existingMap[rawNik].id_relawan}).`,
            existingName: existingMap[rawNik].nama,
          });
          return;
        }

        // Valid & New
        results.push({
          rowIndex: r._rowIndex || idx + 2,
          data: rowMapped,
          status: 'new',
        });
      });

      setValidationResults(results);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal Memeriksa Data', err.message || 'Terjadi kesalahan saat validasi.');
    } finally {
      setLoadingCheck(false);
    }
  };

  // Perform Final Bulk Import
  const handleExecuteImport = async () => {
    const validItems = validationResults
      .filter((r) => r.status === 'new')
      .map((r) => ({
        ...r.data,
        nik: r.data.nik.replace(/\D/g, ''),
        nama: r.data.nama.toUpperCase(),
        kelurahan: r.data.kelurahan || 'Jagakarsa',
        rw: r.data.rw ? String(r.data.rw).replace(/\D/g, '').padStart(3, '0') : '001',
        rt: r.data.rt ? String(r.data.rt).replace(/\D/g, '').padStart(3, '0') : '001',
        tps: r.data.tps || 'TPS 001',
        status_relawan: r.data.status_relawan || 'Aktif',
      }));

    if (validItems.length === 0) {
      addToast('warning', 'Tidak Ada Data Baru', 'Tidak ada data valid berstatus "Data Baru" untuk disimpan.');
      return;
    }

    setImporting(true);
    try {
      const res = await api.bulkImportRelawan(validItems as any);
      const duplicateCount = validationResults.filter((r) => r.status === 'duplicate').length;
      const invalidCount = validationResults.filter((r) => r.status === 'invalid').length;

      setImportSummary({
        total: validationResults.length,
        newCount: validItems.length,
        duplicateCount,
        invalidCount,
        importedCount: res.importedCount,
        failedCount: res.failedCount,
      });

      setStep('result');
      onSuccess(res.importedCount);
      addToast('success', 'Import Berhasil', `${res.importedCount} data relawan berhasil ditambahkan ke database.`);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Import Gagal', err.message || 'Gagal menyimpan data ke server.');
    } finally {
      setImporting(false);
    }
  };

  const newRowsCount = validationResults.filter((r) => r.status === 'new').length;
  const duplicateRowsCount = validationResults.filter((r) => r.status === 'duplicate').length;
  const invalidRowsCount = validationResults.filter((r) => r.status === 'invalid').length;

  const filteredPreviewRows = validationResults.filter((r) => {
    if (previewFilter === 'all') return true;
    return r.status === previewFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Import Data Relawan dari Excel</h3>
              <p className="text-xs text-gray-500">
                Format file .xlsx / .xls dari Google Form atau dokumen spreadsheet.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                step === 'upload' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              1
            </span>
            <span className={`font-medium ${step === 'upload' ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
              Pilih File
            </span>
          </div>
          <div className="h-0.5 w-8 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                step === 'mapping' ? 'bg-blue-600 text-white' : step === 'preview' || step === 'result' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-500'
              }`}
            >
              2
            </span>
            <span className={`font-medium ${step === 'mapping' ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
              Mapping Kolom
            </span>
          </div>
          <div className="h-0.5 w-8 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                step === 'preview' ? 'bg-blue-600 text-white' : step === 'result' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-500'
              }`}
            >
              3
            </span>
            <span className={`font-medium ${step === 'preview' ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
              Preview &amp; Cek Duplikat
            </span>
          </div>
          <div className="h-0.5 w-8 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                step === 'result' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              4
            </span>
            <span className={`font-medium ${step === 'result' ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
              Selesai
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-gray-800 mb-1">
                  Pilih atau Tarik File Excel ke Sini
                </h4>
                <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                  Mendukung file spreadsheet dengan ekstensi <span className="font-semibold text-gray-700">.xlsx</span> atau <span className="font-semibold text-gray-700">.xls</span> (hasil ekspor Google Form / Sheet).
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs">
                  <span>Pilih Dokumen dari Komputer</span>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-amber-900 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Petunjuk Penting:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-amber-800">
                    <li>Pastikan baris pertama file Excel berisi nama kolom (Header).</li>
                    <li>Sistem mengenali variasi nama kolom (misal: "No. KTP", "Nomor Induk Kependudukan", "No HP", "WhatsApp").</li>
                    <li>Sebelum data disimpan ke database, sistem akan menampilkan preview dan konfirmasi jumlah data.</li>
                    <li>NIK yang sudah terdaftar akan otomatis ditandai sebagai <b>Duplikat</b> dan tidak akan ditambahkan ganda.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING KOLOM */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Sesuaikan Kolom Excel dengan Field Database</h4>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    File: <span className="font-medium text-gray-900">{file?.name}</span> ({rawRows.length} baris terdeteksi)
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-gray-500 hover:text-gray-800 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ganti File</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RELAWAN_FIELDS.map((field) => {
                  const mappedHeader = fieldMapping[field.key] || '';
                  return (
                    <div
                      key={field.key}
                      className={`p-3 rounded-2xl border transition-all ${
                        field.required && !mappedHeader
                          ? 'border-rose-300 bg-rose-50/30'
                          : mappedHeader
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-800">
                          {field.label}
                          {field.required && <span className="text-rose-500 ml-1">*</span>}
                        </span>
                        {mappedHeader ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terpetakan</span>
                          </span>
                        ) : field.required ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            Wajib Dipilih
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Opsional</span>
                        )}
                      </div>

                      <select
                        value={mappedHeader}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFieldMapping((prev) => ({
                            ...prev,
                            [field.key]: val,
                          }));
                        }}
                        className="w-full p-2 border border-gray-300 rounded-xl bg-white text-xs font-medium text-gray-800"
                      >
                        <option value="">-- [ Abaikan Kolom Ini ] --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & CEK DUPLIKAT */}
          {step === 'preview' && (
            <div className="space-y-4">
              {loadingCheck ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="font-bold text-gray-800">Memeriksa Data &amp; Cek Duplikasi NIK...</p>
                  <p className="text-gray-500 text-xs">Memverifikasi seluruh NIK terhadap database relawan aktif.</p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div
                      onClick={() => setPreviewFilter('all')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        previewFilter === 'all'
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-500 text-[11px] block">Total Baris File</span>
                      <span className="text-xl font-black text-gray-900">{validationResults.length}</span>
                    </div>
                    <div
                      onClick={() => setPreviewFilter('new')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        previewFilter === 'new'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40'
                      }`}
                    >
                      <span className="text-emerald-700 text-[11px] font-semibold block">Data Baru (Siap Tambah)</span>
                      <span className="text-xl font-black text-emerald-700">{newRowsCount}</span>
                    </div>
                    <div
                      onClick={() => setPreviewFilter('duplicate')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        previewFilter === 'duplicate'
                          ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                          : 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/40'
                      }`}
                    >
                      <span className="text-amber-700 text-[11px] font-semibold block">Duplikat (Dilewati)</span>
                      <span className="text-xl font-black text-amber-700">{duplicateRowsCount}</span>
                    </div>
                    <div
                      onClick={() => setPreviewFilter('invalid')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        previewFilter === 'invalid'
                          ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                          : 'border-rose-200 bg-rose-50/20 hover:bg-rose-50/40'
                      }`}
                    >
                      <span className="text-rose-700 text-[11px] font-semibold block">Data Bermasalah</span>
                      <span className="text-xl font-black text-rose-700">{invalidRowsCount}</span>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px] sticky top-0">
                          <tr>
                            <th className="p-2.5 pl-3 font-semibold">Baris</th>
                            <th className="p-2.5 font-semibold">Status</th>
                            <th className="p-2.5 font-semibold">NIK</th>
                            <th className="p-2.5 font-semibold">Nama Lengkap</th>
                            <th className="p-2.5 font-semibold">No HP</th>
                            <th className="p-2.5 font-semibold">Kelurahan</th>
                            <th className="p-2.5 font-semibold">RW/RT</th>
                            <th className="p-2.5 pr-3 font-semibold">Catatan / Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700 text-xs">
                          {filteredPreviewRows.length > 0 ? (
                            filteredPreviewRows.map((row) => (
                              <tr
                                key={row.rowIndex}
                                className={`hover:bg-gray-50/80 ${
                                  row.status === 'invalid'
                                    ? 'bg-rose-50/30'
                                    : row.status === 'duplicate'
                                    ? 'bg-amber-50/30'
                                    : ''
                                }`}
                              >
                                <td className="p-2.5 pl-3 font-mono text-gray-500 text-[11px]">#{row.rowIndex}</td>
                                <td className="p-2.5">
                                  {row.status === 'new' && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Data Baru</span>
                                    </span>
                                  )}
                                  {row.status === 'duplicate' && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Duplikat</span>
                                    </span>
                                  )}
                                  {row.status === 'invalid' && (
                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] inline-flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      <span>Bermasalah</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 font-mono font-medium text-gray-900">{row.data.nik || '-'}</td>
                                <td className="p-2.5 font-bold text-gray-900">{row.data.nama || '-'}</td>
                                <td className="p-2.5 font-mono text-gray-600">{row.data.no_hp || '-'}</td>
                                <td className="p-2.5">{row.data.kelurahan || '-'}</td>
                                <td className="p-2.5 font-mono">
                                  {row.data.rw ? `RW ${row.data.rw}` : ''} {row.data.rt ? `RT ${row.data.rt}` : ''}
                                </td>
                                <td className="p-2.5 pr-3 text-gray-500 text-[11px]">
                                  {row.reason || (row.status === 'new' ? 'Siap disimpan' : '-')}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="p-6 text-center text-gray-400">
                                Tidak ada data yang sesuai filter ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {newRowsCount === 0 && (
                    <div className="p-3 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Tidak ada baris yang memenuhi syarat sebagai <b>Data Baru</b>. Seluruh data sudah ada di database atau bermasalah.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 4: RESULT SUMMARY */}
          {step === 'result' && importSummary && (
            <div className="space-y-6 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-gray-900">Proses Import Selesai</h4>
                <p className="text-gray-500 text-xs mt-1">
                  Data relawan telah berhasil dimasukkan ke dalam database sistem.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Total data dalam file:</span>
                  <span className="font-bold text-gray-900">{importSummary.total} baris</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-emerald-700 font-semibold">Berhasil diimport (Data Baru):</span>
                  <span className="font-bold text-emerald-700">{importSummary.importedCount} data</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-amber-700 font-semibold">Duplikat dilewati:</span>
                  <span className="font-bold text-amber-700">{importSummary.duplicateCount} data</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-rose-700 font-semibold">Data bermasalah diabaikan:</span>
                  <span className="font-bold text-rose-700">{importSummary.invalidCount} baris</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div>
            {step === 'mapping' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs hover:bg-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('mapping')}
                disabled={importing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs hover:bg-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ubah Mapping</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'upload' && (
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  onClose();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs hover:bg-white cursor-pointer"
              >
                Tutup
              </button>
            )}

            {step === 'mapping' && (
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lanjut ke Preview &amp; Cek Duplikat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={newRowsCount === 0 || importing || loadingCheck}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Konfirmasi &amp; Simpan ({newRowsCount} Data Baru)</span>
                  </>
                )}
              </button>
            )}

            {step === 'result' && (
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  onClose();
                }}
                className="px-6 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
