import fs from 'fs';
import path from 'path';
import type {
  AgendaItem,
  EmailBroadcastLog,
  LeaderRole,
  ManagementBriefResult,
  SystemSettings,
} from '../src/types.ts';

export interface DatabaseState {
  agendas: AgendaItem[];
  broadcastLogs: EmailBroadcastLog[];
  briefs: ManagementBriefResult[];
  settings: SystemSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'si_agenda_db.json');

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, offset: number): string {
  const copy = new Date(base.getTime());
  copy.setDate(copy.getDate() + offset);
  return formatLocalDate(copy);
}

function toMinutes(hhmm: string): number {
  const [hStr, mStr] = (hhmm || '00:00').split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  return h * 60 + m;
}

function effectiveAssignee(item: AgendaItem): LeaderRole | '' {
  if (item.status === 'Diwakilkan' && item.diwakilkanKepadaId) {
    return item.diwakilkanKepadaId;
  }
  return item.pejabatId;
}

export function recomputeConflicts(agendas: AgendaItem[]): AgendaItem[] {
  const active = agendas.map((item) => ({
    ...item,
    hasConflict: false,
    conflictWithIds: [] as string[],
  }));

  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    if (a.status === 'Selesai') continue;
    const assigneeA = effectiveAssignee(a);
    if (!assigneeA) continue;

    const startA = toMinutes(a.waktuMulai);
    const endA = Math.max(startA + 15, toMinutes(a.waktuSelesai));

    for (let j = i + 1; j < active.length; j++) {
      const b = active[j];
      if (b.status === 'Selesai') continue;
      if (a.tanggal !== b.tanggal) continue;
      const assigneeB = effectiveAssignee(b);
      if (!assigneeB || assigneeA !== assigneeB) continue;

      const startB = toMinutes(b.waktuMulai);
      const endB = Math.max(startB + 15, toMinutes(b.waktuSelesai));

      if (startA < endB && startB < endA) {
        a.hasConflict = true;
        b.hasConflict = true;
        a.conflictWithIds.push(b.id);
        b.conflictWithIds.push(a.id);
      }
    }
  }

  return active.map((item) => {
    if (item.hasConflict && item.status !== 'Selesai' && item.status !== 'Diwakilkan') {
      return { ...item, status: 'Bentrok Jadwal' as const };
    }
    if (!item.hasConflict && item.status === 'Bentrok Jadwal') {
      return {
        ...item,
        status: item.pejabatId ? ('Terverifikasi' as const) : ('Menunggu Disposisi' as const),
      };
    }
    return item;
  });
}

function createInitialState(): DatabaseState {
  const now = new Date();
  const today = formatLocalDate(now);
  const yesterday = addDays(now, -1);
  const twoDaysAgo = addDays(now, -2);
  const threeDaysAgo = addDays(now, -3);
  const tomorrow = addDays(now, 1);
  const inTwoDays = addDays(now, 2);
  const inThreeDays = addDays(now, 3);
  const inFourDays = addDays(now, 4);
  const inFiveDays = addDays(now, 5);
  const ts = now.toISOString();

  const rawAgendas: AgendaItem[] = [
    {
      id: 'ag-101',
      nomorSurat: '005/412/438.5.4/2026',
      instansiPengirim: 'Sekretariat Daerah Kabupaten Sidoarjo',
      perihal: 'Rapat Koordinasi Percepatan Digitalisasi Layanan Administrasi Terpadu Kecamatan (PATEN) & SPBE',
      tanggal: today,
      waktuMulai: '08:30',
      waktuSelesai: '11:00',
      lokasi: 'Pendopo Delta Wibawa Kab. Sidoarjo',
      desaWilayah: 'Kabupaten Sidoarjo',
      pakaian: 'PDH Khaki Lengkap',
      narahubung: 'Bagian Tata Pemerintahan (0812-3451-8890)',
      ringkasan: 'Rapat koordinasi evaluasi implementasi SPBE dan percepatan integrasi layanan kependudukan tingkat kecamatan se-Kabupaten Sidoarjo.',
      status: 'Terverifikasi',
      pejabatId: 'Camat',
      catatanDisposisi: 'Camat hadir langsung membawa laporan capaian PATEN Triwulan IV.',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 98,
      sourceFileName: 'Undangan_Rakor_PATEN_Setda.pdf',
      sourceLetterBody: `PEMERINTAH KABUPATEN SIDOARJO\nSEKRETARIAT DAERAH\nJl. Gubernur Suryo No. 1 Sidoarjo\n\nNomor: 005/412/438.5.4/2026\nSifat: Penting\nLampiran: 1 Berkas\nPerihal: Rapat Koordinasi Percepatan Digitalisasi PATEN & SPBE\n\nKepada Yth.\nCamat Candi Kabupaten Sidoarjo\ndi Tempat\n\nMengharap dengan hormat kehadiran Saudara pada:\nHari/Tanggal : ${today}\nPukul        : 08.30 - 11.00 WIB\nTempat       : Pendopo Delta Wibawa Kab. Sidoarjo\nPakaian      : PDH Khaki Lengkap\nNarahubung   : Bag. Tata Pemerintahan (0812-3451-8890)\n\nDemikian atas perhatian dan kehadirannya disampaikan terima kasih.`,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-102',
      nomorSurat: '440/189/438.7.2.4/2026',
      instansiPengirim: 'Pemerintah Desa Balongdowo',
      perihal: 'Musyawarah Desa Khusus Penetapan KPM BLT-DD dan Evaluasi Penanganan Stunting',
      tanggal: today,
      waktuMulai: '09:30',
      waktuSelesai: '12:00',
      lokasi: 'Balai Desa Balongdowo, Kec. Candi',
      desaWilayah: 'Balongdowo',
      pakaian: 'Batik Korpri / Batik Bebas Rapi',
      narahubung: 'Sekdes Balongdowo - Bpk. Suprapto (0856-4812-0933)',
      ringkasan: 'Penetapan daftar Keluarga Penerima Manfaat BLT Dana Desa dan sinkronisasi intervensi gizi terpadu di Desa Balongdowo.',
      status: 'Terverifikasi',
      pejabatId: 'Camat',
      catatanDisposisi: 'Jadwal bersamaan dengan Rakor Setda di Pendopo; disarankan disposisi ke Kasi Kesos atau Sekcam.',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 94,
      sourceFileName: 'Musdes_Balongdowo_2026.pdf',
      sourceLetterBody: `PEMERINTAH DESA BALONGDOWO\nKECAMATAN CANDI KABUPATEN SIDOARJO\n\nNomor: 440/189/438.7.2.4/2026\nPerihal: Undangan Musyawarah Desa Khusus BLT-DD & Stunting\n\nKepada Yth. Camat Candi\nMohon kehadiran Bapak Camat pada:\nTanggal : ${today}\nWaktu   : 09.30 - 12.00 WIB\nLokasi  : Balai Desa Balongdowo, Kec. Candi\nPakaian : Batik Bebas Rapi`,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-103',
      nomorSurat: '300/074/438.7.2/2026',
      instansiPengirim: 'Polsek Candi & Koramil 0816/02 Candi',
      perihal: 'Patroli Gabungan Forkopimka & Penertiban Reklame Liar Jalur Arteri Porong–Candi',
      tanggal: today,
      waktuMulai: '13:30',
      waktuSelesai: '15:30',
      lokasi: 'Titik Kumpul Halaman Kantor Kecamatan Candi',
      desaWilayah: 'Gelam',
      pakaian: 'PDL Satpol PP / Lapangan',
      narahubung: 'Kanit Sabhara Polsek Candi (0813-3029-4411)',
      ringkasan: 'Operasi penertiban ketertiban umum dan reklame tak berizin di koridor Jalan Raya Candi–Gelam.',
      status: 'Terverifikasi',
      pejabatId: 'Kasi Trantib',
      catatanDisposisi: 'Koordinasikan 6 personel Satpol PP Kecamatan.',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 96,
      sourceFileName: 'Surat_Tugas_Forkopimka_Trantib.pdf',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-104',
      nomorSurat: '610/321/438.5.12/2026',
      instansiPengirim: 'Dinas Pekerjaan Umum Bina Marga dan SDA Sidoarjo',
      perihal: 'Survei Lapangan Normalisasi Saluran Irigasi Tersier Wilayah Desa Kalipecabean & Kedungpeluk',
      tanggal: tomorrow,
      waktuMulai: '08:00',
      waktuSelesai: '11:30',
      lokasi: 'Pintu Air Dam Kalipecabean',
      desaWilayah: 'Kalipecabean',
      pakaian: 'Pakaian Lapangan / Rompi Dinas',
      narahubung: 'Ibu Ratna - Bidang Irigasi PUBMSDA (0811-3120-455)',
      ringkasan: 'Peninjauan teknis sedimentasi saluran pematus untuk mitigasi genangan musim hujan di kawasan timur Candi.',
      status: 'Menunggu Disposisi',
      pejabatId: '',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 91,
      sourceFileName: 'Survei_Irigasi_Kalipecabean.pdf',
      sourceLetterBody: `DINAS PEKERJAAN UMUM BINA MARGA DAN SDA\nKABUPATEN SIDOARJO\n\nNomor: 610/321/438.5.12/2026\nPerihal: Survei Lapangan Normalisasi Saluran Irigasi\n\nTanggal : ${tomorrow}\nPukul   : 08.00 - 11.30 WIB\nLokasi  : Pintu Air Dam Kalipecabean, Kec. Candi\nMohon pendampingan pejabat terkait dari Kecamatan Candi.`,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-105',
      nomorSurat: '140/052/DESA-LGN/2026',
      instansiPengirim: 'Pemerintah Desa Larangan',
      perihal: 'Pembinaan Administrasi BPD dan Pelantikan Perangkat Desa Hasil Penjaringan',
      tanggal: tomorrow,
      waktuMulai: '10:00',
      waktuSelesai: '12:30',
      lokasi: 'Pendopo Balai Desa Larangan',
      desaWilayah: 'Larangan',
      pakaian: 'Pakaian Sipil Lengkap (PSL) / Jas Dinas',
      narahubung: 'Kades Larangan - H. Mulyadi (0812-1677-3021)',
      ringkasan: 'Pengambilan sumpah jabatan Kepala Dusun Larangan Timur serta pembinaan tata kelola administrasi pemerintahan desa.',
      status: 'Perlu Review AI',
      pejabatId: 'Kasi Pemerintahan',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 76,
      sourceFileName: 'Scan_Undangan_Pelantikan_Larangan.jpg',
      sourceLetterBody: `PEMERINTAH DESA LARANGAN\nKECAMATAN CANDI - SIDOARJO\n\nNomor: 140/052/DESA-LGN/2026\nPerihal: Undangan Pelantikan Perangkat Desa & Pembinaan BPD\n\nHari/Tgl : ${tomorrow}\nJam     : 10.00 WIB - Selesai (estimasi 12.30 WIB)\nTempat  : Pendopo Balai Desa Larangan\nBusana  : PSL / Jas Dinas Lengkap\nCP      : H. Mulyadi (0812-1677-3021)\n\nCatatan OCR: Jam selesai tidak tercetak eksplisit pada pindaian.`,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-106',
      nomorSurat: '420/218/438.5.1/2026',
      instansiPengirim: 'Dinas Pendidikan dan Kebudayaan Kab. Sidoarjo',
      perihal: 'Rapat Koordinasi Gebyar Literasi & Beasiswa Pendidikan Inklusif Kecamatan Candi',
      tanggal: inTwoDays,
      waktuMulai: '09:00',
      waktuSelesai: '11:30',
      lokasi: 'Aula Korwil Dikbud Kec. Candi (Desa Sepande)',
      desaWilayah: 'Sepande',
      pakaian: 'Batik Khas Sidoarjo',
      narahubung: 'Koordinator Wilayah Dikbud Candi (0857-3321-0912)',
      ringkasan: 'Sinkronisasi data anak tidak sekolah dan perluasan program beasiswa daerah di 24 desa se-Kecamatan Candi.',
      status: 'Diwakilkan',
      pejabatId: 'Camat',
      diwakilkanKepadaId: 'Kasi Kesos',
      catatanDisposisi: 'Camat menugaskan Kasi Kesos untuk mewakili sekaligus membawa data verifikasi DTKS desa.',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 95,
      sourceFileName: 'Rakor_Dikbud_Sepande.pdf',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-107',
      nomorSurat: '050/115/438.5.2/2026',
      instansiPengirim: 'Bappeda Kabupaten Sidoarjo',
      perihal: 'Pra-Musrenbang Kecamatan Penyusunan RKPD Tahun Anggaran Mendatang',
      tanggal: inThreeDays,
      waktuMulai: '08:30',
      waktuSelesai: '13:00',
      lokasi: 'Pendopo Kantor Kecamatan Candi',
      desaWilayah: 'Candi',
      pakaian: 'PDH Khaki',
      narahubung: 'Bidang Perencanaan Wilayah Bappeda (0813-5709-2214)',
      ringkasan: 'Verifikasi usulan prioritas infrastruktur jalan lingkungan dan pemberdayaan UMKM dari 24 desa di Kecamatan Candi.',
      status: 'Terverifikasi',
      pejabatId: 'Camat',
      catatanDisposisi: 'Sekcam dan Kasi Pembangunan mendampingi sebagai tim perumus berita acara.',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 97,
      sourceFileName: 'Pra_Musrenbang_Candi_Bappeda.pdf',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-108',
      nomorSurat: '800/098/438.7.2/2026',
      instansiPengirim: 'Badan Kepegawaian Daerah (BKD) Kab. Sidoarjo',
      perihal: 'Sosialisasi Evaluasi Kinerja ASN Berbasis e-Kinerja dan Disiplin Pegawai',
      tanggal: inFourDays,
      waktuMulai: '10:00',
      waktuSelesai: '12:00',
      lokasi: 'Ruang Rapat BKD Kab. Sidoarjo',
      desaWilayah: 'Kabupaten Sidoarjo',
      pakaian: 'Batik Korpri',
      narahubung: 'Subbid Penilaian Kinerja BKD (0812-3004-7721)',
      ringkasan: 'Pemutakhiran indikator kinerja triwulanan ASN Kecamatan Candi dan penyusunan sasaran kinerja pegawai.',
      status: 'Menunggu Disposisi',
      pejabatId: '',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 93,
      sourceFileName: 'Undangan_BKD_eKinerja.pdf',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-109',
      nomorSurat: '412.2/064/DESA-SMK/2026',
      instansiPengirim: 'Pemerintah Desa Sumokali',
      perihal: 'Monitoring Pembangunan Gedung Posyandu Integrasi & Bank Sampah Mandiri',
      tanggal: inFiveDays,
      waktuMulai: '09:00',
      waktuSelesai: '11:00',
      lokasi: 'Dusun Sumokali RT 04 RW 02, Desa Sumokali',
      desaWilayah: 'Sumokali',
      pakaian: 'Batik Bebas Rapi',
      narahubung: 'Kaur Perencanaan Sumokali (0852-3109-6654)',
      ringkasan: 'Penyerapan anggaran Dana Desa tahap akhir untuk fasilitas kesehatan ibu-anak dan pengelolaan sampah terpadu.',
      status: 'Terverifikasi',
      pejabatId: 'Kasi Pembangunan',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 92,
      sourceFileName: 'Monitoring_Sumokali.pdf',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-110',
      nomorSurat: '445/142/PKM-CND/2026',
      instansiPengirim: 'UPTD Puskesmas Candi',
      perihal: 'Lokakarya Mini Lintas Sektor Triwulanan Bidang Kesehatan Masyarakat',
      tanggal: yesterday,
      waktuMulai: '08:30',
      waktuSelesai: '11:30',
      lokasi: 'Aula UPTD Puskesmas Candi, Desa Gelam',
      desaWilayah: 'Gelam',
      pakaian: 'PDH Khaki',
      narahubung: 'dr. Kartika Sari - Ka. Puskesmas Candi (0812-3391-4500)',
      ringkasan: 'Evaluasi capaian imunisasi dasar, posbindu PTM, dan kesiapsiagaan DBD di wilayah kerja Puskesmas Candi.',
      status: 'Selesai',
      pejabatId: 'Kasi Kesos',
      catatanDisposisi: 'Telah dihadiri Kasi Kesos; notulensi diserahkan ke Sekretariat.',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 96,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-111',
      nomorSurat: '141/088/DESA-BLG/2026',
      instansiPengirim: 'Pemerintah Desa Bligo',
      perihal: 'Rapat Koordinasi Penyelesaian Batas Wilayah & Inventarisasi Aset Tanah Kas Desa',
      tanggal: twoDaysAgo,
      waktuMulai: '10:00',
      waktuSelesai: '12:30',
      lokasi: 'Balai Desa Bligo, Kec. Candi',
      desaWilayah: 'Bligo',
      pakaian: 'PDH Khaki',
      narahubung: 'Kades Bligo (0813-3122-9087)',
      ringkasan: 'Verifikasi patok batas desa dan sertifikasi aset tanah kas desa bersama tim agraria kecamatan.',
      status: 'Selesai',
      pejabatId: 'Kasi Pemerintahan',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 95,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-112',
      nomorSurat: '005/309/438.7.2/2026',
      instansiPengirim: 'TP-PKK Kecamatan Candi',
      perihal: 'Pembinaan Administrasi Dasa Wisma & Lomba Kebersihan Lingkungan Desa Sugihwaras',
      tanggal: threeDaysAgo,
      waktuMulai: '09:00',
      waktuSelesai: '11:30',
      lokasi: 'Balai Desa Sugihwaras',
      desaWilayah: 'Sugihwaras',
      pakaian: 'Batik PKK / Batik Dinas',
      narahubung: 'Sekretariat PKK Candi (0856-4510-7782)',
      ringkasan: 'Pendampingan 10 Program Pokok PKK dan evaluasi kampung tangguh kebersihan lingkungan.',
      status: 'Selesai',
      pejabatId: 'Sekcam',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 94,
      sourceFileName: 'Pembinaan_PKK_Sugihwaras.pdf',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-113',
      nomorSurat: '510/041/DESA-KRN/2026',
      instansiPengirim: 'Paguyuban UMKM Desa Karangtanjung',
      perihal: 'Bazar Produk Unggulan Desa & Temu Usaha Koperasi Merah Putih',
      tanggal: inTwoDays,
      waktuMulai: '13:00',
      waktuSelesai: '15:30',
      lokasi: 'Lapangan Desa Karangtanjung',
      desaWilayah: 'Karangtanjung',
      pakaian: 'Batik Sidoarjo',
      narahubung: 'Ketua BUMDes Karangtanjung (0815-5032-1190)',
      ringkasan: 'Penguatan pemasaran digital pelaku UMKM dan fasilitasi NIB OSS RBA di Desa Karangtanjung.',
      status: 'Terverifikasi',
      pejabatId: 'Kasi Pembangunan',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 93,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-114',
      nomorSurat: '005/192/DESA-TGL/2026',
      instansiPengirim: 'Pemerintah Desa Tenggulunan',
      perihal: 'Dialog Warga & Penyerahan Sertifikat PTSL Tahap II Desa Tenggulunan',
      tanggal: inThreeDays,
      waktuMulai: '13:30',
      waktuSelesai: '16:00',
      lokasi: 'Balai Desa Tenggulunan',
      desaWilayah: 'Tenggulunan',
      pakaian: 'PDH Khaki',
      narahubung: 'Panitia PTSL Tenggulunan (0812-3401-6620)',
      ringkasan: 'Penyerahan simbolis 240 bidang sertifikat tanah warga bersama BPN Sidoarjo dan Forkopimka.',
      status: 'Terverifikasi',
      pejabatId: 'Camat',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 97,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ag-115',
      nomorSurat: '028/081/438.7.2/2026',
      instansiPengirim: 'Inspektorat Kabupaten Sidoarjo',
      perihal: 'Rekonsiliasi Barang Milik Daerah & Inventaris Aset Kecamatan Tahun 2026',
      tanggal: tomorrow,
      waktuMulai: '13:00',
      waktuSelesai: '15:00',
      lokasi: 'Ruang Rapat Sekcam Kantor Kecamatan Candi',
      desaWilayah: 'Candi',
      pakaian: 'PDH Khaki',
      narahubung: 'Tim Pengurus Barang Kecamatan (0813-3210-8844)',
      ringkasan: 'Pemeriksaan kesesuaian kartu inventaris barang (KIB) dan penatausahaan aset kantor kecamatan.',
      status: 'Terverifikasi',
      pejabatId: 'Kasubag Umum',
      hasConflict: false,
      conflictWithIds: [],
      aiConfidence: 96,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const initialSettings: SystemSettings = {
    namaInstansi: 'Kantor Kecamatan Candi',
    kabupaten: 'Pemerintah Kabupaten Sidoarjo',
    alamatKantor: 'Jl. Raya Candi No. 12, Kec. Candi, Kabupaten Sidoarjo, Jawa Timur 61271',
    namaCamat: 'H. Ahmad Fauzi, S.STP., M.Si.',
    autoDigestEnabled: true,
    digestTime: '06:30',
    digestRecipients: [
      'camat.candi@sidoarjokab.go.id',
      'sekcam.candi@sidoarjokab.go.id',
      'pemerintahan.candi@sidoarjokab.go.id',
      'pembangunan.candi@sidoarjokab.go.id',
      'kesos.candi@sidoarjokab.go.id',
      'trantib.candi@sidoarjokab.go.id',
      'umum.candi@sidoarjokab.go.id',
    ],
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || 'si-agenda.candi@sidoarjokab.go.id',
  };

  const initialLogs: EmailBroadcastLog[] = [
    {
      id: 'mail-101',
      type: 'digest_pagi',
      subject: `[SI-AGENDA CANDI] Ringkasan Agenda Pimpinan — ${today} (06.30 WIB)`,
      recipients: initialSettings.digestRecipients,
      targetDate: today,
      agendaCount: 3,
      deliveryStatus: 'Pratinjau / Antrean Lokal',
      smtpMessage: 'Siaran otomatis 06.30 WIB disiapkan; lengkapi kredensial SMTP pada Pengaturan untuk relay langsung.',
      sentAt: `${today}T06:30:00.000Z`,
    },
  ];

  return {
    agendas: recomputeConflicts(rawAgendas),
    broadcastLogs: initialLogs,
    briefs: [],
    settings: initialSettings,
  };
}

export function loadDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = createInitialState();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseState;
    parsed.agendas = recomputeConflicts(parsed.agendas || []);
    return parsed;
  } catch (err) {
    console.error('Failed to load DB, initializing fresh state:', err);
    return createInitialState();
  }
}

export function saveDatabase(state: DatabaseState): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const normalized: DatabaseState = {
    ...state,
    agendas: recomputeConflicts(state.agendas),
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
  return normalized;
}
