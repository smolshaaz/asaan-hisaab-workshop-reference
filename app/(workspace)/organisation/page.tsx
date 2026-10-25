"use client";

import { SettingsBackLink } from "@/components/settings-back-link";
import { useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  Save,
  ShieldCheck,
  TriangleAlert,
} from "@/lib/icons";
import { PageHeader } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import type { Party } from "@/lib/types";

export default function OrganisationPage() {
  const { data, loading, mutate } = useProduct();
  const [form, setForm] = useState<Party | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (data && !form) setForm(structuredClone(data.organisation));
  }, [data, form]);
  const set = (key: keyof Party, value: string) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));
  const setAddress = (key: string, value: string) =>
    setForm((current) =>
      current
        ? {
            ...current,
            address: {
              ...current.address!,
              [key]: value,
              countryCode: "SA",
            },
          }
        : current,
    );
  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await mutate<Party>("/api/organisation", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setForm(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };
  if (loading || !form)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  return (
    <div className="page">
      <SettingsBackLink />
      <PageHeader
        title="Workshop details"
        description="These details appear on new customer invoices and quotations."
        secondary={
          <button
            className="button primary"
            onClick={() => void save()}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving" : "Save workshop details"}
          </button>
        }
      />
      {error && (
        <div className="inline-alert error" role="alert">
          <TriangleAlert size={18} />
          {error}
        </div>
      )}
      <div data-help="organisation-form" className="settings-columns">
        <section className="form-panel">
          <div className="section-title icon-title">
            <Building2 size={21} />
            <div>
              <h2>Legal identity</h2>
              <p>Use the exact records registered with ZATCA.</p>
            </div>
          </div>
          <div className="form-grid two">
            <label>
              English legal name
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </label>
            <label>
              Arabic legal name
              <input
                dir="rtl"
                value={form.nameAr || ""}
                onChange={(event) => set("nameAr", event.target.value)}
              />
            </label>
            <label>
              VAT registration number
              <input
                inputMode="numeric"
                value={form.vatNumber || ""}
                onChange={(event) => set("vatNumber", event.target.value)}
              />
            </label>
            <label>
              Legal identifier type
              <select
                value={form.additionalIdType || "CRN"}
                onChange={(event) =>
                  set("additionalIdType", event.target.value)
                }
              >
                <option value="CRN">Commercial registration</option>
                <option value="MOM">Municipality license</option>
                <option value="MLS">MHRSD license</option>
                <option value="SAG">MISA license</option>
                <option value="OTH">Other</option>
              </select>
            </label>
            <label>
              Legal identifier
              <input
                value={form.additionalId || ""}
                onChange={(event) => set("additionalId", event.target.value)}
              />
            </label>
            <label>
              Finance email
              <input
                type="email"
                value={form.email || ""}
                onChange={(event) => set("email", event.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="form-panel">
          <div className="section-title icon-title">
            <MapPin size={21} />
            <div>
              <h2>National address</h2>
              <p>Structured address fields used in candidate UBL.</p>
            </div>
          </div>
          <div className="form-grid two">
            <label>
              Street
              <input
                value={form.address?.street || ""}
                onChange={(event) => setAddress("street", event.target.value)}
              />
            </label>
            <label>
              Building number
              <input
                value={form.address?.buildingNumber || ""}
                onChange={(event) =>
                  setAddress("buildingNumber", event.target.value)
                }
              />
            </label>
            <label>
              District
              <input
                value={form.address?.district || ""}
                onChange={(event) => setAddress("district", event.target.value)}
              />
            </label>
            <label>
              City
              <input
                value={form.address?.city || ""}
                onChange={(event) => setAddress("city", event.target.value)}
              />
            </label>
            <label>
              Postal code
              <input
                inputMode="numeric"
                value={form.address?.postalCode || ""}
                onChange={(event) =>
                  setAddress("postalCode", event.target.value)
                }
              />
            </label>
            <label>
              Country
              <input value="Saudi Arabia (SA)" readOnly />
            </label>
          </div>
        </section>
      </div>
      <div className="info-strip">
        <ShieldCheck size={19} />
        <span>
          <strong>Historical identity stays frozen.</strong> Saving this profile
          changes future drafts only; issued XML and seller snapshots are
          immutable.
        </span>
      </div>
    </div>
  );
}
