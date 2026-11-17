import { Icon } from '@plant/ui';
import { revisionStatusLabels, revisionStatusTone, type RevisionStatus } from '@plant/contracts';
// Status tidak menambah palet: arti selalu dibawa label teks (PRD §9).
const toneClass = {
  neutral: 'neutral',
  waiting: 'neutral',
  attention: 'orange',
  final: 'success',
  muted: 'neutral muted',
};
export function StatusBadge({ status }: { status: RevisionStatus }) {
  const tone = revisionStatusTone(status);
  return (
    <span className={`badge ${toneClass[tone]} drawing-status`} data-status={status}>
      {tone === 'waiting' && <Icon name="clock" aria-hidden="true" />}
      {revisionStatusLabels[status]}
    </span>
  );
}
/** Badge generik untuk status revisi atau request yang sudah berlabel. */
export function ToneBadge({
  label,
  tone,
  status,
}: {
  label: string;
  tone: keyof typeof toneClass;
  status?: string;
}) {
  return (
    <span className={`badge ${toneClass[tone]} drawing-status`} data-status={status}>
      {tone === 'waiting' && <Icon name="clock" aria-hidden="true" />}
      {label}
    </span>
  );
}
/**
 * Status drawing di daftar dan judul. Void tidak mengubah status revisi (revisi tetap Completed),
 * jadi drawing yang dibatalkan harus diberi label sendiri agar tidak terbaca sebagai dokumen berlaku.
 */
export function DrawingStatusBadge({ status, voided }: { status: RevisionStatus; voided: boolean }) {
  return voided ? (
    <ToneBadge label="Dibatalkan" tone="muted" status="voided" />
  ) : (
    <StatusBadge status={status} />
  );
}
export function LegacyBadge() {
  return <span className="badge neutral">Legacy Ready</span>;
}
