import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../lib/api';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchAccount: (username: string, password: string) => Promise<void>;
  isKetuaDpc: boolean;
  isKorcam: boolean;
  isKorkel: boolean;
  isKorWe: boolean;
  canManageAdmins: boolean;
  assignedKecamatan: string;
  assignedKelurahan?: string;
  assignedRw?: string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setCurrentUser(null);
        return;
      }
      const res = await api.getMe();
      setCurrentUser(res.user);
    } catch (err) {
      console.error('Failed to get current user:', err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.login(username, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Gagal melakukan login.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Username atau password salah.' };
    }
  };

  const switchAccount = async (username: string, password: string) => {
    await login(username, password);
  };

  const logout = () => {
    clearAuthToken();
    setCurrentUser(null);
  };

  const isKetuaDpc = currentUser?.role === 'Ketua DPC';
  const isKorcam = currentUser?.role === 'Korcam';
  const isKorkel = currentUser?.role === 'Korkel';
  const isKorWe = currentUser?.role === 'KorWe';
  const canManageAdmins = isKetuaDpc || isKorcam;
  const assignedKecamatan = 'Jagakarsa';
  const assignedKelurahan = currentUser?.kelurahan_assigned;
  const assignedRw = currentUser?.rw_assigned;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        logout,
        switchAccount,
        isKetuaDpc,
        isKorcam,
        isKorkel,
        isKorWe,
        canManageAdmins,
        assignedKecamatan,
        assignedKelurahan,
        assignedRw,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
