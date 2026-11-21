import { sql } from 'drizzle-orm';
import { AppError, canDraw, type Identity } from '@plant/contracts';
import { getDrawingsDb } from './database';
export { getDrawingsDb, closeDrawingsDb } from './database';
export * as drawingsSchema from './schema';
export {
  maxPdfBytes,
  storageConfig,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_SIDE,
  THUMB_MAX_SIDE,
  IMAGE_PASSTHROUGH_MAX_BYTES,
  IMAGE_MAX_INPUT_PIXELS,
  STAGED_TTL_MS,
  type StorageConfig,
} from './config';
export { needsConversion, webpName, type ImageFacts } from './images';
export {
  createStorage,
  getStorage,
  withStorage,
  storageKey,
  thumbKey,
  assertKey,
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

export { listMasters, createMaster, updateMaster, type MasterKind } from './masters';
export {
  createDrawing,
  createLegacyDrawing,
  updateDrawing,
  voidDrawing,
  transferOwner,
  listDrawings,
  libraryOwners,
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
export { listNotifications, markNotificationsRead } from './notifications';
export {
  parseCsv,
  legacyImportRow,
  legacyImportKey,
  type LegacyImportRow,
  type LegacyImportOutcome,
} from './legacy-import';
export {
  createRequest,
  reviewRequest,
  drafterDecision,
  cancelRequest,
  listRequests,
  requestDetail,
  requestImage,
} from './requests';
export { drawingsDashboard, drawingsPortalSummary, drawingsActivity, drawingsDiscovery } from './summary';
