import type {
  LedgerExpenseCategory,
  LedgerPaymentMethod,
} from "./ledger-types";

/** person = customer/debtor or supplier; handler = worker holding/paying money.
 * payer is an optional third party paying for the customer, never a substitute debtor. */
export interface MoneyRecordInput {
  idempotencyKey: string;
  direction: "IN" | "OUT";
  purpose: "NEW" | "SETTLEMENT" | "ADVANCE" | "RETURN" | "OPENING";
  timing: "NOW" | "LATER" | "PART";
  amount: number;
  paidNow?: number;
  personId?: string;
  personName?: string;
  handlerPersonId?: string;
  handlerName?: string;
  payerPersonId?: string;
  payerName?: string;
  documentType?: "BILL" | "INVOICE";
  documentId?: string;
  /** Apply up to this earlier payment's unused amount. No second cash movement. */
  existingEntryId?: string;
  category?: LedgerExpenseCategory;
  note?: string;
  entryDate?: string;
  vehicleId?: string;
  paymentMethod?: LedgerPaymentMethod;
  reference?: string;
  dueDate?: string;
}
export interface MoneyRecordResult {
  id: string;
  entryId: string;
  entryIds: string[];
  personId?: string;
  documentId?: string;
  documentType?: "BILL" | "INVOICE";
  settlementId?: string;
  paymentId?: string;
  unusedCredit?: number;
  reversedBy?: string;
}
