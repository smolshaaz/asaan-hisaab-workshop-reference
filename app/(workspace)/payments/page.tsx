"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Download } from "@/lib/icons";
import { useProduct } from "@/components/product-context";
import { LedgerHistory } from "@/components/ledger-history";
import { entryLabel } from "@/lib/ledger-labels";
import { money, shortDate } from "@/lib/format";

export default function MoneyPage() {
  const { data, loading } = useProduct();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ledger = data?.ledger;
  const entries = (ledger?.entries || []).filter(
    (e) =>
      [
        entryLabel(e.kind),
        e.personName,
        e.counterpartyName,
        e.payerName,
        e.note,
        e.plateNumber,
        e.amount,
        e.reference,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!from || e.entryDate >= from) &&
      (!to || e.entryDate <= to) &&
      (filter === "all" ||
        (filter === "in" && e.cashIn !== 0) ||
        (filter === "out" && e.cashOut !== 0) ||
        (filter === "check" && e.needsReview && !e.reversedBy)),
  );
  const earlierEntries = (ledger?.legacyEntries || []).filter(
    (e) =>
      [e.label, e.note, e.personName, e.plateNumber, e.amount]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!from || e.entryDate >= from) &&
      (!to || e.entryDate <= to) &&
      (filter === "all" ||
        (filter === "in" && e.cashIn !== 0) ||
        (filter === "out" && e.cashOut !== 0) ||
        (filter === "check" && e.needsReview)),
  );
  function exportCsv() {
    const rows = [
      [
        "Date",
        "What happened",
        "Person",
        "Related customer or supplier",
        "Actual payer",
        "Car",
        "Amount",
        "Money in",
        "Money out",
        "Description",
        "Reference",
        "Correction of",
        "Record ID",
        "Source",
      ],
      ...entries.map((e) => [
        e.entryDate,
        e.reversalOf ? `Correction: ${entryLabel(e.kind)}` : entryLabel(e.kind),
        e.personName || "",
        e.counterpartyName || "",
        e.payerName || "",
        e.plateNumber || "",
        e.amount,
        e.cashIn,
        e.cashOut,
        e.note || "",
        e.reference || "",
        e.reversalOf || "",
        e.id,
        "Money book",
      ]),
      ...earlierEntries.map((e) => [
        e.entryDate,
        e.label,
        e.personName || "",
        "",
        "",
        e.plateNumber || "",
        e.amount,
        e.cashIn,
        e.cashOut,
        e.note,
        "",
        "",
        e.id,
        e.source === "PAYMENT" ? "Invoice payment" : "Earlier record",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              (typeof v === "string" && /^\s*[=+@\-]/.test(v)
                ? `'${v}`
                : String(v)
              ).replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "workshop-money.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="page daily-page">
      <div className="daily-heading heading-with-action">
        <div>
          <h1>Money book</h1>
          <p>What came in, what went out, and who still has the money.</p>
        </div>
        <Link className="button primary" href="/payments/new">
          <Plus size={18} /> Add record
        </Link>
      </div>
      <div className="balance-overview">
        <div>
          <span>Recorded money in</span>
          <strong>{money(ledger?.totals.cashIn || 0)}</strong>
        </div>
        <div>
          <span>Recorded money out</span>
          <strong>{money(ledger?.totals.cashOut || 0)}</strong>
        </div>
      </div>
      <p className="plain-note">
        All recorded dates. The difference is money movement, not profit or a
        checked cash balance. <Link href="/people">See who owes whom</Link>
      </p>
      <div className="money-filter-bar">
        <label className="daily-search">
          <span className="sr-only">Search records</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, car, amount or note"
          />
        </label>
      </div>
      <div data-help="money-filters" className="money-filters">
        <div className="filter-buttons">
          {[
            ["all", "All"],
            ["in", "Money in"],
            ["out", "Money out"],
            ["check", "To check"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "selected" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <details className="history-options">
        <summary>
          {from || to
            ? "Date filter is on · Change dates or export"
            : "Choose dates or export"}
        </summary>
        <div className="money-filters">
          {" "}
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            All dates
          </button>
        </div>
        <button className="button secondary" onClick={exportCsv}>
          <Download size={17} /> Export filtered records
        </button>
        <p className="plain-note">
          Includes new and earlier records matching these filters.
        </p>
      </details>
      {loading ? <p>Loading records…</p> : <LedgerHistory entries={entries} />}
      {(ledger?.legacyEntries.length || 0) > 0 && (
        <details className="legacy-records">
          <summary>
            Earlier records & invoice payments ({earlierEntries.length})
          </summary>
          <p>
            Kept from the existing app and included in recorded money movement.
            Earlier names have not been guessed into person balances.
          </p>
          {earlierEntries.length === 0 && (
            <p>No earlier records match these filters.</p>
          )}
          {earlierEntries.map((e) => (
            <div className="legacy-entry" key={e.id}>
              <div>
                <strong>{e.label}</strong>
                <small>
                  {shortDate(e.entryDate)} ·{" "}
                  {e.personName || "Name not recorded"}
                </small>
              </div>
              <strong>{money(e.amount)}</strong>
            </div>
          ))}
        </details>
      )}
      <div className="ledger-footer-links">
        <Link href="/expenses">Earlier expense receipts</Link>
        <Link href="/reports/receivables">Invoice money to collect</Link>
        <Link href="/audit">Record history</Link>
      </div>
    </div>
  );
}
