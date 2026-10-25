"use client";

import { AmountInput } from "@/components/amount-input";
import { SettingsBackLink } from "@/components/settings-back-link";
import { useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { Cube, Plus, TriangleAlert } from "@/lib/icons";
import { PageHeader, StatusPill } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import { money } from "@/lib/format";
import type { CatalogItem } from "@/lib/product-types";

const initial = {
  sku: "",
  name: "",
  description: "",
  unitCode: "PCE",
  unitPrice: "",
  vatCategory: "S" as CatalogItem["vatCategory"],
};

export default function ItemsPage() {
  const { data, loading, error, mutate } = useProduct();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await mutate<CatalogItem>("/api/items", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          unitPrice: Number(form.unitPrice),
          vatRate: form.vatCategory === "S" ? 15 : 0,
        }),
      });
      setForm(initial);
      setOpen(false);
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "Item could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <SettingsBackLink />
      <PageHeader
        title="Saved services & parts"
        description="Reuse these descriptions and prices when making a customer invoice."
        secondary={
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger>
              <button className="button primary">
                <Plus size={16} />
                Add item
              </button>
            </Dialog.Trigger>
            <Dialog.Content className="product-dialog" maxWidth="520px">
              <Dialog.Title>Add product or service</Dialog.Title>
              <Dialog.Description size="2">
                Create a reusable catalogue item for faster, consistent document
                entry.
              </Dialog.Description>
              <form className="modal-form" onSubmit={submit}>
                <div className="form-grid two">
                  <label>
                    SKU
                    <input
                      autoFocus
                      required
                      value={form.sku}
                      onChange={(event) =>
                        setForm({ ...form, sku: event.target.value })
                      }
                      placeholder="SRV-004"
                    />
                  </label>
                  <label>
                    Name
                    <input
                      required
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      placeholder="Advisory workshop"
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    required
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    placeholder="What this product or service includes"
                  />
                </label>
                <div className="form-grid three">
                  <label>
                    Unit
                    <select
                      value={form.unitCode}
                      onChange={(event) =>
                        setForm({ ...form, unitCode: event.target.value })
                      }
                    >
                      <option value="PCE">Piece</option>
                      <option value="HUR">Hour</option>
                      <option value="DAY">Day</option>
                      <option value="MON">Month</option>
                    </select>
                  </label>
                  <label>
                    Unit price
                    <AmountInput
                      required
                      min="0"
                      step="0.01"
                      type="number"
                      value={form.unitPrice}
                      onChange={(event) =>
                        setForm({ ...form, unitPrice: event.target.value })
                      }
                      placeholder="0.00"
                    />
                  </label>
                  <label>
                    VAT category
                    <select
                      value={form.vatCategory}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          vatCategory: event.target
                            .value as CatalogItem["vatCategory"],
                        })
                      }
                    >
                      <option value="S">15% standard</option>
                      <option value="Z">Zero-rated</option>
                      <option value="E">Exempt</option>
                      <option value="O">Outside scope</option>
                    </select>
                  </label>
                </div>
                {formError && (
                  <div className="inline-alert error" role="alert">
                    <TriangleAlert size={17} />
                    {formError}
                  </div>
                )}
                <div className="modal-actions">
                  <Dialog.Close>
                    <button type="button" className="button secondary">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button className="button primary" disabled={saving}>
                    {saving ? "Saving" : "Save item"}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Root>
        }
      />
      {loading ? (
        <div className="skeleton large-skeleton" />
      ) : error ? (
        <div className="state-page error-state">
          <TriangleAlert size={28} />
          <h2>Items could not load</h2>
          <p>{error}</p>
        </div>
      ) : data!.items.length === 0 ? (
        <section data-help="items-list" className="panel empty-state">
          <Cube size={30} />
          <h3>No catalogue items</h3>
          <p>
            Add your first product or service to reuse it in quotations and
            invoices.
          </p>
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Add item
          </button>
        </section>
      ) : (
        <section data-help="items-list" className="panel register-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th className="numeric">Unit price</th>
                  <th>VAT</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data!.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code>{item.sku}</code>
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.description}</td>
                    <td>{item.unitCode}</td>
                    <td className="numeric">{money(item.unitPrice)}</td>
                    <td>
                      {item.vatRate}% ({item.vatCategory})
                    </td>
                    <td>
                      <StatusPill
                        status={item.active ? "ACTIVE" : "ARCHIVED"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
