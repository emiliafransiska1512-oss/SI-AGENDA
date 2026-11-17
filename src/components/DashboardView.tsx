import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  FileSearch,
  MapPin,
  Upload,
  Users,
} from 'lucide-react';
import { LEADERS, type AgendaItem, type SystemSettings } from '../types.ts';
import { formatTanggalId, getTodayStr, StatusBadge } from './StatusBadge.tsx';

export type NavSection =
  | 'dashboard'
  | 'upload'
  | 'kalender'
  | 'surat'
  | 'disposisi'
  | 'email'
  | 'analytics'
  | 'laporan'
  | 'pengaturan';

interface DashboardViewProps {
  agendas: AgendaItem[];
  settings: SystemSettings;
  onNavigate: (section: NavSection) => void;
  onSelectAgenda: (item: AgendaItem) => void;
}

export function DashboardView({
  agendas,
  settings,
  onNavigate,
  onSelectAgenda,
}: DashboardViewProps) {
  const [imgError, setImgError] = useState(false);
  const today = getTodayStr();

  const metrics = useMemo(() => {
    const todayItems = agendas
      .filter((a) => a.tanggal === today)
      .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

    const pendingDisposisi = agendas.filter(
      (a) => a.status === 'Menunggu Disposisi'
    ).length;

    const conflicts = agendas.filter((a) => a.hasConflict);
    const reviewAi = agendas.filter((a) => a.status === 'Perlu Review AI');

    const nowDate = new Date();
    const weekAgo = new Date(nowDate.getTime() - 7 * 86400000);
    const weekAhead = new Date(nowDate.getTime() + 7 * 86400000);
    const incomingThisWeek = agendas.filter((a) => {
      const dt = new Date(`${a.tanggal}T00:00:00`);
      return dt >= weekAgo && dt <= weekAhead;
    }).length;

    const assignedItems = agendas.filter((a) => a.pejabatId);
    const delegatedCount = assignedItems.filter(
      (a) => a.status === 'Diwakilkan'
    ).length;
    const directCount = Math.max(0, assignedItems.length - delegatedCount);
    const directPct =
      assignedItems.length > 0
        ? Math.round((directCount / assignedItems.length) * 100)
        : 0;

    return {
      todayItems,
      pendingDisposisi,
      conflicts,
      reviewAi,
      incomingThisWeek,
      directCount,
      delegatedCount,
      directPct,
    };
  }, [agendas, today]);

  const leaderSummary = useMemo(() => {
    return LEADERS.map((leader) => {
      const todayAssigned = metrics.todayItems.filter((a) => {
        const eff =
          a.status === 'Diwakilkan' && a.diwakilkanKepadaId
            ? a.diwakilkanKepadaId
            : a.pejabatId;
        return eff === leader.id;
      });
      const conflictCount = agendas.filter(
        (a) => a.hasConflict && a.pejabatId === leader.id
      ).length;
      return {
        ...leader,
        todayCount: todayAssigned.length,
        conflictCount,
      };
    });
  }, [agendas, metrics.todayItems]);

  const recentLetters = useMemo(() => {
    return [...agendas]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [agendas]);

  return (
    <div className="space-y-6">
      {/* Executive District Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="lg:col-span-8 p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{settings.kabupaten}</span>
              <span aria-hidden="true">·</span>
              <span>{settings.namaInstansi}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-700 font-medium">
                {formatTanggalId(today)}
              </span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold text-[#0F294A] tracking-tight text-balance">
              Pusat Kendali Agenda Pimpinan & Disposisi Surat Masuk
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Pemantauan jadwal harian Camat, Sekcam, dan lima kepala seksi secara terpusat dengan deteksi bentrok jadwal otomatis serta pengiriman ringkasan pagi pukul 06.30 WIB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah & Ekstrak Surat</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('kalender')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Buka Kalender Pimpinan</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 relative min-h-[180px] bg-[#0F294A]">
          {!imgError ? (
            <img
              src="/src/assets/images/kantor_kecamatan_candi_1794887982659.jpg"
              alt="Gedung Kantor Kecamatan Candi Kabupaten Sidoarjo"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white/90 bg-gradient-to-br from-[#0F294A] to-[#1D4B82]">
              <Building2 className="w-10 h-10 mb-2 opacity-80" />
              <span className="text-xs font-medium text-center">
                {settings.namaInstansi}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08182E]/85 via-[#08182E]/25 to-transparent flex items-end p-4">
            <div className="text-white">
              <div className="text-xs font-semibold">{settings.namaCamat}</div>
              <div className="text-[11px] text-slate-200">
                Camat Candi · 24 Desa Wilayah Kerja
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">
            Agenda Hari Ini
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-[#0F294A]">
              {metrics.todayItems.length}
            </span>
            <span className="text-xs text-slate-500">kegiatan</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Terjadwal pada {formatTanggalId(today)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('disposisi')}
          className="text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-amber-300 transition-colors"
        >
          <div className="text-xs font-medium text-slate-500">
            Menunggu Disposisi
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {metrics.pendingDisposisi}
            </span>
            <span className="text-xs text-amber-700 font-medium">perlu aksi</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Menunggu penunjukan pejabat
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('disposisi')}
          className={`text-left rounded-lg p-4 border transition-colors ${
            metrics.conflicts.length > 0
              ? 'bg-red-50/70 border-red-200 hover:border-red-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div
            className={`text-xs font-medium ${
              metrics.conflicts.length > 0 ? 'text-red-800' : 'text-slate-500'
            }`}
          >
            Bentrok Jadwal
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                metrics.conflicts.length > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {metrics.conflicts.length}
            </span>
            <span
              className={`text-xs font-medium ${
                metrics.conflicts.length > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {metrics.conflicts.length > 0 ? 'risiko tumpang tindih' : 'aman'}
            </span>
          </div>
          <div
            className={`mt-2 text-[11px] ${
              metrics.conflicts.length > 0 ? 'text-red-700' : 'text-slate-500'
            }`}
          >
            Deteksi otomatis lintas pimpinan
          </div>
        </button>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">
            Surat Masuk Minggu Ini
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-sky-700">
              {metrics.incomingThisWeek}
            </span>
            <span className="text-xs text-slate-500">surat aktif</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Rentang ±7 hari berjalan
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">
            Rasio Hadir Langsung
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {metrics.directPct}%
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {metrics.directCount}:{metrics.delegatedCount}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Langsung vs Diwakilkan
          </div>
        </div>
      </section>

      {/* Active Conflict & AI Review Alerts */}
      {(metrics.conflicts.length > 0 || metrics.reviewAi.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {metrics.conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-red-900">
                    Peringatan Bentrok Jadwal Pejabat ({metrics.conflicts.length} Agenda)
                  </h3>
                  <div className="mt-2 space-y-2">
                    {metrics.conflicts.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectAgenda(c)}
                        className="w-full text-left p-2.5 bg-white border border-red-200 rounded-md hover:border-red-400 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-red-900 truncate">
                            {c.pejabatId} · {c.perihal}
                          </span>
                          <span className="font-mono tabular-nums text-red-700 shrink-0">
                            {c.waktuMulai}–{c.waktuSelesai}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          {formatTanggalId(c.tanggal)} · {c.lokasi}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('disposisi')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-800 hover:text-red-950"
                >
                  <span>Kelola Pendelegasian</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {metrics.reviewAi.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <FileSearch className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-amber-950">
                    Dokumen Perlu Review AI ({metrics.reviewAi.length} Surat)
                  </h3>
                  <div className="mt-2 space-y-2">
                    {metrics.reviewAi.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectAgenda(item)}
                        className="w-full text-left p-2.5 bg-white border border-amber-200 rounded-md hover:border-amber-400 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900 truncate">
                            {item.perihal}
                          </span>
                          <span className="font-mono tabular-nums text-amber-800 shrink-0">
                            Akurasi {item.aiConfidence ?? 75}%
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          {item.instansiPengirim} · Klik untuk Split-View Verifikasi
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('surat')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950"
                >
                  <span>Lihat Semua Surat Masuk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Main 2-Column Content */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Today's Schedule */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Jadwal Kegiatan Hari Ini
              </h3>
              <p className="text-xs text-slate-500">
                Kronologi agenda pimpinan Kecamatan Candi ({formatTanggalId(today)})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('kalender')}
              className="text-xs font-medium text-sky-700 hover:text-sky-900 whitespace-nowrap shrink-0"
            >
              Kalender Lengkap
            </button>
          </div>

          {metrics.todayItems.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                Belum ada agenda terjadwal hari ini
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Unggah surat undangan masuk untuk mengekstrak jadwal secara otomatis.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {metrics.todayItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectAgenda(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectAgenda(item);
                    }
                  }}
                  className="p-4 hover:bg-slate-50/90 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  <div className="sm:w-28 shrink-0">
                    <div className="font-mono tabular-nums text-sm font-semibold text-[#0F294A]">
                      {item.waktuMulai} – {item.waktuSelesai}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">WIB</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                        {item.perihal}
                      </h4>
                      <StatusBadge status={item.status} compact />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.lokasi}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.desaWilayah}</span>
                      <span aria-hidden="true">·</span>
                      <span>Pakaian: {item.pakaian}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-500">Pejabat:</span>
                      <span className="font-medium text-slate-800">
                        {item.pejabatId || 'Belum Didisposisi'}
                        {item.status === 'Diwakilkan' && item.diwakilkanKepadaId
                          ? ` → Diwakilkan ke ${item.diwakilkanKepadaId}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Leadership Matrix & Recent Incoming */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F294A]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Kesiapan Pejabat Struktural Hari Ini
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('disposisi')}
                className="text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                Atur Disposisi
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {leaderSummary.map((leader) => (
                <div
                  key={leader.id}
                  className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      {leader.id}
                    </div>
                    <div className="text-slate-500 truncate">{leader.nama}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {leader.conflictCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-medium">
                        {leader.conflictCount} Bentrok
                      </span>
                    )}
                    <span className="font-mono tabular-nums text-slate-700 font-medium">
                      {leader.todayCount} agenda
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Surat Masuk Terbaru
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('surat')}
                className="text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                Semua Surat
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentLetters.map((letter) => (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => onSelectAgenda(letter)}
                  className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums text-[11px] text-slate-500">
                      {letter.nomorSurat}
                    </span>
                    <StatusBadge status={letter.status} compact />
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-900 line-clamp-1">
                    {letter.perihal}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                    {letter.instansiPengirim} · {formatTanggalId(letter.tanggal)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
