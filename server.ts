import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  DESA_CANDI,
  LEADERS,
  type AgendaItem,
  type EmailBroadcastLog,
} from './src/types.ts';
import {
  extractSuratWithGemini,
  generateManagementBriefWithGemini,
} from './server/gemini.ts';
import {
  buildDigestHtml,
  dispatchEmailViaSmtp,
  verifySmtpConnection,
} from './server/mailer.ts';
import { loadDatabase, saveDatabase } from './server/store.ts';

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '35mb' }));

  app.get('/api/bootstrap', (_req, res) => {
    const db = loadDatabase();
    res.json({
      agendas: db.agendas,
      broadcastLogs: db.broadcastLogs,
      briefs: db.briefs,
      settings: {
        ...db.settings,
        smtpPass: db.settings.smtpPass ? '••••••••' : '',
        hasSmtpPass: Boolean(db.settings.smtpPass),
      },
      leaders: LEADERS,
      desaList: DESA_CANDI,
    });
  });

  app.post('/api/agendas', (req, res) => {
    try {
      const db = loadDatabase();
      const body = req.body as Partial<AgendaItem>;
      const nowIso = new Date().toISOString();
      const today = formatLocalDate(new Date());

      const newItem: AgendaItem = {
        id: `ag-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nomorSurat: body.nomorSurat || '-',
        instansiPengirim: body.instansiPengirim || '-',
        perihal: body.perihal || 'Agenda Baru',
        tanggal: body.tanggal || today,
        waktuMulai: body.waktuMulai || '09:00',
        waktuSelesai: body.waktuSelesai || '11:00',
        lokasi: body.lokasi || '-',
        desaWilayah: body.desaWilayah || 'Candi',
        pakaian: body.pakaian || 'PDH / Menyesuaikan',
        narahubung: body.narahubung || '-',
        ringkasan: body.ringkasan || '-',
        status:
          body.status ||
          (body.pejabatId ? 'Terverifikasi' : 'Menunggu Disposisi'),
        pejabatId: body.pejabatId || '',
        diwakilkanKepadaId: body.diwakilkanKepadaId || '',
        catatanDisposisi: body.catatanDisposisi || '',
        hasConflict: false,
        conflictWithIds: [],
        aiConfidence: body.aiConfidence,
        sourceFileName: body.sourceFileName,
        sourceFileMime: body.sourceFileMime,
        sourceFileDataUrl: body.sourceFileDataUrl,
        sourceLetterBody: body.sourceLetterBody,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.agendas = [newItem, ...db.agendas];
      const saved = saveDatabase(db);
      const created = saved.agendas.find((a) => a.id === newItem.id) || newItem;
      res.status(201).json({ item: created, agendas: saved.agendas });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menyimpan agenda.',
      });
    }
  });

  app.put('/api/agendas/:id', (req, res) => {
    try {
      const db = loadDatabase();
      const { id } = req.params;
      const idx = db.agendas.findIndex((a) => a.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Agenda tidak ditemukan.' });
      }

      const patch = req.body as Partial<AgendaItem>;
      const existing = db.agendas[idx];
      const updated: AgendaItem = {
        ...existing,
        ...patch,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };

      db.agendas[idx] = updated;
      const saved = saveDatabase(db);
      const refreshed = saved.agendas.find((a) => a.id === id) || updated;
      res.json({ item: refreshed, agendas: saved.agendas });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal memperbarui agenda.',
      });
    }
  });

  app.delete('/api/agendas/:id', (req, res) => {
    try {
      const db = loadDatabase();
      const { id } = req.params;
      db.agendas = db.agendas.filter((a) => a.id !== id);
      const saved = saveDatabase(db);
      res.json({ agendas: saved.agendas });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menghapus agenda.',
      });
    }
  });

  app.post('/api/extract', async (req, res) => {
    try {
      const { files } = req.body as {
        files: Array<{
          fileName: string;
          mimeType?: string;
          dataUrl?: string;
          rawText?: string;
        }>;
      };

      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Tidak ada berkas atau teks surat yang dikirim.' });
      }

      const db = loadDatabase();
      const today = formatLocalDate(new Date());
      const createdItems: AgendaItem[] = [];

      for (const file of files) {
        let base64Data: string | undefined;
        let mimeType = file.mimeType;

        if (file.dataUrl && file.dataUrl.includes(',')) {
          const [header, b64] = file.dataUrl.split(',');
          base64Data = b64;
          if (!mimeType) {
            const match = header.match(/data:([^;]+);/);
            if (match) mimeType = match[1];
          }
        }

        const extracted = await extractSuratWithGemini({
          fileName: file.fileName,
          mimeType,
          base64Data,
          rawText: file.rawText,
          todayDate: today,
        });

        const nowIso = new Date().toISOString();
        const needsReview = extracted.aiConfidence < 85 || extracted.nomorSurat === '-' || extracted.lokasi === '-';

        const newItem: AgendaItem = {
          id: `ag-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          nomorSurat: extracted.nomorSurat,
          instansiPengirim: extracted.instansiPengirim,
          perihal: extracted.perihal,
          tanggal: extracted.tanggal,
          waktuMulai: extracted.waktuMulai,
          waktuSelesai: extracted.waktuSelesai,
          lokasi: extracted.lokasi,
          desaWilayah: extracted.desaWilayah,
          pakaian: extracted.pakaian,
          narahubung: extracted.narahubung,
          ringkasan: extracted.ringkasan,
          status: needsReview ? 'Perlu Review AI' : 'Menunggu Disposisi',
          pejabatId: extracted.rekomendasiPejabat || '',
          hasConflict: false,
          conflictWithIds: [],
          aiConfidence: extracted.aiConfidence,
          sourceFileName: file.fileName,
          sourceFileMime: mimeType,
          sourceFileDataUrl: file.dataUrl,
          sourceLetterBody: file.rawText,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        db.agendas = [newItem, ...db.agendas];
        createdItems.push(newItem);
      }

      const saved = saveDatabase(db);
      const refreshedItems = createdItems.map(
        (c) => saved.agendas.find((a) => a.id === c.id) || c
      );

      res.json({
        extractedItems: refreshedItems,
        agendas: saved.agendas,
      });
    } catch (err) {
      console.error('Extract error:', err);
      const msg = err instanceof Error ? err.message : 'Ekstraksi AI gagal diproses.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/brief', async (req, res) => {
    try {
      const { period } = req.body as { period: 'mingguan' | 'bulanan' };
      const db = loadDatabase();
      const today = formatLocalDate(new Date());

      const brief = await generateManagementBriefWithGemini({
        period: period === 'bulanan' ? 'bulanan' : 'mingguan',
        agendas: db.agendas,
        todayDate: today,
      });

      db.briefs = [brief, ...db.briefs.slice(0, 9)];
      saveDatabase(db);

      res.json({ brief, briefs: db.briefs });
    } catch (err) {
      console.error('Brief generation error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menyusun Management Brief.',
      });
    }
  });

  app.post('/api/email/preview', (req, res) => {
    const { type, targetDate, customNote } = req.body as {
      type: 'digest_pagi' | 'urgent_update';
      targetDate?: string;
      customNote?: string;
    };
    const db = loadDatabase();
    const date = targetDate || formatLocalDate(new Date());
    const dayAgendas = db.agendas
      .filter((a) => a.tanggal === date)
      .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

    const { subject, html } = buildDigestHtml({
      type: type === 'urgent_update' ? 'urgent_update' : 'digest_pagi',
      targetDate: date,
      agendas: dayAgendas,
      settings: db.settings,
      customNote,
    });

    res.json({
      subject,
      html,
      agendaCount: dayAgendas.length,
      recipients: db.settings.digestRecipients,
    });
  });

  app.post('/api/email/send', async (req, res) => {
    try {
      const { type, targetDate, recipients, customNote } = req.body as {
        type: 'digest_pagi' | 'urgent_update';
        targetDate?: string;
        recipients?: string[];
        customNote?: string;
      };
      const db = loadDatabase();
      const date = targetDate || formatLocalDate(new Date());
      const targetRecipients =
        Array.isArray(recipients) && recipients.length > 0
          ? recipients
          : db.settings.digestRecipients;

      const dayAgendas = db.agendas
        .filter((a) => a.tanggal === date)
        .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

      const { subject, html } = buildDigestHtml({
        type: type === 'urgent_update' ? 'urgent_update' : 'digest_pagi',
        targetDate: date,
        agendas: dayAgendas,
        settings: db.settings,
        customNote,
      });

      const result = await dispatchEmailViaSmtp({
        settings: db.settings,
        recipients: targetRecipients,
        subject,
        html,
      });

      const log: EmailBroadcastLog = {
        id: `mail-${Date.now()}`,
        type: type === 'urgent_update' ? 'urgent_update' : 'digest_pagi',
        subject,
        recipients: targetRecipients,
        targetDate: date,
        agendaCount: dayAgendas.length,
        deliveryStatus: result.delivered
          ? 'Terkirim via SMTP'
          : 'Pratinjau / Antrean Lokal',
        smtpMessage: result.message,
        sentAt: new Date().toISOString(),
      };

      db.broadcastLogs = [log, ...db.broadcastLogs];
      saveDatabase(db);

      res.json({ log, broadcastLogs: db.broadcastLogs });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal mengirim email dinas.',
      });
    }
  });

  app.post('/api/email/test-smtp', async (_req, res) => {
    try {
      const db = loadDatabase();
      const result = await verifySmtpConnection(db.settings);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        message: err instanceof Error ? err.message : 'Verifikasi SMTP gagal.',
      });
    }
  });

  app.put('/api/settings', (req, res) => {
    try {
      const db = loadDatabase();
      const incoming = req.body as Partial<typeof db.settings>;
      const nextPass =
        incoming.smtpPass && incoming.smtpPass !== '••••••••'
          ? incoming.smtpPass
          : db.settings.smtpPass;

      db.settings = {
        ...db.settings,
        ...incoming,
        smtpPass: nextPass,
      };
      saveDatabase(db);

      res.json({
        settings: {
          ...db.settings,
          smtpPass: db.settings.smtpPass ? '••••••••' : '',
          hasSmtpPass: Boolean(db.settings.smtpPass),
        },
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SI-AGENDA CANDI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
