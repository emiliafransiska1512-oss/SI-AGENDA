import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Save,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  DESA_CANDI,
  LEADERS,
  type AgendaItem,
  type AgendaStatus,
  type LeaderRole,
} from '../types.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface SplitViewVerificationProps {
  item: AgendaItem;
  allAgendas: AgendaItem[];
  onSave: (id: string, patch: Partial<AgendaItem>) => Promise<void>;
  onClose?: () => void;
  isInline?: boolean;
}

function toMinutes(hhmm: string): number {
  const [hStr, mStr] = (hhmm || '00:00').split(':');
  return (Number(hStr) || 0) * 60 + (Number(mStr) || 0);
}

export function SplitViewVerificationPanel({
  item,
  allAgendas,
  onSave,
  onClose,
  isInline = false,
}: SplitViewVerificationProps) {
  const [form, setForm] = useState({
    nomorSurat: item.nomorSurat,
    instansiPengirim: item.instansiPengirim,
    perihal: item.perihal,
    tanggal: item.tanggal,
    waktuMulai: item.waktuMulai,
    waktuSelesai: item.waktuSelesai,
    lokasi: item.lokasi,
    desaWilayah: item.desaWilayah,
    pakaian: item.pakaian,
    narahubung: item.narahubung,
    ringkasan: item.ringkasan,
    pejabatId: (item.pejabatId || '') as LeaderRole | '',
    isDelegated: item.status === 'Diwakilkan',
    diwakilkanKepadaId: (item.diwakilkanKepadaId || '') as LeaderRole | '',
    catatanDisposisi: item.catatanDisposisi || '',
    status: item.status as AgendaStatus,
  });

  const [zoom, setZoom] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      nomorSurat: item.nomorSurat,
      instansiPengirim: item.instansiPengirim,
      perihal: item.perihal,
      tanggal: item.tanggal,
      waktuMulai: item.waktuMulai,
      waktuSelesai: item.waktuSelesai,
      lokasi: item.lokasi,
      desaWilayah: item.desaWilayah,
      pakaian: item.pakaian,
      narahubung: item.narahubung,
      ringkasan: item.ringkasan,
      pejabatId: (item.pejabatId || '') as LeaderRole | '',
      isDelegated: item.status === 'Diwakilkan',
      diwakilkanKepadaId: (item.diwakilkanKepadaId || '') as LeaderRole | '',
      catatanDisposisi: item.catatanDisposisi || '',
      status: item.status,
    });
  }, [item]);

  const liveConflicts = useMemo(() => {
    const assignee =
      form.isDelegated && form.diwakilkanKepadaId
        ? form.diwakilkanKepadaId
        : form.pejabatId;
    if (!assignee || form.status === 'Selesai') return [];
    const startA = toMinutes(form.waktuMulai);
    const endA = Math.max(startA + 15, toMinutes(form.waktuSelesai));

    return allAgendas.filter((other) => {
      if (other.id === item.id || other.status === 'Selesai') return false;
      if (other.tanggal !== form.tanggal) return false;
      const otherAssignee =
        other.status === 'Diwakilkan' && other.diwakilkanKepadaId
          ? other.diwakilkanKepadaId
          : other.pejabatId;
      if (!otherAssignee || otherAssignee !== assignee) return false;
      const startB = toMinutes(other.waktuMulai);
      const endB = Math.max(startB + 15, toMinutes(other.waktuSelesai));
      return startA < endB && startB < endA;
    });
  }, [allAgendas, form, item.id]);

  async function handleSave(targetStatus?: AgendaStatus) {
    setSaving(true);
    try {
      let nextStatus: AgendaStatus = targetStatus || form.status;
      if (form.isDelegated && form.diwakilkanKepadaId && nextStatus !== 'Selesai') {
        nextStatus = 'Diwakilkan';
      } else if (!targetStatus && nextStatus === 'Perlu Review AI') {
        nextStatus = form.pejabatId ? 'Terverifikasi' : 'Menunggu Disposisi';
      }

      await onSave(item.id, {
        nomorSurat: form.nomorSurat,
        instansiPengirim: form.instansiPengirim,
        perihal: form.perihal,
        tanggal: form.tanggal,
        waktuMulai: form.waktuMulai,
        waktuSelesai: form.waktuSelesai,
        lokasi: form.lokasi,
        desaWilayah: form.desaWilayah,
        pakaian: form.pakaian,
        narahubung: form.narahubung,
        ringkasan: form.ringkasan,
        pejabatId: form.pejabatId,
        diwakilkanKepadaId: form.isDelegated ? form.diwakilkanKepadaId : '',
        catatanDisposisi: form.catatanDisposisi,
        status: nextStatus,
      });
      if (onClose) onClose();
    } finally {
      setSaving(false);
    }
  }

  const isPdf =
    item.sourceFileMime === 'application/pdf' ||
    item.sourceFileDataUrl?.startsWith('data:application/pdf');
  const isImage =
    item.sourceFileMime?.startsWith('image/') ||
    item.sourceFileDataUrl?.startsWith('data:image/');

  const wilayahOptions = [
    ...DESA_CANDI,
    'Kabupaten Sidoarjo',
    'Luar Wilayah Kecamatan Candi',
  ];

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-4 h-4 text-[#0F294A] shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              Split-View Verifikasi Dokumen & Hasil Ekstraksi AI
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {item.sourceFileName || 'Dokumen Surat Masuk'}
              {typeof item.aiConfidence === 'number' && (
                <span>
                  {' '}
                  · Akurasi Ekstraksi AI:{' '}
                  <span className="font-mono tabular-nums font-medium text-slate-700">
                    {item.aiConfidence}%
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={item.status} />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              aria-label="Tutup panel verifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Split Content */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 ${
          isInline ? 'min-h-[600px]' : 'max-h-[78vh] overflow-y-auto lg:overflow-hidden'
        }`}
      >
        {/* Left: Original Document Preview */}
        <div className="lg:col-span-5 bg-slate-100 flex flex-col min-h-[380px] lg:max-h-[78vh]">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-200/70 border-b border-slate-300/70 text-xs text-slate-700">
            <span className="font-medium truncate">
              Pratinjau Dokumen Asli
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(75, z - 15))}
                className="p-1 rounded hover:bg-slate-300/60"
                title="Perkecil"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono tabular-nums w-10 text-center">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(160, z + 15))}
                className="p-1 rounded hover:bg-slate-300/60"
                title="Perbesar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            {isPdf && item.sourceFileDataUrl ? (
              <iframe
                src={item.sourceFileDataUrl}
                title={item.sourceFileName || 'Pratinjau PDF Surat'}
                className="w-full h-[540px] bg-white border border-slate-300 rounded shadow-xs"
              />
            ) : isImage && item.sourceFileDataUrl ? (
              <img
                src={item.sourceFileDataUrl}
                alt={item.sourceFileName || 'Hasil scan surat masuk'}
                referrerPolicy="no-referrer"
                style={{ width: `${zoom}%` }}
                className="max-w-none bg-white border border-slate-300 rounded shadow-xs"
              />
            ) : (
              <div
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                className="w-full max-w-md bg-white border border-slate-300 rounded p-6 text-slate-800 shadow-xs"
              >
                <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
                  <div className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
                    Dokumen Surat Masuk Terarsip
                  </div>
                  <div className="text-sm font-bold text-[#0F294A] mt-0.5">
                    {form.instansiPengirim}
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                  {item.sourceLetterBody ||
                    `Nomor Surat  : ${form.nomorSurat}\nPengirim     : ${form.instansiPengirim}\nPerihal      : ${form.perihal}\n\nPelaksanaan:\nTanggal      : ${form.tanggal}\nWaktu        : ${form.waktuMulai} - ${form.waktuSelesai} WIB\nLokasi       : ${form.lokasi} (${form.desaWilayah})\nPakaian      : ${form.pakaian}\nNarahubung   : ${form.narahubung}\n\nRingkasan:\n${form.ringkasan}`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right: Editable Extracted Fields & Conflict Check */}
        <div className="lg:col-span-7 p-5 overflow-y-auto lg:max-h-[78vh] space-y-4">
          {liveConflicts.length > 0 && (
            <div className="p-3.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Deteksi Bentrok Jadwal Otomatis ({liveConflicts.length} agenda tumpang tindih)
                </p>
                <ul className="mt-1 space-y-1 text-red-800">
                  {liveConflicts.map((c) => (
                    <li key={c.id}>
                      <span className="font-mono tabular-nums font-medium">
                        {c.waktuMulai}–{c.waktuSelesai} WIB
                      </span>{' '}
                      · {c.perihal} ({c.lokasi})
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-red-700">
                  Solusi: alihkan disposisi ke pejabat lain atau aktifkan opsi "Diwakilkan".
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nomor Surat
              </label>
              <input
                type="text"
                value={form.nomorSurat}
                onChange={(e) => setForm({ ...form, nomorSurat: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Instansi Pengirim
              </label>
              <input
                type="text"
                value={form.instansiPengirim}
                onChange={(e) =>
                  setForm({ ...form, instansiPengirim: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Perihal / Nama Kegiatan
              </label>
              <input
                type="text"
                value={form.perihal}
                onChange={(e) => setForm({ ...form, perihal: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={form.waktuMulai}
                  onChange={(e) =>
                    setForm({ ...form, waktuMulai: e.target.value })
                  }
                  className="w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={form.waktuSelesai}
                  onChange={(e) =>
                    setForm({ ...form, waktuSelesai: e.target.value })
                  }
                  className="w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Lokasi / Tempat
              </label>
              <input
                type="text"
                value={form.lokasi}
                onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Desa / Wilayah (24 Desa Kec. Candi)
              </label>
              <select
                value={
                  wilayahOptions.includes(form.desaWilayah)
                    ? form.desaWilayah
                    : 'Candi'
                }
                onChange={(e) =>
                  setForm({ ...form, desaWilayah: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              >
                {wilayahOptions.map((w) => (
                  <option key={w} value={w}>
                    {DESA_CANDI.includes(w) ? `Desa ${w}` : w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ketentuan Pakaian
              </label>
              <input
                type="text"
                value={form.pakaian}
                onChange={(e) => setForm({ ...form, pakaian: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Narahubung / CP
              </label>
              <input
                type="text"
                value={form.narahubung}
                onChange={(e) =>
                  setForm({ ...form, narahubung: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Disposisi Pejabat Utama
              </label>
              <select
                value={form.pejabatId}
                onChange={(e) =>
                  setForm({ ...form, pejabatId: e.target.value as LeaderRole | '' })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              >
                <option value="">-- Belum Didisposisi --</option>
                {LEADERS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} — {l.jabatan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Skema Kehadiran
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      isDelegated: false,
                      diwakilkanKepadaId: '',
                    })
                  }
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors ${
                    !form.isDelegated
                      ? 'bg-[#0F294A] text-white border-[#0F294A]'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Hadir Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isDelegated: true })}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md border transition-colors ${
                    form.isDelegated
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Diwakilkan
                </button>
              </div>
            </div>

            {form.isDelegated && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Diwakilkan Kepada Pejabat
                </label>
                <select
                  value={form.diwakilkanKepadaId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      diwakilkanKepadaId: e.target.value as LeaderRole | '',
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-sky-50/50 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                  <option value="">-- Pilih Pejabat Pengganti --</option>
                  {LEADERS.filter((l) => l.id !== form.pejabatId).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id} — {l.jabatan}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ringkasan & Catatan Disposisi
              </label>
              <textarea
                rows={2}
                value={form.catatanDisposisi}
                onChange={(e) =>
                  setForm({ ...form, catatanDisposisi: e.target.value })
                }
                placeholder="Arahan Camat / catatan tindak lanjut untuk pejabat yang ditugaskan..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('Selesai')}
              className="px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Tandai Selesai
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handleSave(
                    form.isDelegated && form.diwakilkanKepadaId
                      ? 'Diwakilkan'
                      : form.pejabatId
                        ? 'Terverifikasi'
                        : 'Menunggu Disposisi'
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : 'Verifikasi & Terbitkan'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
