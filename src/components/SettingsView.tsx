import { useState, type FormEvent } from 'react';
import { CheckCircle2, MailCheck, Save, ShieldCheck } from 'lucide-react';
import { DESA_CANDI, LEADERS, type SystemSettings } from '../types.ts';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (next: Partial<SystemSettings>) => Promise<void>;
}

export function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [form, setForm] = useState<SystemSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [smtpResult, setSmtpResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveNotice(null);
    try {
      await onSaveSettings(form);
      setSaveNotice('Pengaturan instansi dan gateway SMTP berhasil disimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSmtp() {
    setTestingSmtp(true);
    setSmtpResult(null);
    try {
      await onSaveSettings(form);
      const res = await fetch('/api/email/test-smtp', { method: 'POST' });
      const data = await res.json();
      setSmtpResult({
        ok: Boolean(data.ok),
        message: data.message || 'Uji koneksi selesai.',
      });
    } catch (err) {
      setSmtpResult({
        ok: false,
        message:
          err instanceof Error ? err.message : 'Koneksi SMTP gagal diuji.',
      });
    } finally {
      setTestingSmtp(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-lg font-bold text-[#0F294A]">
          Pengaturan Sistem, Gateway SMTP & Referensi Wilayah
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Konfigurasi profil Kantor Kecamatan Candi, jadwal otomatis Email Digest 06.30 WIB, serta kredensial server SMTP dinas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Institution & Digest Settings */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2.5">
            Profil Instansi & Otomasi Digest Pagi
          </h3>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Nama Unit Kerja
            </label>
            <input
              type="text"
              value={form.namaInstansi}
              onChange={(e) =>
                setForm({ ...form, namaInstansi: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Pemerintah Daerah
            </label>
            <input
              type="text"
              value={form.kabupaten}
              onChange={(e) => setForm({ ...form, kabupaten: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Alamat Kantor
            </label>
            <input
              type="text"
              value={form.alamatKantor}
              onChange={(e) =>
                setForm({ ...form, alamatKantor: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Jabatan Pimpinan Wilayah
            </label>
            <input
              type="text"
              value={form.namaCamat}
              onChange={(e) => setForm({ ...form, namaCamat: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">
                Aktifkan Digest Pagi Otomatis
              </div>
              <div className="text-slate-500">
                Kirim ringkasan agenda ke surel pimpinan tiap pagi
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.autoDigestEnabled}
              onChange={(e) =>
                setForm({ ...form, autoDigestEnabled: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-[#0F294A]"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Jam Pengiriman Digest (WIB)
            </label>
            <input
              type="time"
              value={form.digestTime}
              onChange={(e) => setForm({ ...form, digestTime: e.target.value })}
              className="w-36 px-3 py-2 border border-slate-300 rounded-md font-mono tabular-nums"
            />
          </div>
        </div>

        {/* Right: SMTP Gateway */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Konfigurasi SMTP Gateway Dinas
            </h3>
            <ShieldCheck className="w-4 h-4 text-[#0F294A]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Host SMTP
              </label>
              <input
                type="text"
                value={form.smtpHost}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                placeholder="mail.sidoarjokab.go.id / smtp.gmail.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Port
              </label>
              <input
                type="number"
                value={form.smtpPort}
                onChange={(e) =>
                  setForm({ ...form, smtpPort: Number(e.target.value) || 587 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Username SMTP
              </label>
              <input
                type="text"
                value={form.smtpUser}
                onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                placeholder="si-agenda.candi@sidoarjokab.go.id"
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Password / App Password
              </label>
              <input
                type="password"
                value={form.smtpPass}
                onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Alamat Pengirim (From)
            </label>
            <input
              type="email"
              value={form.smtpFrom}
              onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.smtpSecure}
              onChange={(e) =>
                setForm({ ...form, smtpSecure: e.target.checked })
              }
              className="rounded border-slate-300"
            />
            <span>Gunakan TLS/SSL Langsung (Port 465)</span>
          </label>

          {smtpResult && (
            <div
              className={`p-3 rounded-md border ${
                smtpResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {smtpResult.message}
            </div>
          )}

          {saveNotice && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={testingSmtp}
              onClick={handleTestSmtp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <MailCheck className="w-3.5 h-3.5" />
              <span>{testingSmtp ? 'Menguji...' : 'Test Koneksi SMTP'}</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F294A] text-white font-semibold rounded-md hover:bg-[#163A66] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Reference Directory: 7 Officials & 24 Villages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Direktori 7 Pejabat Struktural Kecamatan Candi
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {LEADERS.map((l) => (
              <div key={l.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900">
                    {l.id} — {l.jabatan}
                  </div>
                  <div className="text-slate-500">
                    {l.seksi}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-600">
                  {l.email}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Daftar 24 Desa Wilayah Administrasi Kecamatan Candi
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {DESA_CANDI.map((d, idx) => (
              <div
                key={d}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 flex items-center gap-1.5"
              >
                <span className="font-mono tabular-nums text-[10px] text-slate-400">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="truncate">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
