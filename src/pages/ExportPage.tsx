import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface ExportPageProps {
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const ExportPage: React.FC<ExportPageProps> = ({ addToast }) => {
  const { currentUser, isSuperAdmin } = useAuth();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterValue, setFilterValue] = useState<string>('');
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});
  const [loadingExport, setLoadingExport] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: string[][];
    totalExported: number;
    timestamp: string;
  } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);

  // Load hierarchy
  useEffect(() => {
    api.getWilayahHierarchy().then((res) => {
      setHierarchy(res.hierarchy || {});
    }).catch(console.error);
  }, []);

  // Fetch initial preview
  const fetchExportPreview = async () => {
    setLoadingExport(true);
    try {
      const res = await api.exportGoogleSheets(filterType, filterValue, 'preview');
      setPreviewData(res);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal Membuat Preview', err.message);
    } finally {
      setLoadingExport(false);
    }
  };

  useEffect(() => {
    fetchExportPreview();
  }, [filterType, filterValue]);

  // Handle Download CSV
  const handleDownloadCsv = () => {
    if (!previewData || previewData.rows.length === 0) {
      addToast('warning', 'Tidak Ada Data', 'Tidak ada baris data relawan untuk diekspor.');
      return;
    }

    const csvContent = [
      previewData.headers.join(','),
      ...previewData.rows.map((row) =>
        row
          .map((cell) => {
            const escaped = (cell || '').replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DATA_RELAWAN_${filterType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast(
      'success',
      'Unduhan Berhasil',
      `File CSV berisi ${previewData.totalExported} data relawan siap diimpor ke Google Sheets.`
    );
  };

  const handleCopyGoogleSheetsAppScript = () => {
    const script = `
// Google Apps Script untuk menerima data dari Sistem Pendataan Relawan
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  if (data.rows && data.rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, data.rows.length, data.headers.length).setValues(data.rows);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  }
}
    `.trim();
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    addToast('info', 'Tersalin', 'Kode Google Apps Script Webhook telah disalin ke clipboard.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Ekspor ke Google Sheets</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Format 24 Kolom Standar
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ekspor seluruh atau sebagian data relawan dalam struktur tabel standar Google Sheets &amp; Microsoft Excel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-download-csv"
            onClick={handleDownloadCsv}
            disabled={loadingExport || !previewData?.totalExported}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV untuk Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Filter Ekspor Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Pilih Lingkup / Opsi Ekspor</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Pilih Kriteria Ekspor</label>
            <select
              id="select-export-filter-type"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setFilterValue('');
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-medium"
            >
              <option value="all">Semua Data Relawan</option>
              <option value="kecamatan">Berdasarkan Kecamatan</option>
              <option value="kelurahan">Berdasarkan Kelurahan</option>
              <option value="rw">Berdasarkan RW</option>
              <option value="rt">Berdasarkan RT</option>
              <option value="tps">Berdasarkan TPS</option>
              <option value="status">Berdasarkan Status Relawan</option>
            </select>
          </div>

          {filterType !== 'all' && (
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Nilai Kriteria</label>
              {filterType === 'status' ? (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-medium"
                >
                  <option value="">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                  <option value="Pending">Pending</option>
                </select>
              ) : filterType === 'kecamatan' ? (
                <div className="text-xs p-2 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-lg flex items-center justify-between">
                  <span>Jagakarsa</span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded">Tunggal</span>
                </div>
              ) : filterType === 'kelurahan' ? (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-medium"
                >
                  <option value="">Pilih Kelurahan</option>
                  {['Tanjung Barat', 'Lenteng Agung', 'Jagakarsa', 'Ciganjur', 'Srengseng Sawah', 'Cipedak'].map((kel) => (
                    <option key={kel} value={kel}>
                      Kel. {kel}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={`Masukkan nama/nomor ${filterType}...`}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2"
                />
              )}
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchExportPreview}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingExport ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Integration Guide Box */}
      <div className="bg-emerald-950 text-emerald-100 p-5 rounded-2xl border border-emerald-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Cara Impor Otomatis ke Google Sheets</span>
          </div>
          <p className="text-xs text-emerald-300 max-w-2xl leading-relaxed">
            1. Klik tombol hijau di atas untuk mengunduh file CSV. <br />
            2. Buka spreadsheet baru di Google Sheets (sheets.new) → File → Import → Upload file CSV. <br />
            3. Seluruh 24 kolom terstruktur akan langsung rapi dan siap dianalisis atau dibagikan.
          </p>
        </div>
        <button
          onClick={handleCopyGoogleSheetsAppScript}
          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-600 transition-colors whitespace-nowrap cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Kode Tersalin!' : 'Salin Skrip Webhook'}</span>
        </button>
      </div>

      {/* Preview Table of 24 Columns */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-gray-900">Preview Data yang Akan Diekspor (24 Kolom)</h3>
            <p className="text-xs text-gray-500">
              Total <span className="font-bold text-emerald-700">{previewData?.totalExported || 0}</span> baris relawan
            </p>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {previewData?.timestamp ? new Date(previewData.timestamp).toLocaleTimeString() : ''}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-2.5 text-center bg-gray-100">#</th>
                {previewData?.headers.map((h, i) => (
                  <th key={i} className="p-2.5 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingExport ? (
                <tr>
                  <td colSpan={25} className="p-8 text-center text-gray-400">
                    Mempersiapkan preview ekspor...
                  </td>
                </tr>
              ) : previewData && previewData.rows.length > 0 ? (
                previewData.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-2.5 text-center text-gray-400 font-mono bg-gray-50/50">{rowIdx + 1}</td>
                    {row.map((cell, colIdx) => (
                      <td
                        key={colIdx}
                        className={`p-2.5 ${colIdx === 0 || colIdx === 1 ? 'font-mono font-semibold' : ''}`}
                      >
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={25} className="p-8 text-center text-gray-400">
                    Tidak ada baris relawan yang sesuai dengan filter ekspor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
