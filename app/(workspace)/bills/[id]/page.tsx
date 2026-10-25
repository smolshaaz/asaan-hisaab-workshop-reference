"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Pencil, ReceiptText } from "@/lib/icons";
import { BillForm } from "@/components/bill-form";
import { AmountInput } from "@/components/amount-input";
import { BillCarLink } from "@/components/bill-car-link";
import { RecordAttachments } from "@/components/ledger-attachments";
import { useProduct } from "@/components/product-context";
import type { BillRecord, BillSettlement } from "@/lib/bill-types";
import { money, shortDate } from "@/lib/format";
import { riyadhDate } from "@/lib/business-date";
import { canReceiveInvoicePayment } from "@/lib/invoice-payment-eligibility";
import styles from "@/components/bills.module.css";

type Mode = "offset" | "cancel" | "date" | null;
type OffsetTarget = {
  key: string;
  id: string;
  type: "bill" | "invoice";
  label: string;
  balance: number;
};
const rounded = (value: number) => Math.round(value * 100) / 100;
const categoryLabels = {
  PARTS: "Parts",
  OUTSOURCED_WORK: "Outside work",
  WAGES: "Worker wages",
  BUSINESS: "Other business expense",
  RENT: "Rent",
  UTILITIES: "Electricity & water",
  PERSONAL: "Personal / non-business",
};

export default function BillDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data, loading, error: loadError, refresh, mutate } = useProduct();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(riyadhDate());
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [success, setSuccess] = useState("");
  const [reverseId, setReverseId] = useState("");
  const [reverseReason, setReverseReason] = useState("");
  const busy = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const bill = data?.billBook.bills.find((item) => item.id === id);
  if (loading)
    return (
      <div className="page">
        <p>Loading record…</p>
      </div>
    );
  if (!data)
    return (
      <div className="page">
        <h1>Could not load this record</h1>
        <p>{loadError}</p>
        <button className="button primary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  if (!bill)
    return (
      <div className="page">
        <Link className="back-link" href="/bills">
          <ArrowLeft size={18} /> Back to supplier bills
        </Link>
        <h1>Record not found</h1>
        <Link className="text-link" href="/invoices">
          Find a customer invoice
        </Link>
      </div>
    );
  const person = data.ledger.people.find((item) => item.id === bill.personId);
  const settlements = data.billBook.settlements
    .filter((item) => item.billId === bill.id || item.otherBillId === bill.id)
    .sort(
      (a, b) =>
        a.entryDate.localeCompare(b.entryDate) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const opposite: OffsetTarget[] = data.billBook.bills
    .filter(
      (candidate) =>
        candidate.id !== bill.id &&
        candidate.personId === bill.personId &&
        candidate.direction !== bill.direction &&
        candidate.status === "POSTED" &&
        candidate.balance > 0,
    )
    .map((candidate) => ({
      key: `bill:${candidate.id}`,
      id: candidate.id,
      type: "bill",
      balance: candidate.balance,
      label: `${candidate.direction === "PURCHASE" ? "Supplier invoice" : "Customer invoice"} ${candidate.number || "without number"} · ${money(candidate.balance)} left`,
    }));
  const invoiceTargets: OffsetTarget[] =
    bill.direction === "PURCHASE" && person?.customerId
      ? data.invoices
          .filter(
            (invoice) =>
              invoice.customerId === person.customerId &&
              invoice.documentType === "INVOICE" &&
              canReceiveInvoicePayment(invoice),
          )
          .map((invoice) => ({
            key: `invoice:${invoice.id}`,
            id: invoice.id,
            type: "invoice",
            balance: rounded(
              invoice.total - invoice.paidAmount - invoice.badDebtAmount,
            ),
            label: `Invoice ${invoice.number} · ${money(rounded(invoice.total - invoice.paidAmount - invoice.badDebtAmount))} left`,
          }))
      : [];
  const targets = [...opposite, ...invoiceTargets];
  const target = targets.find((item) => item.key === targetKey);
  const offsetLimit = target ? Math.min(bill.balance, target.balance) : 0;
  const offsetAmount = Number(amount) || 0;
  const status =
    bill.status === "DRAFT"
      ? "Draft"
      : bill.status === "CANCELLED"
        ? "Cancelled"
        : bill.balance <= 0
          ? "Settled"
          : "Amount recorded";

  function openMode(next: Mode | "pay") {
    if (next === "pay") {
      router.push(
        `/payments/new?direction=${bill!.direction === "SALE" ? "IN" : "OUT"}&bill=${id}&step=amount`,
      );
      return;
    }
    setMode(next);
    setEditing(false);
    setReverseId("");
    setError("");
    setSuccess("");
    setNote("");
    setEntryDate(riyadhDate());
    requestId.current = crypto.randomUUID();
    if (next === "offset") {
      const only = targets.length === 1 ? targets[0] : undefined;
      setTargetKey(only?.key || "");
      setAmount(only ? String(Math.min(bill!.balance, only.balance)) : "");
    } else setAmount("");
    if (next === "date") setDueDate(bill!.dueDate || "");
  }
  async function run(payload: Record<string, unknown>, message: string) {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    setSuccess("");
    try {
      await mutate<BillRecord | BillSettlement>("/api/bills", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMode(null);
      setReverseId("");
      setReverseReason("");
      setSuccess(message);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save. Your details are still here.",
      );
      void refresh();
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }
  function recordOffset(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    void run(
      {
        action: "offset",
        purchaseBillId: bill!.direction === "PURCHASE" ? bill!.id : target.id,
        saleBillId:
          bill!.direction === "SALE"
            ? bill!.id
            : target.type === "bill"
              ? target.id
              : undefined,
        invoiceId: target.type === "invoice" ? target.id : undefined,
        amount: Number(amount),
        entryDate,
        note,
        idempotencyKey: requestId.current,
      },
      "Offset saved. Both amounts were reduced. No cash was recorded.",
    );
  }

  return (
    <div data-help="bill-detail" className={`page ${styles.page}`}>
      <Link
        className="back-link"
        href={bill.direction === "PURCHASE" ? "/bills" : "/invoices"}
      >
        <ArrowLeft size={18} />{" "}
        {bill.direction === "PURCHASE"
          ? "Back to supplier bills"
          : "Back to customer invoices"}
      </Link>
      <div className={styles.header}>
        <div>
          <p>
            {bill.direction === "PURCHASE"
              ? "Supplier bill"
              : "Customer invoice"}
          </p>
          <h1>
            {bill.number ||
              (bill.direction === "PURCHASE"
                ? "Bill number not added"
                : "Invoice number not added")}
          </h1>
          <p>
            {person ? (
              <Link href={`/people/${person.id}`}>{person.name}</Link>
            ) : (
              "Person not added"
            )}
          </p>
          <span className={styles.status}>{status}</span>
        </div>
        <div className={styles.actions}>
          {bill.status === "DRAFT" && !editing && (
            <>
              <button
                className="button primary"
                onClick={() => setEditing(true)}
              >
                <Pencil size={17} /> Continue draft
              </button>
              <button
                className="button secondary"
                disabled={working}
                onClick={() =>
                  void run(
                    { action: "post", id: bill.id },
                    "Amount recorded. No payment has been recorded yet.",
                  )
                }
              >
                Record amount owed
              </button>
            </>
          )}
          {bill.status === "POSTED" && bill.balance > 0 && (
            <>
              <button
                className="button primary"
                onClick={() => openMode("pay")}
              >
                {bill.direction === "PURCHASE" ? "We paid" : "Customer paid"}
              </button>
              <button
                className="button secondary"
                onClick={() => openMode("offset")}
              >
                Settle against another invoice
              </button>
            </>
          )}
        </div>
      </div>
      {success && (
        <p className={styles.saved} role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {editing && bill.status === "DRAFT" ? (
        <BillForm
          key={bill.id}
          initial={bill}
          onSaved={(savedBill) => {
            setEditing(false);
            setSuccess(
              savedBill.status === "POSTED"
                ? "Amount recorded. No payment has been recorded yet."
                : "Draft saved",
            );
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {bill.status === "DRAFT" && (
            <div className={styles.banner}>
              <strong>Saved for later</strong>
              <p>
                This draft does not change anyone’s balance. Add the missing
                details before recording the amount owed.
              </p>
            </div>
          )}
          {bill.status === "CANCELLED" && (
            <div className={styles.banner}>
              <strong>Cancelled — kept in your records</strong>
              <p>{bill.cancellationReason}</p>
              <small>
                {bill.cancelledAt
                  ? new Date(bill.cancelledAt).toLocaleString("en-GB")
                  : ""}
              </small>
            </div>
          )}
          <div className={styles.summary}>
            <div>
              <span>
                {bill.direction === "PURCHASE" ? "Bill total" : "Invoice total"}
              </span>
              <strong>{money(bill.total)}</strong>
            </div>
            <div>
              <span>Payments matched</span>
              <strong>{money(bill.paidAmount)}</strong>
            </div>
            <div>
              <span>Settled by offset</span>
              <strong>{money(bill.offsetAmount)}</strong>
            </div>
            <div className={styles.remaining}>
              <span>
                {bill.status === "DRAFT"
                  ? "Not recorded yet"
                  : bill.direction === "PURCHASE"
                    ? "Left to pay"
                    : "Left to collect"}
              </span>
              <strong>{money(bill.balance)}</strong>
            </div>
          </div>
          <dl className={styles.details}>
            <div>
              <dt>
                {bill.direction === "PURCHASE" ? "Bill date" : "Invoice date"}
              </dt>
              <dd>
                {bill.issueDate ? shortDate(bill.issueDate) : "Not added"}
              </dd>
            </div>
            <div>
              <dt>Payment date agreed</dt>
              <dd>
                {bill.dueDate ? shortDate(bill.dueDate) : "Not added"}
                {bill.status !== "CANCELLED" && (
                  <button
                    type="button"
                    className="text-link"
                    disabled={working}
                    onClick={() => openMode("date")}
                  >
                    {bill.dueDate ? "Change date" : "Add payment date"}
                  </button>
                )}
              </dd>
            </div>
            {bill.direction === "PURCHASE" && (
              <div>
                <dt>What it was for</dt>
                <dd>{categoryLabels[bill.category]}</dd>
              </div>
            )}
          </dl>
          {mode === "date" && (
            <form
              data-help="bill-due-date"
              className={styles.settlementForm}
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  { action: "due-date", id: bill.id, dueDate },
                  dueDate
                    ? "Payment date saved. Today will use this date for follow-ups."
                    : "Payment date removed.",
                );
              }}
            >
              <h2>When is payment expected?</h2>
              <p className={styles.note}>
                Record the date agreed with {person?.name || "the other person"}
                . This changes the follow-up date, not the amount owed.
              </p>
              <label>
                Payment date (optional)
                <input
                  type="date"
                  autoFocus
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
              <div className={styles.actions}>
                <button className="button primary" disabled={working}>
                  {working ? "Saving…" : "Save payment date"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={working}
                  onClick={() => setMode(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <BillCarLink bill={bill} />
          {bill.note && <p className={styles.fullNote}>{bill.note}</p>}
          {bill.existingEntryId && (
            <p className={styles.note}>
              Linked to an earlier pay-later record. The amount was not added
              twice.
            </p>
          )}
        </>
      )}

      {mode === "offset" && (
        <form className={styles.settlementForm} onSubmit={recordOffset}>
          <h2>Settle what we owe each other</h2>
          <p className={styles.note}>
            Match an unpaid customer invoice with a supplier bill for{" "}
            {person?.name || "the same person"}. Both amounts go down. No money
            changes hands.
          </p>
          {targets.length ? (
            <>
              <label>
                {bill.direction === "PURCHASE"
                  ? "Which invoice do they owe us for?"
                  : "Which supplier bill do we owe them for?"}
                <select
                  value={targetKey}
                  required
                  onChange={(event) => {
                    setTargetKey(event.target.value);
                    const next = targets.find(
                      (item) => item.key === event.target.value,
                    );
                    setAmount(
                      next ? String(Math.min(bill.balance, next.balance)) : "",
                    );
                  }}
                >
                  <option value="">
                    {bill.direction === "PURCHASE"
                      ? "Choose a customer invoice"
                      : "Choose a supplier bill"}
                  </option>
                  {targets.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.two}>
                <label>
                  Amount to offset (SAR)
                  <AmountInput
                    min="0.01"
                    max={offsetLimit || undefined}
                    step="0.01"
                    value={amount}
                    required
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <label>
                  Agreement date
                  <input
                    type="date"
                    value={entryDate}
                    required
                    onChange={(event) => setEntryDate(event.target.value)}
                  />
                </label>
              </div>
              <label>
                What did you agree?
                <textarea
                  rows={3}
                  required
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="For example: agreed with Ahmed to settle these two invoices against each other"
                />
              </label>
              {target && offsetAmount > 0 && offsetAmount <= offsetLimit && (
                <div className={styles.preview}>
                  <p>
                    This record: {money(rounded(bill.balance - offsetAmount))}{" "}
                    left.
                  </p>
                  <p>
                    The other record:{" "}
                    {money(rounded(target.balance - offsetAmount))} left.
                  </p>
                  <strong>No cash is recorded.</strong>
                </div>
              )}
              <div className={styles.actions}>
                <button
                  className="button primary"
                  disabled={
                    working ||
                    !target ||
                    offsetAmount <= 0 ||
                    offsetAmount > offsetLimit
                  }
                >
                  {working ? "Saving…" : "Save agreed offset"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={working}
                  onClick={() => setMode(null)}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                {bill.direction === "PURCHASE"
                  ? "No unpaid customer invoice is linked to this person."
                  : "No unpaid supplier bill is linked to this person."}
              </p>
              <div className={styles.actions}>
                <Link
                  className="button secondary"
                  href={`${bill.direction === "PURCHASE" ? "/invoices/record" : "/bills/new"}?person=${bill.personId || ""}`}
                >
                  {bill.direction === "PURCHASE"
                    ? "Record their customer invoice"
                    : "Add their supplier bill"}
                </Link>
                {person && (
                  <Link className="text-link" href={`/people/${person.id}`}>
                    Check this person’s linked customer record
                  </Link>
                )}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setMode(null)}
                >
                  Back
                </button>
              </div>
            </>
          )}
        </form>
      )}

      <section className={styles.section}>
        <h2>
          {bill.direction === "PURCHASE"
            ? "Bill photo or PDF"
            : "Invoice photo or PDF"}
        </h2>
        <RecordAttachments linkType="BILL" linkId={bill.id} />
      </section>
      <section data-help="bill-settlements" className={styles.section}>
        <h2>Payments and offsets</h2>
        {settlements.length ? (
          <ol className={styles.history}>
            {settlements.map((settlement) => {
              const reversed = Boolean(
                settlement.reversalOf || settlement.reversedBy,
              );
              const moneyEntry = data.ledger.entries.find(
                (entry) =>
                  entry.id ===
                  (settlement.existingEntryId || settlement.ledgerEntryId),
              );
              const handlerPaid = moneyEntry?.kind === "PERSON_PAID_BILL";
              const handlerCollected =
                moneyEntry &&
                ["PERSON_COLLECTED", "ADVANCE_COLLECTED"].includes(
                  moneyEntry.kind,
                );
              const otherBillId =
                settlement.billId === bill.id
                  ? settlement.otherBillId
                  : settlement.billId;
              const otherNumber =
                settlement.billId === bill.id
                  ? settlement.otherBillNumber
                  : settlement.billNumber;
              return (
                <li
                  key={settlement.id}
                  className={reversed ? styles.reversed : undefined}
                >
                  <div className={styles.historyTop}>
                    <strong>
                      {settlement.reversalOf
                        ? settlement.kind === "OFFSET"
                          ? "Offset undone"
                          : settlement.existingEntryId
                            ? "Earlier payment unlinked"
                            : "Payment undone"
                        : settlement.kind === "OFFSET"
                          ? "Settled by offset"
                          : settlement.existingEntryId
                            ? "Earlier payment linked"
                            : bill.direction === "PURCHASE"
                              ? "Money paid"
                              : "Money received"}
                    </strong>
                    <strong>
                      {settlement.amount < 0 ? "−" : ""}
                      {money(Math.abs(settlement.amount))}
                    </strong>
                  </div>
                  <p>
                    {shortDate(settlement.entryDate)}
                    {settlement.kind === "OFFSET"
                      ? " · No cash moved"
                      : ` · ${settlement.paymentMethod?.replaceAll("_", " ").toLowerCase() || "Payment"}`}
                  </p>
                  {moneyEntry && (handlerPaid || handlerCollected) && (
                    <p>
                      {handlerPaid
                        ? "Paid for the workshop by "
                        : "Collected for the workshop by "}
                      <Link href={`/people/${moneyEntry.personId}`}>
                        {moneyEntry.personName || "this person"}
                      </Link>
                      .
                      {handlerPaid
                        ? " This changes their account without recording a second workshop payment or expense."
                        : " The customer's payment is recorded; a handover to the workshop is a separate record."}
                    </p>
                  )}
                  {moneyEntry?.payerName && (
                    <p>
                      Actually paid by{" "}
                      {moneyEntry.payerPersonId ? (
                        <Link href={`/people/${moneyEntry.payerPersonId}`}>
                          {moneyEntry.payerName}
                        </Link>
                      ) : (
                        moneyEntry.payerName
                      )}{" "}
                      for {person?.name || "the customer"}.
                    </p>
                  )}
                  {settlement.existingEntryId && (
                    <p>
                      {settlement.reversalOf
                        ? "Link removed. The earlier money record remains."
                        : "Uses a payment already recorded. No new money in or out."}{" "}
                      <Link
                        href={`/payments#entry-${settlement.existingEntryId}`}
                      >
                        Open earlier money record
                      </Link>
                    </p>
                  )}
                  {!settlement.existingEntryId &&
                    settlement.kind === "PAYMENT" && (
                      <p>
                        <Link
                          href={`/payments#entry-${settlement.ledgerEntryId}`}
                        >
                          Open money record and receipt
                        </Link>
                      </p>
                    )}
                  {otherBillId && (
                    <p>
                      Against{" "}
                      <Link href={`/bills/${otherBillId}`}>
                        {otherNumber || "invoice record"}
                      </Link>
                    </p>
                  )}
                  {settlement.invoiceId && (
                    <p>
                      Against{" "}
                      <Link href={`/invoices/${settlement.invoiceId}`}>
                        {settlement.invoiceNumber || "customer invoice"}
                      </Link>
                    </p>
                  )}
                  {settlement.reference && <p>{settlement.reference}</p>}
                  {settlement.note && <p>{settlement.note}</p>}
                  {settlement.reversalReason && (
                    <p>Reason: {settlement.reversalReason}</p>
                  )}
                  <small>
                    Recorded{" "}
                    {new Date(settlement.createdAt).toLocaleString("en-GB")}
                    {settlement.reversedBy ? " · Undone" : ""}
                  </small>
                  {!reversed && (
                    <div className={styles.correction}>
                      <button
                        type="button"
                        className="text-link"
                        disabled={working}
                        onClick={() => {
                          setReverseId(
                            reverseId === settlement.id ? "" : settlement.id,
                          );
                          setReverseReason("");
                          setError("");
                        }}
                      >
                        Undo this{" "}
                        {settlement.kind === "OFFSET"
                          ? "offset"
                          : settlement.existingEntryId
                            ? "payment link"
                            : "payment"}
                      </button>
                      {reverseId === settlement.id && (
                        <form
                          className={styles.settlementForm}
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run(
                              {
                                action: "reverse-settlement",
                                settlementId: settlement.id,
                                reason: reverseReason,
                              },
                              "Undone. The original record stays in history.",
                            );
                          }}
                        >
                          <p className={styles.note}>
                            {settlement.existingEntryId
                              ? "This removes the payment link. The earlier money record stays unchanged, and the amount left on this record goes back up."
                              : "The original stays in history. The amounts will be put back as they were before this record."}
                          </p>
                          <label>
                            Why are you undoing it?
                            <textarea
                              rows={2}
                              required
                              value={reverseReason}
                              onChange={(event) =>
                                setReverseReason(event.target.value)
                              }
                            />
                          </label>
                          <div className={styles.actions}>
                            <button
                              className="button secondary"
                              disabled={working}
                            >
                              {working ? "Saving…" : "Confirm undo"}
                            </button>
                            <button
                              type="button"
                              className="button secondary"
                              disabled={working}
                              onClick={() => setReverseId("")}
                            >
                              Keep record
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className={styles.banner}>
            <ReceiptText size={24} />
            <p>No payments or offsets recorded yet.</p>
          </div>
        )}
      </section>
      {bill.status !== "CANCELLED" && (
        <section className={styles.section}>
          {mode !== "cancel" ? (
            <button
              type="button"
              className="text-link"
              onClick={() => openMode("cancel")}
            >
              Cancel this record
            </button>
          ) : (
            <form
              className={styles.settlementForm}
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  { action: "cancel", id: bill.id, reason: note },
                  "Record cancelled and kept in history.",
                );
              }}
            >
              <h2>Cancel this record</h2>
              <p className={styles.note}>
                The record and its history stay visible. Undo its payments or
                offsets first, if any are still active.
              </p>
              <label>
                Why are you cancelling it?
                <textarea
                  rows={3}
                  value={note}
                  required
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <div className={styles.actions}>
                <button className="button secondary" disabled={working}>
                  {working ? "Saving…" : "Confirm cancellation"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={working}
                  onClick={() => setMode(null)}
                >
                  Keep record
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
