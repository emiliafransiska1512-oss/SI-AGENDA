import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileSearch,
  UserCheck,
} from 'lucide-react';
import type { AgendaStatus } from '../types.ts';

interface StatusBadgeProps {
  status: AgendaStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const styles: Record<
    AgendaStatus,
    { classes: string; Icon: typeof CheckCircle2 }
  > = {
    Terverifikasi: {
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Icon: CheckCircle2,
    },
    Selesai: {
      classes: 'bg-teal-50 text-teal-900 border-teal-200',
      Icon: CheckCheck,
    },
    'Perlu Review AI': {
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: FileSearch,
    },
    'Menunggu Disposisi': {
      classes: 'bg-orange-50 text-orange-800 border-orange-200',
      Icon: Clock,
    },
    'Bentrok Jadwal': {
      classes: 'bg-red-50 text-red-800 border-red-300',
      Icon: AlertTriangle,
    },
    Diwakilkan: {
      classes: 'bg-sky-50 text-sky-800 border-sky-200',
      Icon: UserCheck,
    },
  };

  const { classes, Icon } = styles[status] || styles['Menunggu Disposisi'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-medium whitespace-nowrap shrink-0 ${
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
      } ${classes}`}
    >
      <Icon className={compact ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{status}</span>
    </span>
  );
}

export function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTanggalId(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return dt.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
