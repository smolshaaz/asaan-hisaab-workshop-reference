"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { documentTotals, lineTotals } from "@/lib/calculations";
import { shortDate } from "@/lib/format";
import type { CustomerRecord } from "@/lib/product-types";
import type {
  DocumentKind,
  FiscalDocumentType,
  LineItem,
  Party,
} from "@/lib/types";

export interface InvoiceDraftPreviewProps {
  numberLabel: string;
  seller: Party;
  customer?: CustomerRecord;
  issueDate: string;
  supplyDate?: string;
  dueDate?: string;
  lines: LineItem[];
  notes?: string;
  paymentTerms?: string;
  kind: DocumentKind;
  documentType: FiscalDocumentType;
  originalInvoiceNumber?: string;
  adjustmentReason?: string;
  qrBase64?: string;
}

export interface QuotationDraftPreviewProps {
  numberLabel: string;
  seller: Party;
  customer?: CustomerRecord;
  issueDate: string;
  expiryDate?: string;
  taxEnabled?: boolean;
  lines: LineItem[];
  notes?: string;
  terms?: string;
}

type PreviewHeading = {
  english: string;
  arabic: string;
};

type MetadataRow = {
  label: string;
  labelAr: string;
  value: string;
};

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export function A4ScaleToFit({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateScale = (width: number) => {
      if (width > 0) setScale(width / A4_WIDTH_PX);
    };
    const observer = new ResizeObserver(([entry]) => {
      updateScale(entry.contentRect.width);
    });

    updateScale(frame.getBoundingClientRect().width);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="a4-scale-frame"
      style={{ height: A4_HEIGHT_PX * scale }}
    >
      <div
        className="a4-scale-page"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

const invoiceHeadings: Record<
  FiscalDocumentType,
  Record<DocumentKind, PreviewHeading>
> = {
  INVOICE: {
    STANDARD: {
      english: "TAX INVOICE",
      arabic: "فاتورة ضريبية",
    },
    SIMPLIFIED: {
      english: "SIMPLIFIED TAX INVOICE",
      arabic: "فاتورة ضريبية مبسطة",
    },
  },
  CREDIT_NOTE: {
    STANDARD: {
      english: "TAX CREDIT NOTE",
      arabic: "إشعار دائن ضريبي",
    },
    SIMPLIFIED: {
      english: "SIMPLIFIED TAX CREDIT NOTE",
      arabic: "إشعار دائن لفاتورة ضريبية مبسطة",
    },
  },
  DEBIT_NOTE: {
    STANDARD: {
      english: "TAX DEBIT NOTE",
      arabic: "إشعار مدين ضريبي",
    },
    SIMPLIFIED: {
      english: "SIMPLIFIED TAX DEBIT NOTE",
      arabic: "إشعار مدين لفاتورة ضريبية مبسطة",
    },
  },
};

const documentNumberLabels: Record<
  FiscalDocumentType,
  { english: string; arabic: string }
> = {
  INVOICE: { english: "Invoice number", arabic: "رقم الفاتورة" },
  CREDIT_NOTE: {
    english: "Credit note number",
    arabic: "رقم الإشعار الدائن",
  },
  DEBIT_NOTE: { english: "Debit note number", arabic: "رقم الإشعار المدين" },
};

const amountFormatter = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function amount(value: number) {
  return amountFormatter.format(value);
}

function displayDate(value?: string) {
  if (!value) return "Not set";
  try {
    return shortDate(value);
  } catch {
    return value;
  }
}

function partyDetails(party: Party, includeAdditionalId = false) {
  const address = party.address;
  const details = address
    ? [
        [address.buildingNumber, address.street].filter(Boolean).join(" "),
        [address.district, address.city, address.postalCode]
          .filter(Boolean)
          .join(", "),
        address.countryCode === "SA" ? "Saudi Arabia" : address.countryCode,
      ]
    : [];

  if (party.vatNumber) details.push(`VAT ${party.vatNumber}`);
  if (includeAdditionalId && party.additionalId) {
    details.push(
      `${party.additionalIdType === "CRN" ? "CR" : party.additionalIdType || "ID"} ${party.additionalId}`,
    );
  }
  if (party.email) details.push(party.email);

  return details.filter(Boolean);
}

function PartyDetails({
  party,
  includeAdditionalId = false,
}: {
  party: Party;
  includeAdditionalId?: boolean;
}) {
  const details = partyDetails(party, includeAdditionalId);

  if (!details.length) {
    return <p className="customer-document-placeholder">Details not set.</p>;
  }

  return (
    <address className="customer-document-address">
      {details.map((detail, index) => (
        <span key={`${detail}-${index}`}>{detail}</span>
      ))}
    </address>
  );
}

function IssuerBlock({ seller }: { seller: Party }) {
  return (
    <section className="customer-document-issuer" aria-label="Service provider">
      <div className="customer-document-issuer-heading">
        <div>
          <strong>{seller.name}</strong>
          {seller.nameAr && (
            <span lang="ar" dir="rtl">
              {seller.nameAr}
            </span>
          )}
        </div>
      </div>
      <PartyDetails party={seller} includeAdditionalId />
    </section>
  );
}

function CustomerBlock({
  customer,
  label,
  labelAr,
}: {
  customer?: CustomerRecord;
  label: string;
  labelAr: string;
}) {
  return (
    <section className="customer-document-customer" aria-label={label}>
      <p className="customer-document-kicker">
        {label} / <span lang="ar">{labelAr}</span>
      </p>
      <h3>
        {customer?.name || "Customer not selected"}
        {customer?.nameAr && (
          <span lang="ar" dir="rtl">
            {customer.nameAr}
          </span>
        )}
      </h3>
      {customer ? (
        <PartyDetails party={customer} includeAdditionalId />
      ) : (
        <p className="customer-document-placeholder">
          Select a customer to complete the customer copy.
        </p>
      )}
    </section>
  );
}

function Metadata({ rows }: { rows: MetadataRow[] }) {
  return (
    <dl className="customer-document-metadata">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>
            {row.label}
            <span lang="ar" dir="rtl">
              {row.labelAr}
            </span>
          </dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LinesTable({
  lines,
  taxEnabled = true,
}: {
  lines: LineItem[];
  taxEnabled?: boolean;
}) {
  return (
    <div className="customer-document-lines-wrap">
      <table className="customer-document-lines">
        <caption className="sr-only">Document line items</caption>
        <colgroup>
          <col className="line-column-index" />
          <col className="line-column-description" />
          <col className="line-column-quantity" />
          <col className="line-column-price" />
          <col className="line-column-taxable" />
          <col className="line-column-vat" />
          <col className="line-column-total" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">
              Description <span lang="ar">الوصف</span>
            </th>
            <th scope="col">
              Qty <span lang="ar">الكمية</span>
            </th>
            <th scope="col">
              Price <span lang="ar">السعر</span>
            </th>
            <th scope="col">
              Taxable amount <span lang="ar">المبلغ الخاضع للضريبة</span>
            </th>
            <th scope="col">
              VAT amount <span lang="ar">قيمة الضريبة</span>
            </th>
            <th scope="col">
              Line amount <span lang="ar">إجمالي السطر</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.length ? (
            lines.map((line, index) => {
              const amounts = lineTotals(line, taxEnabled);
              return (
                <tr key={`${line.id}-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>
                      {line.description || "Item description not entered"}
                    </strong>
                    <small>
                      {line.unitCode}
                      {line.discount > 0
                        ? line.discountMode === "PERCENTAGE"
                          ? ` · Discount ${amount(line.discountValue ?? 0)}%`
                          : ` · Discount SAR ${amount(line.discount)}`
                        : ""}
                    </small>
                  </td>
                  <td>{quantityFormatter.format(line.quantity)}</td>
                  <td className="numeric">{amount(line.unitPrice)}</td>
                  <td className="numeric">{amount(amounts.taxable)}</td>
                  <td className="numeric">
                    {taxEnabled ? amount(amounts.vat) : "—"}
                    <small>{taxEnabled ? `${line.vatRate}%` : "Not added"}</small>
                  </td>
                  <td className="numeric">{amount(amounts.total)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="customer-document-empty" colSpan={7}>
                No items added.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Totals({
  lines,
  taxEnabled = true,
}: {
  lines: LineItem[];
  taxEnabled?: boolean;
}) {
  const totals = documentTotals({ lines }, taxEnabled);

  return (
    <dl className="customer-document-totals">
      {totals.discount > 0 && (
        <>
          <div>
            <dt>
              Gross subtotal <span lang="ar">المجموع قبل الخصم</span>
            </dt>
            <dd>
              <span>SAR</span> {amount(totals.subtotal)}
            </dd>
          </div>
          <div>
            <dt>
              Discount <span lang="ar">الخصم</span>
            </dt>
            <dd>
              <span>SAR</span> -{amount(totals.discount)}
            </dd>
          </div>
        </>
      )}
      <div>
        <dt>
          Subtotal (excl. VAT) <span lang="ar">المجموع الفرعي دون الضريبة</span>
        </dt>
        <dd>
          <span>SAR</span> {amount(totals.taxable)}
        </dd>
      </div>
      {taxEnabled ? (
        <div>
          <dt>
            Total VAT <span lang="ar">إجمالي ضريبة القيمة المضافة</span>
          </dt>
          <dd>
            <span>SAR</span> {amount(totals.vat)}
          </dd>
        </div>
      ) : (
        <div className="customer-document-tax-disabled">
          <dt>
            VAT <span lang="ar">ضريبة القيمة المضافة</span>
          </dt>
          <dd>Not added</dd>
        </div>
      )}
      <div className="customer-document-total-row">
        <dt>
          Total amount <span lang="ar">المبلغ الإجمالي</span>
        </dt>
        <dd>
          <span>SAR</span> {amount(totals.total)}
        </dd>
      </div>
    </dl>
  );
}

function qrImageSource(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("iVBORw0KGgo")) return `data:image/png;base64,${value}`;
  if (value.startsWith("/9j/")) return `data:image/jpeg;base64,${value}`;
  return undefined;
}

function InvoiceQr({ qrBase64 }: { qrBase64?: string }) {
  const imageSource = qrImageSource(qrBase64);

  return (
    <div className="customer-document-qr-block">
      {imageSource ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="customer-document-qr"
          src={imageSource}
          alt="Invoice QR code"
        />
      ) : (
        <div className="customer-document-qr-placeholder" aria-hidden="true">
          <span>QR</span>
        </div>
      )}
      <p>
        {imageSource
          ? "Scan to verify the invoice"
          : "QR is added only after compliant ZATCA processing"}
        <span lang="ar" dir="rtl">
          {imageSource
            ? "امسح الرمز للتحقق من الفاتورة"
            : "يُضاف الرمز بعد المعالجة المتوافقة مع متطلبات هيئة الزكاة"}
        </span>
      </p>
    </div>
  );
}

function DocumentCopy({
  firstLabel,
  firstLabelAr,
  firstValue,
  secondLabel,
  secondLabelAr,
  secondValue,
}: {
  firstLabel: string;
  firstLabelAr: string;
  firstValue?: string;
  secondLabel: string;
  secondLabelAr: string;
  secondValue?: string;
}) {
  return (
    <div className="customer-document-copy">
      <h4>
        {firstLabel} / <span lang="ar">{firstLabelAr}</span>
      </h4>
      <p>{firstValue || "Not specified."}</p>
      <h4>
        {secondLabel} / <span lang="ar">{secondLabelAr}</span>
      </h4>
      <p>{secondValue || "Not specified."}</p>
    </div>
  );
}

function CustomerDocument({
  variant,
  heading,
  seller,
  customer,
  customerLabel,
  customerLabelAr,
  metadata,
  lines,
  numberLabel,
  taxEnabled = true,
  children,
}: {
  variant: "invoice" | "quotation";
  heading: PreviewHeading;
  seller: Party;
  customer?: CustomerRecord;
  customerLabel: string;
  customerLabelAr: string;
  metadata: MetadataRow[];
  lines: LineItem[];
  numberLabel: string;
  taxEnabled?: boolean;
  children: ReactNode;
}) {
  const totals = documentTotals({ lines }, taxEnabled);

  return (
    <section
      className={`customer-document customer-document--${variant}`}
      aria-label={`${heading.english} customer copy`}
    >
      <header className="customer-document-head">
        <div className="customer-document-title">
          <h2>{heading.english}</h2>
          <p lang="ar" dir="rtl">
            {heading.arabic}
          </p>
        </div>
        <Metadata rows={metadata} />
        <IssuerBlock seller={seller} />
        <CustomerBlock
          customer={customer}
          label={customerLabel}
          labelAr={customerLabelAr}
        />
        <div className="customer-document-grand-total">
          <span>
            Total amount <b lang="ar">المبلغ الإجمالي</b>
          </span>
          <strong>
            <small>SAR</small> {amount(totals.total)}
          </strong>
        </div>
      </header>
      <LinesTable lines={lines} taxEnabled={taxEnabled} />
      {children}
      <footer className="customer-document-footer">
        <span>{seller.name}</span>
        <span>{variant === "quotation" ? "Quotation" : "Customer copy"}</span>
        <span>{numberLabel}</span>
      </footer>
    </section>
  );
}

export function InvoiceDraftPreview({
  numberLabel,
  seller,
  customer,
  issueDate,
  supplyDate,
  dueDate,
  lines,
  notes,
  paymentTerms,
  kind,
  documentType,
  originalInvoiceNumber,
  adjustmentReason,
  qrBase64,
}: InvoiceDraftPreviewProps) {
  const heading = invoiceHeadings[documentType][kind];
  const numberLabelCopy = documentNumberLabels[documentType];
  const metadata: MetadataRow[] = [
    {
      label: numberLabelCopy.english,
      labelAr: numberLabelCopy.arabic,
      value: numberLabel,
    },
    {
      label: "Issue date",
      labelAr: "تاريخ الإصدار",
      value: displayDate(issueDate),
    },
  ];

  if (supplyDate) {
    metadata.push({
      label: "Supply date",
      labelAr: "تاريخ التوريد",
      value: displayDate(supplyDate),
    });
  }
  if (documentType === "INVOICE" || dueDate) {
    metadata.push({
      label: "Due date",
      labelAr: "تاريخ الاستحقاق",
      value: displayDate(dueDate),
    });
  }

  return (
    <CustomerDocument
      variant="invoice"
      heading={heading}
      seller={seller}
      customer={customer}
      customerLabel="Customer"
      customerLabelAr="العميل"
      metadata={metadata}
      lines={lines}
      numberLabel={numberLabel}
    >
      {originalInvoiceNumber && (
        <div className="customer-document-reference">
          <strong>Correction to {originalInvoiceNumber}</strong>
          <span>{adjustmentReason}</span>
        </div>
      )}
      <div className="customer-document-closing customer-document-closing--invoice">
        <div className="customer-document-support">
          <InvoiceQr qrBase64={qrBase64} />
          <DocumentCopy
            firstLabel="Customer note"
            firstLabelAr="ملاحظات العميل"
            firstValue={notes}
            secondLabel="Payment terms"
            secondLabelAr="شروط الدفع"
            secondValue={paymentTerms}
          />
        </div>
        <Totals lines={lines} />
      </div>
    </CustomerDocument>
  );
}

export function QuotationDraftPreview({
  numberLabel,
  seller,
  customer,
  issueDate,
  expiryDate,
  taxEnabled = true,
  lines,
  notes,
  terms,
}: QuotationDraftPreviewProps) {
  const metadata: MetadataRow[] = [
    {
      label: "Proforma number",
      labelAr: "رقم الفاتورة المبدئية",
      value: numberLabel,
    },
    {
      label: "Date",
      labelAr: "التاريخ",
      value: displayDate(issueDate),
    },
  ];

  if (expiryDate) {
    metadata.push({
      label: "Valid until",
      labelAr: "صالح حتى",
      value: displayDate(expiryDate),
    });
  }

  return (
    <CustomerDocument
      variant="quotation"
      heading={{ english: "QUOTATION", arabic: "عرض سعر" }}
      seller={seller}
      customer={customer}
      customerLabel="Customer"
      customerLabelAr="العميل"
      metadata={metadata}
      lines={lines}
      numberLabel={numberLabel}
      taxEnabled={taxEnabled}
    >
      <div className="customer-document-closing customer-document-closing--quotation">
        <DocumentCopy
          firstLabel="Notes"
          firstLabelAr="ملاحظات"
          firstValue={notes}
          secondLabel="Terms"
          secondLabelAr="الشروط"
          secondValue={terms}
        />
        <Totals lines={lines} taxEnabled={taxEnabled} />
      </div>
    </CustomerDocument>
  );
}
