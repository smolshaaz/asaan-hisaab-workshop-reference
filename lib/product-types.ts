import type {
  Address,
  DocumentKind,
  DocumentStatus,
  FiscalDocumentType,
  LineItem,
  Party,
} from "./types";

export interface CustomerRecord extends Party {
  id: string;
  status: "ACTIVE" | "ARCHIVED";
  phone?: string;
  outstanding: number;
  promiseDate?: string;
  promiseStatus?: PromiseStatus;
  promiseHistory: PromiseHistoryItem[];
  createdAt: string;
}

export type PromiseStatus = "OPEN" | "KEPT" | "MOVED" | "BROKEN";

export interface PromiseHistoryItem {
  date: string;
  status: PromiseStatus;
  changedAt: string;
  previousDate?: string;
}

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  unitCode: string;
  unitPrice: number;
  vatCategory: "S" | "Z" | "E" | "O";
  vatRate: number;
  active: boolean;
  createdAt: string;
}

export interface QuotationRecord {
  id: string;
  number: string;
  customerId: string;
  vehicleId?: string;
  customer: CustomerRecord;
  issueDate: string;
  expiryDate?: string;
  taxEnabled: boolean;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CONVERTED";
  currency: "SAR";
  lines: LineItem[];
  notes: string;
  terms: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  convertedInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  customerId: string;
  vehicleId?: string;
  customer: CustomerRecord;
  seller: Party;
  kind: DocumentKind;
  documentType: FiscalDocumentType;
  status: DocumentStatus;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "WRITTEN_OFF";
  issueDate: string;
  supplyDate?: string;
  dueDate?: string;
  currency: "SAR";
  lines: LineItem[];
  notes: string;
  paymentTerms: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  paidAmount: number;
  badDebtAmount: number;
  badDebtAt?: string;
  quotationId?: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  adjustmentReason?: string;
  uuid?: string;
  counter?: number;
  previousHash?: string;
  xmlHash?: string;
  archivedXml?: string;
  officialHash?: string;
  signedXml?: string;
  officialArtifactAt?: string;
  qrBase64?: string;
  reportingDeadline?: string;
  zatcaRequestId?: string;
  zatcaResponse?: SubmissionOutboxResponseEvidence;
  clearedInvoice?: string;
  zatcaResponseAt?: string;
  submissionLastError?: string;
  immutableAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerId: string;
  dailyEntryId?: string;
  ledgerEntryId?: string;
  sourceEntryId?: string;
  handlerPersonId?: string;
  payerPersonId?: string;
  payerName?: string;
  source?: "WORKSHOP" | "WORKER" | "ADVANCE" | "OFFSET";
  reversalOf?: string;
  reversedBy?: string;
  reversalReason?: string;
  amount: number;
  method: "BANK_TRANSFER" | "CARD" | "CASH" | "CHEQUE" | "OTHER" | "OFFSET";
  reference: string;
  paidAt: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  number: string;
  vendor: string;
  category: string;
  expenseDate: string;
  description: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  status: "DRAFT" | "RECORDED";
  createdAt: string;
}

export interface VehicleRecord {
  representativePersonId?: string;
  representativeName?: string;
  representativePhone?: string;
  id: string;
  plateNumber: string;
  /** A readable reference even before a plate number is known. */
  displayName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  vin?: string;
  odometer?: string;
  notes?: string;
  promiseDate?: string;
  promiseStatus?: PromiseStatus;
  promiseHistory: PromiseHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

/** One "Put cars together" change, kept so it can be put back. */
export interface CarMoveRecord {
  id: string;
  destinationCustomerId: string;
  sourceCustomerIds: string[];
  /** Every car moved, with the customer it had before. */
  cars: { vehicleId: string; fromCustomerId: string }[];
  /** Customer names when the change was made. */
  names: Record<string, string>;
  actor: string;
  createdAt: string;
  putBackAt?: string;
}

export interface CarMoveInput {
  operationId: string;
  customerIds: string[];
  destinationCustomerId: string;
  /** Every car under the chosen names when the manager reviewed them. */
  expectedCarIds: string[];
}

export interface WorkshopJobRecord {
  id: string;
  vehicleId?: string;
  plateNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  workDate: string;
  description: string;
  workerName?: string;
  status: "OPEN" | "DONE";
  amountCharged: number;
  costAmount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export type MoneyEntryCategory =
  | "CUSTOMER_PAYMENT"
  | "EARNED_FROM_CAR"
  | "EARNED_OTHER"
  | "PASS_THROUGH_RECEIVED"
  | "SPENT_ON_CAR"
  | "SPENT_ON_MATERIAL"
  | "SPENT_ON_WORKER"
  | "SPENT_FOR_BUSINESS"
  | "SPENT_RENT"
  | "SPENT_UTILITIES"
  | "SPENT_NON_BUSINESS"
  | "PAID_SUPPLIER"
  | "OWNER_PAID"
  | "OWNER_TAKEN"
  | "RANDOM_NOTE";

export type MoneyEntryDirection = "IN" | "OUT" | "NOTE";

export interface MoneyEntryRecord {
  id: string;
  direction: MoneyEntryDirection;
  category: MoneyEntryCategory;
  amount: number;
  description: string;
  partyName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  vehicleId?: string;
  plateNumber?: string;
  invoiceId?: string;
  paymentId?: string;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER";
  entryDate: string;
  routedTo: string[];
  needsReview: boolean;
  attachmentCount: number;
  createdAt: string;
}

export interface AttachmentRecord {
  id: string;
  linkType:
    | "MONEY_ENTRY"
    | "WORKSHOP_JOB"
    | "VEHICLE"
    | "CUSTOMER"
    | "LEDGER_ENTRY"
    | "BILL"
    | "INVOICE";
  linkId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  actorId: string;
  objectHash: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export type SubmissionOutboxOperation = "CLEARANCE" | "REPORTING";

export type SubmissionOutboxStatus =
  | "PENDING"
  | "PROCESSING"
  | "RETRY_SCHEDULED"
  | "SUCCEEDED"
  | "PERMANENT_FAILURE";

export interface SubmissionOutboxPayload extends Record<string, unknown> {
  kind: "STANDARD" | "SIMPLIFIED";
  uuid: string;
  officialHash: string;
  signedXml: string;
  artifactStage: "SIGNED";
  hashSource: "OFFICIAL_SDK";
  signatureVerified: true;
}

export interface SubmissionOutboxRecord {
  id: string;
  invoiceId: string;
  operation: SubmissionOutboxOperation;
  status: SubmissionOutboxStatus;
  payload: SubmissionOutboxPayload;
  request?: SubmissionOutboxRequestEvidence;
  response?: SubmissionOutboxResponseEvidence;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
  idempotencyKey: string;
  lockedAt?: string;
  lockedBy?: string;
  lockExpiresAt?: string;
  completedAt?: string;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionOutboxEnqueueInput {
  invoiceId: string;
  operation: SubmissionOutboxOperation;
  idempotencyKey: string;
  payload: SubmissionOutboxPayload;
  maxAttempts?: number;
  nextAttemptAt?: string;
}

export interface SubmissionOutboxListFilters {
  invoiceId?: string;
  operation?: SubmissionOutboxOperation;
  status?: SubmissionOutboxStatus | SubmissionOutboxStatus[];
  limit?: number;
}

export interface SubmissionOutboxClaimInput {
  workerId: string;
  limit?: number;
  lockTtlMs?: number;
  at?: string;
}

export interface SubmissionOutboxRequestEvidence {
  schemaVersion: 1;
  submitted: boolean;
  operation: "clearance" | "reporting";
  documentKind: "STANDARD" | "SIMPLIFIED";
  invoiceId: string;
  uuid: string;
  invoiceHash: string;
  idempotencyKey: string;
  artifactStage: "SIGNED";
  hashSource: "OFFICIAL_SDK";
  signatureVerified: true;
}

export type SubmissionOutboxOutcome =
  | "SUCCESS"
  | "RETRY"
  | "OFFICIAL_REJECTION"
  | "LOCAL_FAILURE"
  | "CONFIGURATION_FAILURE"
  | "AMBIGUOUS";

export interface SubmissionOutboxResponseEvidence {
  schemaVersion: 1;
  outcome: SubmissionOutboxOutcome;
  officialRejection: boolean;
  invoiceStatus:
    | "CLEARED"
    | "REPORTED"
    | "CLEARANCE_PENDING"
    | "REPORTING_PENDING"
    | "REJECTED"
    | null;
  code: string | null;
  error: string | null;
  processedAt: string;
  received: boolean;
  httpStatus: number | null;
  requestId: string | null;
  environment: "simulation" | "production" | null;
  clearanceStatus: string | null;
  reportingStatus: string | null;
  clearedInvoice: string | null;
  validationResults: unknown | null;
  clientError: {
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
  } | null;
  rawBody: unknown | null;
}

export interface SubmissionOutboxAttemptEvidence {
  request?: SubmissionOutboxRequestEvidence;
  response?: SubmissionOutboxResponseEvidence;
}

export interface SubmissionOutboxRetryOptions extends SubmissionOutboxAttemptEvidence {
  baseDelayMs?: number;
  maxDelayMs?: number;
  at?: string;
}

export interface EgsState {
  id: string;
  environment: string;
  qualification_status: string;
  last_counter: number;
  last_invoice_hash: string;
  csid_status: string;
  certificate_expires_at: string | null;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  nameAr?: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  additionalIdType?: Party["additionalIdType"];
  additionalId?: string;
  address?: Address;
}

export interface CatalogItemInput {
  sku: string;
  name: string;
  description: string;
  unitCode: string;
  unitPrice: number;
  vatCategory: CatalogItem["vatCategory"];
  vatRate: number;
}

export interface QuotationInput {
  customerId: string;
  vehicleId?: string;
  issueDate: string;
  expiryDate?: string;
  taxEnabled?: boolean;
  lines: LineItem[];
  notes?: string;
  terms?: string;
}

export interface InvoiceInput {
  customerId: string;
  vehicleId?: string;
  kind: DocumentKind;
  documentType?: FiscalDocumentType;
  issueDate: string;
  supplyDate?: string;
  dueDate?: string;
  lines: LineItem[];
  notes?: string;
  paymentTerms?: string;
  quotationId?: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  adjustmentReason?: string;
}

export interface VehicleInput {
  representativePersonId?: string;
  representativeName?: string;
  representativePhone?: string;
  personId?: string;
  plateNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  vin?: string;
  odometer?: string;
  notes?: string;
}

/** Omitted fields stay unchanged; empty or null values clear the detail. */
export type VehicleUpdateInput = {
  [Key in keyof VehicleInput]?: VehicleInput[Key] | null;
};

export interface MoneyEntryInput {
  category: MoneyEntryCategory;
  amount?: number;
  description?: string;
  partyName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  plateNumber?: string;
  vehicleId?: string;
  invoiceId?: string;
  promiseDate?: string;
  paymentMethod?: MoneyEntryRecord["paymentMethod"];
  entryDate?: string;
}
