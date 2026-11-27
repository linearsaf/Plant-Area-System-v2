import type { Identity } from './index';

export const consumablesRoles = ['viewer', 'operator', 'storekeeper', 'admin'] as const;
export type ConsumablesRole = (typeof consumablesRoles)[number];
export type ConsumablesGrant = { appId: 'consumables'; role: ConsumablesRole };
export type StockAction = 'read' | 'issue' | 'return' | 'receive' | 'onbehalf' | 'manage' | 'audit';
export function canConsume(actor: Identity, action: StockAction) {
  if (!['read', 'issue', 'return', 'receive', 'onbehalf', 'manage', 'audit'].includes(action)) return false;
  if (actor.mustChangePassword) return false;
  const g = actor.grants.find((v) => v.appId === 'consumables');
  if (!g || !consumablesRoles.includes(g.role)) return false;
  if (g.role === 'admin') return true;
  if (action === 'read') return true;
  if (action === 'issue' || action === 'return') return g.role === 'operator' || g.role === 'storekeeper';
  return (action === 'receive' || action === 'onbehalf') && g.role === 'storekeeper';
}
const SCALE = 1_000_000n;
const MAX = 999_999_999_999_999_999n;
export function decimalUnits(value: unknown, signed = false): bigint {
  if (
    typeof value !== 'string' ||
    !(signed ? /^-?\d{1,12}(\.\d{1,6})?$/ : /^\d{1,12}(\.\d{1,6})?$/).test(value)
  )
    throw new Error('Jumlah harus berupa desimal, maksimal 12 digit dan 6 angka pecahan.');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace('-', '').split('.');
  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
  if (units > MAX) throw new Error('Jumlah melampaui kapasitas.');
  return negative ? -units : units;
}
export function decimalString(units: bigint): string {
  if (units > MAX || units < -MAX) throw new Error('Jumlah melampaui kapasitas.');
  const n = units < 0 ? -units : units;
  return `${units < 0 ? '-' : ''}${n / SCALE}.${String(n % SCALE).padStart(6, '0')}`;
}
export function localDecimal(value: string) {
  return value.trim().replace(',', '.');
}
export function formatQuantity(value: string): string {
  const [whole, fraction] = decimalString(decimalUnits(value, true)).split('.');
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') +
    (fraction.replace(/0+$/, '') ? ',' + fraction.replace(/0+$/, '') : '')
  );
}
export type Material = {
  id: string;
  mmid: string;
  description: string;
  commonName: string;
  unit: string;
  sapUnit: string;
  aliases: string;
  decimalAllowed: boolean;
  conversionReviewed: boolean;
  unitLocked?: boolean;
  inStock?: boolean;
  category: string;
  mrpType: string;
  critical: boolean;
  packSize: string | null;
  active: boolean;
  version: number;
  sourceBatch: string | null;
  sourceDate: string | null;
};
export type InventoryItem = Material & {
  inventoryId: string;
  rack: string;
  quantity: string;
  initialized: boolean;
  inventoryActive: boolean;
  inventoryVersion: number;
};
export type Movement = {
  id: string;
  materialId: string;
  inventoryId?: string;
  mmid: string;
  description: string;
  unit: string;
  type: 'opening' | 'receipt' | 'issue' | 'return' | 'adjustment' | 'loan_out' | 'loan_in' | 'loan_return';
  documentId?: string | null;
  lineNo?: number | null;
  commonName?: string | null;
  sapUnit?: string | null;
  sapQuantity?: string | null;
  workArea?: string;
  borrowedFromArea?: string;
  loanId?: string | null;
  quantity: string;
  balanceAfter: string;
  packs: number | null;
  packSize: string | null;
  reference: string;
  wo: string;
  job: string;
  reason: string;
  actorId: string;
  actorName: string;
  createdAt: string;
};

export const R22_SHARED_AREA = 'Umum R22' as const;
export const R22_WORK_AREAS = ['RMP', 'RMK 1', 'RMK 2', 'FMD', 'Tool & Utility', R22_SHARED_AREA] as const;
export type R22WorkArea = (typeof R22_WORK_AREAS)[number];
export function isSharedWorkArea(area: string | null | undefined): boolean {
  const v = (area || '').trim();
  return v === '' || v === R22_SHARED_AREA;
}
export function workAreaLabel(area: string | null | undefined): string {
  const v = (area || '').trim();
  return v === '' ? R22_SHARED_AREA : v;
}
export const R22_COST_CENTERS = [
  { code: '10410', description: 'TQ-RME Limestone' },
  { code: '10430', description: 'TQ-RME Clay' },
  { code: '10440', description: 'TQ-Clay for Sale' },
  { code: '20410', description: 'TQ-RMP Limestone Clay Mix' },
  { code: '29400', description: 'TQ-Quarry Transportation of Limestone' },
  { code: '30410', description: 'TQ1-Raw Meal Preparation' },
  { code: '30420', description: 'TQ2-Raw Meal Preparation' },
  { code: '40410', description: 'TQ1-Clinker Production' },
  { code: '40420', description: 'TQ2-Clinker Production' },
  { code: '50410', description: 'TQ1-Cement Grinding' },
  { code: '50420', description: 'TQ2-Cement Grinding' },
  { code: '60400', description: 'TQ-Packhouse' },
  { code: '60460', description: 'TQ-Jetty' },
  { code: '73005', description: 'TQ-Waterway Distribution' },
  { code: '91035', description: 'TQ-Community Relations (Tuban)' },
  { code: 'C0400', description: 'TQ-Production Management / Plant Mgt' },
  { code: 'C0402', description: 'TQ-Process Engineering / Plant Mgt' },
  { code: 'D0400', description: 'TQ-Plant Admin Services/GPS' },
  { code: 'D0401', description: 'TQ-Environment & Quality' },
  { code: 'D0402', description: 'TQ-Occupational Healthy Safety' },
  { code: 'F0400', description: 'TQ-Parts & Supplies Management' },
  { code: 'G0420', description: 'TQ-Mechanical/Plant Maintenance&Worksho' },
  { code: 'G0430', description: 'TQ-Electrical/Plant Maintenance-Worksho' },
  { code: 'G0440', description: 'TQ-Reliability/Plnt Maintenance-Worksho' },
  { code: 'H0400', description: 'TQ-Laboratory/Quality Control Lab.' },
  { code: 'J0400', description: 'TQ-Inbound Transport From Jetty to Stora' },
  { code: 'K0410', description: 'TQ1-Gypsum, Additive Prep. & Handling' },
  { code: 'K0420', description: 'TQ2-Gypsum, Additive Prep. & Handling' },
  { code: 'L0410', description: 'TQ1-Traditional Fuel Prep & Handling' },
  { code: 'L0420', description: 'TQ2-Traditional Fuel Prep & Handling' },
  { code: 'M0400', description: 'TQ-Compress Air-Pum' },
  { code: 'V0410', description: 'TQ1-Alt Fuel CO-Processing' },
  { code: 'V0411', description: 'TQ1-Alt Fuel Storage & Handling' },
  { code: 'V0420', description: 'TQ2-Alt Fuel CO-Processing' },
  { code: 'V0421', description: 'TQ2-Alt Fuel Storage & Handling' },
  { code: 'X0401', description: 'TQ1-Corrective Preparation & Handling.' },
  { code: 'X0402', description: 'TQ2-Corrective Preparation & Handling.' },
  { code: 'X0403', description: 'TQ1-Alt Raw Mat CO-Processing' },
  { code: 'X0404', description: 'TQ2-Alt Raw Mat CO-Processing' },
  { code: 'X0405', description: 'TQ1-Alt Raw Mat Storage & handling' },
  { code: 'X0406', description: 'TQ2-Alt Raw Mat Storage & handling' },
  { code: '10450', description: 'TQ-Limestone for Sale' },
  { code: '10451', description: 'TQ-Dolomite for Sale' },
] as const;
export type R22CostCenter = (typeof R22_COST_CENTERS)[number];
export function costCenterLabel(code: string | null | undefined): string {
  const v = (code || '').trim();
  if (!v) return '';
  const found = R22_COST_CENTERS.find((item) => item.code === v);
  return found ? `${found.code} — ${found.description}` : v;
}
export const HEC_PATTERN = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;
export function normalizeHec(value: string) {
  return value.trim().toUpperCase().replace(/^TQ\./, '');
}
export const COUNT_UNITS = [
  'EA',
  'PC',
  'PCS',
  'SET',
  'BH',
  'BUAH',
  'UNIT',
  'ROL',
  'ROLL',
  'CAN',
  'TBE',
  'BTL',
  'BOX',
  'PAK',
  'PACK',
] as const;
export function allowsDecimals(unit: string) {
  return !(COUNT_UNITS as readonly string[]).includes(unit.trim().toUpperCase());
}
export function normalizeAliases(value: string) {
  const result: string[] = [];
  for (const raw of value.split(',')) {
    const alias = raw.trim();
    if (!alias) continue;
    if (alias.length > 40) throw Error('Setiap alias maksimal 40 karakter.');
    if (!result.some((v) => v.toLocaleLowerCase() === alias.toLocaleLowerCase())) result.push(alias);
  }
  if (result.length > 10) throw Error('Maksimal 10 alias per material.');
  return result.join(', ');
}
export function validateCountQuantity(value: string, decimalAllowed: boolean) {
  const units = decimalUnits(value);
  if (!decimalAllowed && units % SCALE !== 0n) throw Error('Material ini hanya menerima jumlah bulat.');
  return decimalString(units);
}
export function validateStockQuantity(value: string, decimalAllowed: boolean) {
  const units = decimalUnits(value);
  if (units <= 0n) throw Error('Jumlah harus lebih besar dari nol.');
  if (!decimalAllowed && units % SCALE !== 0n) throw Error('Material ini hanya menerima jumlah bulat.');
  return decimalString(units);
}
export function sapToR22(
  value: string,
  material: Pick<Material, 'unit' | 'sapUnit' | 'packSize' | 'decimalAllowed'>,
) {
  const input = decimalUnits(value);
  if (input <= 0n) throw Error('Jumlah SAP harus lebih besar dari nol.');
  const factor =
    material.packSize ?? (material.sapUnit.toUpperCase() === material.unit.toUpperCase() ? '1' : null);
  if (!factor) throw Error('Konversi SAP belum diatur. Gunakan input satuan R22 atau hubungi admin.');
  const product = input * decimalUnits(factor);
  if (product % SCALE !== 0n)
    throw Error('Hasil konversi melebihi enam desimal. Gunakan satuan R22 atau perbaiki konversi.');
  return validateStockQuantity(decimalString(product / SCALE), material.decimalAllowed);
}
export const stockDocumentLabels = {
  consume: 'Consume Order',
  return: 'Return Order',
  picklist: 'Penerimaan Picklist',
} as const;
export type StockDocumentType = keyof typeof stockDocumentLabels;
export type StockDocument = {
  id: string;
  number: string;
  type: StockDocumentType;
  workArea?: string;
  borrowCount?: number;
  hec: string;
  wo: string;
  note: string;
  channel: 'self' | 'cashier';
  requesterName: string;
  requesterNik: string;
  sourceRef: string;
  reservationNo: string;
  equipmentNo: string;
  functionalLocation: string;
  costCenter: string;
  requiredDate: string | null;
  lineCount: number;
  actorId: string;
  actorName: string;
  createdAt: string;
};
export type StockDocumentLine = Movement & { documentId: string; lineNo: number };
export type DocumentResult = {
  document: StockDocument;
  lines: StockDocumentLine[];
  loans?: StockLoan[];
  replayed?: boolean;
  previousDocuments?: StockDocument[];
};
export type StockLineConflict = {
  lineNo: number;
  materialId: string;
  inventoryId?: string;
  mmid: string;
  available: string;
  requested: string;
  error: string;
};
export type AreaStockOption = {
  inventoryId: string;
  rack: string;
  quantity: string;
  initialized: boolean;
  inventoryActive: boolean;
};
export type MaterialSearchResult = Material & {
  inventoryId: string | null;
  rack: string;
  quantity: string;
  initialized: boolean;
  inventoryActive: boolean;
  otherAreas?: AreaStockOption[];
};
export type StockLoanStatus = 'open' | 'partial' | 'settled';
export type LoanRepaymentMethod = 'transfer' | 'physical_return';
export const stockLoanStatusLabels: Record<StockLoanStatus, string> = {
  open: 'Belum lunas',
  partial: 'Sebagian',
  settled: 'Lunas',
};
export const loanRepaymentMethodLabels: Record<LoanRepaymentMethod, string> = {
  transfer: 'Transfer dari stok area peminjam',
  physical_return: 'Pengembalian fisik ke area pemberi',
};
export type StockLoan = {
  id: string;
  number: string;
  documentId: string;
  documentNumber?: string;
  movementId: string;
  materialId: string;
  lenderInventoryId: string;
  borrowerArea: string;
  lenderArea: string;
  mmid: string;
  description: string;
  commonName: string;
  unit: string;
  decimalAllowed?: boolean;
  hec: string;
  wo: string;
  requesterName: string;
  requesterNik: string;
  quantity: string;
  returnedQuantity: string;
  remainingQuantity: string;
  status: StockLoanStatus;
  note: string;
  actorId: string;
  actorName: string;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
};
export type StockLoanRepayment = {
  id: string;
  loanId: string;
  method: LoanRepaymentMethod;
  quantity: string;
  borrowerInventoryId: string | null;
  lenderInventoryId: string;
  outMovementId: string | null;
  inMovementId: string;
  note: string;
  actorId: string;
  actorName: string;
  createdAt: string;
};
export type StockLoanDetail = {
  loan: StockLoan;
  repayments: StockLoanRepayment[];
  borrowerStock: InventoryItem | null;
  lenderStock: InventoryItem | null;
};
export function canonicalDocumentPayload(value: Record<string, unknown>): string {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .filter(([, x]) => x !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, canonical(x)]),
      );
    return v;
  };
  return JSON.stringify(canonical(value));
}
export type StockDashboard = {
  operational: number;
  available: number;
  empty: number;
  criticalEmpty: number;
  uncounted: number;
  activeLoans?: number;
  year: number;
  currentYear: number;
  series: {
    quarter: number;
    opening: number;
    consume: number;
    return: number;
    picklist: number;
    adjustment: number;
  }[];
  legacyMovementCount: number;
  recent: StockDocument[];
};
