"use client";
import { AmountInput } from "@/components/amount-input";
import { InvoicePaymentHistory } from "@/components/invoice-payment-history";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@radix-ui/themes";
import {
  Archive,
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  FileMinus,
  Fingerprint,
  LockKeyhole,
  Pencil,
  ReceiptX,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "@/lib/icons";
import { StatusPill } from "@/components/app-shell";
import { DocumentRecordRail } from "@/components/document-record-rail";
import { InvoiceDraftPreview } from "@/components/document-previews";
import { DocumentActions } from "@/components/document-actions";
import { RecordAttachments } from "@/components/ledger-attachments";
import { useProduct } from "@/components/product-context";
import { money, shortDate } from "@/lib/format";
import { canReceiveInvoicePayment } from "@/lib/invoice-payment-eligibility";
import type { InvoiceRecord, PaymentRecord } from "@/lib/product-types";
const localDateTime = () => {
  const current = new Date();
  return new Date(current.getTime() - current.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, mutate } = useProduct();
  const tabs = [
    ["document", "Document"],
    ["payments", "Payments"],
    ["compliance", "Compliance evidence"],
    ["timeline", "Timeline"],
  ] as const;
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("document");
  const [dialog, setDialog] = useState<
    "payment" | "note" | "issue" | "delete" | null
  >(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentRecord["method"]>("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState(localDateTime);
  const [noteReason, setNoteReason] = useState("");
  const [noteType, setNoteType] = useState<"CREDIT_NOTE" | "DEBIT_NOTE">(
    "CREDIT_NOTE",
  );
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invoice = data?.invoices.find((item) => item.id === id);
  const payments =
    data?.payments.filter((payment) => payment.invoiceId === id) || [];
  const offsets =
    data?.billBook?.settlements.filter(
      (settlement) =>
        settlement.kind === "OFFSET" && settlement.invoiceId === id,
    ) || [];
  const run = async (fn: () => Promise<void>) => {
    setWorking(true);
    setError(null);
    try {
      await fn();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action failed");
    } finally {
      setWorking(false);
    }
  };
  const recordPayment = () =>
    run(async () => {
      await mutate<PaymentRecord>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: id,
          amount: Number(amount),
          method: paymentMethod,
          reference:
            reference.trim() ||
            paymentMethod.replaceAll("_", " ").toLowerCase(),
          paidAt: new Date(paidAt).toISOString(),
        }),
      });
      setDialog(null);
      setAmount("");
      setReference("");
    });
  const createNote = () =>
    run(async () => {
      const note = await mutate<InvoiceRecord>(`/api/invoices/${id}`, {
        method: "POST",
        body: JSON.stringify({
          action: "create-note",
          type: noteType,
          reason: noteReason,
        }),
      });
      router.push(`/invoices/${note.id}/edit`);
    });
  const issue = () =>
    run(async () => {
      await mutate(`/api/invoices/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "issue-sandbox" }),
      });
      setDialog(null);
    });
  const recordBadDebt = () =>
    run(async () => {
      await mutate(`/api/invoices/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "record-bad-debt" }),
      });
    });
  const duplicate = () =>
    run(async () => {
      const created = await mutate<InvoiceRecord>(`/api/invoices/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "duplicate" }),
      });
      router.push(`/invoices/${created.id}/edit`);
    });
  const remove = () =>
    run(async () => {
      await mutate(`/api/invoices/${id}`, { method: "DELETE" });
      router.push("/invoices");
    });
  if (loading)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  if (!invoice)
    return (
      <div className="page">
        <div className="state-page error-state">
          <TriangleAlert size={30} />
          <h1>Invoice not found</h1>
          <Link className="button secondary" href="/invoices">
            Return to invoices
          </Link>
        </div>
      </div>
    );
  const balance = invoice.total - invoice.paidAmount - invoice.badDebtAmount;
  const collectable = invoice.documentType !== "CREDIT_NOTE";
  const canRecordPayment = canReceiveInvoicePayment(invoice);
  const canRecordBadDebt = canRecordPayment;
  const openPaymentDialog = () => {
    router.push(`/payments/new?direction=IN&invoice=${id}&step=amount`);
  };
  return (
    <div className="page document-workspace-page">
      <DocumentRecordRail
        kind="invoice"
        activeId={invoice.id}
        records={data?.invoices ?? []}
      />
      <article className="document-workspace-content">
        <div className="detail-top">
          <div>
            <Link href="/invoices" className="back-link">
              <ArrowLeft size={16} />
              Invoices
            </Link>
            <div className="detail-title">
              <h1>{invoice.number}</h1>
              <StatusPill status={invoice.status} />
              <StatusPill status={invoice.paymentStatus} />
              {invoice.immutableAt && (
                <span className="frozen-label">
                  <LockKeyhole size={14} />
                  Locked
                </span>
              )}
            </div>
            <p>
              {invoice.kind === "STANDARD"
                ? "Business tax invoice"
                : "Customer tax invoice"}
            </p>
          </div>
          <div data-help="invoice-actions" className="page-actions">
            {invoice.status === "DRAFT" && (
              <button
                type="button"
                className="button primary"
                onClick={() => setDialog("issue")}
                disabled={working}
              >
                <LockKeyhole size={16} />
                Issue sandbox copy
              </button>
            )}
            {canRecordPayment && (
              <button
                type="button"
                className="button primary"
                onClick={openPaymentDialog}
                disabled={working}
              >
                <CreditCard size={16} />
                Record payment
              </button>
            )}
            <DocumentActions
              kind="Invoice"
              number={invoice.number}
              customerName={invoice.customer.name}
              customerPhone={invoice.customer.phone}
              customerEmail={invoice.customer.email}
              total={invoice.total}
              onBeforePrint={() => setTab("document")}
            />
            <details
              className="detail-actions-menu"
              aria-label={`More actions for ${invoice.number}`}
            >
              <summary className="button secondary">More actions</summary>
              <div
                className="detail-actions-menu-content"
                role="group"
                aria-label="Invoice actions"
              >
                {invoice.status === "DRAFT" && (
                  <Link
                    className="button secondary"
                    href={`/invoices/${invoice.id}/edit`}
                  >
                    <Pencil size={16} />
                    Edit draft
                  </Link>
                )}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void duplicate()}
                  disabled={working}
                >
                  <Copy size={16} />
                  Duplicate
                </button>
                {invoice.immutableAt && invoice.documentType === "INVOICE" && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setDialog("note")}
                    disabled={working}
                  >
                    <FileMinus size={16} />
                    Create tax note
                  </button>
                )}
                {invoice.status === "DRAFT" && !invoice.quotationId && (
                  <button
                    type="button"
                    className="button danger"
                    onClick={() => setDialog("delete")}
                    disabled={working}
                  >
                    <Trash2 size={16} />
                    Delete draft
                  </button>
                )}
              </div>
            </details>
          </div>
        </div>
        {error && (
          <div className="inline-alert error" role="alert">
            <TriangleAlert size={18} />
            {error}
          </div>
        )}
        {invoice.status === "SANDBOX_ISSUED" && (
          <div className="info-strip warning">
            <TriangleAlert size={19} />
            <span>
              <strong>Sandbox artefact only.</strong> This record was not
              signed, cleared, reported, or submitted to ZATCA.
            </span>
          </div>
        )}
        <section
          className="summary-panel invoice-balance-panel internal-workflow"
          aria-labelledby="invoice-balance-heading"
        >
          <div className="panel-heading">
            <div>
              <h2 id="invoice-balance-heading">
                {invoice.documentType === "CREDIT_NOTE"
                  ? "Credit value"
                  : invoice.status === "DRAFT"
                    ? "Draft total"
                    : "Balance"}
              </h2>
              <p>
                {invoice.documentType === "CREDIT_NOTE"
                  ? "This value is applied as customer credit."
                  : `${payments.length} payment${payments.length === 1 ? " or settlement" : "s or settlements"} recorded`}
              </p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Document total</dt>
              <dd>{money(invoice.total)}</dd>
            </div>
            <div>
              <dt>Paid / settled</dt>
              <dd>{money(invoice.paidAmount)}</dd>
            </div>
            {invoice.badDebtAmount > 0 && (
              <div>
                <dt>Recorded bad debt</dt>
                <dd>{money(invoice.badDebtAmount)}</dd>
              </div>
            )}
            <div className="summary-total">
              <dt>
                {invoice.documentType === "CREDIT_NOTE"
                  ? "Customer credit"
                  : "Amount due"}
              </dt>
              <dd>{money(balance)}</dd>
            </div>
          </dl>
          {canRecordBadDebt && (
            <button
              type="button"
              className="button secondary"
              onClick={() => void recordBadDebt()}
              disabled={working}
            >
              <ReceiptX size={16} />
              Record bad debt
            </button>
          )}
        </section>
        <div data-help="invoice-tabs" className="detail-tabs" role="tablist">
          {tabs.map(([value, label], index) => (
            <button
              key={value}
              id={`tab-${value}`}
              role="tab"
              aria-selected={tab === value}
              aria-controls={`panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              className={tab === value ? "active" : ""}
              onClick={() => setTab(value)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                const nextValue = tabs[next][0];
                setTab(nextValue);
                document.getElementById(`tab-${nextValue}`)?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "document" && (
          <div
            className="document-customer-copy"
            role="tabpanel"
            id="panel-document"
            aria-labelledby="tab-document"
            tabIndex={0}
          >
            <InvoiceSheet invoice={invoice} />
          </div>
        )}
        {tab === "payments" && (
          <section
            className="panel register-panel"
            role="tabpanel"
            id="panel-payments"
            aria-labelledby="tab-payments"
            tabIndex={0}
          >
            <div className="panel-heading">
              <div>
                <h2>Payments and settlements</h2>
                <p>
                  Payments and amounts settled against supplier bills reduce the
                  amount due.
                </p>
              </div>
              {canRecordPayment && (
                <button
                  type="button"
                  className="button primary"
                  onClick={openPaymentDialog}
                  disabled={working}
                >
                  <CreditCard size={16} />
                  Record payment
                </button>
              )}
            </div>
            {payments.length ? (
              <InvoicePaymentHistory payments={payments} />
            ) : (
              <div className="empty-state">
                <CreditCard size={30} />
                <h3>No payments or settlements recorded</h3>
                <p>
                  {collectable
                    ? `The open balance is ${money(balance)}.`
                    : "Credit notes are applied as customer credits, not payments."}
                </p>
              </div>
            )}
            {offsets.length > 0 && (
              <details className="history-options">
                <summary>Supplier-bill settlement history</summary>
                <p className="plain-note">
                  These amounts cleared debts without moving money. Open the
                  supplier bill to check or undo a settlement.
                </p>
                <div className="timeline-list">
                  {offsets.map((settlement) => (
                    <div className="timeline-event" key={settlement.id}>
                      <span>
                        <Check size={13} />
                      </span>
                      <div>
                        <strong>
                          {settlement.reversalOf
                            ? "Settlement undone"
                            : settlement.reversedBy
                              ? "Settlement · later undone"
                              : "Settled against supplier bill"}
                          {" · "}
                          {money(settlement.amount)}
                        </strong>
                        <small>
                          {shortDate(settlement.entryDate)} ·{" "}
                          {settlement.billNumber || "Supplier bill"}
                        </small>
                        {(settlement.reversalReason || settlement.note) && (
                          <p>{settlement.reversalReason || settlement.note}</p>
                        )}
                        <Link
                          className="text-link"
                          href={`/bills/${settlement.billId}`}
                        >
                          {!settlement.reversalOf && !settlement.reversedBy
                            ? "Open supplier bill / undo settlement"
                            : "View supplier bill"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <section
              className="entry-attachments"
              aria-label="Invoice copies and receipts"
            >
              <h3>Invoice copies and receipts</h3>
              <RecordAttachments linkType="INVOICE" linkId={invoice.id} />
            </section>
          </section>
        )}
        {tab === "compliance" && (
          <section
            className="evidence-layout"
            role="tabpanel"
            id="panel-compliance"
            aria-labelledby="tab-compliance"
            tabIndex={0}
          >
            <div className="panel evidence-main">
              <div className="panel-heading">
                <div>
                  <h2>Archived sandbox evidence</h2>
                  <p>Values below exist only after local sandbox issuance.</p>
                </div>
                <Fingerprint size={21} />
              </div>
              <Evidence
                label="Document UUID (local sandbox)"
                value={invoice.uuid || "Not allocated"}
              />
              <Evidence
                label="Invoice counter"
                value={invoice.counter?.toString() || "Not allocated"}
              />
              <Evidence
                label="Previous local hash"
                value={invoice.previousHash || "Not allocated"}
              />
              <Evidence
                label="Raw XML SHA-256"
                value={invoice.xmlHash || "Not generated"}
              />
              <Evidence
                label="Immutable at"
                value={invoice.immutableAt || "Draft is editable"}
              />
              {invoice.reportingDeadline && (
                <Evidence
                  label="Reporting deadline (sandbox)"
                  value={invoice.reportingDeadline}
                />
              )}
              {invoice.immutableAt && (
                <a
                  className="button secondary archive-download"
                  href={`/api/invoices/${invoice.id}/xml`}
                  download
                >
                  <Archive size={16} />
                  Download archived sandbox XML
                </a>
              )}
            </div>
            <aside className="readiness-panel">
              <ShieldCheck size={24} />
              <h2>Production gate</h2>
              <p>
                Production issuance remains unavailable until the official
                validator, canonical hash, signing key, CSID, archive, and
                submission worker are connected.
              </p>
              <Link className="button secondary full" href="/compliance">
                Open action center
              </Link>
            </aside>
          </section>
        )}
        {tab === "timeline" && (
          <section
            className="panel timeline-list"
            role="tabpanel"
            id="panel-timeline"
            aria-labelledby="tab-timeline"
            tabIndex={0}
          >
            <h2>Document history</h2>
            {data?.audit
              .filter((event) => event.aggregateId === id)
              .map((event) => (
                <div className="timeline-event" key={event.id}>
                  <span>
                    <Check size={13} />
                  </span>
                  <div>
                    <strong>{event.eventType.replaceAll("_", " ")}</strong>
                    <small>
                      {new Date(event.occurredAt).toLocaleString("en-GB")} by{" "}
                      {event.actorId}
                    </small>
                  </div>
                </div>
              ))}
          </section>
        )}
        <Dialog.Root
          open={dialog !== null}
          onOpenChange={(open) => !open && setDialog(null)}
        >
          {dialog && (
            <Dialog.Content className="review-modal" maxWidth="470px">
              <Dialog.Title>
                {dialog === "payment"
                  ? "Record payment"
                  : dialog === "note"
                    ? "Create a linked tax note"
                    : dialog === "issue"
                      ? "Issue immutable sandbox copy?"
                      : "Delete draft invoice?"}
              </Dialog.Title>
              {error && (
                <div className="modal-error" role="alert">
                  <TriangleAlert size={17} />
                  {error}
                </div>
              )}
              {dialog === "payment" ? (
                <div className="modal-form">
                  <label>
                    Amount (SAR)
                    <AmountInput
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={balance}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                  <label>
                    Payment method
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value as PaymentRecord["method"],
                        )
                      }
                    >
                      <option value="BANK_TRANSFER">Bank transfer</option>
                      <option value="CARD">Card</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label>
                    Paid at
                    <input
                      type="datetime-local"
                      value={paidAt}
                      onChange={(event) => setPaidAt(event.target.value)}
                    />
                  </label>
                  <label>
                    Reference (optional)
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Receipt number, if any"
                    />
                  </label>
                </div>
              ) : dialog === "note" ? (
                <div className="modal-form">
                  <label>
                    Note type
                    <select
                      value={noteType}
                      onChange={(e) =>
                        setNoteType(e.target.value as typeof noteType)
                      }
                    >
                      <option value="CREDIT_NOTE">Credit note</option>
                      <option value="DEBIT_NOTE">Debit note</option>
                    </select>
                  </label>
                  <label>
                    Correction reason
                    <textarea
                      rows={4}
                      value={noteReason}
                      onChange={(e) => setNoteReason(e.target.value)}
                      placeholder="Required reason for the note"
                    />
                  </label>
                </div>
              ) : dialog === "issue" ? (
                <Dialog.Description>
                  This locks {invoice.number} inside the demo so it cannot be
                  edited. It is not signed or sent to ZATCA.
                </Dialog.Description>
              ) : (
                <Dialog.Description>
                  {invoice.number} will be removed. Its number and existing
                  audit events remain part of the workspace history.
                </Dialog.Description>
              )}
              <div className="modal-actions">
                <Dialog.Close>
                  <button className="button secondary" disabled={working}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className={
                    dialog === "delete" ? "button danger" : "button primary"
                  }
                  onClick={() =>
                    void (dialog === "payment"
                      ? recordPayment()
                      : dialog === "note"
                        ? createNote()
                        : dialog === "issue"
                          ? issue()
                          : remove())
                  }
                  disabled={
                    working ||
                    (dialog === "payment" &&
                      (Number(amount) <= 0 ||
                        Number(amount) > balance ||
                        !paidAt)) ||
                    (dialog === "note" && noteReason.trim().length < 3)
                  }
                >
                  {working
                    ? "Saving"
                    : dialog === "payment"
                      ? "Record payment"
                      : dialog === "note"
                        ? "Create draft note"
                        : dialog === "issue"
                          ? "Issue sandbox copy"
                          : "Delete draft"}
                </button>
              </div>
            </Dialog.Content>
          )}
        </Dialog.Root>
      </article>
    </div>
  );
}
function InvoiceSheet({ invoice }: { invoice: InvoiceRecord }) {
  return (
    <InvoiceDraftPreview
      numberLabel={invoice.number}
      seller={invoice.seller}
      customer={invoice.customer}
      issueDate={invoice.issueDate}
      supplyDate={invoice.supplyDate}
      dueDate={invoice.dueDate}
      lines={invoice.lines}
      notes={invoice.notes}
      paymentTerms={invoice.paymentTerms}
      kind={invoice.kind}
      documentType={invoice.documentType}
      originalInvoiceNumber={invoice.originalInvoiceNumber}
      adjustmentReason={invoice.adjustmentReason}
      qrBase64={invoice.qrBase64}
    />
  );
}
function Evidence({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="evidence-line">
      <span>{label}</span>
      <code>{value}</code>
      <button onClick={() => void copy()} aria-label={`Copy ${label}`}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}
