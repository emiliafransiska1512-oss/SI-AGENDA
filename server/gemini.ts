import { GoogleGenAI, Type } from '@google/genai';
import {
  DESA_CANDI,
  LEADERS,
  type AgendaItem,
  type LeaderRole,
  type ManagementBriefResult,
} from '../src/types.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY belum dikonfigurasi. Mohon atur API key Gemini pada panel Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ExtractedSuratPayload {
  nomorSurat: string;
  instansiPengirim: string;
  perihal: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  lokasi: string;
  desaWilayah: string;
  pakaian: string;
  narahubung: string;
  ringkasan: string;
  rekomendasiPejabat: LeaderRole | '';
  aiConfidence: number;
}

export async function extractSuratWithGemini(input: {
  fileName?: string;
  mimeType?: string;
  base64Data?: string;
  rawText?: string;
  todayDate: string;
}): Promise<ExtractedSuratPayload> {
  const ai = getGeminiClient();

  const leaderNames = LEADERS.map((l) => `${l.id} (${l.seksi})`).join(', ');
  const desaList = DESA_CANDI.join(', ');

  const instruction = `Anda adalah asisten administrasi pemerintahan ahli untuk Kantor Kecamatan Candi, Kabupaten Sidoarjo (sistem SI-AGENDA CANDI).
Tugas Anda: melakukan OCR dan ekstraksi terstruktur dari surat undangan/nota dinas masuk (PDF, gambar scan, atau teks).

Pedoman Ekstraksi:
1. Tanggal acuan hari ini: ${input.todayDate}. Format tanggal WAJIB YYYY-MM-DD. Jika tahun tidak disebut, gunakan tahun berjalan dari tanggal acuan.
2. Format waktuMulai dan waktuSelesai WAJIB HH:mm (24 jam, contoh "09:00"). Jika tertulis "s.d. selesai" tanpa jam akhir, estimasikan durasi +2 jam dari waktu mulai.
3. desaWilayah: Cocokkan lokasi/asal desa dengan salah satu dari 24 desa di Kecamatan Candi: [${desaList}]. Jika lokasi di Kantor Kecamatan Candi gunakan "Candi"; jika di tingkat Kabupaten/luar kecamatan gunakan "Kabupaten Sidoarjo".
4. rekomendasiPejabat: Pilih SATU jabatan yang paling relevan dari daftar berikut: [${leaderNames}], atau kosong "" jika tidak dapat ditentukan.
5. aiConfidence: Nilai keyakinan ekstraksi 0-100 (integer) berdasarkan kejelasan dokumen dan kelengkapan tanggal/waktu/lokasi.
6. Jangan mengarang informasi yang tidak ada; jika suatu kolom tidak tercantum pada surat, isi dengan "-" (kecuali tanggal/waktu gunakan estimasi terstruktur yang logis).`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (input.base64Data && input.mimeType) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.base64Data,
      },
    });
  }

  parts.push({
    text: input.rawText
      ? `Ekstrak informasi surat resmi berikut (nama berkas: ${input.fileName || 'teks-surat'}):\n\n${input.rawText}`
      : `Lakukan OCR dan ekstrak seluruh kolom informasi agenda dari dokumen surat undangan terlampir (nama berkas: ${input.fileName || 'dokumen-surat'}).`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      systemInstruction: instruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nomorSurat: { type: Type.STRING, description: 'Nomor surat resmi' },
          instansiPengirim: { type: Type.STRING, description: 'Nama instansi/OPD/desa pengirim surat' },
          perihal: { type: Type.STRING, description: 'Perihal atau nama kegiatan undangan' },
          tanggal: { type: Type.STRING, description: 'Tanggal pelaksanaan format YYYY-MM-DD' },
          waktuMulai: { type: Type.STRING, description: 'Jam mulai format HH:mm' },
          waktuSelesai: { type: Type.STRING, description: 'Jam selesai format HH:mm' },
          lokasi: { type: Type.STRING, description: 'Tempat atau alamat pelaksanaan kegiatan' },
          desaWilayah: { type: Type.STRING, description: 'Desa/kelurahan di Kec. Candi atau Kabupaten Sidoarjo' },
          pakaian: { type: Type.STRING, description: 'Ketentuan pakaian / dress code' },
          narahubung: { type: Type.STRING, description: 'Nama dan/atau nomor kontak narahubung' },
          ringkasan: { type: Type.STRING, description: 'Ringkasan eksekutif 1-2 kalimat formal Bahasa Indonesia' },
          rekomendasiPejabat: { type: Type.STRING, description: 'Rekomendasi pejabat disposisi dari daftar pimpinan' },
          aiConfidence: { type: Type.INTEGER, description: 'Skor keyakinan ekstraksi 0-100' },
        },
        required: [
          'nomorSurat',
          'instansiPengirim',
          'perihal',
          'tanggal',
          'waktuMulai',
          'waktuSelesai',
          'lokasi',
          'desaWilayah',
          'pakaian',
          'narahubung',
          'ringkasan',
          'rekomendasiPejabat',
          'aiConfidence',
        ],
      },
    },
  });

  const rawJson = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawJson) as Partial<ExtractedSuratPayload>;

  const validRoles = new Set<string>(LEADERS.map((l) => l.id));
  const recRole =
    parsed.rekomendasiPejabat && validRoles.has(parsed.rekomendasiPejabat)
      ? (parsed.rekomendasiPejabat as LeaderRole)
      : 'Sekcam';

  return {
    nomorSurat: parsed.nomorSurat || '-',
    instansiPengirim: parsed.instansiPengirim || '-',
    perihal: parsed.perihal || 'Agenda Undangan Masuk',
    tanggal: /^\d{4}-\d{2}-\d{2}$/.test(parsed.tanggal || '')
      ? (parsed.tanggal as string)
      : input.todayDate,
    waktuMulai: /^\d{2}:\d{2}$/.test(parsed.waktuMulai || '')
      ? (parsed.waktuMulai as string)
      : '09:00',
    waktuSelesai: /^\d{2}:\d{2}$/.test(parsed.waktuSelesai || '')
      ? (parsed.waktuSelesai as string)
      : '11:00',
    lokasi: parsed.lokasi || '-',
    desaWilayah: parsed.desaWilayah || 'Candi',
    pakaian: parsed.pakaian || 'PDH / Menyesuaikan',
    narahubung: parsed.narahubung || '-',
    ringkasan: parsed.ringkasan || '-',
    rekomendasiPejabat: recRole,
    aiConfidence:
      typeof parsed.aiConfidence === 'number'
        ? Math.min(100, Math.max(0, Math.round(parsed.aiConfidence)))
        : 88,
  };
}

export async function generateManagementBriefWithGemini(input: {
  period: 'mingguan' | 'bulanan';
  agendas: AgendaItem[];
  todayDate: string;
}): Promise<ManagementBriefResult> {
  const ai = getGeminiClient();

  const compactData = input.agendas.map((a) => ({
    tanggal: a.tanggal,
    waktu: `${a.waktuMulai}-${a.waktuSelesai}`,
    perihal: a.perihal,
    instansi: a.instansiPengirim,
    desa: a.desaWilayah,
    pejabat: a.pejabatId || 'Belum Disposisi',
    diwakilkanKepada: a.diwakilkanKepadaId || null,
    status: a.status,
    bentrok: a.hasConflict,
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Tanggal acuan: ${input.todayDate}. Periode laporan: ${input.period}.\n\nData agenda Kecamatan Candi:\n${JSON.stringify(compactData, null, 2)}`,
    config: {
      systemInstruction: `Anda adalah Analis Kebijakan & Tata Kelola Pemerintahan Kecamatan Candi, Kabupaten Sidoarjo.
Susun "Management Brief" formal berstandar administrasi publik Indonesia (SPBE) berdasarkan data agenda riil yang diberikan.
Analisis harus mencerminkan angka nyata dalam data: pola koordinasi lintas seksi, distribusi beban kerja di antara 7 pejabat struktural (Camat, Sekcam, Kasi Pemerintahan, Kasi Pembangunan, Kasi Kesos, Kasi Trantib, Kasubag Umum), cakupan wilayah 24 desa, serta rekomendasi mitigasi bentrok jadwal dan pendelegasian yang konkret.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          judul: { type: Type.STRING, description: 'Judul formal laporan eksekutif' },
          ringkasanEksekutif: { type: Type.STRING, description: 'Paragraf ringkasan eksekutif 3-4 kalimat berbasis angka riil' },
          polaKoordinasi: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-4 poin temuan pola koordinasi lintas seksi dan OPD',
          },
          distribusiBebanKerja: { type: Type.STRING, description: 'Analisis keseimbangan beban kerja pimpinan dan rasio pendelegasian' },
          cakupanWilayah: { type: Type.STRING, description: 'Analisis keterjangkauan desa dari 24 desa di Kecamatan Candi' },
          rekomendasiStrategis: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-4 rekomendasi tindak lanjut operasional untuk Camat & Sekcam',
          },
        },
        required: [
          'judul',
          'ringkasanEksekutif',
          'polaKoordinasi',
          'distribusiBebanKerja',
          'cakupanWilayah',
          'rekomendasiStrategis',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<
    ManagementBriefResult,
    'id' | 'period' | 'generatedAt'
  >;

  return {
    id: `brief-${Date.now()}`,
    period: input.period,
    generatedAt: new Date().toISOString(),
    judul: parsed.judul || `Laporan Analisis Agenda ${input.period === 'mingguan' ? 'Mingguan' : 'Bulanan'} Kecamatan Candi`,
    ringkasanEksekutif: parsed.ringkasanEksekutif || '',
    polaKoordinasi: parsed.polaKoordinasi || [],
    distribusiBebanKerja: parsed.distribusiBebanKerja || '',
    cakupanWilayah: parsed.cakupanWilayah || '',
    rekomendasiStrategis: parsed.rekomendasiStrategis || [],
  };
}
