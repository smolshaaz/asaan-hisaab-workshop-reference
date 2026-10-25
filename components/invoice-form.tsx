"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@radix-ui/themes";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Info,
  LockKeyhole,
  Package,
  Plus,
  Save,
  X,
} from "@/lib/icons";
import { A4ScaleToFit, InvoiceDraftPreview } from "./document-previews";
import { LineItemsEditor } from "./line-items-editor";
import {
  CustomerQuickCreate,
  CustomerQuickEdit,
} from "./customer-quick-create";
import { useProduct } from "./product-context";
import { validateFiscalDocument } from "@/lib/compliance/validator";
import type { DocumentKind, FiscalDocument, LineItem } from "@/lib/types";
import type { InvoiceRecord } from "@/lib/product-types";
import { addCalendarDays, riyadhDate } from "@/lib/business-date";

const today = riyadhDate();
const inThirty = addCalendarDays(today, 30);
const emptyLine = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unitCode: "PCE",
  unitPrice: 0,
  discount: 0,
  vatCategory: "S",
  vatRate: 15,
});

export function InvoiceForm({ invoiceId }: { invoiceId?: string } = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const { data, loading, mutate } = useProduct();
  const quoteId = params.get("quotation");
  const quote = data?.quotations.find((q) => q.id === quoteId);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [kind, setKind] = useState<DocumentKind>("STANDARD");
  const [issueDate, setIssueDate] = useState(today);
  const [supplyDate, setSupplyDate] = useState(today);
  const [dueDate, setDueDate] = useState(inThirty);
  const [paymentTerms, setPaymentTerms] = useState("Payment due in 30 days");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [created, setCreated] = useState<InvoiceRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setSaved(false);
  }, [
    customerId,
    vehicleId,
    kind,
    issueDate,
    supplyDate,
    dueDate,
    lines,
    notes,
    paymentTerms,
  ]);
  useEffect(() => {
    if (!data || hydrated) return;
    const existing = invoiceId
      ? data.invoices.find((invoice) => invoice.id === invoiceId)
      : undefined;
    if (invoiceId && !existing) {
      setError("Invoice draft not found");
      setHydrated(true);
      return;
    }
    if (existing) {
      if (existing.status !== "DRAFT") {
        router.replace(`/invoices/${existing.id}`);
        return;
      }
      setCreated(existing);
      setCustomerId(existing.customerId);
      setVehicleId(existing.vehicleId ?? "");
      setKind(existing.kind);
      setIssueDate(existing.issueDate);
      setSupplyDate(existing.supplyDate ?? "");
      setDueDate(
        existing.documentType === "CREDIT_NOTE" ? "" : (existing.dueDate ?? ""),
      );
      setPaymentTerms(existing.paymentTerms);
      setNotes(existing.notes);
      setLines(existing.lines.map((line) => ({ ...line })));
      setHydrated(true);
      return;
    }
    const car = data.vehicles.find(
      (item) => item.id === (quote?.vehicleId || params.get("car")),
    );
    const requestedCustomer =
      quote?.customerId || car?.customerId || params.get("customer") || "";
    const selectedCustomer = data.customers.find(
      (item) => item.id === requestedCustomer,
    );
    setCustomerId(selectedCustomer?.id || "");
    if (selectedCustomer)
      setKind(selectedCustomer.vatNumber ? "STANDARD" : "SIMPLIFIED");
    setVehicleId(car?.id || "");
    if (quote) {
      setLines(
        quote.lines.map((line) => ({ ...line, id: crypto.randomUUID() })),
      );
      setNotes(quote.notes);
      setPaymentTerms(quote.terms || "Payment due in 30 days");
    }
    setHydrated(true);
  }, [data, hydrated, invoiceId, params, quote, router]);
  const customer = data?.customers.find((c) => c.id === customerId);
  const document = useMemo<FiscalDocument | null>(
    () =>
      customer && data
        ? {
            id: created?.id || "draft",
            number: created?.number || "Draft",
            kind,
            documentType: created?.documentType || "INVOICE",
            status: "DRAFT",
            customer,
            seller: created?.seller ?? data.organisation,
            issueDate,
            supplyDate,
            currency: "SAR",
            taxCurrency: "SAR",
            paymentMeans: "30",
            lines,
            originalInvoiceNumber: created?.originalInvoiceNumber,
            adjustmentReason: created?.adjustmentReason,
            complianceVersion: "LOCAL-PREFLIGHT-2026.08",
          }
        : null,
    [created, customer, data?.organisation, kind, issueDate, supplyDate, lines],
  );
  const issues = document ? validateFiscalDocument(document) : [];
  const errors = issues.filter((issue) => issue.severity === "ERROR");
  const missingCustomer = !customer;
  const blockingIssueCount = errors.length + (missingCustomer ? 1 : 0);
  const save = async (): Promise<InvoiceRecord | null> => {
    setSaving(true);
    setError(null);
    try {
      const invoice = await mutate<InvoiceRecord>(
        created ? `/api/invoices/${created.id}` : "/api/invoices",
        {
          method: created ? "PATCH" : "POST",
          body: JSON.stringify({
            customerId,
            vehicleId,
            kind,
            issueDate,
            supplyDate,
            dueDate: dueDate || undefined,
            lines,
            notes,
            paymentTerms,
            quotationId: created?.quotationId || quote?.id || undefined,
          }),
        },
      );
      setCreated(invoice);
      setSaved(true);
      return invoice;
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Draft could not be saved",
      );
      return null;
    } finally {
      setSaving(false);
    }
  };
  const confirmSandbox = async () => {
    const target = await save();
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const issued = await mutate<InvoiceRecord>(`/api/invoices/${target.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "issue-sandbox" }),
      });
      router.push(`/invoices/${issued.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Sandbox issuance failed",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading || !data)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  if (invoiceId && hydrated && !created)
    return (
      <div className="page">
        <div className="state-page error-state">
          <AlertCircle size={30} />
          <h1>Invoice draft not found</h1>
          <p>The requested draft does not exist or is no longer editable.</p>
          <Link className="button secondary" href="/invoices">
            Return to invoices
          </Link>
        </div>
      </div>
    );
  const correctionDraft =
    created?.documentType !== undefined && created.documentType !== "INVOICE";
  const creditNote = created?.documentType === "CREDIT_NOTE";
  return (
    <div data-help="invoice-editor" className="page editor-page">
      <div className="editor-header">
        <div>
          <Link
            href={created ? `/invoices/${created.id}` : "/invoices"}
            className="back-link"
          >
            <ArrowLeft size={16} />
            {created ? `Back to ${created.number}` : "Back to invoices"}
          </Link>
          <h1>
            {created
              ? `Edit ${created.documentType.replaceAll("_", " ").toLowerCase()} draft`
              : "New invoice"}
          </h1>
          <p>Add what you know. Save now and finish the rest later.</p>
        </div>
        <div className="editor-actions">
          <span
            className={`editor-action-hint ${saved ? "is-ready" : ""}`}
            role="status"
          >
            {saved
              ? "Saved. You can come back later."
              : "You can save with details missing"}
          </span>
          <div className="page-actions">
            <button
              type="button"
              className="button secondary mobile-preview-trigger"
              onClick={() => setPreviewOpen(true)}
            >
              <FileText size={16} />
              Preview
            </button>
            <button
              data-help="invoice-save"
              className="button primary"
              onClick={async () => {
                const invoice = await save();
                if (invoice && !invoiceId)
                  router.replace(`/invoices/${invoice.id}/edit`);
              }}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Saving" : created ? "Save changes" : "Save draft"}
            </button>
            <button
              className="button secondary"
              onClick={() => setReview(true)}
              disabled={saving}
            >
              <LockKeyhole size={16} />
              Review & issue demo
            </button>
          </div>
        </div>
      </div>
      {quote && !created && (
        <div className="source-banner">
          <FileSource />
          <div>
            <strong>Created from {quote.number}</strong>
            <span>
              Customer, items, prices, and notes were carried into this draft.
            </span>
          </div>
        </div>
      )}
      {created?.originalInvoiceNumber && (
        <div className="source-banner">
          <FileSource />
          <div>
            <strong>Correction to {created.originalInvoiceNumber}</strong>
            <span>{created.adjustmentReason}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="inline-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <div className="editor-layout editor-layout-preview">
        <section className="editor-main">
          <section className="form-panel">
            <div className="section-title">
              <h2>1. Who is buying?</h2>
              <p>Choose business or individual. We set the invoice type.</p>
            </div>
            <fieldset className="classification-grid">
              <legend className="sr-only">Invoice type</legend>
              <label className={kind === "STANDARD" ? "selected" : ""}>
                <input
                  className="sr-only"
                  type="radio"
                  name="invoice-kind"
                  value="STANDARD"
                  checked={kind === "STANDARD"}
                  disabled={correctionDraft}
                  onChange={() => setKind("STANDARD")}
                />
                <span>
                  <strong>Business customer</strong>
                  <small>Standard tax invoice</small>
                </span>
                {kind === "STANDARD" && <Check size={17} />}
              </label>
              <label className={kind === "SIMPLIFIED" ? "selected" : ""}>
                <input
                  className="sr-only"
                  type="radio"
                  name="invoice-kind"
                  value="SIMPLIFIED"
                  checked={kind === "SIMPLIFIED"}
                  disabled={correctionDraft}
                  onChange={() => setKind("SIMPLIFIED")}
                />
                <span>
                  <strong>Individual / walk-in</strong>
                  <small>Simplified tax invoice</small>
                </span>
                {kind === "SIMPLIFIED" && <Check size={17} />}
              </label>
            </fieldset>
            {correctionDraft && (
              <p className="locked-field-note">
                Correction notes keep the original invoice classification.
              </p>
            )}
          </section>
          <section className="form-panel">
            <div className="section-title">
              <h2>2. Customer and dates</h2>
              <p>
                You can add the customer later. Change dates only if needed.
              </p>
            </div>
            <div className="form-grid invoice-fields">
              <div className="customer-picker-block">
                <label>
                  Customer <small>(can add later)</small>
                  <select
                    value={customerId}
                    disabled={correctionDraft}
                    onChange={(e) => {
                      const nextCustomerId = e.target.value;
                      const nextCustomer = data.customers.find(
                        (item) => item.id === nextCustomerId,
                      );
                      setCustomerId(nextCustomerId);
                      if (!correctionDraft) {
                        setKind(
                          nextCustomer?.vatNumber ? "STANDARD" : "SIMPLIFIED",
                        );
                      }
                    }}
                  >
                    <option value="">Add customer later</option>
                    {data.customers.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!correctionDraft && (
                  <div className="customer-picker-actions">
                    <CustomerQuickCreate
                      onCreated={(createdCustomer) => {
                        setCustomerId(createdCustomer.id);
                        setKind(
                          createdCustomer.vatNumber ? "STANDARD" : "SIMPLIFIED",
                        );
                      }}
                    />
                    {customer && (
                      <CustomerQuickEdit
                        customer={customer}
                        onUpdated={(updatedCustomer) => {
                          setCustomerId(updatedCustomer.id);
                          setKind(
                            updatedCustomer.vatNumber
                              ? "STANDARD"
                              : "SIMPLIFIED",
                          );
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
              <label>
                Car <small>(optional)</small>
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="">No car selected</option>
                  {data.vehicles.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.displayName || car.plateNumber || "Car details to add"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Draft date
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </label>
              <label>
                Supply date
                <input
                  type="date"
                  value={supplyDate}
                  onChange={(e) => setSupplyDate(e.target.value)}
                />
              </label>
              {!creditNote && (
                <label>
                  Due date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              )}
            </div>
            {customer && (
              <div className="buyer-preview">
                <span>
                  <strong>{customer.name}</strong>
                  <small>
                    {customer.address?.buildingNumber}{" "}
                    {customer.address?.street}, {customer.address?.city}
                  </small>
                </span>
                <span>
                  <small>VAT identity</small>
                  <strong>{customer.vatNumber || "Non VAT-registered"}</strong>
                </span>
              </div>
            )}
          </section>
          <section className="form-panel">
            <div className="section-title line-title">
              <div>
                <h2>3. Items</h2>
                <p>Add what you sold.</p>
              </div>
              <select
                className="catalog-picker"
                aria-label="Add saved item"
                defaultValue=""
                onChange={(e) => {
                  const item = data.items.find((x) => x.id === e.target.value);
                  if (item)
                    setLines([
                      ...lines.filter(
                        (line) =>
                          !(
                            !line.description &&
                            line.quantity === 1 &&
                            line.unitPrice === 0 &&
                            line.discount === 0 &&
                            line.vatCategory === "S" &&
                            !line.exemptionReason &&
                            !line.exemptionReasonCode
                          ),
                      ),
                      {
                        id: crypto.randomUUID(),
                        description: item.name,
                        quantity: 1,
                        unitCode: item.unitCode,
                        unitPrice: item.unitPrice,
                        discount: 0,
                        vatCategory: item.vatCategory,
                        vatRate: item.vatRate,
                      },
                    ]);
                  e.currentTarget.value = "";
                }}
              >
                <option value="">Add saved item</option>
                {data.items.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.sku} - {item.name}
                  </option>
                ))}
              </select>
            </div>
            <LineItemsEditor
              helpTarget="invoice-lines"
              lines={lines}
              onChange={setLines}
            />
            <button
              className="add-line"
              onClick={() => setLines([...lines, emptyLine()])}
            >
              <Plus size={16} />
              Add line
            </button>
          </section>
          <details className="form-panel optional-panel">
            <summary>Optional: payment terms and customer note</summary>
            <div className="form-grid two">
              <label>
                Payment terms
                <input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </label>
              <label>
                Customer note
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Visible on the customer copy"
                />
              </label>
            </div>
          </details>
        </section>
        <aside
          className={`editor-aside${previewOpen ? " is-mobile-preview-open" : ""}`}
        >
          <button
            type="button"
            className="mobile-preview-close"
            onClick={() => setPreviewOpen(false)}
          >
            <X size={18} />
            Back to editor
          </button>
          <section
            className="editor-preview-panel"
            aria-label="Live invoice preview"
          >
            <A4ScaleToFit>
              <InvoiceDraftPreview
                numberLabel={created?.number || "Draft"}
                seller={created?.seller || data.organisation}
                customer={customer}
                issueDate={issueDate}
                supplyDate={supplyDate}
                dueDate={dueDate || undefined}
                lines={lines}
                notes={notes}
                paymentTerms={paymentTerms}
                kind={kind}
                documentType={created?.documentType || "INVOICE"}
                originalInvoiceNumber={created?.originalInvoiceNumber}
                adjustmentReason={created?.adjustmentReason}
              />
            </A4ScaleToFit>
          </section>
        </aside>
      </div>
      <Dialog.Root open={review} onOpenChange={setReview}>
        {review && (
          <Dialog.Content className="review-modal" maxWidth="470px">
            <div className="review-icon">
              <LockKeyhole size={24} />
            </div>
            <Dialog.Title>Lock this demo invoice?</Dialog.Title>
            <Dialog.Description>
              You will not be able to edit it afterward. This demo does not send
              anything to ZATCA.
            </Dialog.Description>
            <div className="environment-warning">
              <AlertCircle size={17} />
              <span>
                <strong>Demo only.</strong> ZATCA setup, signing, and submission
                are not connected yet.
              </span>
            </div>
            {error && (
              <div className="modal-error" role="alert">
                <AlertCircle size={17} />
                {error}
              </div>
            )}
            {blockingIssueCount > 0 && (
              <div className="modal-error">
                <AlertCircle size={17} />
                <div>
                  <strong>Finish these details before issuing:</strong>
                  <ul>
                    {missingCustomer && <li>Add a customer.</li>}
                    {errors.map((issue) => (
                      <li key={`${issue.code}-${issue.path}`}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                  <p>You can still save this draft.</p>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <Dialog.Close>
                <button className="button secondary" disabled={saving}>
                  Return to draft
                </button>
              </Dialog.Close>
              <button
                className="button primary"
                onClick={() => void confirmSandbox()}
                disabled={blockingIssueCount > 0 || saving}
              >
                <LockKeyhole size={16} />
                {saving ? "Processing" : "Issue sandbox copy"}
              </button>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Root>
    </div>
  );
}
function FileSource() {
  return <FileTextIcon />;
}
function FileTextIcon() {
  return <Package size={19} />;
}
