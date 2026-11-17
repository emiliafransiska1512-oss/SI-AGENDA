import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { LEADERS, type AgendaItem, type LeaderRole } from '../types.ts';
import { formatTanggalId, StatusBadge } from './StatusBadge.tsx';

interface DisposisiViewProps {
  agendas: AgendaItem[];
  onUpdateAgenda: (id: string, patch: Partial<AgendaItem>) => Promise<void>;
  onSelectAgenda: (item: AgendaItem) => void;
}

export function DisposisiView({
  agendas,
  onUpdateAgenda,
  onSelectAgenda,
}: DisposisiViewProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedLeaderTab, setSelectedLeaderTab] = useState<LeaderRole>('Camat');

  const actionQueue = useMemo(() => {
    return agendas
      .filter(
        (a) =>
          a.status === 'Menunggu Disposisi' ||
          a.status === 'Bentrok Jadwal' ||
          a.status === 'Perlu Review AI'
      )
      .sort((a, b) => {
        if (a.hasConflict !== b.hasConflict) return a.hasConflict ? -1 : 1;
        return a.tanggal.localeCompare(b.tanggal);
      });
  }, [agendas]);

  const leaderAgendas = useMemo(() => {
    return agendas
      .filter((a) => {
        if (a.status === 'Selesai') return false;
        const eff =
          a.status === 'Diwakilkan' && a.diwakilkanKepadaId
            ? a.diwakilkanKepadaId
            : a.pejabatId;
        return a.pejabatId === selectedLeaderTab || eff === selectedLeaderTab;
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [agendas, selectedLeaderTab]);

  async function assignLeader(id: string, role: LeaderRole) {
    setBusyId(id);
    try {
      await onUpdateAgenda(id, {
        pejabatId: role,
        diwakilkanKepadaId: '',
        status: 'Terverifikasi',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function delegateLeader(
    item: AgendaItem,
    delegateTo: LeaderRole
  ) {
    setBusyId(item.id);
    try {
      await onUpdateAgenda(item.id, {
        pejabatId: item.pejabatId || 'Camat',
        diwakilkanKepadaId: delegateTo,
        status: 'Diwakilkan',
        catatanDisposisi: `Diwakilkan kepada ${delegateTo} untuk menghindari bentrok jadwal.`,
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-lg font-bold text-[#0F294A]">
          Disposisi Pejabat & Manajemen Pendelegasian Kehadiran
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Penugasan kehadiran resmi kepada 7 pejabat struktural Kecamatan Candi beserta resolusi otomatis bentrok jadwal melalui mekanisme pendelegasian.
        </p>
      </div>

      {/* Action Queue: Pending Dispositions & Schedule Conflicts */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Antrean Disposisi & Penyelesaian Bentrok ({actionQueue.length})
          </h3>
          <span className="text-xs text-slate-500">
            Pilih pejabat penanggung jawab atau delegasikan perwakilan
          </span>
        </div>

        {actionQueue.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">
              Seluruh surat masuk telah terdisposisi tanpa bentrok jadwal
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {actionQueue.map((item) => (
              <div
                key={item.id}
                className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  item.hasConflict ? 'bg-red-50/50' : ''
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} compact />
                    <span className="font-mono tabular-nums text-xs text-slate-500">
                      {formatTanggalId(item.tanggal)} · {item.waktuMulai}–{item.waktuSelesai} WIB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectAgenda(item)}
                    className="text-left text-sm font-semibold text-slate-900 hover:text-[#0F294A] hover:underline"
                  >
                    {item.perihal}
                  </button>
                  <div className="text-xs text-slate-600">
                    {item.instansiPengirim} · {item.lokasi} ({item.desaWilayah})
                  </div>
                  {item.hasConflict && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Bentrok pada jadwal {item.pejabatId}. Segera delegasikan ke Sekcam atau Kasi terkait.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {item.hasConflict ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 inline-flex items-center gap-1">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Wakilkan ke:
                      </span>
                      <select
                        disabled={busyId === item.id}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            void delegateLeader(
                              item,
                              e.target.value as LeaderRole
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-white border border-red-300 rounded-md focus:outline-none focus:border-red-500"
                      >
                        <option value="">-- Pilih Pejabat Pengganti --</option>
                        {LEADERS.filter((l) => l.id !== item.pejabatId).map(
                          (l) => (
                            <option key={l.id} value={l.id}>
                              {l.id}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        disabled={busyId === item.id}
                        value={item.pejabatId}
                        onChange={(e) => {
                          if (e.target.value) {
                            void assignLeader(
                              item.id,
                              e.target.value as LeaderRole
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#0F294A]"
                      >
                        <option value="">-- Tugaskan Pejabat --</option>
                        {LEADERS.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.id} — {l.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectAgenda(item)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7-Official Matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-700">
            Struktur Pimpinan Kecamatan Candi
          </div>
          <div className="divide-y divide-slate-200">
            {LEADERS.map((leader) => {
              const count = agendas.filter((a) => {
                if (a.status === 'Selesai') return false;
                const eff =
                  a.status === 'Diwakilkan' && a.diwakilkanKepadaId
                    ? a.diwakilkanKepadaId
                    : a.pejabatId;
                return eff === leader.id;
              }).length;
              const conflicts = agendas.filter(
                (a) => a.hasConflict && a.pejabatId === leader.id
              ).length;
              const active = selectedLeaderTab === leader.id;

              return (
                <button
                  key={leader.id}
                  type="button"
                  onClick={() => setSelectedLeaderTab(leader.id)}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-2 ${
                    active ? 'bg-[#0F294A] text-white' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {leader.id}
                    </div>
                    <div
                      className={`text-[11px] truncate ${
                        active ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {leader.nama}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {conflicts > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-600 text-white">
                        {conflicts} Bentrok
                      </span>
                    )}
                    <span
                      className={`font-mono tabular-nums text-xs font-semibold ${
                        active ? 'text-sky-200' : 'text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Penugasan: {selectedLeaderTab}
              </h3>
              <p className="text-xs text-slate-500">
                {LEADERS.find((l) => l.id === selectedLeaderTab)?.nama} ·{' '}
                {LEADERS.find((l) => l.id === selectedLeaderTab)?.seksi}
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {leaderAgendas.length} agenda aktif
            </span>
          </div>

          {leaderAgendas.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada agenda aktif yang ditugaskan kepada {selectedLeaderTab}.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {leaderAgendas.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} compact />
                      <span className="font-mono tabular-nums text-xs text-slate-500">
                        {formatTanggalId(item.tanggal)} · {item.waktuMulai}–{item.waktuSelesai} WIB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectAgenda(item)}
                      className="mt-1 text-left text-sm font-semibold text-slate-900 hover:text-[#0F294A] hover:underline"
                    >
                      {item.perihal}
                    </button>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {item.lokasi} · {item.desaWilayah}
                      {item.status === 'Diwakilkan' && item.diwakilkanKepadaId && (
                        <span className="inline-flex items-center gap-1 ml-2 text-sky-700 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          Mewakili {item.pejabatId}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectAgenda(item)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shrink-0 self-start sm:self-center"
                  >
                    Ubah / Delegasikan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
