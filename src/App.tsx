import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/Toast';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ScanKtpPage } from './pages/ScanKtpPage';
import { RelawanListPage } from './pages/RelawanListPage';
import { LaporanPage } from './pages/LaporanPage';
import { ExportPage } from './pages/ExportPage';
import { WilayahPage } from './pages/WilayahPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { Relawan } from './types';
import { PanLogo } from './components/PanLogo';

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedRelawanForDetail, setSelectedRelawanForDetail] = useState<Relawan | null>(null);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Navigation callbacks
  const handleNavigateToScan = () => {
    setCurrentPage('scan-ktp');
  };

  const handleNavigateToManual = () => {
    setCurrentPage('input-manual');
  };

  const handleSuccessSaveRelawan = (relawan: Relawan) => {
    setSelectedRelawanForDetail(relawan);
    setCurrentPage('relawan');
  };

  const handleViewExistingRelawan = (relawan: Relawan) => {
    setSelectedRelawanForDetail(relawan);
    setCurrentPage('relawan');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/20 shadow-2xl mb-4 animate-pulse">
          <PanLogo size="lg" variant="emblem" />
        </div>
        <div className="w-8 h-8 border-3 border-blue-500 border-t-white rounded-full animate-spin mb-3" />
        <p className="text-white font-bold text-sm tracking-wide">SISTEM PENDATAAN RELAWAN PAN</p>
        <p className="text-blue-300 text-xs mt-0.5">Memeriksa sesi login Kecamatan Jagakarsa...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <LoginPage onLoginSuccess={() => setCurrentPage('dashboard')} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {currentPage === 'dashboard' && (
            <DashboardPage
              onNavigateToScan={handleNavigateToScan}
              onNavigateToManualInput={handleNavigateToManual}
              onNavigateToRelawanWithFilter={(kecamatan) => {
                setCurrentPage('relawan');
              }}
            />
          )}

          {currentPage === 'scan-ktp' && (
            <ScanKtpPage
              initialMode="scan"
              onSuccessSave={handleSuccessSaveRelawan}
              onViewExisting={handleViewExistingRelawan}
              onCancel={() => setCurrentPage('dashboard')}
              addToast={addToast}
            />
          )}

          {currentPage === 'input-manual' && (
            <ScanKtpPage
              initialMode="manual"
              onSuccessSave={handleSuccessSaveRelawan}
              onViewExisting={handleViewExistingRelawan}
              onCancel={() => setCurrentPage('dashboard')}
              addToast={addToast}
            />
          )}

          {currentPage === 'relawan' && (
            <RelawanListPage
              onNavigateToScan={handleNavigateToScan}
              onNavigateToManualInput={handleNavigateToManual}
              selectedRelawanForDetail={selectedRelawanForDetail}
              addToast={addToast}
            />
          )}

          {currentPage === 'laporan' && <LaporanPage />}

          {currentPage === 'export' && <ExportPage addToast={addToast} />}

          {currentPage === 'wilayah' && <WilayahPage />}

          {currentPage === 'manajemen-user' && <UserManagementPage addToast={addToast} />}

          {currentPage === 'audit-log' && <AuditLogPage />}

          {currentPage === 'pengaturan' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
