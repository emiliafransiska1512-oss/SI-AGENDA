import { useState, type ChangeEvent, type DragEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FilePlus2,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { AgendaItem } from '../types.ts';
import { SplitViewVerificationPanel } from './SplitViewVerificationModal.tsx';
import { formatTanggalId, getTodayStr, StatusBadge } from './StatusBadge.tsx';

interface UploadExtractViewProps {
  allAgendas: AgendaItem[];
  onExtracted: (newItems: AgendaItem[], updatedAll: AgendaItem[]) => void;
  onUpdateAgenda: (id: string, patch: Partial<AgendaItem>) => Promise<void>;
}

interface QueuedFile {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  sizeLabel: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Gagal membaca berkas ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function UploadExtractView({
  allAgendas,
  onExtracted,
  onUpdateAgenda,
}: UploadExtractViewProps) {
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [rawText, setRawText] = useState('');
  const [textFileName, setTextFileName] = useState('Surat_Undangan_Masuk.txt');
  const [dragActive, setDragActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentExtracted, setRecentExtracted] = useState<AgendaItem[]>([]);
  const [activeVerifyId, setActiveVerifyId] = useState<string | null>(null);

  const activeItem =
    allAgendas.find((a) => a.id === activeVerifyId) ||
    recentExtracted.find((a) => a.id === activeVerifyId) ||
    null;

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);

    const added: QueuedFile[] = [];
    for (const file of Array.from(fileList)) {
      const validType =
        file.type === 'application/pdf' || file.type.startsWith('image/');
      if (!validType) {
        setErrorMsg(
          `Berkas "${file.name}" dilewati. Gunakan format PDF, PNG, JPG, atau WEBP.`
        );
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      added.push({
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        sizeLabel: `${(file.size / 1024).toFixed(0)} KB`,
      });
    }
    setQueuedFiles((prev) => [...prev, ...added]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    void addFiles(e.dataTransfer.files);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    void addFiles(e.target.files);
    e.target.value = '';
  }

  function loadSampleLetterText() {
    const today = getTodayStr();
    setMode('text');
    setTextFileName('Undangan_Rakor_Desa_Gelam_Sample.txt');
    setRawText(
      `PEMERINTAH KABUPATEN SIDOARJO
KECAMATAN CANDI - PEMERINTAH DESA GELAM
Jl. Raya Gelam No. 45, Kec. Candi, Kabupaten Sidoarjo

Nomor     : 005/214/438.7.2.7/2026
Sifat     : Penting
Perihal   : Undangan Musyawarah Perencanaan Pembangunan Desa (Musrenbangdes) & Penanganan Banjir Lingkungan

Kepada Yth.
Camat Candi Kabupaten Sidoarjo
di Tempat

Dengan hormat, mengharap kehadiran Bapak Camat / Pejabat yang mewakili pada acara yang akan diselenggarakan pada:
Hari/Tanggal : ${today}
Pukul        : 10.00 - 12.00 WIB
Tempat       : Pendopo Balai Desa Gelam, Kecamatan Candi
Pakaian      : Batik Korpri / Batik Bebas Rapi
Narahubung   : Sekretaris Desa Gelam - Sdr. Bagus Setiawan (0812-5590-3341)

Demikian atas perhatian dan kehadirannya kami sampaikan terima kasih.`
    );
  }

  async function handleExtract() {
    setErrorMsg(null);
    setExtracting(true);
    try {
      const payload =
        mode === 'file'
          ? {
              files: queuedFiles.map((f) => ({
                fileName: f.fileName,
                mimeType: f.mimeType,
                dataUrl: f.dataUrl,
              })),
            }
          : {
              files: [
                {
                  fileName: textFileName || 'Teks_Surat_Masuk.txt',
                  rawText,
                },
              ],
            };

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ekstraksi surat gagal diproses.');
      }

      const extractedItems = (data.extractedItems || []) as AgendaItem[];
      onExtracted(extractedItems, data.agendas);
      setRecentExtracted((prev) => [...extractedItems, ...prev]);
      if (extractedItems.length > 0) {
        setActiveVerifyId(extractedItems[0].id);
      }
      if (mode === 'file') {
        setQueuedFiles([]);
      } else {
        setRawText('');
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat ekstraksi.'
      );
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F294A]">
            AI Surat Extractor (OCR + LLM) & Split-View Verification
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Unggah surat undangan PDF/gambar (tunggal atau batch) untuk ekstraksi otomatis nomor surat, waktu, lokasi, desa, pakaian, narahubung, dan rekomendasi disposisi.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start shrink-0">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              mode === 'file'
                ? 'bg-white text-[#0F294A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unggah PDF / Gambar
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              mode === 'text'
                ? 'bg-white text-[#0F294A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Input Teks Surat
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Ekstraksi Tidak Dapat Dilanjutkan</p>
            <p className="mt-0.5 text-red-800">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Upload / Input Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          {mode === 'file' ? (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-[#0F294A] bg-sky-50/50'
                    : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
                }`}
              >
                <Upload className="w-8 h-8 text-[#0F294A] mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-900">
                  Seret berkas PDF atau pindaian surat ke sini
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung unggah tunggal maupun batch (PDF, PNG, JPG, WEBP)
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] cursor-pointer transition-colors">
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Pilih Berkas Surat</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleLetterText}
                    className="px-3.5 py-2 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 transition-colors"
                  >
                    Uji dengan Contoh Teks Surat
                  </button>
                </div>
              </div>

              {queuedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>Antrean Ekstraksi ({queuedFiles.length} berkas)</span>
                    <button
                      type="button"
                      onClick={() => setQueuedFiles([])}
                      className="text-red-600 hover:text-red-800"
                    >
                      Kosongkan
                    </button>
                  </div>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                    {queuedFiles.map((f) => (
                      <div
                        key={f.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-[#0F294A] shrink-0" />
                          <span className="font-medium text-slate-800 truncate">
                            {f.fileName}
                          </span>
                          <span className="text-slate-400 font-mono tabular-nums shrink-0">
                            {f.sizeLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setQueuedFiles((prev) =>
                              prev.filter((q) => q.id !== f.id)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                          aria-label={`Hapus ${f.fileName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-700">
                  Tempel Isi Teks Surat Undangan / Nota Dinas
                </label>
                <button
                  type="button"
                  onClick={loadSampleLetterText}
                  className="text-xs font-medium text-sky-700 hover:text-sky-900"
                >
                  Isi Contoh Surat Desa Gelam
                </button>
              </div>
              <input
                type="text"
                value={textFileName}
                onChange={(e) => setTextFileName(e.target.value)}
                placeholder="Nama referensi berkas..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Tempel teks surat undangan resmi di sini..."
                className="w-full px-3 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-[#0F294A]"
              />
            </div>
          )}

          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              disabled={
                extracting ||
                (mode === 'file' ? queuedFiles.length === 0 : !rawText.trim())
              }
              onClick={handleExtract}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0F294A] rounded-md hover:bg-[#163A66] transition-colors disabled:opacity-50"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses OCR & Ekstraksi AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Ekstrak Agenda Otomatis
                    {mode === 'file' && queuedFiles.length > 0
                      ? ` (${queuedFiles.length})`
                      : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Recent Batch Extraction Queue */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Antrean Verifikasi Hasil Ekstraksi
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {allAgendas.filter((a) => a.status === 'Perlu Review AI').length} perlu review
            </span>
          </div>
          <div className="divide-y divide-slate-200 overflow-y-auto max-h-[340px]">
            {(recentExtracted.length > 0
              ? recentExtracted
              : allAgendas.filter(
                  (a) =>
                    a.status === 'Perlu Review AI' ||
                    a.status === 'Menunggu Disposisi'
                )
            )
              .slice(0, 8)
              .map((item) => {
                const live = allAgendas.find((a) => a.id === item.id) || item;
                const selected = activeVerifyId === live.id;
                return (
                  <button
                    key={live.id}
                    type="button"
                    onClick={() => setActiveVerifyId(live.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selected
                        ? 'bg-sky-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono tabular-nums text-[11px] text-slate-500">
                        {live.nomorSurat}
                      </span>
                      <StatusBadge status={live.status} compact />
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-900 line-clamp-1">
                      {live.perihal}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-2">
                      <span>{formatTanggalId(live.tanggal)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {live.waktuMulai} WIB
                      </span>
                      {typeof live.aiConfidence === 'number' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>AI {live.aiConfidence}%</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Inline Split-View Verification Panel */}
      {activeItem ? (
        <SplitViewVerificationPanel
          item={activeItem}
          allAgendas={allAgendas}
          onSave={onUpdateAgenda}
          isInline
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">
            Pilih salah satu surat dari antrean di atas atau unggah dokumen baru
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Panel Split-View Verification akan menampilkan pratinjau dokumen asli di sisi kiri dan kolom hasil ekstraksi AI di sisi kanan.
          </p>
        </div>
      )}
    </div>
  );
}
