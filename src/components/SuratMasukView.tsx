import { useMemo, useState, type FormEvent } from 'react';
import {
  CheckCheck,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ALL_STATUSES,
  DESA_CANDI,
  LEADERS,
  type AgendaItem,
  type AgendaStatus,
  type LeaderRole,
} from '../types.ts';
import { formatTanggalId, getTodayStr, StatusBadge } from './StatusBadge.tsx';

interface SuratMasukViewProps {
  agendas: AgendaItem[];
  onSelectAgenda: (item: AgendaItem) => void;
  onCreateAgenda: (payload: Partial<AgendaItem>) => Promise<void>;
  onUpdateAgenda: (id: string, patch: Partial<AgendaItem>) => Promise<void>;
  onDeleteAgenda: (id: string) => Promise<void>;
}

export function SuratMasukView({
  agendas,
  onSelectAgenda,
  onCreateAgenda,
  onUpdateAgenda,
  onDeleteAgenda,
}: SuratMasukViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgendaStatus | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newForm, setNewForm] = useState({
    nomorSurat: '',
    instansiPengirim: '',
    perihal: '',
    tanggal: getTodayStr(),
    waktuMulai: '09:00',
    waktuSelesai: '11:00',
    lokasi: '',
    desaWilayah: 'Candi',
    pakaian: 'PDH Khaki',
    narahubung: '',
    pejabatId: '' as LeaderRole | '',
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agendas
      .filter((item) => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (!q) return true;
        return (
          item.nomorSurat.toLowerCase().includes(q) ||
          item.instansiPengirim.toLowerCase().includes(q) ||
          item.perihal.toLowerCase().includes(q) ||
          item.desaWilayah.toLowerCase().includes(q) ||
          item.lokasi.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [agendas, search, statusFilter]);

  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateAgenda({
        ...newForm,
        status: newForm.pejabatId ? 'Terverifikasi' : 'Menunggu Disposisi',
      });
      setShowCreateModal(false);
      setNewForm({
        nomorSurat: '',
        instansiPengirim: '',
        perihal: '',
        tanggal: getTodayStr(),
        waktuMulai: '09:00',
        waktuSelesai: '11:00',
        lokasi: '',
        desaWilayah: 'Candi',
        pakaian: 'PDH Khaki',
        narahubung: '',
        pejabatId: '',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F294A]">
              Daftar Surat Masuk & Agenda Pimpinan
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Total{' '}
              <span className="font-mono tabular-nums font-semibold">
                {agendas.length}
              </span>{' '}
              surat masuk tercatat dalam register digital Kecamatan Candi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] transition-colors self-start whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Surat Manual</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-white text-[#0F294A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({agendas.length})
            </button>
            {ALL_STATUSES.map((st) => {
              const count = agendas.filter((a) => a.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white text-[#0F294A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor surat, perihal, desa..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Nomor & Pengirim</th>
                <th className="py-3 px-4">Perihal Kegiatan</th>
                <th className="py-3 px-4">Jadwal & Wilayah</th>
                <th className="py-3 px-4">Disposisi Pejabat</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Tidak ditemukan surat masuk sesuai kriteria pencarian/filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.hasConflict ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 align-top">
                      <div className="font-mono tabular-nums font-medium text-[#0F294A]">
                        {item.nomorSurat}
                      </div>
                      <div className="text-slate-600 mt-0.5 max-w-[200px]">
                        {item.instansiPengirim}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top max-w-xs">
                      <button
                        type="button"
                        onClick={() => onSelectAgenda(item)}
                        className="text-left font-semibold text-slate-900 hover:text-[#0F294A] hover:underline"
                      >
                        {item.perihal}
                      </button>
                      <div className="text-slate-500 mt-0.5">
                        Pakaian: {item.pakaian}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {formatTanggalId(item.tanggal)}
                      </div>
                      <div className="font-mono tabular-nums text-slate-600 mt-0.5">
                        {item.waktuMulai} – {item.waktuSelesai} WIB
                      </div>
                      <div className="text-slate-500 mt-0.5 max-w-[220px] truncate">
                        {item.lokasi} · {item.desaWilayah}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {item.pejabatId || 'Belum Didisposisi'}
                      </div>
                      {item.status === 'Diwakilkan' && item.diwakilkanKepadaId && (
                        <div className="text-sky-700 mt-0.5">
                          Wakil: {item.diwakilkanKepadaId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectAgenda(item)}
                          className="p-1.5 rounded text-slate-600 hover:text-[#0F294A] hover:bg-slate-100"
                          title="Buka Split-View Verifikasi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.status !== 'Selesai' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAgenda(item.id, { status: 'Selesai' })
                            }
                            className="p-1.5 rounded text-teal-700 hover:bg-teal-50"
                            title="Tandai Selesai"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteAgenda(item.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F294A]">
                Catat Surat Masuk Baru Secara Manual
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nomor Surat
                  </label>
                  <input
                    required
                    type="text"
                    value={newForm.nomorSurat}
                    onChange={(e) =>
                      setNewForm({ ...newForm, nomorSurat: e.target.value })
                    }
                    placeholder="Contoh: 005/120/438.7.2/2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Instansi Pengirim
                  </label>
                  <input
                    required
                    type="text"
                    value={newForm.instansiPengirim}
                    onChange={(e) =>
                      setNewForm({
                        ...newForm,
                        instansiPengirim: e.target.value,
                      })
                    }
                    placeholder="Contoh: Pemerintah Desa Sepande"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">
                    Perihal Kegiatan
                  </label>
                  <input
                    required
                    type="text"
                    value={newForm.perihal}
                    onChange={(e) =>
                      setNewForm({ ...newForm, perihal: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    required
                    type="date"
                    value={newForm.tanggal}
                    onChange={(e) =>
                      setNewForm({ ...newForm, tanggal: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Mulai
                    </label>
                    <input
                      required
                      type="time"
                      value={newForm.waktuMulai}
                      onChange={(e) =>
                        setNewForm({ ...newForm, waktuMulai: e.target.value })
                      }
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Selesai
                    </label>
                    <input
                      required
                      type="time"
                      value={newForm.waktuSelesai}
                      onChange={(e) =>
                        setNewForm({ ...newForm, waktuSelesai: e.target.value })
                      }
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Lokasi
                  </label>
                  <input
                    required
                    type="text"
                    value={newForm.lokasi}
                    onChange={(e) =>
                      setNewForm({ ...newForm, lokasi: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Desa / Wilayah
                  </label>
                  <select
                    value={newForm.desaWilayah}
                    onChange={(e) =>
                      setNewForm({ ...newForm, desaWilayah: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    {DESA_CANDI.map((d) => (
                      <option key={d} value={d}>
                        Desa {d}
                      </option>
                    ))}
                    <option value="Kabupaten Sidoarjo">
                      Kabupaten Sidoarjo
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Pakaian
                  </label>
                  <input
                    type="text"
                    value={newForm.pakaian}
                    onChange={(e) =>
                      setNewForm({ ...newForm, pakaian: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Disposisi Awal
                  </label>
                  <select
                    value={newForm.pejabatId}
                    onChange={(e) =>
                      setNewForm({
                        ...newForm,
                        pejabatId: e.target.value as LeaderRole | '',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">-- Menunggu Disposisi --</option>
                    {LEADERS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0F294A] text-white font-semibold rounded-md hover:bg-[#163A66] disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Surat Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
