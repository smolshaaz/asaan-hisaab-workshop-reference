"use client";
import { AmountInput } from "@/components/amount-input";
import { SettingsBackLink } from "@/components/settings-back-link";
import { useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { Plus, Save, ShoppingBag, TriangleAlert } from "@/lib/icons";
import { PageHeader, StatusPill } from "./app-shell";
import { useProduct } from "./product-context";
import { money, shortDate } from "@/lib/format";
import type { ExpenseRecord } from "@/lib/product-types";
import { riyadhDate } from "@/lib/business-date";
export function ExpenseManager() {
  const { data, loading, mutate } = useProduct();
  const [open, setOpen] = useState(false);
  const blank = () => ({
    vendor: "",
    category: "Software",
    expenseDate: riyadhDate(),
    description: "",
    subtotal: "",
    vatAmount: "",
  });
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const subtotal = Number(form.subtotal),
        vat = Number(form.vatAmount);
      await mutate<ExpenseRecord>("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          subtotal,
          vatAmount: vat,
          status: "RECORDED",
        }),
      });
      setOpen(false);
      setForm(blank());
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Expense could not be recorded",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <div className="page">
        <SettingsBackLink />
        <PageHeader
          title="Earlier expense receipts"
          description="Receipts saved with the earlier expense form. Add new daily spending in Money book."
          secondary={
            <button className="button primary" onClick={() => setOpen(true)}>
              <Plus size={16} />
              New expense
            </button>
          }
        />
        {loading ? (
          <div className="skeleton large-skeleton" />
        ) : (
          <section data-help="expenses-list" className="panel register-panel">
            {data!.expenses.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Expense</th>
                      <th>Vendor</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>VAT</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>
                          <code>{expense.number}</code>
                        </td>
                        <td>
                          <strong>{expense.vendor}</strong>
                        </td>
                        <td>{expense.category}</td>
                        <td>{shortDate(expense.expenseDate)}</td>
                        <td>{expense.description}</td>
                        <td className="numeric">{money(expense.vatAmount)}</td>
                        <td className="numeric">
                          <strong>{money(expense.total)}</strong>
                        </td>
                        <td>
                          <StatusPill status={expense.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <ShoppingBag size={30} />
                <h3>No expenses recorded</h3>
                <p>Add your first supplier or operating expense.</p>
                <button
                  className="button primary"
                  onClick={() => setOpen(true)}
                >
                  <Plus size={16} />
                  New expense
                </button>
              </div>
            )}
          </section>
        )}
        <Dialog.Content className="review-modal" maxWidth="470px">
          <Dialog.Title>Record expense</Dialog.Title>
          <Dialog.Description>
            Capture the supplier cost and recoverable input VAT separately.
          </Dialog.Description>
          {error && (
            <div className="inline-alert error" role="alert">
              <TriangleAlert size={17} />
              {error}
            </div>
          )}
          <div className="modal-form">
            <label>
              Vendor
              <input
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>Software</option>
                <option>Travel</option>
                <option>Professional services</option>
                <option>Office</option>
              </select>
            </label>
            <label>
              Expense date
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) =>
                  setForm({ ...form, expenseDate: e.target.value })
                }
              />
            </label>
            <label>
              Description
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label>
              Amount excluding VAT
              <AmountInput
                type="number"
                min="0"
                step="0.01"
                value={form.subtotal}
                onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
              />
            </label>
            <label>
              VAT amount
              <AmountInput
                type="number"
                min="0"
                step="0.01"
                value={form.vatAmount}
                onChange={(e) =>
                  setForm({ ...form, vatAmount: e.target.value })
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <Dialog.Close>
              <button className="button secondary" disabled={saving}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="button primary"
              onClick={() => void save()}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Recording" : "Record expense"}
            </button>
          </div>
        </Dialog.Content>
      </div>
    </Dialog.Root>
  );
}
