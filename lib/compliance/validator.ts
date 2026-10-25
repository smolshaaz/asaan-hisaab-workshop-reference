import type { FiscalDocument, ValidationIssue } from "../types";
import { addressSchema } from "../schemas";

const vatNumberPattern = /^3\d{13}3$/;

export function validateFiscalDocument(
  document: FiscalDocument,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (code: string, path: string, message: string) =>
    issues.push({ code, path, message, severity: "ERROR" });
  const warning = (code: string, path: string, message: string) =>
    issues.push({ code, path, message, severity: "WARNING" });

  if (!document.seller.name.trim())
    error("LOCAL-SELLER-NAME", "seller.name", "Seller legal name is required.");
  if (
    !document.seller.vatNumber ||
    !vatNumberPattern.test(document.seller.vatNumber)
  )
    error(
      "LOCAL-SELLER-VAT",
      "seller.vatNumber",
      "Seller VAT number must be a valid 15-digit Saudi VAT number.",
    );
  if (!document.seller.additionalId || !document.seller.additionalIdType)
    error(
      "LOCAL-SELLER-ID",
      "seller.additionalId",
      "Seller additional legal identifier is required.",
    );
  if (!addressSchema.safeParse(document.seller.address).success)
    error(
      "LOCAL-SELLER-ADDRESS",
      "seller.address",
      "Complete the seller's street, building, district, city and postal code.",
    );

  if (document.kind === "STANDARD") {
    if (!document.customer.name.trim())
      error(
        "LOCAL-BUYER-NAME",
        "customer.name",
        "Buyer name is required for a standard tax invoice.",
      );
    if (!addressSchema.safeParse(document.customer.address).success)
      error(
        "LOCAL-BUYER-ADDRESS",
        "customer.address",
        "Complete the buyer's street, building, district, city and postal code before issuing a standard tax invoice.",
      );
    if (!document.customer.vatNumber && !document.customer.additionalId)
      error(
        "LOCAL-BUYER-ID",
        "customer",
        "A standard invoice requires the buyer VAT number or another permitted identifier.",
      );
    if (!document.paymentMeans)
      error(
        "LOCAL-PAYMENT-MEANS",
        "paymentMeans",
        "Payment means is required for a standard tax invoice.",
      );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(document.issueDate))
    error("LOCAL-ISSUE-DATE", "issueDate", "Issue date must use YYYY-MM-DD.");
  if (document.lines.length === 0)
    error("LOCAL-LINES", "lines", "At least one invoice line is required.");

  document.lines.forEach((line, index) => {
    const path = `lines.${index}`;
    if (!line.description.trim())
      error(
        "LOCAL-LINE-DESCRIPTION",
        `${path}.description`,
        "Item description is required.",
      );
    if (line.quantity <= 0)
      error(
        "LOCAL-LINE-QUANTITY",
        `${path}.quantity`,
        "Quantity must be greater than zero.",
      );
    if (line.unitPrice < 0 || line.discount < 0)
      error(
        "LOCAL-LINE-NONNEGATIVE",
        path,
        "Prices and discounts cannot be negative.",
      );
    if (line.discount > line.quantity * line.unitPrice)
      error(
        "LOCAL-DISCOUNT-LIMIT",
        `${path}.discount`,
        "Discount cannot exceed the gross line amount.",
      );
    if (line.vatCategory === "S" && line.vatRate !== 15)
      error(
        "LOCAL-STANDARD-VAT",
        `${path}.vatRate`,
        "Standard-rated Saudi VAT must be 15%.",
      );
    if (line.vatCategory !== "S" && line.vatRate !== 0)
      error(
        "LOCAL-NONSTANDARD-VAT",
        `${path}.vatRate`,
        "Non-standard VAT categories must use a 0% rate.",
      );
    if (
      ["Z", "E", "O"].includes(line.vatCategory) &&
      (!line.exemptionReasonCode || !line.exemptionReason)
    )
      error(
        "LOCAL-TAX-REASON",
        path,
        "A non-standard tax category requires an exemption reason code and narrative.",
      );
  });

  if (["CREDIT_NOTE", "DEBIT_NOTE"].includes(document.documentType)) {
    if (!document.originalInvoiceNumber)
      error(
        "LOCAL-NOTE-REFERENCE",
        "originalInvoiceNumber",
        "A tax note must reference the original invoice.",
      );
    if (!document.adjustmentReason?.trim())
      error(
        "LOCAL-NOTE-REASON",
        "adjustmentReason",
        "A tax note requires a reason.",
      );
  }

  if (document.currency !== "SAR")
    error(
      "LOCAL-DOCUMENT-CURRENCY",
      "currency",
      "This workspace currently supports SAR documents only.",
    );
  if (document.taxCurrency !== "SAR")
    error("LOCAL-TAX-CURRENCY", "taxCurrency", "Tax currency must be SAR.");
  if (document.kind === "SIMPLIFIED" && document.customer.vatNumber)
    warning(
      "LOCAL-SIMPLIFIED-BUYER-VAT",
      "customer.vatNumber",
      "This buyer has a VAT number; confirm that a simplified invoice is appropriate.",
    );
  return issues;
}
