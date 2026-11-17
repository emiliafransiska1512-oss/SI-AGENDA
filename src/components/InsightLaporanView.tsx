import { useState } from 'react';
import {
  AlertCircle,
  FileBarChart2,
  Loader2,
  Printer,
  Sparkles,
} from 'lucide-react';
import type { ManagementBriefResult, SystemSettings } from '../types.ts';

interface InsightLaporanViewProps {
  briefs: ManagementBriefResult[];
  settings: SystemSettings;
  onBriefGenerated: (
    brief: ManagementBriefResult,
    allBriefs: ManagementBriefResult[]
  ) => void;
}

export function InsightLaporanView({
  briefs,
  settings,
  onBriefGenerated,
}: InsightLaporanViewProps) {
  const [period, setPeriod] = useState<'mingguan' | 'bulanan'>('mingguan');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeBriefId, setActiveBriefId] = useState<string | null>(
    briefs[0]?.id || null
  );

  const activeBrief =
    briefs.find((b) => b.id === activeBriefId) || briefs[0] || null;

  async function handleGenerate() {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyusun Management Brief.');
      }
      onBriefGenerated(data.brief, data.briefs);
      setActiveBriefId(data.brief.id);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal menyusun laporan eksekutif.'
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F294A]">
            Insight & Generator Management Brief Pimpinan
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Sintesis otomatis pola koordinasi lintas seksi, pemerataan kunjungan 24 desa, beban kerja 7 pejabat, dan rekomendasi kebijakan berbasis data agenda riil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setPeriod('mingguan')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                period === 'mingguan'
                  ? 'bg-white text-[#0F294A] shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setPeriod('bulanan')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                period === 'bulanan'
                  ? 'bg-white text-[#0F294A] shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Bulanan
            </button>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyusun Brief...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Susun Management Brief</span>
              </>
            )}
          </button>

          {activeBrief && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Brief Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          {activeBrief ? (
            <article className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
              <div className="border-b-2 border-[#0F294A] pb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    {settings.kabupaten} · {settings.namaInstansi}
                  </div>
                  <h3 className="mt-1 text-lg sm:text-xl font-bold text-[#0F294A]">
                    {activeBrief.judul}
                  </h3>
                  <div className="mt-1 text-xs text-slate-500">
                    Periode Analisis:{' '}
                    <span className="capitalize font-medium text-slate-700">
                      {activeBrief.period}
                    </span>{' '}
                    · Disusun pada{' '}
                    <span className="font-mono tabular-nums">
                      {new Date(activeBrief.generatedAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F294A] mb-2">
                  01. Ringkasan Eksekutif
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {activeBrief.ringkasanEksekutif}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F294A] mb-2">
                  02. Pola Koordinasi Lintas Seksi & OPD
                </h4>
                <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
                  {activeBrief.polaKoordinasi.map((p, i) => (
                    <li key={i} className="leading-relaxed">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F294A] mb-2">
                    03. Distribusi Beban Kerja Pimpinan
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {activeBrief.distribusiBebanKerja}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F294A] mb-2">
                    04. Cakupan Wilayah 24 Desa
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {activeBrief.cakupanWilayah}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F294A] mb-2">
                  05. Rekomendasi Tindak Lanjut Operasional
                </h4>
                <ol className="space-y-2 text-sm text-slate-800 list-decimal pl-5">
                  {activeBrief.rekomendasiStrategis.map((r, i) => (
                    <li key={i} className="leading-relaxed">
                      {r}
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <FileBarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">
                Belum Ada Management Brief Tersimpan
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Klik tombol "Susun Management Brief" di atas untuk menghasilkan analisis pola koordinasi dan distribusi beban kerja pimpinan berdasarkan agenda terkini.
              </p>
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div className="no-print lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-700">
            Arsip Management Brief ({briefs.length})
          </div>
          {briefs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Riwayat brief akan muncul di sini setelah dibuat.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {briefs.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveBriefId(b.id)}
                  className={`w-full text-left p-3.5 transition-colors ${
                    activeBrief?.id === b.id
                      ? 'bg-sky-50/70'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 line-clamp-2">
                    {b.judul}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="capitalize">{b.period}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(b.generatedAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
