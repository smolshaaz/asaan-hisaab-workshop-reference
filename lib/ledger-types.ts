/** Positive person balances mean they owe the workshop; negative means we owe them. */
export type LedgerPersonRole = "WORKER" | "CUSTOMER" | "SUPPLIER" | "OTHER";

export type LedgerEntryKind =
  | "INCOME"
  | "EXPENSE"
  | "GIVE_MONEY"
  | "RECEIVE_MONEY"
  | "PERSON_SPENT"
  | "PERSON_COLLECTED"
  | "CREDIT_PURCHASE"
  | "CREDIT_SALE"
  | "OWNER_IN"
  | "OWNER_OUT"
  | "OPENING_OWED_TO_US"
  | "OPENING_WE_OWE"
  | "OFFSET"
  | "BILL_ALLOCATION"
  | "ADVANCE_RECEIVED"
  | "ADVANCE_GIVEN"
  | "ADVANCE_COLLECTED"
  | "PERSON_PAID_BILL"
  | "INVOICE_RECEIPT"
  | "INVOICE_COLLECTED"
  | "INVOICE_ALLOCATION";

export type LedgerExpenseCategory =
  | "PARTS"
  | "OUTSOURCED_WORK"
  | "WAGES"
  | "RENT"
  | "UTILITIES"
  | "BUSINESS"
  | "PERSONAL";

export type LedgerPaymentMethod =
  "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER";

export interface LedgerPersonInput {
  name: string;
  roles: LedgerPersonRole[];
  phone?: string;
  customerId?: string;
}

export interface LedgerPerson extends LedgerPersonInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Only amounts recorded in this ledger; existing invoice balances remain in invoices. */
  balance: number;
  entryCount: number;
  needsReviewCount: number;
  /** Balance excluding unconfirmed worker expense claims. */
  confirmedBalance: number;
}

export interface LedgerEntryInput {
  kind: LedgerEntryKind;
  amount: number;
  personId?: string;
  /** Actual third-party payer; never changes who owes the debt. */
  payerPersonId?: string;
  /** For money collected by a worker against a customer's recorded debt. */
  counterpartyId?: string;
  category?: LedgerExpenseCategory;
  note?: string;
  entryDate?: string;
  vehicleId?: string;
  /** A reference for traceability, not an instruction to mark the invoice paid. */
  invoiceId?: string;
  reference?: string;
  attachmentIds?: string[];
  paymentMethod?: LedgerPaymentMethod;
  /** Reuse this on a network retry to prevent recording the same entry twice. */
  idempotencyKey?: string;
  /** Worker expenses start as claims until the operator confirms them. */
  needsReview?: boolean;
}

export interface LedgerEntry extends Omit<
  LedgerEntryInput,
  "entryDate" | "attachmentIds" | "paymentMethod"
> {
  id: string;
  entryDate: string;
  attachmentIds: string[];
  paymentMethod: LedgerPaymentMethod;
  personName?: string;
  payerName?: string;
  moneyRecordId?: string;
  paymentId?: string;
  allocatedAmount: number;
  availableAmount: number;
  counterpartyName?: string;
  plateNumber?: string;
  invoiceNumber?: string;
  createdAt: string;
  cashIn: number;
  cashOut: number;
  cashChange: number;
  income: number;
  businessExpense: number;
  personalExpense: number;
  personBalanceChange: number;
  counterpartyBalanceChange: number;
  reversalOf?: string;
  reversedBy?: string;
  reversalReason?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface LedgerTotals {
  cashIn: number;
  cashOut: number;
  /** Recorded change, not a verified bank/cash balance. */
  cashChange: number;
  income: number;
  businessExpense: number;
  personalExpense: number;
  owedToUs: number;
  weOwe: number;
  needsReviewCount: number;
}

export interface LegacyLedgerEntry {
  reversalOf?: string;
  reversedBy?: string;
  id: string;
  sourceId: string;
  source: "MONEY_ENTRY" | "PAYMENT" | "EXPENSE";
  label: string;
  amount: number;
  note: string;
  entryDate: string;
  createdAt: string;
  personName?: string;
  vehicleId?: string;
  plateNumber?: string;
  invoiceId?: string;
  cashIn: number;
  cashOut: number;
  income: number;
  businessExpense: number;
  personalExpense: number;
  needsReview: boolean;
}

export interface LedgerSnapshot {
  people: LedgerPerson[];
  entries: LedgerEntry[];
  /** Returned advance/source links; originals remain after a return is corrected.
   * Use entries' reversalOf/reversedBy to derive active or signed effects. */
  creditUses: {
    id: string;
    sourceEntryId: string;
    entryId: string;
    amount: number;
  }[];
  legacyEntries: LegacyLedgerEntry[];
  totals: LedgerTotals;
}
