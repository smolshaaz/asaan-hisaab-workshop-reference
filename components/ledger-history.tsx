"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
} from "@/lib/icons";
import { entryLabel } from "@/lib/ledger-labels";
import {
  expenseCategoryLabel,
  recordedBalanceText,
  recordMoneyExplanation,
  recordMoneyLabel,
  statementBalances,
} from "@/lib/ledger-display";
import type { LedgerEntry } from "@/lib/ledger-types";
import { money, shortDate } from "@/lib/format";
import { useProduct } from "./product-context";
import { LedgerAttachments } from "./ledger-attachments";
import styles from "./ledger-history.module.css";

export type HistoryFilter = "all" | "review" | "checked";

export function LedgerHistory({
  entries,
  personId,
  compact = false,
  filter = "all",
  revealRequest = 0,
}: {
  entries: LedgerEntry[];
  personId?: string;
  compact?: boolean;
  filter?: HistoryFilter;
  revealRequest?: number;
}) {
  const { data, mutate } = useProduct();
  const [expanded, setExpanded] = useState("");
  const [reason, setReason] = useState("");
  const [correcting, setCorrecting] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const balances = statementBalances(data?.ledger.entries || entries);
  const visible = entries.filter(
    (entry) =>
      filter === "all" ||
      (filter === "review" ? entry.needsReview : !entry.needsReview),
  );
  const openId =
    expanded === "closed"
      ? ""
      : visible.some((entry) => entry.id === expanded)
        ? expanded
        : filter === "review"
          ? visible[0]?.id
          : "";
  const billForEntry = (entry: LedgerEntry) =>
    data?.billBook?.bills.find(
      (bill) =>
        bill.chargeEntryId === entry.id ||
        Boolean(entry.reversalOf && bill.chargeEntryId === entry.reversalOf) ||
        data.billBook.settlements.some(
          (settlement) =>
            settlement.billId === bill.id &&
            (settlement.ledgerEntryId === entry.id ||
              (settlement.existingEntryId === entry.id &&
                !settlement.reversalOf &&
                !settlement.reversedBy)),
        ),
    );
  useEffect(() => {
    if (revealRequest) {
      setExpanded("");
      setCorrecting("");
      setError("");
    }
  }, [revealRequest]);
  useEffect(() => {
    function revealLinkedRecord() {
      const id = window.location.hash.startsWith("#entry-")
        ? window.location.hash.slice(7)
        : "";
      if (id) setExpanded(id);
    }
    revealLinkedRecord();
    window.addEventListener("hashchange", revealLinkedRecord);
    return () => window.removeEventListener("hashchange", revealLinkedRecord);
  }, []);

  async function reverse(id: string) {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const entry = entries.find((item) => item.id === id);
      const endpoint = entry?.moneyRecordId
        ? "/api/money-records"
        : entry?.paymentId
          ? "/api/payments"
          : "/api/ledger";
      const payload = entry?.moneyRecordId
        ? { action: "reverse", recordId: entry.moneyRecordId, reason }
        : entry?.paymentId
          ? { action: "reverse", paymentId: entry.paymentId, reason }
          : { action: "reverse", entryId: id, reason };
      await mutate(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setCorrecting("");
      setReason("");
      setNotice(
        "Record corrected. The original and its correction remain in history.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not correct this record. Try again.",
      );
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }
  async function confirm(entry: LedgerEntry) {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await mutate("/api/ledger", {
        method: "POST",
        body: JSON.stringify({
          action: "confirm",
          entryId: entry.id,
          note: "Checked by workshop operator",
        }),
      });
      setNotice(`${money(entry.amount)} expense marked as checked.`);
      setExpanded("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not mark this expense as checked. Try again.",
      );
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }
  return (
    <div data-help="money-history" className={styles.history}>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {!visible.length ? (
        <div className="quiet-empty">
          <h3>
            {filter === "review"
              ? "All reported expenses have been checked"
              : filter === "checked"
                ? "No checked records yet"
                : "No records yet"}
          </h3>
          <p>
            {filter === "review"
              ? "Choose All records to see the full history."
              : "Save what happened. Open any record here to see its details and receipts."}
          </p>
        </div>
      ) : (
        <div className="daily-history">
          {visible.map((entry) => {
            const bill = billForEntry(entry);
            const correctionEntries = entry.moneyRecordId
              ? (data?.ledger.entries || entries).filter(
                  (item) =>
                    item.moneyRecordId === entry.moneyRecordId &&
                    !item.reversalOf &&
                    !item.reversedBy,
                )
              : [entry];
            const recordTone =
              entry.reversalOf || entry.reversedBy
                ? "neutral"
                : entry.cashOut > 0 ||
                    entry.businessExpense > 0 ||
                    entry.personalExpense > 0 ||
                    [
                      "OPENING_WE_OWE",
                      "ADVANCE_GIVEN",
                      "PERSON_PAID_BILL",
                    ].includes(entry.kind)
                  ? "out"
                  : entry.cashIn > 0 ||
                      entry.income > 0 ||
                      [
                        "OPENING_OWED_TO_US",
                        "ADVANCE_RECEIVED",
                        "ADVANCE_COLLECTED",
                        "PERSON_COLLECTED",
                        "INVOICE_COLLECTED",
                        "INVOICE_ALLOCATION",
                        "OFFSET",
                        "BILL_ALLOCATION",
                      ].includes(entry.kind)
                    ? "in"
                    : "neutral";
            const attachments =
              data?.attachments.filter(
                (file) =>
                  (file.linkType === "LEDGER_ENTRY" &&
                    file.linkId === entry.id) ||
                  entry.attachmentIds.includes(file.id),
              ) || [];
            const relatedPeople = personId
              ? [
                  {
                    id: personId,
                    name:
                      data?.ledger.people.find(
                        (person) => person.id === personId,
                      )?.name || "This person",
                  },
                ]
              : [
                  {
                    id: entry.personId,
                    name: entry.personName || "This person",
                  },
                  {
                    id: entry.counterpartyId,
                    name: entry.counterpartyName || "Customer",
                  },
                ].filter((person) => person.id);
            return (
              <article
                id={`entry-${entry.id}`}
                data-money-tone={recordTone}
                className={`daily-entry ${styles.entry} ${entry.reversedBy || entry.reversalOf ? "corrected" : ""}`}
                key={entry.id}
              >
                <button
                  type="button"
                  className={`daily-entry-summary ${styles.summary}`}
                  aria-expanded={openId === entry.id}
                  aria-controls={`entry-details-${entry.id}`}
                  onClick={() => {
                    setExpanded(openId === entry.id ? "closed" : entry.id);
                    setCorrecting("");
                    setError("");
                  }}
                >
                  <span
                    className={`entry-symbol ${recordTone === "in" ? "in" : recordTone === "out" ? "out" : "held"}`}
                    aria-hidden="true"
                  >
                    {entry.cashIn > 0 ? (
                      <ArrowDownRight size={22} />
                    ) : entry.cashOut > 0 ? (
                      <ArrowUpRight size={22} />
                    ) : (
                      <ArrowRight size={20} />
                    )}
                  </span>
                  <span className={`entry-words ${styles.words}`}>
                    <strong>
                      {entry.reversalOf
                        ? `Correction: ${entryLabel(entry.kind)}`
                        : entryLabel(entry.kind)}
                    </strong>
                    <span className={styles.preview}>
                      {[
                        entry.personName,
                        entry.payerName ? `Paid by ${entry.payerName}` : "",
                        entry.plateNumber,
                        entry.note,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Open for the full record"}
                    </span>
                    <small>
                      {shortDate(entry.entryDate)}
                      {attachments.length
                        ? ` · ${attachments.length} attached file${attachments.length === 1 ? "" : "s"}`
                        : ""}
                    </small>
                    {(entry.needsReview || entry.reversedBy) && (
                      <span
                        className={
                          entry.needsReview
                            ? styles.reviewFlag
                            : styles.correctedFlag
                        }
                      >
                        {entry.needsReview
                          ? "Expense to check"
                          : "Corrected — kept in history"}
                      </span>
                    )}
                  </span>
                  <span className={`entry-amount ${styles.amount}`}>
                    <strong>
                      {entry.reversalOf ? "− " : ""}
                      {money(entry.amount)}
                    </strong>
                    <small>{recordMoneyLabel(entry)}</small>
                    <span className={styles.openLabel}>
                      {openId === entry.id ? "Close details" : "View details"}
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={
                          openId === entry.id ? styles.chevronOpen : ""
                        }
                      />
                    </span>
                  </span>
                </button>
                {openId === entry.id && (
                  <div
                    id={`entry-details-${entry.id}`}
                    className={`entry-expanded ${styles.details}`}
                  >
                    <p className={styles.explanation}>
                      {recordMoneyExplanation(entry)}
                    </p>
                    <dl>
                      <div>
                        <dt>Amount</dt>
                        <dd>
                          {money(entry.amount)}
                          {entry.reversalOf
                            ? " removed from the earlier record"
                            : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Record date</dt>
                        <dd>{shortDate(entry.entryDate)}</dd>
                      </div>
                      {entry.category && (
                        <div>
                          <dt>Expense for</dt>
                          <dd>{expenseCategoryLabel[entry.category]}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Full note</dt>
                        <dd className={styles.fullNote}>
                          {entry.note || "No note was added."}
                        </dd>
                      </div>
                      {entry.reference && (
                        <div>
                          <dt>Reference</dt>
                          <dd>{entry.reference}</dd>
                        </div>
                      )}
                      {(entry.cashIn !== 0 ||
                        entry.cashOut !== 0 ||
                        [
                          "PERSON_SPENT",
                          "PERSON_COLLECTED",
                          "PERSON_PAID_BILL",
                          "INVOICE_COLLECTED",
                          "ADVANCE_COLLECTED",
                        ].includes(entry.kind)) && (
                        <div>
                          <dt>Payment method</dt>
                          <dd>
                            {entry.paymentMethod
                              .replaceAll("_", " ")
                              .toLowerCase()}
                          </dd>
                        </div>
                      )}
                      {entry.personId && (
                        <div>
                          <dt>
                            {entry.kind === "PERSON_SPENT"
                              ? "Paid by"
                              : [
                                    "PERSON_COLLECTED",
                                    "INVOICE_COLLECTED",
                                    "ADVANCE_COLLECTED",
                                  ].includes(entry.kind)
                                ? "Collected by"
                                : entry.kind === "PERSON_PAID_BILL"
                                  ? "Paid by"
                                  : "Person"}
                          </dt>
                          <dd>
                            <Link href={`/people/${entry.personId}`}>
                              {entry.personName || "Open person"}
                            </Link>
                          </dd>
                        </div>
                      )}
                      {entry.payerPersonId && (
                        <div>
                          <dt>Actually paid by</dt>
                          <dd>
                            <Link href={`/people/${entry.payerPersonId}`}>
                              {entry.payerName || "Open payer"}
                            </Link>
                            <p>
                              This records who paid; the customer's debt stays
                              with the customer.
                            </p>
                          </dd>
                        </div>
                      )}
                      {entry.counterpartyId && (
                        <div>
                          <dt>
                            {entry.kind === "PERSON_PAID_BILL"
                              ? "Paid to"
                              : "Customer / account"}
                          </dt>
                          <dd>
                            <Link href={`/people/${entry.counterpartyId}`}>
                              {entry.counterpartyName || "Open customer"}
                            </Link>
                          </dd>
                        </div>
                      )}
                      {entry.vehicleId && (
                        <div>
                          <dt>Car</dt>
                          <dd>
                            <Link href={`/cars/${entry.vehicleId}`}>
                              {entry.plateNumber || "Open car"}
                            </Link>
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>Entered on</dt>
                        <dd>
                          {new Date(entry.createdAt).toLocaleString("en-GB")}
                        </dd>
                      </div>
                      {entry.reviewedAt && (
                        <div>
                          <dt>Checked on</dt>
                          <dd>
                            {new Date(entry.reviewedAt).toLocaleString("en-GB")}
                            {entry.reviewNote ? ` · ${entry.reviewNote}` : ""}
                          </dd>
                        </div>
                      )}
                      {entry.reversalReason && (
                        <div>
                          <dt>Correction reason</dt>
                          <dd>{entry.reversalReason}</dd>
                        </div>
                      )}
                    </dl>
                    {relatedPeople.map((person) => {
                      const balance = balances.get(entry.id)?.get(person.id!);
                      return balance ? (
                        <section
                          className={styles.balanceEffect}
                          key={person.id}
                          aria-label={`Effect on ${person.name}'s balance`}
                        >
                          <h3>
                            {personId
                              ? "How this changed the balance"
                              : `${person.name}'s money-book balance`}
                          </h3>
                          <dl>
                            <div>
                              <dt>Before this record</dt>
                              <dd>{recordedBalanceText(balance.before)}</dd>
                            </div>
                            <div>
                              <dt>After this record</dt>
                              <dd>
                                <strong>
                                  {recordedBalanceText(balance.after)}
                                </strong>
                              </dd>
                            </div>
                          </dl>
                          <p>
                            These are the balances at this point in the history,
                            including any unchecked expenses. Invoices made here
                            are shown separately.
                          </p>
                        </section>
                      ) : null;
                    })}
                    {bill && (
                      <p>
                        <Link className="text-link" href={`/bills/${bill.id}`}>
                          Open{" "}
                          {bill.direction === "PURCHASE"
                            ? "supplier bill"
                            : "customer invoice"}
                          {bill.number ? ` ${bill.number}` : ""}, payments and
                          corrections{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </p>
                    )}
                    {entry.invoiceId && (
                      <p>
                        <Link
                          className="text-link"
                          href={`/invoices/${entry.invoiceId}`}
                        >
                          Open customer invoice {entry.invoiceNumber}
                        </Link>
                      </p>
                    )}
                    {(entry.reversalOf || entry.reversedBy) && (
                      <p>
                        <Link
                          className="text-link"
                          href={`${personId ? `/people/${personId}` : "/payments"}#entry-${entry.reversalOf || entry.reversedBy}`}
                          onClick={() =>
                            setExpanded(
                              entry.reversalOf || entry.reversedBy || "",
                            )
                          }
                        >
                          {entry.reversalOf
                            ? "View the original record"
                            : "View its correction"}
                        </Link>
                      </p>
                    )}
                    <h3 className={styles.receiptHeading}>
                      Receipts and evidence
                    </h3>
                    {!attachments.length && (
                      <p className={styles.emptyEvidence}>
                        No file attached yet. Add a receipt or photo to keep
                        proof with this record.
                      </p>
                    )}
                    <LedgerAttachments entryId={entry.id} />
                    {entry.needsReview &&
                      !entry.reversedBy &&
                      !entry.reversalOf && (
                        <div className={styles.reviewBox}>
                          <h3>Check this reported expense</h3>
                          <p>
                            It is included in the recorded balance. Compare the
                            amount and note with the receipt or the person's
                            explanation before marking it checked.
                          </p>
                          <button
                            type="button"
                            className="button primary"
                            disabled={working}
                            onClick={() => void confirm(entry)}
                          >
                            {working ? "Saving…" : "I checked this expense"}
                          </button>
                        </div>
                      )}
                    {!compact &&
                      (!bill || entry.moneyRecordId) &&
                      !entry.reversedBy &&
                      !entry.reversalOf && (
                        <button
                          type="button"
                          className={`text-link ${styles.correctAction}`}
                          onClick={() => {
                            setCorrecting(entry.id);
                            setReason("");
                          }}
                        >
                          Correct this record
                        </button>
                      )}
                    {correcting === entry.id && (
                      <div className="correction-form">
                        <p>
                          {correctionEntries.length > 1
                            ? "This will undo all the linked entries created by this save, including its charge and payment. The originals stay in history."
                            : "The original stays in history. This removes its effect; you can then add the right record."}
                        </p>
                        {correctionEntries.length > 1 && (
                          <ul>
                            {correctionEntries.map((item) => (
                              <li key={item.id}>
                                {entryLabel(item.kind)} · {money(item.amount)}
                              </li>
                            ))}
                          </ul>
                        )}
                        <label>
                          What was wrong?
                          <input
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="For example: amount entered twice"
                          />
                        </label>
                        <div className={styles.correctionActions}>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={working || reason.trim().length < 3}
                            onClick={() => void reverse(entry.id)}
                          >
                            {working
                              ? "Saving…"
                              : correctionEntries.length > 1
                                ? "Undo charge and payment"
                                : "Undo this record"}
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={working}
                            onClick={() => setCorrecting("")}
                          >
                            Keep this record
                          </button>
                        </div>
                      </div>
                    )}
                    {error && (
                      <p role="alert" className="form-error">
                        {error}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
