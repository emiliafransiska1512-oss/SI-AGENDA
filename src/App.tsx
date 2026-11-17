import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  FileBarChart2,
  Inbox,
  LayoutDashboard,
  Mail,
  Menu,
  Settings,
  Shield,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { BroadcastEmailView } from './components/BroadcastEmailView.tsx';
import { CalendarAgendaView } from './components/CalendarAgendaView.tsx';
import { DashboardView, type NavSection } from './components/DashboardView.tsx';
import { DisposisiView } from './components/DisposisiView.tsx';
import { InsightLaporanView } from './components/InsightLaporanView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { SplitViewVerificationPanel } from './components/SplitViewVerificationModal.tsx';
import { SuratMasukView } from './components/SuratMasukView.tsx';
import { UploadExtractView } from './components/UploadExtractView.tsx';
import type {
  AgendaItem,
  EmailBroadcastLog,
  ManagementBriefResult,
  SystemSettings,
} from './types.ts';

interface NavItem {
  id: NavSection;
  label: string;
  Icon: typeof LayoutDashboard;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'upload', label: 'Unggah & Ekstrak Surat', Icon: Upload },
  { id: 'kalender', label: 'Kalender Agenda', Icon: CalendarDays },
  { id: 'surat', label: 'Daftar Surat Masuk', Icon: Inbox },
  { id: 'disposisi', label: 'Disposisi Pejabat', Icon: UserCheck },
  { id: 'email', label: 'Broadcast Email Dinas', Icon: Mail },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'laporan', label: 'Insight & Laporan', Icon: FileBarChart2 },
  { id: 'pengaturan', label: 'Pengaturan', Icon: Settings },
] as const;

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emblemError, setEmblemError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [broadcastLogs, setBroadcastLogs] = useState<EmailBroadcastLog[]>([]);
  const [briefs, setBriefs] = useState<ManagementBriefResult[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    namaInstansi: 'Kantor Kecamatan Candi',
    kabupaten: 'Pemerintah Kabupaten Sidoarjo',
    alamatKantor: 'Jl. Raya Candi No. 12, Kec. Candi, Kabupaten Sidoarjo',
    namaCamat: 'Camat Candi',
    autoDigestEnabled: true,
    digestTime: '06:30',
    digestRecipients: [],
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'si-agenda.candi@sidoarjokab.go.id',
  });

  const [selectedModalAgendaId, setSelectedModalAgendaId] = useState<
    string | null
  >(null);

  const fetchBootstrap = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Gagal memuat data SI-AGENDA CANDI.');
      const data = await res.json();
      setAgendas(data.agendas || []);
      setBroadcastLogs(data.broadcastLogs || []);
      setBriefs(data.briefs || []);
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal terhubung ke server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBootstrap();
  }, [fetchBootstrap]);

  async function handleCreateAgenda(payload: Partial<AgendaItem>) {
    const res = await fetch('/api/agendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menambah agenda.');
    setAgendas(data.agendas);
  }

  async function handleUpdateAgenda(id: string, patch: Partial<AgendaItem>) {
    const res = await fetch(`/api/agendas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui agenda.');
    setAgendas(data.agendas);
  }

  async function handleDeleteAgenda(id: string) {
    const res = await fetch(`/api/agendas/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus agenda.');
    setAgendas(data.agendas);
    if (selectedModalAgendaId === id) setSelectedModalAgendaId(null);
  }

  async function handleSaveSettings(next: Partial<SystemSettings>) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan.');
    setSettings(data.settings);
  }

  const conflictCount = agendas.filter((a) => a.hasConflict).length;
  const pendingDisposisiCount = agendas.filter(
    (a) => a.status === 'Menunggu Disposisi' || a.status === 'Perlu Review AI'
  ).length;

  const selectedModalAgenda =
    agendas.find((a) => a.id === selectedModalAgendaId) || null;

  const activeNavMeta =
    NAV_ITEMS.find((n) => n.id === activeNav) || NAV_ITEMS[0];

  function selectSection(id: NavSection) {
    setActiveNav(id);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[264px] bg-[#0F294A] text-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Block */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
              {!emblemError ? (
                <img
                  src="/src/assets/images/emblem_kecamatan_candi_1794887982080.jpg"
                  alt="Lambang Kecamatan Candi"
                  referrerPolicy="no-referrer"
                  onError={() => setEmblemError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Shield className="w-6 h-6 text-[#0F294A]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-white truncate">
                SI-AGENDA CANDI
              </div>
              <div className="text-[11px] text-sky-200 truncate">
                Kecamatan Candi · Sidoarjo
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded text-slate-300 hover:text-white"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeNav === id;
            const badgeNum =
              id === 'disposisi'
                ? conflictCount + pendingDisposisiCount
                : id === 'surat'
                  ? agendas.filter((a) => a.status === 'Perlu Review AI').length
                  : 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => selectSection(id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-sky-500/20 text-white border border-sky-400/30'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-sky-300' : 'text-slate-300'
                    }`}
                  />
                  <span className="truncate whitespace-nowrap">{label}</span>
                </span>
                {badgeNum > 0 && (
                  <span
                    className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                      id === 'disposisi' && conflictCount > 0
                        ? 'bg-red-500 text-white font-semibold'
                        : 'bg-white/15 text-sky-100'
                    }`}
                  >
                    {badgeNum}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quiet Institutional Footer */}
        <div className="px-4 py-3.5 border-t border-white/10 text-[11px] text-slate-300 leading-relaxed">
          <div className="font-medium text-white truncate">
            {settings.namaInstansi}
          </div>
          <div className="text-slate-400">Standar Administrasi SPBE · v2.0</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-semibold text-[#0F294A] whitespace-nowrap shrink-0 hidden sm:inline">
                SI-AGENDA CANDI
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavMeta.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => selectSection('upload')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ekstrak Surat</span>
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {errorMsg && (
            <div className="mb-5 p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-3">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => void fetchBootstrap()}
                className="px-3 py-1.5 bg-white border border-red-300 rounded font-medium hover:bg-red-100"
              >
                Muat Ulang
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-36 bg-white border border-slate-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse"
                  />
                ))}
              </div>
              <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
              {activeNav === 'dashboard' && (
                <DashboardView
                  agendas={agendas}
                  settings={settings}
                  onNavigate={selectSection}
                  onSelectAgenda={(item) => setSelectedModalAgendaId(item.id)}
                />
              )}

              {activeNav === 'upload' && (
                <UploadExtractView
                  allAgendas={agendas}
                  onExtracted={(_created, all) => setAgendas(all)}
                  onUpdateAgenda={handleUpdateAgenda}
                />
              )}

              {activeNav === 'kalender' && (
                <CalendarAgendaView
                  agendas={agendas}
                  onSelectAgenda={(item) => setSelectedModalAgendaId(item.id)}
                />
              )}

              {activeNav === 'surat' && (
                <SuratMasukView
                  agendas={agendas}
                  onSelectAgenda={(item) => setSelectedModalAgendaId(item.id)}
                  onCreateAgenda={handleCreateAgenda}
                  onUpdateAgenda={handleUpdateAgenda}
                  onDeleteAgenda={handleDeleteAgenda}
                />
              )}

              {activeNav === 'disposisi' && (
                <DisposisiView
                  agendas={agendas}
                  onUpdateAgenda={handleUpdateAgenda}
                  onSelectAgenda={(item) => setSelectedModalAgendaId(item.id)}
                />
              )}

              {activeNav === 'email' && (
                <BroadcastEmailView
                  settings={settings}
                  broadcastLogs={broadcastLogs}
                  onSent={(logs) => setBroadcastLogs(logs)}
                />
              )}

              {activeNav === 'analytics' && <AnalyticsView agendas={agendas} />}

              {activeNav === 'laporan' && (
                <InsightLaporanView
                  briefs={briefs}
                  settings={settings}
                  onBriefGenerated={(_brief, allBriefs) => setBriefs(allBriefs)}
                />
              )}

              {activeNav === 'pengaturan' && (
                <SettingsView
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Split-View Verification Modal */}
      {selectedModalAgenda && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedModalAgendaId(null);
          }}
        >
          <div className="w-full max-w-6xl">
            <SplitViewVerificationPanel
              item={selectedModalAgenda}
              allAgendas={agendas}
              onSave={handleUpdateAgenda}
              onClose={() => setSelectedModalAgendaId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
