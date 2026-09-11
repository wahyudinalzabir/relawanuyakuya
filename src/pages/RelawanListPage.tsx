import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Relawan, StatusRelawan } from '../types';
import { useAuth } from '../context/AuthContext';
import { exportRelawanToExcel } from '../lib/excelHelper';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { RelawanDetailModal } from '../components/RelawanDetailModal';
import {
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  ScanLine,
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  Shield,
  FileText,
  Lock,
  FileEdit,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

interface RelawanListPageProps {
  onNavigateToScan: () => void;
  onNavigateToManualInput?: () => void;
  selectedRelawanForDetail?: Relawan | null;
  addToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const RelawanListPage: React.FC<RelawanListPageProps> = ({
  onNavigateToScan,
  onNavigateToManualInput,
  selectedRelawanForDetail,
  addToast,
}) => {
  const { currentUser, isSuperAdmin, isOperator } = useAuth();

  // Data list states
  const [items, setItems] = useState<Relawan[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Search & Filter states
  const [search, setSearch] = useState<string>('');
  const filterKecamatan = 'Jagakarsa';
  const [filterKelurahan, setFilterKelurahan] = useState<string>('');
  const [filterRw, setFilterRw] = useState<string>('');
  const [filterRt, setFilterRt] = useState<string>('');
  const [filterTps, setFilterTps] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<keyof Relawan>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Hierarchy for cascading filter dropdowns
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});

  // Sync role assignment
  useEffect(() => {
    if (currentUser?.kelurahan_assigned) {
      setFilterKelurahan(currentUser.kelurahan_assigned);
    }
    if (currentUser?.rw_assigned) {
      setFilterRw(currentUser.rw_assigned);
    }
  }, [currentUser]);

  // Modals
  const [detailModalItem, setDetailModalItem] = useState<Relawan | null>(null);
  const [editModalItem, setEditModalItem] = useState<Relawan | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Relawan | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [showNikFull, setShowNikFull] = useState<boolean>(false);

  // Open detail if passed via props
  useEffect(() => {
    if (selectedRelawanForDetail) {
      setDetailModalItem(selectedRelawanForDetail);
    }
  }, [selectedRelawanForDetail]);

  // Load hierarchy
  useEffect(() => {
    api.getWilayahHierarchy().then((res) => {
      setHierarchy(res.hierarchy || {});
    }).catch(console.error);
  }, []);

  // Export Excel matching active filters
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Fetch all items matching the current filter (limit 10000)
      const res = await api.getRelawan({
        search,
        kecamatan: filterKecamatan || undefined,
        kelurahan: filterKelurahan || undefined,
        rw: filterRw || undefined,
        rt: filterRt || undefined,
        tps: filterTps || undefined,
        status_relawan: filterStatus || undefined,
        page: 1,
        limit: 10000,
        sortBy,
        sortOrder,
      });

      if (!res.items || res.items.length === 0) {
        addToast('warning', 'Tidak Ada Data', 'Tidak ada data relawan yang cocok dengan filter untuk diekspor.');
        return;
      }

      const cleanKel = filterKelurahan ? `_${filterKelurahan.replace(/\s+/g, '_')}` : '';
      const cleanRw = filterRw ? `_RW${filterRw}` : '';
      const filename = `DATA_RELAWAN_JAGAKARSA${cleanKel}${cleanRw}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      exportRelawanToExcel(res.items, filename);
      addToast(
        'success',
        'Export Excel Berhasil',
        `${res.items.length} data relawan berhasil diexport ke file Excel (.xlsx).`
      );
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal Ekspor Excel', err.message || 'Terjadi kesalahan saat mengunduh file Excel.');
    } finally {
      setExporting(false);
    }
  };

  // Fetch volunteers
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getRelawan({
        search,
        kecamatan: filterKecamatan || undefined,
        kelurahan: filterKelurahan || undefined,
        rw: filterRw || undefined,
        rt: filterRt || undefined,
        tps: filterTps || undefined,
        status_relawan: filterStatus || undefined,
        page,
        limit: 10,
        sortBy,
        sortOrder,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
      addToast('error', 'Gagal Mengambil Data', 'Gagal memuat daftar relawan dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, filterKecamatan, filterKelurahan, filterRw, filterRt, filterTps, filterStatus, page, sortBy, sortOrder]);

  // Cascading options
  const kelurahanOptions = useMemo(() => {
    if (currentUser?.kelurahan_assigned) {
      return [currentUser.kelurahan_assigned];
    }
    if (!hierarchy['Jagakarsa']) return ['Tanjung Barat', 'Lenteng Agung', 'Jagakarsa', 'Ciganjur', 'Srengseng Sawah', 'Cipedak'];
    return Object.keys(hierarchy['Jagakarsa']);
  }, [hierarchy, currentUser]);

  const rwOptions = useMemo(() => {
    if (currentUser?.rw_assigned) {
      return [currentUser.rw_assigned];
    }
    if (!filterKelurahan || !hierarchy['Jagakarsa']?.[filterKelurahan]) return [];
    return Object.keys(hierarchy['Jagakarsa'][filterKelurahan]);
  }, [hierarchy, filterKelurahan, currentUser]);

  const rtOptions = useMemo(() => {
    if (!filterKelurahan || !filterRw || !hierarchy['Jagakarsa']?.[filterKelurahan]?.[filterRw]) return [];
    return Object.keys(hierarchy['Jagakarsa'][filterKelurahan][filterRw]);
  }, [hierarchy, filterKelurahan, filterRw]);

  const tpsOptions = useMemo(() => {
    if (!filterKelurahan || !filterRw || !filterRt || !hierarchy['Jagakarsa']?.[filterKelurahan]?.[filterRw]?.[filterRt]) return [];
    return hierarchy['Jagakarsa'][filterKelurahan][filterRw][filterRt];
  }, [hierarchy, filterKelurahan, filterRw, filterRt]);

  // Sorting handler
  const handleSort = (field: keyof Relawan) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Delete Action
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.deleteRelawan(deleteConfirmItem.id);
      addToast('success', 'Relawan Dihapus', `Data relawan '${deleteConfirmItem.nama}' berhasil dihapus.`);
      setDeleteConfirmItem(null);
      loadData();
    } catch (err: any) {
      addToast('error', 'Gagal Menghapus', err.message || 'Anda tidak memiliki hak untuk menghapus data ini.');
    }
  };

  // Update Action
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem) return;
    try {
      await api.updateRelawan(editModalItem.id, editModalItem);
      addToast('success', 'Data Diperbarui', `Data relawan '${editModalItem.nama}' berhasil diperbarui.`);
      setEditModalItem(null);
      loadData();
    } catch (err: any) {
      addToast('error', 'Gagal Memperbarui', err.message || 'Terjadi kesalahan saat memperbarui.');
    }
  };

  // Mask NIK for security
  const formatNik = (nik: string) => {
    if (!nik) return '-';
    if (showNikFull) return nik;
    if (nik.length <= 8) return nik;
    return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Data Relawan Jagakarsa</h2>
          <p className="text-xs text-gray-500 mt-1">
            Daftar lengkap relawan terverifikasi. Dilengkapi fitur Export/Import Excel, edit profil, dan filter wilayah bertingkat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* NIK Masking Toggle */}
          <button
            onClick={() => setShowNikFull(!showNikFull)}
            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sembunyikan / Tampilkan NIK Lengkap"
          >
            {showNikFull ? <Lock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showNikFull ? 'Masking NIK' : 'NIK Lengkap'}</span>
          </button>

          {/* Export to Excel Button */}
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            disabled={exporting}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Ekspor data relawan aktif ke format file Microsoft Excel (.xlsx)"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>{exporting ? 'Mengekspor...' : 'Export Excel (.xlsx)'}</span>
          </button>

          {/* Import from Excel Button */}
          <button
            id="btn-import-excel"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Impor data relawan dari file Excel (.xlsx / .xls)"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-700" />
            <span>Import Excel</span>
          </button>

          {/* Input Manual */}
          <button
            id="btn-add-relawan-manual"
            onClick={() => onNavigateToManualInput ? onNavigateToManualInput() : onNavigateToScan()}
            className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <FileEdit className="w-4 h-4 text-blue-600" />
            <span>Input Manual</span>
          </button>

          {/* Scan KTP */}
          <button
            id="btn-add-relawan-scan"
            onClick={onNavigateToScan}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan KTP</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Container */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-relawan"
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari berdasarkan NIK, Nama Relawan, atau ID Relawan..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Cascading Filter Wilayah & Status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Kecamatan (Fixed Jagakarsa) */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Kecamatan</label>
            <div className="w-full text-xs font-bold p-2 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-lg flex items-center justify-between">
              <span>Jagakarsa</span>
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">Tunggal</span>
            </div>
          </div>

          {/* Kelurahan */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Kelurahan</label>
            <select
              value={filterKelurahan}
              disabled={!filterKecamatan}
              onChange={(e) => {
                setFilterKelurahan(e.target.value);
                setFilterRw('');
                setFilterRt('');
                setFilterTps('');
                setPage(1);
              }}
              className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kelurahan</option>
              {kelurahanOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* RW */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">RW</label>
            <select
              value={filterRw}
              disabled={!filterKelurahan}
              onChange={(e) => {
                setFilterRw(e.target.value);
                setFilterRt('');
                setFilterTps('');
                setPage(1);
              }}
              className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua RW</option>
              {rwOptions.map((rw) => (
                <option key={rw} value={rw}>
                  RW {rw}
                </option>
              ))}
            </select>
          </div>

          {/* RT */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">RT</label>
            <select
              value={filterRt}
              disabled={!filterRw}
              onChange={(e) => {
                setFilterRt(e.target.value);
                setFilterTps('');
                setPage(1);
              }}
              className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua RT</option>
              {rtOptions.map((rt) => (
                <option key={rt} value={rt}>
                  RT {rt}
                </option>
              ))}
            </select>
          </div>

          {/* TPS */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">TPS</label>
            <select
              value={filterTps}
              disabled={!filterRt}
              onChange={(e) => {
                setFilterTps(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua TPS</option>
              {tpsOptions.map((tps) => (
                <option key={tps} value={tps}>
                  {tps}
                </option>
              ))}
            </select>
          </div>

          {/* Status Relawan */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table (Requirement #9) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th
                  onClick={() => handleSort('id_relawan')}
                  className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ID Relawan</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nik')}
                  className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>NIK</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nama')}
                  className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Lengkap</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3.5">Kecamatan</th>
                <th className="p-3.5">Kelurahan</th>
                <th className="p-3.5">RW/RT</th>
                <th className="p-3.5">TPS</th>
                <th className="p-3.5">Status</th>
                <th
                  onClick={() => handleSort('tanggal_input')}
                  className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal Input</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    Memuat data relawan...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((row) => {
                  const statusBadges: Record<StatusRelawan, string> = {
                    Aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'Tidak Aktif': 'bg-rose-50 text-rose-700 border-rose-200',
                    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
                  };

                  return (
                    <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-gray-900">{row.id_relawan}</td>
                      <td className="p-3.5 font-mono text-gray-700 font-semibold">{formatNik(row.nik)}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => setDetailModalItem(row)}
                          className="text-left font-bold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors block"
                          title="Klik untuk melihat profil detail relawan"
                        >
                          {row.nama}
                        </button>
                        {row.no_hp && (
                          <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                            WA/HP: {row.no_hp}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-700">{row.kecamatan}</td>
                      <td className="p-3.5 text-gray-600">{row.kelurahan}</td>
                      <td className="p-3.5 text-gray-600 font-mono">
                        {row.rw}/{row.rt}
                      </td>
                      <td className="p-3.5 font-semibold text-blue-600">{row.tps}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusBadges[row.status_relawan]}`}>
                          {row.status_relawan}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-500 whitespace-nowrap">{row.tanggal_input}</td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            id={`btn-view-${row.id}`}
                            onClick={() => setDetailModalItem(row)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-edit-${row.id}`}
                            onClick={() => setEditModalItem({ ...row })}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit Data Relawan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isOperator && (
                            <button
                              id={`btn-delete-${row.id}`}
                              onClick={() => setDeleteConfirmItem(row)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Relawan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    Tidak ada relawan yang cocok dengan pencarian atau filter wilayah.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-800">{items.length}</span> dari{' '}
            <span className="font-semibold text-gray-800">{total}</span> total relawan
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
            <span className="px-2 font-medium text-gray-700">
              Halaman {page} dari {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: DETAIL RELAWAN (High Quality Modal with Print & Full Profile) */}
      <RelawanDetailModal
        isOpen={!!detailModalItem}
        relawan={detailModalItem}
        onClose={() => setDetailModalItem(null)}
        onEdit={(r) => {
          setDetailModalItem(null);
          setEditModalItem({ ...r });
        }}
      />

      {/* MODAL 2: EDIT RELAWAN (Lengkap KTP & Kontak) */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900">Edit Data Relawan</h3>
                <p className="text-xs text-gray-500 font-mono">
                  ID: <span className="font-bold text-blue-600">{editModalItem.id_relawan}</span>
                </p>
              </div>
              <button
                onClick={() => setEditModalItem(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={editModalItem.nama}
                    onChange={(e) => setEditModalItem({ ...editModalItem, nama: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">NIK (16 Digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={editModalItem.nik}
                    onChange={(e) => setEditModalItem({ ...editModalItem, nik: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={editModalItem.no_hp || ''}
                    onChange={(e) => setEditModalItem({ ...editModalItem, no_hp: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Kelurahan</label>
                  <select
                    value={editModalItem.kelurahan}
                    onChange={(e) => setEditModalItem({ ...editModalItem, kelurahan: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-semibold bg-white"
                  >
                    {['Jagakarsa', 'Cipedak', 'Lenteng Agung', 'Ciganjur', 'Srengseng Sawah', 'Tanjung Barat'].map((kel) => (
                      <option key={kel} value={kel}>{kel}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    readOnly
                    value={editModalItem.kecamatan || 'Jagakarsa'}
                    className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-600 font-semibold cursor-not-allowed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">RW (3 Digit)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editModalItem.rw}
                      onChange={(e) => setEditModalItem({ ...editModalItem, rw: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-mono"
                      placeholder="001"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">RT (3 Digit)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editModalItem.rt}
                      onChange={(e) => setEditModalItem({ ...editModalItem, rt: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-mono"
                      placeholder="001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">TPS (Contoh: 001)</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={editModalItem.tps}
                    onChange={(e) => setEditModalItem({ ...editModalItem, tps: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Status Relawan</label>
                  <select
                    value={editModalItem.status_relawan}
                    onChange={(e) =>
                      setEditModalItem({ ...editModalItem, status_relawan: e.target.value as StatusRelawan })
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-semibold bg-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Koordinator</label>
                  <input
                    type="text"
                    value={editModalItem.koordinator || ''}
                    onChange={(e) => setEditModalItem({ ...editModalItem, koordinator: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                    placeholder="Nama Koordinator Lapangan"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Alamat KTP Lengkap</label>
                  <input
                    type="text"
                    value={editModalItem.alamat}
                    onChange={(e) => setEditModalItem({ ...editModalItem, alamat: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={editModalItem.tempat_lahir || ''}
                    onChange={(e) => setEditModalItem({ ...editModalItem, tempat_lahir: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="text"
                    placeholder="DD-MM-YYYY"
                    value={editModalItem.tanggal_lahir || ''}
                    onChange={(e) => setEditModalItem({ ...editModalItem, tanggal_lahir: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={editModalItem.jenis_kelamin || ''}
                    onChange={(e) => setEditModalItem({ ...editModalItem, jenis_kelamin: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                  >
                    <option value="">Pilih</option>
                    <option value="LAKI-LAKI">LAKI-LAKI</option>
                    <option value="PEREMPUAN">PEREMPUAN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Pekerjaan</label>
                  <input
                    type="text"
                    value={editModalItem.pekerjaan || ''}
                    onChange={(e) => setEditModalItem({ ...editModalItem, pekerjaan: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Keterangan Tambahan</label>
                  <textarea
                    rows={2}
                    value={editModalItem.keterangan || ''}
                    onChange={(e) => setEditModalItem({ ...editModalItem, keterangan: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                    placeholder="Catatan relawan / catatan TPS"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION DIALOG */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Konfirmasi Hapus Data</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus data relawan{' '}
                <span className="font-bold text-gray-900">{deleteConfirmItem.nama}</span> (NIK: {deleteConfirmItem.nik})?
                Data akan dipindahkan ke status terhapus (soft-delete) dan dicatat dalam audit log sistem.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: IMPORT EXCEL WIZARD */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        addToast={addToast}
      />
    </div>
  );
};
