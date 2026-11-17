import nodemailer from 'nodemailer';
import { LEADERS, type AgendaItem, type SystemSettings } from '../src/types.ts';

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLeaderLabel(id: string): string {
  const found = LEADERS.find((l) => l.id === id);
  return found ? found.jabatan : id || 'Belum Ditunjuk';
}

export function buildDigestHtml(params: {
  type: 'digest_pagi' | 'urgent_update';
  targetDate: string;
  agendas: AgendaItem[];
  settings: SystemSettings;
  customNote?: string;
}): { subject: string; html: string } {
  const { type, targetDate, agendas, settings, customNote } = params;
  const conflicts = agendas.filter((a) => a.hasConflict);
  const isUrgent = type === 'urgent_update';

  const subject = isUrgent
    ? `[MENDESAK] Pembaruan & Peringatan Jadwal Pimpinan Kecamatan Candi — ${targetDate}`
    : `[SI-AGENDA CANDI] Ringkasan Agenda Pimpinan — ${targetDate} (${settings.digestTime} WIB)`;

  const statusColor = (status: AgendaItem['status']) => {
    switch (status) {
      case 'Terverifikasi':
      case 'Selesai':
        return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
      case 'Bentrok Jadwal':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      case 'Perlu Review AI':
      case 'Menunggu Disposisi':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
      case 'Diwakilkan':
        return { bg: '#E0F2FE', text: '#075985', border: '#7DD3FC' };
    }
  };

  const rowsHtml =
    agendas.length === 0
      ? `<tr><td style="padding:24px;text-align:center;color:#64748B;font-size:14px;">Tidak ada agenda terjadwal pada tanggal ${escapeHtml(targetDate)}.</td></tr>`
      : agendas
          .map((item) => {
            const sc = statusColor(item.status);
            const pic =
              item.status === 'Diwakilkan' && item.diwakilkanKepadaId
                ? `${escapeHtml(getLeaderLabel(item.pejabatId))} &rarr; Diwakilkan kepada <strong>${escapeHtml(getLeaderLabel(item.diwakilkanKepadaId))}</strong>`
                : `<strong>${escapeHtml(getLeaderLabel(item.pejabatId))}</strong>`;

            return `
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;vertical-align:top;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:#0F294A;padding-bottom:6px;">
                    ${escapeHtml(item.waktuMulai)} – ${escapeHtml(item.waktuSelesai)} WIB
                    &nbsp;&nbsp;
                    <span style="display:inline-block;padding:2px 8px;font-family:sans-serif;font-size:11px;font-weight:600;border-radius:4px;background:${sc.bg};color:${sc.text};border:1px solid ${sc.border};">
                      ${escapeHtml(item.status)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px;font-weight:700;color:#0F172A;line-height:1.4;padding-bottom:6px;">
                    ${escapeHtml(item.perihal)}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#334155;line-height:1.6;">
                    <div><strong>Pengirim:</strong> ${escapeHtml(item.instansiPengirim)} (${escapeHtml(item.nomorSurat)})</div>
                    <div><strong>Lokasi:</strong> ${escapeHtml(item.lokasi)} · Wilayah: ${escapeHtml(item.desaWilayah)}</div>
                    <div><strong>Disposisi:</strong> ${pic}</div>
                    <div><strong>Pakaian:</strong> ${escapeHtml(item.pakaian)} · <strong>Narahubung:</strong> ${escapeHtml(item.narahubung)}</div>
                    ${item.catatanDisposisi ? `<div style="margin-top:6px;padding:8px 10px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;color:#1E293B;"><strong>Catatan Pimpinan:</strong> ${escapeHtml(item.catatanDisposisi)}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
          })
          .join('');

  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Public Sans',Arial,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background-color:#FFFFFF;border:1px solid #CBD5E1;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:${isUrgent ? '#991B1B' : '#0F294A'};padding:22px 24px;color:#FFFFFF;">
              <div style="font-size:12px;letter-spacing:0.06em;opacity:0.88;font-weight:600;">
                ${escapeHtml(settings.kabupaten.toUpperCase())} · ${escapeHtml(settings.namaInstansi.toUpperCase())}
              </div>
              <div style="font-size:20px;font-weight:700;margin-top:6px;">
                ${isUrgent ? 'Siaran Mendesak Pembaruan Agenda Pimpinan' : 'Ringkasan Agenda Harian Pimpinan (06.30 WIB)'}
              </div>
              <div style="font-size:13px;opacity:0.9;margin-top:4px;">
                Tanggal Pelaksanaan: ${escapeHtml(targetDate)} · Total ${agendas.length} Kegiatan
              </div>
            </td>
          </tr>

          ${
            conflicts.length > 0
              ? `<tr>
                  <td style="background-color:#FEF2F2;border-bottom:1px solid #FECACA;padding:14px 24px;color:#991B1B;font-size:13px;line-height:1.5;">
                    <strong>Peringatan Bentrok Jadwal (${conflicts.length} agenda):</strong> Ditemukan jadwal tumpang tindih pada pejabat yang sama. Mohon koordinasi pendelegasian melalui modul Disposisi Pejabat SI-AGENDA CANDI.
                  </td>
                </tr>`
              : ''
          }

          ${
            customNote
              ? `<tr>
                  <td style="background-color:#EFF6FF;border-bottom:1px solid #BFDBFE;padding:14px 24px;color:#1E3A8A;font-size:13px;line-height:1.5;">
                    <strong>Catatan Pengantar Sekretariat:</strong> ${escapeHtml(customNote)}
                  </td>
                </tr>`
              : ''
          }

          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#F8FAFC;padding:18px 24px;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;line-height:1.6;">
              <div><strong>${escapeHtml(settings.namaInstansi)}</strong> — ${escapeHtml(settings.alamatKantor)}</div>
              <div>Dikirim otomatis oleh Gateway Email Dinas SI-AGENDA CANDI Versi 2.0 (Standar SPBE).</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

export async function dispatchEmailViaSmtp(params: {
  settings: SystemSettings;
  recipients: string[];
  subject: string;
  html: string;
}): Promise<{ delivered: boolean; message: string }> {
  const { settings, recipients, subject, html } = params;

  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    return {
      delivered: false,
      message:
        'Kredensial SMTP belum lengkap di Pengaturan. Email disimpan sebagai Pratinjau / Antrean Lokal.',
    };
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: settings.smtpFrom || settings.smtpUser,
    to: recipients.join(', '),
    subject,
    html,
  });

  return {
    delivered: true,
    message: `Terkirim melalui ${settings.smtpHost} (Message-ID: ${info.messageId})`,
  };
}

export async function verifySmtpConnection(settings: SystemSettings): Promise<{ ok: boolean; message: string }> {
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    return {
      ok: false,
      message: 'Host, Username, dan Password SMTP wajib diisi terlebih dahulu.',
    };
  }
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });
  await transporter.verify();
  return {
    ok: true,
    message: `Koneksi SMTP ke ${settings.smtpHost}:${settings.smtpPort} terverifikasi.`,
  };
}
