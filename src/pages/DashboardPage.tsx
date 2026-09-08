import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { DashboardStats } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Building2,
  MapPin,
  Home,
  CheckCircle2,
  Filter,
  RotateCcw,
  ScanLine,
  FileEdit,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface DashboardPageProps {
  onNavigateToScan: () => void;
  onNavigateToManualInput?: () => void;
  onNavigateToRelawanWithFilter?: (kecamatan?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToScan,
  onNavigateToManualInput,
  onNavigateToRelawanWithFilter,
}) => {
  const { currentUser, isSuperAdmin } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});

  // Cascading filter states
  const filterKecamatan = 'Jagakarsa';
  const [filterKelurahan, setFilterKelurahan] = useState<string>('');
  const [filterRw, setFilterRw] = useState<string>('');
  const [filterRt, setFilterRt] = useState<string>('');
  const [filterTps, setFilterTps] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Fetch hierarchy
  useEffect(() => {
    api.getWilayahHierarchy().then((res) => {
      setHierarchy(res.hierarchy || {});
    }).catch(console.error);
  }, []);

  // Set default filter if user is restricted to Kelurahan or RW
  useEffect(() => {
    if (currentUser?.kelurahan_assigned) {
      setFilterKelurahan(currentUser.kelurahan_assigned);
    }
    if (currentUser?.rw_assigned) {
      setFilterRw(currentUser.rw_assigned);
    }
  }, [currentUser]);

  // Fetch stats whenever filters change
  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats({
        kelurahan: filterKelurahan || undefined,
        rw: filterRw || undefined,
        rt: filterRt || undefined,
        tps: filterTps || undefined,
        status_relawan: filterStatus || undefined,
      });
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [filterKelurahan, filterRw, filterRt, filterTps, filterStatus]);

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

  const handleResetFilters = () => {
    if (!currentUser?.kelurahan_assigned) {
      setFilterKelurahan('');
    }
    if (!currentUser?.rw_assigned) {
      setFilterRw('');
    }
    setFilterRt('');
    setFilterTps('');
    setFilterStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard Relawan</h2>
          <p className="text-xs text-gray-500 mt-1">
            Monitoring rekapitulasi data relawan dan cakupan wilayah secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-quick-manual-input"
            onClick={onNavigateToManualInput || onNavigateToScan}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <FileEdit className="w-4 h-4 text-blue-600" />
            <span>Input Manual</span>
          </button>
          <button
            id="btn-quick-scan-ktp"
            onClick={onNavigateToScan}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan KTP (AI)</span>
          </button>
        </div>
      </div>

      {/* Wilayah & Status Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Wilayah &amp; Status Relawan</span>
          </div>
          {(filterKecamatan || filterKelurahan || filterRw || filterRt || filterTps || filterStatus) && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Kecamatan (Fixed Jagakarsa) */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Kecamatan</label>
            <div className="w-full text-xs font-bold bg-blue-50/80 border border-blue-200 text-blue-900 rounded-lg p-2 flex items-center justify-between">
              <span>Jagakarsa</span>
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">Tunggal</span>
            </div>
          </div>

          {/* Kelurahan */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Kelurahan</label>
            <select
              id="filter-kelurahan"
              value={filterKelurahan}
              disabled={!filterKecamatan}
              onChange={(e) => {
                setFilterKelurahan(e.target.value);
                setFilterRw('');
                setFilterRt('');
                setFilterTps('');
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
            >
              <option value="">Semua Kelurahan</option>
              {kelurahanOptions.map((kel) => (
                <option key={kel} value={kel}>
                  {kel}
                </option>
              ))}
            </select>
          </div>

          {/* RW */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">RW</label>
            <select
              id="filter-rw"
              value={filterRw}
              disabled={!filterKelurahan}
              onChange={(e) => {
                setFilterRw(e.target.value);
                setFilterRt('');
                setFilterTps('');
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
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
            <label className="block text-[11px] font-medium text-gray-600 mb-1">RT</label>
            <select
              id="filter-rt"
              value={filterRt}
              disabled={!filterRw}
              onChange={(e) => {
                setFilterRt(e.target.value);
                setFilterTps('');
              }}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
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
            <label className="block text-[11px] font-medium text-gray-600 mb-1">TPS</label>
            <select
              id="filter-tps"
              value={filterTps}
              disabled={!filterRt}
              onChange={(e) => setFilterTps(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
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
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Status Relawan</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* 8 Metric Cards from Specification #7 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Relawan */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total Relawan</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalRelawan ?? 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Terdaftar dalam sistem</p>
        </div>

        {/* Relawan Aktif */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Aktif</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{stats?.relawanAktif ?? 0}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Siap di lapangan</p>
        </div>

        {/* Relawan Tidak Aktif */}
        <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">Tidak Aktif</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{stats?.relawanTidakAktif ?? 0}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Pindah / berhalangan</p>
        </div>

        {/* Total Kecamatan */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Kecamatan</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalKecamatan ?? 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Cakupan Kecamatan</p>
        </div>

        {/* Total Kelurahan */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Kelurahan</span>
            <MapPin className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalKelurahan ?? 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Kelurahan / Desa</p>
        </div>

        {/* Total RW */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total RW</span>
            <Home className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalRW ?? 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Rukun Warga</p>
        </div>

        {/* Total RT */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total RT</span>
            <Home className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalRT ?? 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Rukun Tetangga</p>
        </div>

        {/* Total TPS */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs text-left">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Total TPS</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats?.totalTPS ?? 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Titik Tempat Pemilihan</p>
        </div>
      </div>

      {/* Chart Section & Summary Table (Requirement #7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart: Jumlah Relawan berdasarkan Kecamatan */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Grafik Jumlah Relawan per Kecamatan</h3>
              <p className="text-xs text-gray-500">Perbandingan Total Relawan vs Relawan Aktif</p>
            </div>
            <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
              Real-time
            </span>
          </div>

          <div className="h-64 w-full">
            {stats && stats.chartData && stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="kecamatan" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="total" name="Total Relawan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aktif" name="Relawan Aktif" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Tidak ada data relawan sesuai filter yang dipilih.
              </div>
            )}
          </div>
        </div>

        {/* Table: Kecamatan | Kelurahan | Relawan | TPS */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Cakupan Wilayah &amp; TPS</h3>
              <p className="text-xs text-gray-500">Rekap per Kelurahan</p>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {stats?.tableData?.length || 0} Kelurahan
            </span>
          </div>

          <div className="flex-1 overflow-x-auto max-h-64 border border-gray-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="p-2.5">Kecamatan</th>
                  <th className="p-2.5">Kelurahan</th>
                  <th className="p-2.5 text-right">Relawan</th>
                  <th className="p-2.5 text-right">TPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats && stats.tableData && stats.tableData.length > 0 ? (
                  stats.tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 font-medium text-gray-800">{row.kecamatan}</td>
                      <td className="p-2.5 text-gray-600">{row.kelurahan}</td>
                      <td className="p-2.5 text-right font-bold text-blue-600">{row.relawanCount}</td>
                      <td className="p-2.5 text-right font-semibold text-gray-700">{row.tpsCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      Data wilayah tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 text-right">
            <button
              onClick={() => onNavigateToRelawanWithFilter && onNavigateToRelawanWithFilter(filterKecamatan)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Lihat Seluruh Daftar Relawan →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
