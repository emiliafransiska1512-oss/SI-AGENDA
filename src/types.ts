export type AgendaStatus =
  | 'Terverifikasi'
  | 'Perlu Review AI'
  | 'Menunggu Disposisi'
  | 'Bentrok Jadwal'
  | 'Diwakilkan'
  | 'Selesai';

export type LeaderRole =
  | 'Camat'
  | 'Sekcam'
  | 'Kasi Pemerintahan'
  | 'Kasi Pembangunan'
  | 'Kasi Kesos'
  | 'Kasi Trantib'
  | 'Kasubag Umum';

export interface LeaderInfo {
  id: LeaderRole;
  nama: string;
  nip: string;
  jabatan: string;
  email: string;
  seksi: string;
}

export interface AgendaItem {
  id: string;
  nomorSurat: string;
  instansiPengirim: string;
  perihal: string;
  tanggal: string; // YYYY-MM-DD
  waktuMulai: string; // HH:mm
  waktuSelesai: string; // HH:mm
  lokasi: string;
  desaWilayah: string;
  pakaian: string;
  narahubung: string;
  ringkasan: string;
  status: AgendaStatus;
  pejabatId: LeaderRole | '';
  diwakilkanKepadaId?: LeaderRole | '';
  catatanDisposisi?: string;
  hasConflict: boolean;
  conflictWithIds: string[];
  aiConfidence?: number;
  sourceFileName?: string;
  sourceFileMime?: string;
  sourceFileDataUrl?: string;
  sourceLetterBody?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailBroadcastLog {
  id: string;
  type: 'digest_pagi' | 'urgent_update';
  subject: string;
  recipients: string[];
  targetDate: string;
  agendaCount: number;
  deliveryStatus: 'Terkirim via SMTP' | 'Pratinjau / Antrean Lokal';
  smtpMessage?: string;
  sentAt: string;
}

export interface SystemSettings {
  namaInstansi: string;
  kabupaten: string;
  alamatKantor: string;
  namaCamat: string;
  autoDigestEnabled: boolean;
  digestTime: string;
  digestRecipients: string[];
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

export interface ManagementBriefResult {
  id: string;
  period: 'mingguan' | 'bulanan';
  generatedAt: string;
  judul: string;
  ringkasanEksekutif: string;
  polaKoordinasi: string[];
  distribusiBebanKerja: string;
  cakupanWilayah: string;
  rekomendasiStrategis: string[];
}

export const DESA_CANDI: readonly string[] = [
  'Balongdowo',
  'Balonggabus',
  'Bligo',
  'Candi',
  'Durungbanjar',
  'Durungbedug',
  'Gelam',
  'Jambangan',
  'Kalipecabean',
  'Karangtanjung',
  'Kebonsari',
  'Kedungkendo',
  'Kedungpeluk',
  'Kendalpecabean',
  'Klurak',
  'Larangan',
  'Ngampelsari',
  'Sepande',
  'Sidodadi',
  'Sugihwaras',
  'Sumokali',
  'Sumorame',
  'Tenggulunan',
  'Wedoroklurak',
] as const;

export const LEADERS: readonly LeaderInfo[] = [
  {
    id: 'Camat',
    nama: 'H. Ahmad Fauzi, S.STP., M.Si.',
    nip: '19780412 199810 1 002',
    jabatan: 'Camat Candi',
    email: 'camat.candi@sidoarjokab.go.id',
    seksi: 'Pimpinan Wilayah',
  },
  {
    id: 'Sekcam',
    nama: 'Dra. Siti Aminah, M.M.',
    nip: '19750921 200003 2 004',
    jabatan: 'Sekretaris Kecamatan',
    email: 'sekcam.candi@sidoarjokab.go.id',
    seksi: 'Sekretariat Kecamatan',
  },
  {
    id: 'Kasi Pemerintahan',
    nama: 'Budi Santoso, S.Sos.',
    nip: '19810315 200604 1 009',
    jabatan: 'Kepala Seksi Pemerintahan',
    email: 'pemerintahan.candi@sidoarjokab.go.id',
    seksi: 'Seksi Pemerintahan',
  },
  {
    id: 'Kasi Pembangunan',
    nama: 'Ir. Hendra Wijaya, M.T.',
    nip: '19820708 200902 1 003',
    jabatan: 'Kepala Seksi Pembangunan & Pemberdayaan',
    email: 'pembangunan.candi@sidoarjokab.go.id',
    seksi: 'Seksi Pembangunan',
  },
  {
    id: 'Kasi Kesos',
    nama: 'Hj. Nurul Hidayah, S.Ag.',
    nip: '19791127 200501 2 007',
    jabatan: 'Kepala Seksi Kesejahteraan Sosial',
    email: 'kesos.candi@sidoarjokab.go.id',
    seksi: 'Seksi Kesos',
  },
  {
    id: 'Kasi Trantib',
    nama: 'Rizky Pratama, S.H.',
    nip: '19840519 201001 1 011',
    jabatan: 'Kepala Seksi Ketenteraman & Ketertiban',
    email: 'trantib.candi@sidoarjokab.go.id',
    seksi: 'Seksi Trantibum',
  },
  {
    id: 'Kasubag Umum',
    nama: 'Dewi Lestari, S.E.',
    nip: '19860214 201101 2 008',
    jabatan: 'Kepala Sub Bagian Umum & Kepegawaian',
    email: 'umum.candi@sidoarjokab.go.id',
    seksi: 'Subbag Umum & Kepegawaian',
  },
] as const;

export const ALL_STATUSES: readonly AgendaStatus[] = [
  'Terverifikasi',
  'Perlu Review AI',
  'Menunggu Disposisi',
  'Bentrok Jadwal',
  'Diwakilkan',
  'Selesai',
] as const;
