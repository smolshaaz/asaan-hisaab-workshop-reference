"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Download, Plus, ReceiptText } from "@/lib/icons";
import { useProduct } from "@/components/product-context";
import { isPostedStatus, signedFiscalAmount } from "@/lib/calculations";
import { money, shortDate } from "@/lib/format";
import type { BillDirection } from "@/lib/bill-types";
import styles from "./document-register.module.css";

interface RegisterRow {
  id: string;
  href: string;
  direction: "SALE" | "PURCHASE";
  number: string;
  person: string;
  date: string;
  dueDate: string;
  createdAt: string;
  total: number;
  paid: number;
  offset: number;
  remaining: number;
  draft: boolean;
  inactive: boolean;
  cancelled: boolean;
  credit: boolean;
  source: string;
}

function recordStatus(row: RegisterRow) {
  if (row.cancelled) return "Cancelled";
  if (row.draft) return "Draft";
  if (row.inactive) return "Not issued";
  if (row.credit) return "Customer credit";
  if (row.remaining <= 0) return "Settled";
  return row.paid + row.offset > 0 ? "Partly settled" : "Unpaid";
}

export function DocumentRegister({ direction }: { direction: BillDirection }) {
  const { data, loading, error, refresh } = useProduct();
  const supplier = direction === "PURCHASE";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows: RegisterRow[] = [
    ...(supplier ? [] : data?.invoices || []).map((invoice): RegisterRow => {
      const offset = (data?.payments || [])
        .filter(
          (payment) =>
            payment.invoiceId === invoice.id &&
            String(payment.method) === "OFFSET",
        )
        .reduce((sum, payment) => sum + payment.amount, 0);
      const draft = invoice.status === "DRAFT";
      return {
        id: invoice.id,
        href: draft
          ? `/invoices/${invoice.id}/edit`
          : `/invoices/${invoice.id}`,
        direction: "SALE",
        number: invoice.number,
        person: invoice.customerId ? invoice.customer.name : "Customer to add",
        date: invoice.issueDate,
        dueDate: invoice.dueDate || "",
        createdAt: invoice.createdAt,
        total: signedFiscalAmount(invoice.documentType, invoice.total),
        paid: invoice.paidAmount - offset,
        offset,
        remaining: isPostedStatus(invoice.status)
          ? signedFiscalAmount(
              invoice.documentType,
              invoice.total - invoice.paidAmount - invoice.badDebtAmount,
            )
          : 0,
        draft,
        inactive: !isPostedStatus(invoice.status),
        cancelled: false,
        credit: invoice.documentType === "CREDIT_NOTE",
        source:
          invoice.status === "SANDBOX_ISSUED"
            ? "Created here · sandbox copy"
            : `Created here · ${invoice.documentType.replaceAll("_", " ").toLowerCase()}`,
      };
    }),
    ...(data?.billBook?.bills || [])
      .filter((bill) => bill.direction === direction)
      .map((bill): RegisterRow => ({
        id: bill.id,
        href: `/bills/${bill.id}`,
        direction: bill.direction,
        number: bill.number || "Number to add",
        person:
          bill.personName ||
          (bill.direction === "PURCHASE"
            ? "Supplier to add"
            : "Customer to add"),
        date: bill.issueDate || "",
        dueDate: bill.dueDate || "",
        createdAt: bill.createdAt,
        total: bill.total,
        paid: bill.paidAmount,
        offset: bill.offsetAmount,
        remaining: bill.balance,
        draft: bill.status === "DRAFT",
        inactive: bill.status !== "POSTED",
        cancelled: bill.status === "CANCELLED",
        credit: false,
        source:
          bill.direction === "PURCHASE"
            ? "Supplier bill"
            : "Recorded sales invoice",
      })),
  ].sort((a, b) =>
    (b.date || b.createdAt).localeCompare(a.date || a.createdAt),
  );
  const filtered = rows.filter(
    (row) =>
      `${row.number} ${row.person} ${row.total} ${row.source}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!from || row.date >= from) &&
      (!to || row.date <= to) &&
      (status === "ALL" ||
        (status === "DRAFT" && row.draft) ||
        (status === "OPEN" && !row.inactive && row.remaining > 0) ||
        (status === "SETTLED" &&
          !row.inactive &&
          !row.credit &&
          row.remaining === 0) ||
        (status === "CANCELLED" && row.cancelled)),
  );
  const outstanding =
    rows
      .filter((row) => !row.inactive)
      .reduce((sum, row) => sum + Math.round(row.remaining * 100), 0) / 100;

  function exportCsv() {
    const cells: (string | number)[][] = [
      [
        "Direction",
        "Number",
        "Person / shop",
        "Date",
        "Due date",
        "Total",
        "Payments matched",
        "Settled against another bill",
        "Left",
        "Status",
        "Source",
        "Record ID",
      ],
      ...filtered.map((row) => [
        row.direction === "SALE" ? "To customer" : "From supplier",
        row.number,
        row.person,
        row.date,
        row.dueDate,
        row.total,
        row.paid,
        row.offset,
        row.remaining,
        recordStatus(row),
        row.source,
        row.id,
      ]),
    ];
    const csv = cells
      .map((row) =>
        row
          .map(
            (value) =>
              `"${(typeof value === "string" && /^\s*[=+@\-]/.test(value) ? `'${value}` : String(value)).replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = supplier
      ? "workshop-supplier-bills.csv"
      : "workshop-customer-invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      data-help={supplier ? "bills-register" : "invoices-register"}
      className="page daily-page"
    >
      <div className="daily-heading">
        <h1>{supplier ? "Supplier bills" : "Customer invoices"}</h1>
        <p>
          {supplier
            ? "Parts and work we bought, and what is left to pay."
            : "Work we charged customers for, and what is left to collect."}
        </p>
      </div>
      <div
        data-help={supplier ? "bills-actions" : "invoices-actions"}
        className={styles.actions}
      >
        {supplier ? (
          <Link className="button primary" href="/bills/new">
            <Plus size={18} aria-hidden="true" /> Add supplier bill
          </Link>
        ) : (
          <>
            <Link className="button primary" href="/invoices/new">
              <Plus size={18} aria-hidden="true" /> Make invoice
            </Link>
            <Link className="button secondary" href="/invoices/record">
              Record an existing invoice
            </Link>
          </>
        )}
      </div>
      <div className={styles.balance}>
        <div>
          <span>
            {supplier
              ? "Left to pay suppliers"
              : outstanding < 0
                ? "Customer credit remaining"
                : "Left to collect from customers"}
          </span>
          <strong>{data ? money(Math.abs(outstanding)) : "—"}</strong>
        </div>
        <p>
          {supplier
            ? "Across all recorded supplier bills."
            : "Across all issued and recorded customer invoices."}{" "}
          Drafts do not change this amount.
        </p>
      </div>
      <label className="daily-search">
        <span className="sr-only">
          {supplier ? "Find supplier bill" : "Find customer invoice"}
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            supplier
              ? "Find supplier, bill number or amount"
              : "Find customer, invoice number or amount"
          }
        />
      </label>
      <details className="history-options">
        <summary>Filter dates, payment status & export</summary>
        <div className={styles.filters}>
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <label>
            Show
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ALL">Every status</option>
              <option value="OPEN">Still unpaid</option>
              <option value="DRAFT">Drafts</option>
              <option value="SETTLED">Settled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <button
            className="button secondary"
            onClick={exportCsv}
            disabled={!data}
          >
            <Download size={18} /> Export list
          </button>
        </div>
      </details>
      {loading ? (
        <p>
          {supplier ? "Loading supplier bills…" : "Loading customer invoices…"}
        </p>
      ) : !data ? (
        <div className="quiet-empty">
          <h2>Could not load your records</h2>
          <p>{error || "Try again to see your saved records."}</p>
          <button className="button primary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className={styles.count}>
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
          </p>
          <div className={styles.list}>
            {filtered.map((row) => (
              <Link className={styles.row} href={row.href} key={row.id}>
                <span className={styles.record}>
                  <small>
                    {row.direction === "PURCHASE"
                      ? "From supplier"
                      : "To customer"}
                  </small>
                  <strong>{row.person}</strong>
                  <span>
                    {row.number} · {shortDate(row.date)}
                  </span>
                  <small>{row.source}</small>
                </span>
                <span className={styles.amount}>
                  <strong>{money(row.total)}</strong>
                  <span>{recordStatus(row)}</span>
                  {!row.inactive && row.remaining !== 0 && (
                    <small>
                      {money(Math.abs(row.remaining))}{" "}
                      {row.credit ? "credit" : "left"}
                    </small>
                  )}
                  {row.offset > 0 && (
                    <small>{money(row.offset)} settled against a bill</small>
                  )}
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
          {!filtered.length && (
            <div className="quiet-empty">
              <ReceiptText size={30} />
              <h2>
                {supplier
                  ? "No supplier bills here yet"
                  : "No customer invoices here yet"}
              </h2>
              <p>
                {query || from || to || status !== "ALL"
                  ? "Try another search or clear the filters."
                  : supplier
                    ? "Add the bill you received from a supplier."
                    : "Make an invoice, or record one you already gave a customer."}
              </p>
            </div>
          )}
        </>
      )}
      <div className={styles.related}>
        <Link href={supplier ? "/invoices" : "/bills"} className="text-link">
          {supplier ? "Customer invoices" : "Supplier bills"}{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        {supplier && (
          <Link href="/expenses" className="text-link">
            Earlier expense receipts <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
