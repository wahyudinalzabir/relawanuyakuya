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
import { EventCheckInPage } from './pages/EventCheckInPage';
import { EventManagementPage } from './pages/EventManagementPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { PublicEventRegisterPage } from './pages/PublicEventRegisterPage';
import { Relawan } from './types';
import { PanLogo } from './components/PanLogo';

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedRelawanForDetail, setSelectedRelawanForDetail] = useState<Relawan | null>(null);

  // Event Management states
  const [selectedEventIdForDetail, setSelectedEventIdForDetail] = useState<string | null>(null);
  const [selectedCheckInEventId, setSelectedCheckInEventId] = useState<string | undefined>(undefined);
  const [publicRegisterEventId, setPublicRegisterEventId] = useState<string | null>(() => {
    // Check URL path or query
    const path = window.location.pathname;
    const match = path.match(/^\/events\/([^\/]+)\/register/);
    if (match) return match[1];
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('register_event') || null;
  });

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

  // If public registration URL or view is active, render PublicEventRegisterPage directly
  if (publicRegisterEventId) {
    return (
      <div className="relative">
        {currentUser && (
          <div className="bg-slate-900 border-b border-slate-800 py-2.5 px-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Pratinjau Mode Formulir Publik (Event ID: <strong className="text-white">{publicRegisterEventId}</strong>)
            </span>
            <button
              onClick={() => setPublicRegisterEventId(null)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold"
            >
              Kembali ke Dashboard Admin
            </button>
          </div>
        )}
        <PublicEventRegisterPage
          eventId={publicRegisterEventId}
          onBackToApp={() => setPublicRegisterEventId(null)}
        />
      </div>
    );
  }

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
        onSelectPage={(page) => {
          if (page === 'event-management') {
            setSelectedEventIdForDetail(null);
          }
          setCurrentPage(page);
        }}
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
              onNavigateToCheckIn={() => {
                setSelectedCheckInEventId(undefined);
                setCurrentPage('checkin-event');
              }}
            />
          )}

          {currentPage === 'event-management' && (
            selectedEventIdForDetail ? (
              <EventDetailPage
                eventId={selectedEventIdForDetail}
                onBack={() => setSelectedEventIdForDetail(null)}
                onNavigateToCheckIn={(evtId) => {
                  setSelectedCheckInEventId(evtId);
                  setCurrentPage('checkin-event');
                }}
                onNavigateToPublicRegister={(evtId) => {
                  setPublicRegisterEventId(evtId);
                }}
              />
            ) : (
              <EventManagementPage
                onNavigateToDetail={(evtId) => setSelectedEventIdForDetail(evtId)}
                onNavigateToCheckIn={(evtId) => {
                  setSelectedCheckInEventId(evtId);
                  setCurrentPage('checkin-event');
                }}
                onNavigateToPublicRegister={(evtId) => {
                  setPublicRegisterEventId(evtId);
                }}
              />
            )
          )}

          {currentPage === 'checkin-event' && (
            <EventCheckInPage
              addToast={addToast}
              initialEventId={selectedCheckInEventId}
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
