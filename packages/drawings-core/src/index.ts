import { sql } from 'drizzle-orm';
import { AppError, canDraw, wibWeekStarts, type Identity, type PortalSummary } from '@plant/contracts';
import { getDrawingsDb } from './database';
export { getDrawingsDb, closeDrawingsDb } from './database';
export * as drawingsSchema from './schema';
export { maxPdfBytes, storageConfig, IMAGE_MAX_BYTES, STAGED_TTL_MS, type StorageConfig } from './config';
export {
  createStorage,
  getStorage,
  withStorage,
  storageKey,
  FsStorage,
  S3Storage,
  StorageUnavailable,
  type Storage,
  type ByteRange,
} from './storage';
export {
  validatePdf,
  stampPdf,
  stampPlacement,
  stampWidth,
  formatStampTime,
  winAnsiSafe,
  normalizeRotation,
  detectImage,
  serialPdfJob,
  STAMP_HEIGHT,
  STAMP_MARGIN,
  STAMP_GAP,
  type StampSlot,
} from './pdf';
export {
  stageUpload,
  stagedFileForOwner,
  cleanupStagedFiles,
  serveFile,
  parseRange,
  contentDisposition,
  requireUpload,
  requireContentType,
  fileNameFromHeader,
  uploadLimit,
  type UploadKind,
  type StagedFile,
} from './files';

/** Menolak identitas tanpa grant Drawing Database (403). */
export function requireDrawings(actor: Identity) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
}

/** Readiness database: memastikan migrasi `plant_drawings` sudah dijalankan. */
export async function drawingsDatabaseReady() {
  await getDrawingsDb().execute(sql`SELECT id FROM __drizzle_migrations LIMIT 1`);
}

/**
 * Ringkasan kartu Portal. Fase 1 belum mempunyai tabel drawing sehingga semua angka nol;
 * perhitungan dari data nyata ditambahkan pada Fase 5 (PRD §15.4).
 */
export async function drawingsPortalSummary(actor: Identity, now = Date.now()): Promise<PortalSummary> {
  requireDrawings(actor);
  return {
    appId: 'drawings',
    updatedAt: new Date(now).toISOString(),
    headline: {
      label: 'Final Drawing',
      value: 0,
      total: 0,
      unit: 'drawing',
      caption: 'Belum ada Final Drawing.',
      href: '/drawings/library',
    },
    metrics: [],
    attention: [],
    activity: {
      unitSingular: 'drawing',
      weeks: wibWeekStarts(now, 12).map((w) => ({ start: w.start, count: 0 })),
    },
    recent: [],
  };
}
export { listMasters, createMaster, updateMaster, type MasterKind } from './masters';
export {
  createDrawing,
  createLegacyDrawing,
  updateDrawing,
  voidDrawing,
  transferOwner,
  listDrawings,
  drawingTimeline,
  auditList,
  hacSuggestions,
  revisionFile,
  revisionContext,
  type DirectoryPerson,
  type FileIntent,
} from './drawings';
export {
  submitRevision,
  checkRevision,
  decideApproval,
  updateApprovalPlan,
  createRevision,
  cancelRevision,
  drawingDetail,
  listTasks,
  attachmentFile,
  approverCandidates,
} from './approval';
