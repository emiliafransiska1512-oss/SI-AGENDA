import { useMemo } from 'react';
import {
  ALL_STATUSES,
  DESA_CANDI,
  LEADERS,
  type AgendaItem,
} from '../types.ts';

interface AnalyticsViewProps {
  agendas: AgendaItem[];
}

export function AnalyticsView({ agendas }: AnalyticsViewProps) {
  const leaderStats = useMemo(() => {
    return LEADERS.map((leader) => {
      const direct = agendas.filter(
        (a) => a.pejabatId === leader.id && a.status !== 'Diwakilkan'
      ).length;
      const delegated = agendas.filter(
        (a) => a.status === 'Diwakilkan' && a.diwakilkanKepadaId === leader.id
      ).length;
      const conflicts = agendas.filter(
        (a) => a.hasConflict && a.pejabatId === leader.id
      ).length;
      return {
        ...leader,
        direct,
        delegated,
        conflicts,
        total: direct + delegated,
      };
    });
  }, [agendas]);

  const maxLeaderTotal = Math.max(1, ...leaderStats.map((l) => l.total));

  const villageStats = useMemo(() => {
    return DESA_CANDI.map((desa) => ({
      desa,
      count: agendas.filter(
        (a) => a.desaWilayah.toLowerCase() === desa.toLowerCase()
      ).length,
    }));
  }, [agendas]);

  const maxVillageCount = Math.max(1, ...villageStats.map((v) => v.count));
  const coveredVillages = villageStats.filter((v) => v.count > 0).length;

  const attendanceRatio = useMemo(() => {
    const assigned = agendas.filter((a) => a.pejabatId);
    const delegated = assigned.filter((a) => a.status === 'Diwakilkan').length;
    const direct = Math.max(0, assigned.length - delegated);
    const total = Math.max(1, assigned.length);
    const directPct = Math.round((direct / total) * 100);
    const delegatedPct = 100 - directPct;
    return { direct, delegated, total: assigned.length, directPct, delegatedPct };
  }, [agendas]);

  const statusBreakdown = useMemo(() => {
    return ALL_STATUSES.map((st) => ({
      status: st,
      count: agendas.filter((a) => a.status === st).length,
    }));
  }, [agendas]);

  // SVG Donut Geometry
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const directArc = (attendanceRatio.directPct / 100) * circumference;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-lg font-bold text-[#0F294A]">
          Analytics Distribusi Kegiatan & Cakupan 24 Desa Kecamatan Candi
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Pemetaan beban kerja lintas 7 pejabat struktural, rasio kehadiran langsung vs diwakilkan, serta pemerataan kunjungan kerja di 24 desa/kelurahan se-Kecamatan Candi.
        </p>
      </div>

      {/* Top Row: Section Distribution + Attendance Ratio Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Distribusi Agenda per Seksi & Pejabat Struktural
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan penugasan langsung, perwakilan, dan insiden bentrok jadwal
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0F294A]" />
                Langsung
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
                Mewakili
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {leaderStats.map((row) => {
              const directW = (row.direct / maxLeaderTotal) * 100;
              const delW = (row.delegated / maxLeaderTotal) * 100;
              return (
                <div key={row.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      {row.id}{' '}
                      <span className="text-slate-400 font-normal">
                        · {row.seksi}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 font-semibold">
                      {row.total} agenda
                      {row.conflicts > 0 && (
                        <span className="text-red-600 ml-2">
                          ({row.conflicts} bentrok)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden flex">
                    {directW > 0 && (
                      <div
                        style={{ width: `${directW}%` }}
                        className="bg-[#0F294A] h-full transition-all"
                        title={`Hadir Langsung: ${row.direct}`}
                      />
                    )}
                    {delW > 0 && (
                      <div
                        style={{ width: `${delW}%` }}
                        className="bg-sky-500 h-full transition-all"
                        title={`Mewakili: ${row.delegated}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut & Status Breakdown */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Rasio Kehadiran Langsung vs Diwakilkan
            </h3>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative w-36 h-36 shrink-0">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="#E0F2FE"
                    strokeWidth="16"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="#0F294A"
                    strokeWidth="16"
                    strokeDasharray={`${directArc} ${circumference}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold font-mono tabular-nums text-[#0F294A]">
                    {attendanceRatio.directPct}%
                  </span>
                  <span className="text-[10px] text-slate-500">Langsung</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs flex-1">
                <div>
                  <div className="text-slate-500">Hadir Langsung</div>
                  <div className="font-mono tabular-nums font-bold text-[#0F294A] text-sm">
                    {attendanceRatio.direct} agenda ({attendanceRatio.directPct}%)
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Diwakilkan</div>
                  <div className="font-mono tabular-nums font-bold text-sky-700 text-sm">
                    {attendanceRatio.delegated} agenda ({attendanceRatio.delegatedPct}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Rekapitulasi Status Agenda
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {statusBreakdown.map((item) => (
                <div
                  key={item.status}
                  className="py-2 flex items-center justify-between"
                >
                  <span className="text-slate-700">{item.status}</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 24 Villages Coverage Matrix */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Sebaran Agenda Wilayah di 24 Desa Kecamatan Candi
            </h3>
            <p className="text-xs text-slate-500">
              Terjangkau pada periode data saat ini:{' '}
              <span className="font-mono tabular-nums font-semibold text-[#0F294A]">
                {coveredVillages} / 24 desa
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {villageStats.map((v) => {
            const intensity = v.count / maxVillageCount;
            return (
              <div
                key={v.desa}
                className={`p-3 rounded-md border text-xs ${
                  v.count > 0
                    ? 'bg-sky-50/70 border-sky-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-slate-800 truncate">
                    {v.desa}
                  </span>
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      v.count > 0 ? 'text-[#0F294A]' : 'text-slate-400'
                    }`}
                  >
                    {v.count}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-200/80 rounded overflow-hidden">
                  <div
                    style={{ width: `${Math.round(intensity * 100)}%` }}
                    className="h-full bg-[#0F294A]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
