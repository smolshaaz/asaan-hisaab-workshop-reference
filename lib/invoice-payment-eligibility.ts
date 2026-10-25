import type { InvoiceRecord } from "./product-types";

export function isCollectableInvoiceStatus(
  invoice: Pick<InvoiceRecord, "kind" | "status">,
) {
  if (invoice.kind === "STANDARD")
    return invoice.status === "CLEARED" || invoice.status === "SANDBOX_ISSUED";
  return [
    "SANDBOX_ISSUED",
    "ISSUED",
    "REPORTING_PENDING",
    "REPORTED",
    "CLEARED",
    "WARNING",
  ].includes(invoice.status);
}
export function canReceiveInvoicePayment(
  invoice: Pick<
    InvoiceRecord,
    | "kind"
    | "status"
    | "documentType"
    | "total"
    | "paidAmount"
    | "badDebtAmount"
  >,
) {
  return (
    isCollectableInvoiceStatus(invoice) &&
    invoice.documentType !== "CREDIT_NOTE" &&
    Math.round(
      (invoice.total - invoice.paidAmount - invoice.badDebtAmount) * 100,
    ) > 0
  );
}
