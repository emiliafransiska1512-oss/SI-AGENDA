import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  ALL_STATUSES,
  LEADERS,
  type AgendaItem,
  type AgendaStatus,
  type LeaderRole,
} from '../types.ts';
import { formatTanggalId, getTodayStr, StatusBadge } from './StatusBadge.tsx';

interface CalendarAgendaViewProps {
  agendas: AgendaItem[];
  onSelectAgenda: (item: AgendaItem) => void;
}

type CalendarMode = 'harian' | 'mingguan' | 'bulanan';

function formatYmd(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function CalendarAgendaView({
  agendas,
  onSelectAgenda,
}: CalendarAgendaViewProps) {
  const [mode, setMode] = useState<CalendarMode>('mingguan');
  const [anchorDate, setAnchorDate] = useState<string>(getTodayStr());
  const [leaderFilter, setLeaderFilter] = useState<LeaderRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AgendaStatus | 'ALL'>('ALL');

  const filteredAgendas = useMemo(() => {
    return agendas.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (leaderFilter !== 'ALL') {
        const eff =
          a.status === 'Diwakilkan' && a.diwakilkanKepadaId
            ? a.diwakilkanKepadaId
            : a.pejabatId;
        if (a.pejabatId !== leaderFilter && eff !== leaderFilter) return false;
      }
      return true;
    });
  }, [agendas, leaderFilter, statusFilter]);

  function stepDate(delta: number) {
    const dt = parseYmd(anchorDate);
    if (mode === 'harian') dt.setDate(dt.getDate() + delta);
    else if (mode === 'mingguan') dt.setDate(dt.getDate() + delta * 7);
    else dt.setMonth(dt.getMonth() + delta);
    setAnchorDate(formatYmd(dt));
  }

  const weekDays = useMemo(() => {
    const base = parseYmd(anchorDate);
    const dayOfWeek = (base.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return formatYmd(d);
    });
  }, [anchorDate]);

  const monthCells = useMemo(() => {
    const base = parseYmd(anchorDate);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7; // Monday start
    const start = new Date(year, month, 1 - offset);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        ymd: formatYmd(d),
        dayNum: d.getDate(),
        inMonth: d.getMonth() === month,
      };
    });
  }, [anchorDate]);

  const headerLabel = useMemo(() => {
    const base = parseYmd(anchorDate);
    if (mode === 'harian') return formatTanggalId(anchorDate);
    if (mode === 'mingguan') {
      return `${formatTanggalId(weekDays[0])} — ${formatTanggalId(weekDays[6])}`;
    }
    return base.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [anchorDate, mode, weekDays]);

  const dailyAgendas = useMemo(() => {
    return filteredAgendas
      .filter((a) => a.tanggal === anchorDate)
      .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));
  }, [anchorDate, filteredAgendas]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['harian', 'mingguan', 'bulanan'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded capitalize transition-colors whitespace-nowrap ${
                  mode === m
                    ? 'bg-white text-[#0F294A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(getTodayStr())}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => stepDate(1)}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm font-semibold text-[#0F294A]">
            {headerLabel}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={leaderFilter}
            onChange={(e) =>
              setLeaderFilter(e.target.value as LeaderRole | 'ALL')
            }
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#0F294A]"
          >
            <option value="ALL">Semua Pejabat (7 Pimpinan)</option>
            {LEADERS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as AgendaStatus | 'ALL')
            }
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#0F294A]"
          >
            <option value="ALL">Semua Status</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Views */}
      {mode === 'harian' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">
              Agenda Pimpinan Tanggal {formatTanggalId(anchorDate)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {dailyAgendas.length} kegiatan
            </span>
          </div>

          {dailyAgendas.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Tidak ada agenda pada tanggal ini sesuai filter yang dipilih.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {dailyAgendas.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectAgenda(item)}
                  className={`w-full text-left p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 transition-colors ${
                    item.hasConflict ? 'bg-red-50/40' : ''
                  }`}
                >
                  <div className="sm:w-32 shrink-0 font-mono tabular-nums text-sm font-semibold text-[#0F294A]">
                    {item.waktuMulai} – {item.waktuSelesai}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {item.perihal}
                      </span>
                      <StatusBadge status={item.status} compact />
                    </div>
                    <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.lokasi}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Pejabat: {item.pejabatId || 'Belum Didisposisi'}
                        {item.status === 'Diwakilkan' && item.diwakilkanKepadaId
                          ? ` (Diwakilkan ke ${item.diwakilkanKepadaId})`
                          : ''}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'mingguan' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((ymd) => {
            const dayItems = filteredAgendas
              .filter((a) => a.tanggal === ymd)
              .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));
            const isToday = ymd === getTodayStr();
            const dt = parseYmd(ymd);

            return (
              <div
                key={ymd}
                className={`bg-white rounded-lg border flex flex-col min-h-[260px] ${
                  isToday ? 'border-[#0F294A] ring-1 ring-[#0F294A]/20' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAnchorDate(ymd);
                    setMode('harian');
                  }}
                  className={`px-3 py-2.5 border-b text-left flex items-center justify-between ${
                    isToday
                      ? 'bg-[#0F294A] text-white border-[#0F294A] rounded-t-md'
                      : 'bg-slate-50 text-slate-800 border-slate-200 rounded-t-lg'
                  }`}
                >
                  <div>
                    <div className="text-[11px] opacity-80">
                      {dt.toLocaleDateString('id-ID', { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-bold font-mono tabular-nums">
                      {dt.getDate()}{' '}
                      {dt.toLocaleDateString('id-ID', { month: 'short' })}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums opacity-80">
                    {dayItems.length}
                  </span>
                </button>

                <div className="p-2 space-y-2 flex-1">
                  {dayItems.length === 0 ? (
                    <div className="text-[11px] text-slate-400 text-center py-6">
                      Kosong
                    </div>
                  ) : (
                    dayItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectAgenda(item)}
                        className={`w-full text-left p-2 rounded border text-xs transition-colors ${
                          item.hasConflict
                            ? 'bg-red-50 border-red-300 hover:border-red-400'
                            : item.status === 'Diwakilkan'
                              ? 'bg-sky-50/70 border-sky-200 hover:border-sky-300'
                              : item.status === 'Menunggu Disposisi' ||
                                  item.status === 'Perlu Review AI'
                                ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 font-mono tabular-nums text-[11px] font-semibold text-[#0F294A]">
                          <span>{item.waktuMulai}</span>
                          {item.hasConflict && (
                            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                          )}
                        </div>
                        <div className="mt-1 font-medium text-slate-900 line-clamp-2 leading-snug">
                          {item.perihal}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600 truncate">
                          {item.status === 'Diwakilkan' && item.diwakilkanKepadaId
                            ? `${item.diwakilkanKepadaId} (Wakil)`
                            : item.pejabatId || 'Belum Disposisi'}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'bulanan' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
              <div key={d} className="py-2.5 border-r last:border-r-0 border-slate-200">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((cell) => {
              const items = filteredAgendas
                .filter((a) => a.tanggal === cell.ymd)
                .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));
              const isToday = cell.ymd === getTodayStr();
              return (
                <div
                  key={cell.ymd}
                  className={`min-h-[115px] p-2 border-b border-r border-slate-200 flex flex-col gap-1 ${
                    !cell.inMonth ? 'bg-slate-50/70 text-slate-400' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setAnchorDate(cell.ymd);
                        setMode('harian');
                      }}
                      className={`w-6 h-6 text-xs font-mono tabular-nums rounded flex items-center justify-center ${
                        isToday
                          ? 'bg-[#0F294A] text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cell.dayNum}
                    </button>
                    {items.length > 0 && (
                      <span className="text-[10px] font-mono tabular-nums text-slate-400">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectAgenda(item)}
                        className={`w-full text-left px-1.5 py-1 rounded text-[10px] leading-tight truncate border ${
                          item.hasConflict
                            ? 'bg-red-50 text-red-900 border-red-300'
                            : item.status === 'Diwakilkan'
                              ? 'bg-sky-50 text-sky-900 border-sky-200'
                              : item.status === 'Selesai' || item.status === 'Terverifikasi'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                        title={`${item.waktuMulai} ${item.perihal}`}
                      >
                        <span className="font-mono tabular-nums font-semibold">
                          {item.waktuMulai}
                        </span>{' '}
                        {item.perihal}
                      </button>
                    ))}
                    {items.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnchorDate(cell.ymd);
                          setMode('harian');
                        }}
                        className="text-[10px] text-sky-700 font-medium pl-1"
                      >
                        +{items.length - 3} lainnya
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 px-1">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-700" />
          <span>Terverifikasi / Selesai</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Perlu Review AI / Menunggu Disposisi</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-700" />
          <span>Diwakilkan</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>Bentrok Jadwal</span>
        </span>
      </div>
    </div>
  );
}
