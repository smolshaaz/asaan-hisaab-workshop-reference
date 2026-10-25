import type {
  DocumentStatus,
  FiscalDocument,
  FiscalDocumentType,
  LineItem,
} from "./types";
import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const round2 = (value: Decimal.Value) =>
  new Decimal(value).toDecimalPlaces(2).toNumber();

export function lineTotals(line: LineItem, taxEnabled = true) {
  const gross = new Decimal(line.quantity)
    .mul(line.unitPrice)
    .toDecimalPlaces(2);
  const taxable = gross.minus(line.discount).toDecimalPlaces(2);
  const vat = taxEnabled
    ? taxable.mul(line.vatRate).div(100).toDecimalPlaces(2)
    : new Decimal(0);
  return {
    gross: gross.toNumber(),
    taxable: taxable.toNumber(),
    vat: vat.toNumber(),
    total: taxable.plus(vat).toDecimalPlaces(2).toNumber(),
  };
}

export function documentTotals(
  document: Pick<FiscalDocument, "lines">,
  taxEnabled = true,
) {
  const totals = document.lines.reduce(
    (acc, line) => {
      const value = lineTotals(line, taxEnabled);
      return {
        subtotal: acc.subtotal.plus(value.gross),
        discount: acc.discount.plus(line.discount),
        taxable: acc.taxable.plus(value.taxable),
        vat: acc.vat.plus(value.vat),
        total: acc.total.plus(value.total),
      };
    },
    {
      subtotal: new Decimal(0),
      discount: new Decimal(0),
      taxable: new Decimal(0),
      vat: new Decimal(0),
      total: new Decimal(0),
    },
  );
  return {
    subtotal: round2(totals.subtotal),
    discount: round2(totals.discount),
    taxable: round2(totals.taxable),
    vat: round2(totals.vat),
    total: round2(totals.total),
  };
}

export const isPostedStatus = (status: DocumentStatus) =>
  [
    "SANDBOX_ISSUED",
    "ISSUED",
    "REPORTING_PENDING",
    "REPORTED",
    "CLEARANCE_PENDING",
    "CLEARED",
    "WARNING",
  ].includes(status);
export const fiscalSign = (documentType: FiscalDocumentType) =>
  documentType === "CREDIT_NOTE" ? -1 : 1;
export const signedFiscalAmount = (
  documentType: FiscalDocumentType,
  amount: number,
) => round2(new Decimal(amount).mul(fiscalSign(documentType)));
