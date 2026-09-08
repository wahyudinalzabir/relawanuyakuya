import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  FileBarChart,
  ChevronRight,
  Layers,
  MapPin,
  Building,
  Home,
  CheckCircle2,
  Users,
  Printer,
  FileSpreadsheet,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

interface DrilldownLevel {
  level: 'kecamatan' | 'kelurahan' | 'rw' | 'rt' | 'tps';
  kecamatan?: string;
  kelurahan?: string;
  rw?: string;
  rt?: string;
  tps?: string;
}

export const LaporanPage: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();

  const [currentLevel, setCurrentLevel] = useState<DrilldownLevel>(() => {
    if (currentUser?.kelurahan_assigned && currentUser?.rw_assigned) {
      return {
        level: 'rt',
        kecamatan: 'Jagakarsa',
        kelurahan: currentUser.kelurahan_assigned,
        rw: currentUser.rw_assigned,
      };
    }
    if (currentUser?.kelurahan_assigned) {
      return {
        level: 'rw',
        kecamatan: 'Jagakarsa',
        kelurahan: currentUser.kelurahan_assigned,
      };
    }
    return {
      level: 'kelurahan',
      kecamatan: 'Jagakarsa',
    };
  });

  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDrilldown = async () => {
    setLoading(true);
    try {
      const res = await api.getDrilldownReport({
        level: currentLevel.level,
        kecamatan: 'Jagakarsa',
        kelurahan: currentLevel.kelurahan,
        rw: currentLevel.rw,
        rt: currentLevel.rt,
        tps: currentLevel.tps,
      });
      setReportData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrilldown();
  }, [currentLevel]);

  // Navigate deeper into hierarchy
  const handleDrilldown = (item: any) => {
    if (currentLevel.level === 'kelurahan') {
      setCurrentLevel({
        ...currentLevel,
        level: 'rw',
        kelurahan: item.name,
      });
    } else if (currentLevel.level === 'rw') {
      setCurrentLevel({
        ...currentLevel,
        level: 'rt',
        rw: item.name,
      });
    } else if (currentLevel.level === 'rt') {
      setCurrentLevel({
        ...currentLevel,
        level: 'tps',
        rt: item.name,
      });
    }
  };

  // Step backwards
  const handleStepBack = () => {
    if (currentLevel.level === 'tps') {
      setCurrentLevel({ ...currentLevel, level: 'rt', rt: undefined });
    } else if (currentLevel.level === 'rt') {
      if (currentUser?.rw_assigned) return; // cannot step back beyond assigned RW
      setCurrentLevel({ ...currentLevel, level: 'rw', rw: undefined });
    } else if (currentLevel.level === 'rw') {
      if (currentUser?.kelurahan_assigned) return; // cannot step back beyond assigned Kelurahan
      setCurrentLevel({ ...currentLevel, level: 'kelurahan', kelurahan: undefined });
    }
  };

  // Calculations for summary stats
  const totalVolunteers = reportData.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const activeVolunteers = reportData.reduce((acc, curr) => acc + (curr.aktif || 0), 0);
  const inactiveVolunteers = reportData.reduce((acc, curr) => acc + (curr.tidakAktif || 0), 0);
  const pendingVolunteers = reportData.reduce((acc, curr) => acc + (curr.pending || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Laporan Rekapitulasi Wilayah</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Drill-down Hierarkis
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Telusuri data relawan dari tingkat Kecamatan, Kelurahan, RW, RT, hingga daftar relawan per TPS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Interactive Breadcrumbs Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mr-1">Hierarki:</span>

        <button
          onClick={() => {
            if (currentUser?.kelurahan_assigned) return;
            setCurrentLevel({
              level: 'kelurahan',
              kecamatan: 'Jagakarsa',
            });
          }}
          className={`font-semibold hover:text-blue-600 transition-colors ${
            currentLevel.level === 'kelurahan' ? 'text-blue-700 underline font-bold' : 'text-gray-600'
          }`}
        >
          Kecamatan Jagakarsa
        </button>

        {currentLevel.kelurahan && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <button
              onClick={() =>
                setCurrentLevel({
                  ...currentLevel,
                  level: 'rw',
                })
              }
              className={`font-semibold hover:text-blue-600 transition-colors ${
                currentLevel.level === 'rw' ? 'text-blue-700 underline font-bold' : 'text-gray-600'
              }`}
            >
              Kel. {currentLevel.kelurahan}
            </button>
          </>
        )}

        {currentLevel.rw && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <button
              onClick={() =>
                setCurrentLevel({
                  ...currentLevel,
                  level: 'rt',
                })
              }
              className={`font-semibold hover:text-blue-600 transition-colors ${
                currentLevel.level === 'rt' ? 'text-blue-700 underline font-bold' : 'text-gray-600'
              }`}
            >
              RW {currentLevel.rw}
            </button>
          </>
        )}

        {currentLevel.rt && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold text-blue-700">RT {currentLevel.rt} (TPS)</span>
          </>
        )}
      </div>

      {/* Summary Stat Cards for this Level */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Relawan</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalVolunteers}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Pada tingkatan ini</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Aktif</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{activeVolunteers}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Siap penugasan</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Tidak Aktif</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{inactiveVolunteers}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Tidak bertugas</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Pending</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingVolunteers}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Dalam verifikasi</p>
        </div>
      </div>

      {/* Drill-down Table View */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentLevel.level !== 'kecamatan' && (
              <button
                onClick={handleStepBack}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 mr-1"
                title="Kembali ke tingkat atas"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-bold text-sm text-gray-900">
              Daftar {currentLevel.level.toUpperCase()}
              {currentLevel.parent ? ` di ${currentLevel.parent}` : ''}
            </h3>
          </div>
          <span className="text-xs text-gray-500">Klik baris untuk melihat rincian lebih dalam (drill-down)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3.5">
                  {currentLevel.level === 'kecamatan' && 'Nama Kecamatan'}
                  {currentLevel.level === 'kelurahan' && 'Nama Kelurahan'}
                  {currentLevel.level === 'rw' && 'Nomor RW'}
                  {currentLevel.level === 'rt' && 'Nomor RT'}
                  {currentLevel.level === 'tps' && 'TPS / Relawan'}
                </th>
                <th className="p-3.5 text-right">Total Relawan</th>
                <th className="p-3.5 text-right">Aktif</th>
                <th className="p-3.5 text-right">Tidak Aktif</th>
                <th className="p-3.5 text-right">Pending</th>
                <th className="p-3.5 text-right">Sub-Wilayah</th>
                <th className="p-3.5 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Memuat data drilldown...
                  </td>
                </tr>
              ) : reportData.length > 0 ? (
                reportData.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => currentLevel.level !== 'tps' && handleDrilldown(row)}
                    className={`transition-colors ${
                      currentLevel.level !== 'tps' ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="p-3.5 font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>{row.name}</span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-blue-600">{row.total}</td>
                    <td className="p-3.5 text-right font-semibold text-emerald-600">{row.aktif}</td>
                    <td className="p-3.5 text-right font-semibold text-rose-600">{row.tidakAktif}</td>
                    <td className="p-3.5 text-right font-semibold text-amber-600">{row.pending}</td>
                    <td className="p-3.5 text-right text-gray-500 font-medium">
                      {currentLevel.level === 'kecamatan' && `${row.subCount} Kelurahan`}
                      {currentLevel.level === 'kelurahan' && `${row.subCount} RW`}
                      {currentLevel.level === 'rw' && `${row.subCount} RT`}
                      {currentLevel.level === 'rt' && `${row.subCount} TPS`}
                      {currentLevel.level === 'tps' && `${row.total} Relawan`}
                    </td>
                    <td className="p-3.5 text-center">
                      {currentLevel.level !== 'tps' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                          Buka Rincian →
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Tingkat Akhir</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Tidak ada data pada tingkatan ini.
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
