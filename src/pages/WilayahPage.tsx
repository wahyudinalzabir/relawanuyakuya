import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MapPin, Building, Home, CheckCircle2, ChevronRight, Layers } from 'lucide-react';
import { PanLogo } from '../components/PanLogo';

export const WilayahPage: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});
  const selectedKecamatan = 'Jagakarsa';
  const [selectedKelurahan, setSelectedKelurahan] = useState<string>('Tanjung Barat');
  const [selectedRw, setSelectedRw] = useState<string>('001');

  useEffect(() => {
    api.getWilayahHierarchy().then((res) => {
      setHierarchy(res.hierarchy || {});
    }).catch(console.error);
  }, []);

  const kelurahans = hierarchy['Jagakarsa'] ? Object.keys(hierarchy['Jagakarsa']) : ['Tanjung Barat', 'Lenteng Agung', 'Jagakarsa', 'Ciganjur', 'Srengseng Sawah', 'Cipedak'];

  useEffect(() => {
    if (kelurahans.length > 0 && !kelurahans.includes(selectedKelurahan)) {
      setSelectedKelurahan(kelurahans[0]);
    }
  }, [kelurahans]);

  const rws =
    hierarchy['Jagakarsa']?.[selectedKelurahan]
      ? Object.keys(hierarchy['Jagakarsa'][selectedKelurahan])
      : [];

  useEffect(() => {
    if (rws.length > 0 && !rws.includes(selectedRw)) {
      setSelectedRw(rws[0]);
    }
  }, [selectedKelurahan, rws]);

  const rts =
    hierarchy['Jagakarsa']?.[selectedKelurahan]?.[selectedRw]
      ? Object.keys(hierarchy['Jagakarsa'][selectedKelurahan][selectedRw])
      : [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Struktur Master Wilayah Jagakarsa</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Kecamatan Jagakarsa
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Daftar 6 Kelurahan, RW, RT, dan sebaran TPS resmi Kecamatan Jagakarsa, Jakarta Selatan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PanLogo size="sm" variant="emblem" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Kolom Kecamatan (Fixed Jagakarsa) */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-xs font-bold text-gray-800">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Kecamatan (Tunggal)</span>
          </div>
          <div className="space-y-1 mt-3">
            <div className="w-full text-left p-3 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Jakarta Selatan</p>
                <p className="text-sm font-black">Kec. Jagakarsa</p>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">6 Kelurahan</span>
            </div>
            <p className="text-[11px] text-slate-500 p-2 leading-relaxed">
              Seluruh pendataan relawan di sistem ini didedikasikan untuk pemenangan wilayah Kecamatan Jagakarsa.
            </p>
          </div>
        </div>

        {/* Kolom Kelurahan */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-xs font-bold text-gray-800">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Kelurahan ({kelurahans.length})</span>
          </div>
          <div className="space-y-1 mt-3">
            {kelurahans.map((kel) => (
              <button
                key={kel}
                onClick={() => setSelectedKelurahan(kel)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  selectedKelurahan === kel
                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Kel. {kel}</span>
                <ChevronRight className={`w-3.5 h-3.5 ${selectedKelurahan === kel ? 'text-blue-600' : 'text-gray-400'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Kolom RW */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-xs font-bold text-gray-800">
            <Home className="w-4 h-4 text-blue-600" />
            <span>Rukun Warga (RW) ({rws.length})</span>
          </div>
          <div className="space-y-1 mt-3">
            {rws.map((rw) => (
              <button
                key={rw}
                onClick={() => setSelectedRw(rw)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  selectedRw === rw
                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>RW {rw}</span>
                <ChevronRight className={`w-3.5 h-3.5 ${selectedRw === rw ? 'text-blue-600' : 'text-gray-400'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Kolom RT & TPS */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-xs font-bold text-gray-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>RT &amp; TPS</span>
          </div>
          <div className="space-y-2 mt-3 overflow-y-auto max-h-96">
            {rts.map((rt) => {
              const tpsList = hierarchy['Jagakarsa']?.[selectedKelurahan]?.[selectedRw]?.[rt] || [];
              return (
                <div key={rt} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <div className="font-bold text-gray-900">RT {rt}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tpsList.map((tps: string) => (
                      <span
                        key={tps}
                        className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] font-semibold text-blue-700"
                      >
                        {tps}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
