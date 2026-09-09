import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PanLogo } from '../components/PanLogo';
import { Shield, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Harap isi username dan kata sandi.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await login(username.trim(), password.trim());
    setLoading(false);

    if (res.success) {
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setErrorMessage(res.error || 'Username atau kata sandi tidak cocok.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/20 shadow-2xl mb-3">
            <PanLogo size="lg" variant="emblem" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            PARTAI AMANAT NASIONAL
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
            Sistem Pendataan Relawan
          </h1>
          <p className="mt-1 text-sm font-medium text-blue-200">
            DPC &amp; Koordinator Kecamatan Jagakarsa
          </p>
          <p className="text-xs text-blue-300/70">
            Kota Jakarta Selatan, DKI Jakarta
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-800 border border-slate-100">
          <div className="border-b border-slate-100 pb-4 mb-5 text-center">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Portal Wilayah</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan akun resmi Korcam, Ketua DPC, Korkel, atau KorWe
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username Akun
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center justify-center gap-2 text-center">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Portal Khusus Pengurus &amp; Koordinator Terdaftar</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-blue-200/60">
          <p>© 2025 Dewan Pimpinan Cabang (DPC) PAN Kecamatan Jagakarsa</p>
          <p className="mt-0.5">Mencakup 6 Kelurahan: Tanjung Barat, Lenteng Agung, Jagakarsa, Ciganjur, Srengseng Sawah, Cipedak</p>
        </div>
      </div>
    </div>
  );
};
