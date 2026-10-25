"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Plus, Save, TriangleAlert, X } from "@/lib/icons";
import { A4ScaleToFit, QuotationDraftPreview } from "./document-previews";
import { LineItemsEditor } from "./line-items-editor";
import {
  CustomerQuickCreate,
  CustomerQuickEdit,
} from "./customer-quick-create";
import { useProduct } from "./product-context";
import type { LineItem } from "@/lib/types";
import type { QuotationRecord } from "@/lib/product-types";
import { riyadhDate } from "@/lib/business-date";
const today = riyadhDate();
const newLine = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unitCode: "PCE",
  unitPrice: 0,
  discount: 0,
  vatCategory: "S",
  vatRate: 15,
});
export function QuotationForm({ initial }: { initial?: QuotationRecord }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data, loading, mutate } = useProduct();
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? "");
  const [prefilled, setPrefilled] = useState(Boolean(initial));
  useEffect(() => {
    if (!data || prefilled) return;
    const car = data.vehicles.find((item) => item.id === params.get("car"));
    const requestedCustomer = car?.customerId || params.get("customer") || "";
    setCustomerId(
      data.customers.some((item) => item.id === requestedCustomer)
        ? requestedCustomer
        : "",
    );
    setVehicleId(car?.id || "");
    setPrefilled(true);
  }, [data, params, prefilled]);
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? today);
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? "");
  const [taxEnabled, setTaxEnabled] = useState(initial?.taxEnabled ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [terms, setTerms] = useState(
    initial?.terms ?? "Prices are in Saudi riyals.",
  );
  const [lines, setLines] = useState<LineItem[]>(
    initial?.lines.map((line) => ({ ...line })) ?? [newLine()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const quote = await mutate<QuotationRecord>(
        initial ? `/api/quotations/${initial.id}` : "/api/quotations",
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify({
            customerId,
            vehicleId,
            issueDate,
            expiryDate,
            taxEnabled,
            lines,
            notes,
            terms,
          }),
        },
      );
      router.push(`/quotations/${quote.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Quotation could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading || !data)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  const selectedCustomer = data.customers.find(
    (customer) => customer.id === customerId,
  );
  return (
    <div data-help="quotation-editor" className="page editor-page">
      <div className="editor-header">
        <div>
          <Link href="/quotations" className="back-link">
            <ArrowLeft size={16} />
            Back to quotations
          </Link>
          <h1>{initial ? `Edit ${initial.number}` : "New quotation"}</h1>
          <p>Add what you know. Save now and finish the rest later.</p>
        </div>
        <div className="editor-actions">
          <span className="editor-action-hint">
            You can save with details missing
          </span>
          <div className="page-actions">
            <button
              type="button"
              className="button secondary mobile-preview-trigger"
              onClick={() => setPreviewOpen(true)}
            >
              <FileText size={16} />
              Preview
            </button>
            <button
              data-help="quotation-save"
              className="button primary"
              onClick={() => void submit()}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Saving" : initial ? "Save changes" : "Save quotation"}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div className="inline-alert error" role="alert">
          <TriangleAlert size={18} />
          {error}
        </div>
      )}
      <div className="editor-layout editor-layout-preview">
        <section className="editor-main">
          <section className="form-panel">
            <div className="section-title">
              <h2>1. Customer and dates</h2>
            </div>
            <div className="form-grid three">
              <div className="customer-picker-block">
                <label>
                  Customer <small>(can add later)</small>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Add customer later</option>
                    {data.customers.map((customer) => (
                      <option value={customer.id} key={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="customer-picker-actions">
                  <CustomerQuickCreate
                    onCreated={(createdCustomer) =>
                      setCustomerId(createdCustomer.id)
                    }
                  />
                  {selectedCustomer && (
                    <CustomerQuickEdit
                      customer={selectedCustomer}
                      onUpdated={(updatedCustomer) =>
                        setCustomerId(updatedCustomer.id)
                      }
                    />
                  )}
                </div>
              </div>
              <label>
                Car <small>(optional)</small>
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="">No car selected</option>
                  {data.vehicles.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.displayName || car.plateNumber || "Car details to add"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Issue date
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </label>
              <label>
                Valid until <small>(optional)</small>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="form-panel">
            <div className="section-title line-title">
              <div>
                <h2>2. Items</h2>
                <p>Add what you are offering.</p>
              </div>
              <div className="quotation-item-actions">
                <label className="quotation-tax-toggle">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(event) => setTaxEnabled(event.target.checked)}
                  />
                  <span>
                    <strong>Calculate VAT</strong>
                    <small>
                      {taxEnabled
                        ? "Included in this quotation"
                        : "Quote only; invoice tax stays configured"}
                    </small>
                  </span>
                </label>
                <select
                  className="catalog-picker"
                  defaultValue=""
                  aria-label="Add saved item"
                  onChange={(e) => {
                    const item = data.items.find(
                      (x) => x.id === e.target.value,
                    );
                    if (item)
                      setLines([
                        ...lines.filter(
                          (line) =>
                            !(
                              !line.description &&
                              line.quantity === 1 &&
                              line.unitPrice === 0 &&
                              line.discount === 0 &&
                              line.vatCategory === "S" &&
                              !line.exemptionReason &&
                              !line.exemptionReasonCode
                            ),
                        ),
                        {
                          id: crypto.randomUUID(),
                          description: item.name,
                          quantity: 1,
                          unitCode: item.unitCode,
                          unitPrice: item.unitPrice,
                          discount: 0,
                          vatCategory: item.vatCategory,
                          vatRate: item.vatRate,
                        },
                      ]);
                    e.currentTarget.value = "";
                  }}
                >
                  <option value="">Add saved item</option>
                  {data.items.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.sku} - {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <LineItemsEditor
              helpTarget="quotation-lines"
              lines={lines}
              onChange={setLines}
              taxEnabled={taxEnabled}
            />
            <button
              className="add-line"
              onClick={() => setLines([...lines, newLine()])}
            >
              <Plus size={16} />
              Add line
            </button>
          </section>
          <details className="form-panel optional-panel">
            <summary>Optional: message and terms</summary>
            <div className="form-grid two">
              <label>
                Customer message
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Scope, assumptions, or delivery note"
                />
              </label>
              <label>
                Terms
                <textarea
                  rows={4}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </label>
            </div>
          </details>
        </section>
        <aside
          className={`editor-aside${previewOpen ? " is-mobile-preview-open" : ""}`}
        >
          <button
            type="button"
            className="mobile-preview-close"
            onClick={() => setPreviewOpen(false)}
          >
            <X size={18} />
            Back to editor
          </button>
          <section
            className="editor-preview-panel"
            aria-label="Live quotation preview"
          >
            <A4ScaleToFit>
              <QuotationDraftPreview
                numberLabel={initial?.number || "Draft"}
                seller={data.organisation}
                customer={selectedCustomer}
                issueDate={issueDate}
                expiryDate={expiryDate}
                taxEnabled={taxEnabled}
                lines={lines}
                notes={notes}
                terms={terms}
              />
            </A4ScaleToFit>
          </section>
        </aside>
      </div>
    </div>
  );
}
