"use client";

import { SettingsBackLink } from "@/components/settings-back-link";
import { useState } from "react";
import { Calculator, Download } from "@/lib/icons";
import { PageHeader } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import { isPostedStatus, signedFiscalAmount } from "@/lib/calculations";
import { money } from "@/lib/format";
import { riyadhDate } from "@/lib/business-date";

export default function VatReport() {
  const { data, loading } = useProduct();
  const today = riyadhDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const invoices =
    data?.invoices.filter(
      (invoice) =>
        isPostedStatus(invoice.status) &&
        invoice.issueDate >= from &&
        invoice.issueDate <= to,
    ) || [];
  const expenses =
    data?.expenses.filter(
      (expense) =>
        expense.status === "RECORDED" &&
        expense.expenseDate >= from &&
        expense.expenseDate <= to,
    ) || [];
  const output =
    invoices.reduce(
      (sum, invoice) =>
        sum + signedFiscalAmount(invoice.documentType, invoice.vatTotal),
      0,
    ) || 0;
  const input =
    expenses.reduce((sum, expense) => sum + expense.vatAmount, 0) || 0;
  const exportCsv = () => {
    const rows = [
      ["type", "number", "date", "counterparty", "net", "vat", "total"],
      ...invoices.map((invoice) => [
        "sale",
        invoice.number,
        invoice.issueDate,
        invoice.customer.name,
        signedFiscalAmount(invoice.documentType, invoice.subtotal),
        signedFiscalAmount(invoice.documentType, invoice.vatTotal),
        signedFiscalAmount(invoice.documentType, invoice.total),
      ]),
      ...expenses.map((expense) => [
        "expense",
        expense.number,
        expense.expenseDate,
        expense.vendor,
        expense.subtotal,
        expense.vatAmount,
        expense.total,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vat-reconciliation-${from}-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div data-help="vat-report" className="page">
      <SettingsBackLink />
      <PageHeader
        title="Tax report"
        description="A workspace reconciliation view, not a submitted VAT return."
        secondary={
          <button
            className="button secondary"
            onClick={exportCsv}
            disabled={!data}
          >
            <Download size={16} />
            Export period CSV
          </button>
        }
      />
      {loading ? (
        <div className="skeleton large-skeleton" />
      ) : (
        <>
          <div className="info-strip warning">
            <Calculator size={19} />
            <span>
              <strong>Review required.</strong> Credit notes reduce output VAT;
              debit notes increase it. Confirm tax categories, dates,
              adjustments, and official return rules before filing.
            </span>
          </div>
          <section className="panel period-filter">
            <div>
              <strong>Reconciliation period</strong>
              <span>
                {from} to {to}
              </span>
            </div>
            <label>
              From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </section>
          <section className="vat-layout">
            <article className="vat-figure">
              <span>Net output VAT</span>
              <strong>{money(output)}</strong>
              <p>Posted sandbox documents, signed by note type</p>
            </article>
            <article className="vat-figure">
              <span>Recoverable input VAT</span>
              <strong>{money(input)}</strong>
              <p>From recorded expenses</p>
            </article>
            <article className="vat-figure emphasized">
              <span>Net VAT position</span>
              <strong>{money(output - input)}</strong>
              <p>Output VAT less recorded input VAT</p>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
