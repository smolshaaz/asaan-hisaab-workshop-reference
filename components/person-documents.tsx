"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "@/lib/icons";
import { useProduct } from "./product-context";
import { isPostedStatus, signedFiscalAmount } from "@/lib/calculations";
import { money, shortDate } from "@/lib/format";
import type { BillRecord } from "@/lib/bill-types";
import type { LedgerPerson } from "@/lib/ledger-types";
import styles from "./person-documents.module.css";

function billAmount(bill: BillRecord) {
  if (bill.status === "CANCELLED") return "Cancelled";
  if (bill.status === "DRAFT") return `${money(bill.total)} draft total`;
  return bill.balance > 0 ? `${money(bill.balance)} left` : "Settled";
}

export function PersonDocuments({ person }: { person: LedgerPerson }) {
  const { data, mutate } = useProduct();
  const [customerId, setCustomerId] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const bills =
    data?.billBook?.bills.filter((bill) => bill.personId === person.id) || [];
  const supplierBills = bills.filter((bill) => bill.direction === "PURCHASE");
  const customerRecords = bills.filter((bill) => bill.direction === "SALE");
  const invoices = person.customerId
    ? data?.invoices.filter(
        (invoice) => invoice.customerId === person.customerId,
      ) || []
    : [];
  const invoiceBalance = invoices
    .filter((invoice) => isPostedStatus(invoice.status))
    .reduce(
      (sum, invoice) =>
        sum +
        signedFiscalAmount(
          invoice.documentType,
          invoice.total - invoice.paidAmount - invoice.badDebtAmount,
        ),
      0,
    );
  const availableCustomers =
    data?.customers.filter(
      (customer) =>
        !data.ledger.people.some((other) => other.customerId === customer.id),
    ) || [];

  async function linkCustomer(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId || busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    try {
      await mutate("/api/ledger", {
        method: "POST",
        body: JSON.stringify({
          action: "update-person",
          id: person.id,
          name: person.name,
          phone: person.phone,
          roles: Array.from(new Set([...person.roles, "CUSTOMER"])),
          customerId,
        }),
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not link this customer. Try again.",
      );
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  return (
    <div className={styles.documents}>
      <section
        className={styles.section}
        id="person-customer-invoices"
        data-help="person-customer-invoices"
        aria-labelledby="person-invoices-title"
      >
        <div className={`section-title ${styles.heading}`}>
          <h2 id="person-invoices-title">Customer invoices</h2>
          <Link
            className="text-link"
            href={
              person.customerId
                ? `/invoices/new?customer=${person.customerId}`
                : "/invoices/new"
            }
          >
            New invoice <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className={styles.explanation}>
          Work charged to this person. Open an invoice to see its items,
          payments and amount left.
        </p>
        {person.customerId && (
          <div className={styles.invoiceBalance}>
            <span>Invoices made here</span>
            <strong>
              {Math.round(invoiceBalance * 100) === 0
                ? "Settled — nothing left to pay"
                : invoiceBalance > 0
                  ? `${money(invoiceBalance)} left to receive`
                  : `${money(Math.abs(invoiceBalance))} customer credit`}
            </strong>
            <p>
              These invoice balances are included in the account summary above.
              This section shows their individual documents and history.
            </p>
          </div>
        )}
        {!person.customerId && (
          <details className={`history-options ${styles.linkCustomer}`}>
            <summary>Link invoices already made for this person</summary>
            <form className="simple-form" onSubmit={linkCustomer}>
              <p>
                Choose their existing customer record. Only link it if it is the
                same person.
              </p>
              <label>
                Customer record
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="">Choose a customer</option>
                  {availableCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {!availableCustomers.length && (
                <p>No unlinked customer records are available.</p>
              )}
              <button
                className="button secondary"
                disabled={working || !customerId}
              >
                {working ? "Linking…" : "Link customer record"}
              </button>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </details>
        )}
        <div className={styles.list}>
          {invoices.map((invoice) => {
            const balance = signedFiscalAmount(
              invoice.documentType,
              invoice.total - invoice.paidAmount - invoice.badDebtAmount,
            );
            const documentName =
              invoice.documentType === "CREDIT_NOTE"
                ? "Credit note"
                : invoice.documentType === "DEBIT_NOTE"
                  ? "Debit note"
                  : "Invoice";
            return (
              <Link
                href={
                  invoice.status === "DRAFT"
                    ? `/invoices/${invoice.id}/edit`
                    : `/invoices/${invoice.id}`
                }
                key={invoice.id}
              >
                <span>
                  <strong>{invoice.number || `${documentName} draft`}</strong>
                  <small>
                    {documentName} made here ·{" "}
                    {invoice.status === "DRAFT"
                      ? "Draft — not yet issued"
                      : shortDate(invoice.issueDate)}
                  </small>
                </span>
                <span>
                  <strong>
                    {isPostedStatus(invoice.status)
                      ? Math.round(balance * 100) === 0
                        ? "Settled"
                        : balance > 0
                          ? `${money(balance)} left`
                          : `${money(Math.abs(balance))} credit`
                      : `${money(invoice.total)} total`}
                  </strong>
                  <small>
                    View invoice <ArrowRight size={14} aria-hidden="true" />
                  </small>
                </span>
              </Link>
            );
          })}
          {customerRecords.map((bill) => (
            <Link href={`/bills/${bill.id}`} key={bill.id}>
              <span>
                <strong>
                  {bill.number ||
                    (bill.status === "DRAFT"
                      ? "Customer invoice draft"
                      : "Recorded customer invoice")}
                </strong>
                <small>
                  Recorded sale ·{" "}
                  {bill.status === "DRAFT"
                    ? "Draft — no amount owed recorded"
                    : shortDate(bill.issueDate || bill.createdAt)}
                </small>
              </span>
              <span>
                <strong>{billAmount(bill)}</strong>
                <small>
                  View invoice <ArrowRight size={14} aria-hidden="true" />
                </small>
              </span>
            </Link>
          ))}
        </div>
        {!invoices.length && !customerRecords.length && (
          <p className={styles.empty}>
            No customer invoices linked to this person yet.
          </p>
        )}
        <Link
          className={`text-link ${styles.addLink}`}
          href={`/invoices/record?person=${person.id}`}
        >
          Record an invoice made elsewhere{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
      <section
        className={styles.section}
        id="person-supplier-bills"
        aria-labelledby="person-bills-title"
      >
        <div className={`section-title ${styles.heading}`}>
          <h2 id="person-bills-title">Supplier bills</h2>
          <Link className="text-link" href={`/bills/new?person=${person.id}`}>
            Add supplier bill <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className={styles.explanation}>
          Parts or work bought from this person. Once recorded, these bills are
          included in the account summary above. Drafts do not create an amount
          owed.
        </p>
        <div className={styles.list}>
          {supplierBills.map((bill) => (
            <Link href={`/bills/${bill.id}`} key={bill.id}>
              <span>
                <strong>
                  {bill.number ||
                    (bill.status === "DRAFT"
                      ? "Supplier bill draft"
                      : "Supplier bill")}
                </strong>
                <small>
                  {bill.status === "DRAFT"
                    ? "Draft — no expense or debt recorded"
                    : shortDate(bill.issueDate || bill.createdAt)}
                  {bill.plateNumber ? ` · ${bill.plateNumber}` : ""}
                </small>
              </span>
              <span>
                <strong>{billAmount(bill)}</strong>
                <small>
                  View bill <ArrowRight size={14} aria-hidden="true" />
                </small>
              </span>
            </Link>
          ))}
        </div>
        {!supplierBills.length && (
          <p className={styles.empty}>
            No supplier bills linked to this person yet.
          </p>
        )}
        {supplierBills.length > 0 &&
          (invoices.length > 0 || customerRecords.length > 0) && (
            <p className={styles.explanation}>
              Agreed to use money owed both ways? Open a supplier bill and
              choose “Settle against another invoice”. The two amounts are only
              settled when you record that agreement.
            </p>
          )}
      </section>
    </div>
  );
}
