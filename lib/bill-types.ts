import type {
  LedgerExpenseCategory,
  LedgerPaymentMethod,
} from "./ledger-types";

export type BillDirection = "PURCHASE" | "SALE";
export type BillStatus = "DRAFT" | "POSTED" | "CANCELLED";

/** Change only the car assignment; never records another purchase or payment. */
export interface BillVehicleLinkInput {
  id: string;
  vehicleId: string | null;
}

/** A supplier invoice received, or a sales invoice already made elsewhere. */
export interface BillInput {
  direction: BillDirection;
  personId?: string;
  number?: string;
  issueDate?: string;
  dueDate?: string;
  total?: number;
  category?: LedgerExpenseCategory;
  note?: string;
  vehicleId?: string;
  /** Link an already-recorded credit purchase/sale instead of recording it twice. */
  existingEntryId?: string;
}

export interface BillRecord extends BillInput {
  id: string;
  status: BillStatus;
  number: string;
  total: number;
  note: string;
  category: LedgerExpenseCategory;
  personName?: string;
  plateNumber?: string;
  chargeEntryId?: string;
  paidAmount: number;
  offsetAmount: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface BillSettlement {
  id: string;
  kind: "PAYMENT" | "OFFSET";
  /** The paid bill, or the purchase bill for an offset. */
  billId: string;
  otherBillId?: string;
  invoiceId?: string;
  personId: string;
  personName?: string;
  billNumber: string;
  otherBillNumber?: string;
  invoiceNumber?: string;
  /** Negative for an undo. The original settlement remains in history. */
  amount: number;
  paymentMethod?: LedgerPaymentMethod;
  entryDate: string;
  reference: string;
  note: string;
  ledgerEntryId: string;
  invoicePaymentId?: string;
  /** An earlier recorded payment matched without recording money again. */
  existingEntryId?: string;
  createdAt: string;
  reversalOf?: string;
  reversedBy?: string;
  reversalReason?: string;
}

export interface BillBookSnapshot {
  bills: BillRecord[];
  settlements: BillSettlement[];
}
