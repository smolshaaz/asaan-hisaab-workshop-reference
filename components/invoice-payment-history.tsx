"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useProduct } from "./product-context";
import type { PaymentRecord } from "@/lib/product-types";
import { money, shortDate } from "@/lib/format";
import styles from "./invoice-payment-history.module.css";
export function InvoicePaymentHistory({
  payments,
}: {
  payments: PaymentRecord[];
}) {
  const { data, mutate } = useProduct();
  const [editing, setEditing] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  async function reverse(payment: PaymentRecord) {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    try {
      await mutate("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          action: "reverse",
          paymentId: payment.id,
          reason,
        }),
      });
      setEditing("");
      setReason("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not correct the payment. Try again.",
      );
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }
  return (
    <div className={styles.history}>
      {payments.map((payment) => {
        const handler = data?.ledger.people.find(
          (p) => p.id === payment.handlerPersonId,
        );
        const source =
          payment.method === "OFFSET"
            ? "Settled against a supplier bill — no money moved"
            : payment.source === "ADVANCE"
              ? "Earlier payment applied — no new money received"
              : payment.source === "WORKER"
                ? `Collected by ${handler?.name || "another person"} — not received by workshop`
                : `Received by workshop · ${payment.method.replaceAll("_", " ").toLowerCase()}`;
        return (
          <article key={payment.id} className={styles.row}>
            <div className={styles.summary}>
              <div>
                <strong>
                  {payment.reversalOf ? "Payment corrected" : source}
                </strong>
                <p>
                  {shortDate(payment.paidAt.slice(0, 10))}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </p>
                {payment.payerName && (
                  <p>
                    Paid by {payment.payerName} for {payment.customerName}
                  </p>
                )}
                {payment.reversalReason && (
                  <p>Reason: {payment.reversalReason}</p>
                )}
                {payment.reversedBy && (
                  <span className={styles.badge}>
                    Corrected — kept in history
                  </span>
                )}
              </div>
              <strong
                className={payment.amount < 0 ? styles.removed : styles.amount}
              >
                {money(payment.amount)}
              </strong>
            </div>
            <div className={styles.actions}>
              {payment.ledgerEntryId && (
                <Link href={`/payments#entry-${payment.ledgerEntryId}`}>
                  View money record
                </Link>
              )}
              {!payment.reversalOf &&
                !payment.reversedBy &&
                payment.method !== "OFFSET" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(payment.id);
                      setReason("");
                      setError("");
                    }}
                  >
                    Correct payment
                  </button>
                )}
            </div>
            {editing === payment.id && (
              <div className={styles.correction}>
                <p>
                  This removes the payment's effect and restores the amount left
                  to collect. The original stays in history.
                </p>
                <label>
                  What was wrong?
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="For example: entered twice"
                  />
                </label>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={working || reason.trim().length < 3}
                    onClick={() => void reverse(payment)}
                  >
                    {working ? "Saving…" : "Undo this payment"}
                  </button>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => setEditing("")}
                  >
                    Keep payment
                  </button>
                </div>
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
  );
}
