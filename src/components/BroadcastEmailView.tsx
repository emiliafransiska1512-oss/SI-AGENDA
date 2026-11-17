import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Mail,
  Monitor,
  RefreshCw,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  LEADERS,
  type EmailBroadcastLog,
  type SystemSettings,
} from '../types.ts';
import { formatTanggalId, getTodayStr } from './StatusBadge.tsx';

interface BroadcastEmailViewProps {
  settings: SystemSettings;
  broadcastLogs: EmailBroadcastLog[];
  onSent: (logs: EmailBroadcastLog[]) => void;
}

export function BroadcastEmailView({
  settings,
  broadcastLogs,
  onSent,
}: BroadcastEmailViewProps) {
  const [emailType, setEmailType] = useState<'digest_pagi' | 'urgent_update'>(
    'digest_pagi'
  );
  const [targetDate, setTargetDate] = useState(getTodayStr());
  const [customNote, setCustomNote] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(
    settings.digestRecipients
  );
  const [extraEmail, setExtraEmail] = useState('');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>(
    'desktop'
  );
  const [previewData, setPreviewData] = useState<{
    subject: string;
    html: string;
    agendaCount: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          targetDate,
          customNote,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewData(data);
      }
    } finally {
      setLoadingPreview(false);
    }
  }, [customNote, emailType, targetDate]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  function toggleRecipient(email: string) {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  }

  function addExtraRecipient() {
    const trimmed = extraEmail.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    if (!selectedRecipients.includes(trimmed)) {
      setSelectedRecipients((prev) => [...prev, trimmed]);
    }
    setExtraEmail('');
  }

  async function handleSend() {
    if (selectedRecipients.length === 0) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          targetDate,
          recipients: selectedRecipients,
          customNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim email dinas.');
      }
      onSent(data.broadcastLogs);
      setFeedback(
        `${data.log.deliveryStatus}: ${data.log.smtpMessage || 'Berhasil dicatat.'}`
      );
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : 'Gagal mengirim email dinas.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F294A]">
            Gateway Email Dinas / OPD & Ringkasan Pagi (06.30 WIB)
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Pembuatan otomatis dan pengiriman ringkasan eksekutif agenda harian (06.30 WIB) serta pembaruan mendesak ke surel resmi pimpinan dan OPD melalui SMTP.
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 shrink-0">
          Jadwal Otomatis:{' '}
          <span className="font-mono tabular-nums font-semibold text-[#0F294A]">
            {settings.digestTime} WIB
          </span>{' '}
          ({settings.autoDigestEnabled ? 'Aktif' : 'Nonaktif'})
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Composer & Recipients */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jenis Siaran Email Dinas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEmailType('digest_pagi')}
                className={`py-2 px-3 text-xs font-medium rounded-md border transition-colors ${
                  emailType === 'digest_pagi'
                    ? 'bg-[#0F294A] text-white border-[#0F294A]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Digest Pagi 06.30 WIB
              </button>
              <button
                type="button"
                onClick={() => setEmailType('urgent_update')}
                className={`py-2 px-3 text-xs font-medium rounded-md border transition-colors ${
                  emailType === 'urgent_update'
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Siaran Mendesak
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Agenda Sasaran
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Pengantar Sekretariat (Opsional)
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Contoh: Mohon perhatian khusus agenda bentrok pada pukul 09.30 WIB..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Daftar Penerima Resmi ({selectedRecipients.length} alamat)
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
              {LEADERS.map((l) => (
                <label
                  key={l.id}
                  className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(l.email)}
                    onChange={() => toggleRecipient(l.email)}
                    className="rounded border-slate-300 text-[#0F294A]"
                  />
                  <span className="font-medium">{l.id}</span>
                  <span className="text-slate-400 truncate font-mono text-[11px]">
                    ({l.email})
                  </span>
                </label>
              ))}
              {selectedRecipients
                .filter((e) => !LEADERS.some((l) => l.email === e))
                .map((extra) => (
                  <label
                    key={extra}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleRecipient(extra)}
                      className="rounded border-slate-300"
                    />
                    <span className="font-mono text-[11px]">{extra}</span>
                  </label>
                ))}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                type="email"
                value={extraEmail}
                onChange={(e) => setExtraEmail(e.target.value)}
                placeholder="Tambah email OPD / Desa..."
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
              <button
                type="button"
                onClick={addExtraRecipient}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200"
              >
                Tambah
              </button>
            </div>
          </div>

          {feedback && (
            <div className="p-3 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
          )}

          <button
            type="button"
            disabled={sending || selectedRecipients.length === 0}
            onClick={handleSend}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {sending
                ? 'Mengirim via Gateway SMTP...'
                : `Kirim Siaran Email (${selectedRecipients.length} Penerima)`}
            </span>
          </button>
        </div>

        {/* Right: Live HTML Email Preview */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                Pratinjau HTML Email Dinas
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {previewData?.subject || 'Memuat pratinjau...'}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 p-0.5 bg-slate-200 rounded">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`p-1.5 rounded ${
                    previewViewport === 'desktop'
                      ? 'bg-white text-[#0F294A]'
                      : 'text-slate-600'
                  }`}
                  title="Tampilan Desktop"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`p-1.5 rounded ${
                    previewViewport === 'mobile'
                      ? 'bg-white text-[#0F294A]'
                      : 'text-slate-600'
                  }`}
                  title="Tampilan Mobile Pimpinan"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => void loadPreview()}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600"
                title="Segarkan Pratinjau"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loadingPreview ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-100 flex justify-center">
            <div
              className={`bg-white border border-slate-300 rounded overflow-hidden transition-all ${
                previewViewport === 'mobile' ? 'w-[375px]' : 'w-full'
              }`}
            >
              {previewData?.html ? (
                <iframe
                  srcDoc={previewData.html}
                  title="Pratinjau Email Dinas"
                  className="w-full h-[520px] border-0"
                />
              ) : (
                <div className="h-[520px] flex items-center justify-center text-xs text-slate-500">
                  Memuat templat HTML...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Log */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#0F294A]" />
          <h3 className="text-sm font-semibold text-slate-900">
            Riwayat Pengiriman Gateway Email Dinas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-4">Waktu Kirim</th>
                <th className="py-2.5 px-4">Subjek</th>
                <th className="py-2.5 px-4">Tanggal Agenda</th>
                <th className="py-2.5 px-4">Penerima</th>
                <th className="py-2.5 px-4">Status Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {broadcastLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>{log.subject}</div>
                    {log.smtpMessage && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {log.smtpMessage}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                    {formatTanggalId(log.targetDate)} ({log.agendaCount} item)
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums">
                    {log.recipients.length} alamat
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded border font-medium ${
                        log.deliveryStatus === 'Terkirim via SMTP'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}
                    >
                      {log.deliveryStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
