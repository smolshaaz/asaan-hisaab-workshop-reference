"use client";

import { useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { Pencil, Plus, TriangleAlert } from "@/lib/icons";
import { useProduct } from "./product-context";
import type { CustomerRecord } from "@/lib/product-types";

type AddressDraft = {
  street: string;
  buildingNumber: string;
  district: string;
  city: string;
  postalCode: string;
};

const emptyAddress = (): AddressDraft => ({
  street: "",
  buildingNumber: "",
  district: "",
  city: "",
  postalCode: "",
});

const customerAddress = (customer: CustomerRecord): AddressDraft => ({
  street: customer.address?.street ?? "",
  buildingNumber: customer.address?.buildingNumber ?? "",
  district: customer.address?.district ?? "",
  city: customer.address?.city ?? "",
  postalCode: customer.address?.postalCode ?? "",
});

const addressPayload = (address: AddressDraft) =>
  Object.values(address).some((value) => value.trim())
    ? { ...address, countryCode: "SA" as const }
    : undefined;

function QuickAddressFields({
  value,
  onChange,
}: {
  value: AddressDraft;
  onChange: (value: AddressDraft) => void;
}) {
  const set = (key: keyof AddressDraft, nextValue: string) =>
    onChange({ ...value, [key]: nextValue });

  return (
    <fieldset className="quick-customer-address">
      <legend>Customer address</legend>
      <p>Add the address details you know. The rest can wait.</p>
      <div className="form-grid two">
        <label className="quick-customer-street">
          Street
          <input
            value={value.street}
            onChange={(event) => set("street", event.target.value)}
            placeholder="Street name"
          />
        </label>
        <label>
          Building number
          <input
            value={value.buildingNumber}
            onChange={(event) => set("buildingNumber", event.target.value)}
            placeholder="Building number"
          />
        </label>
        <label>
          District
          <input
            value={value.district}
            onChange={(event) => set("district", event.target.value)}
            placeholder="District"
          />
        </label>
        <label>
          City
          <input
            value={value.city}
            onChange={(event) => set("city", event.target.value)}
            placeholder="City"
          />
        </label>
        <label>
          Postal code
          <input
            inputMode="numeric"
            maxLength={5}
            value={value.postalCode}
            onChange={(event) =>
              set("postalCode", event.target.value.replace(/\D/g, ""))
            }
            placeholder="5 digits"
          />
        </label>
        <label>
          Country
          <input value="Saudi Arabia" readOnly />
        </label>
      </div>
    </fieldset>
  );
}

export function CustomerQuickCreate({
  onCreated,
}: {
  onCreated: (customer: CustomerRecord) => void;
}) {
  const { mutate } = useProduct();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [additionalIdType, setAdditionalIdType] = useState<
    CustomerRecord["additionalIdType"] | ""
  >("");
  const [additionalId, setAdditionalId] = useState("");
  const [address, setAddress] = useState<AddressDraft>(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const customer = await mutate<CustomerRecord>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          email: email || undefined,
          vatNumber: vatNumber || undefined,
          additionalIdType: additionalIdType || undefined,
          additionalId: additionalId || undefined,
          address: addressPayload(address),
        }),
      });
      onCreated(customer);
      setName("");
      setPhone("");
      setEmail("");
      setVatNumber("");
      setAdditionalIdType("");
      setAdditionalId("");
      setAddress(emptyAddress());
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save customer",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button type="button" className="button secondary">
          <Plus size={16} />
          Add customer
        </button>
      </Dialog.Trigger>
      {open && (
        <Dialog.Content
          className="review-modal customer-quick-modal"
          maxWidth="640px"
        >
          <Dialog.Title>Add customer</Dialog.Title>
          <Dialog.Description>
            Start with their name. Add other details whenever you get them.
          </Dialog.Description>
          {error && (
            <div className="modal-error" role="alert">
              <TriangleAlert size={17} />
              {error}
            </div>
          )}
          <div className="modal-form">
            <label>
              Name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer or Company Name"
              />
            </label>
            <label>
              Phone (optional)
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Mobile or WhatsApp"
              />
            </label>
            <details className="customer-extra-details">
              <summary>Address, email and tax details (optional)</summary>
              <div className="modal-form">
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  VAT Number
                  <input
                    value={vatNumber}
                    onChange={(event) => setVatNumber(event.target.value)}
                    placeholder="15-digit VAT Number"
                    maxLength={15}
                  />
                </label>
                <div className="form-grid two">
                  <label>
                    Additional ID Type
                    <select
                      value={additionalIdType}
                      onChange={(event) =>
                        setAdditionalIdType(event.target.value as any)
                      }
                    >
                      <option value="">None</option>
                      <option value="CRN">Commercial Registration (CRN)</option>
                      <option value="MOM">MOMRA</option>
                      <option value="MLS">MHRSD</option>
                      <option value="SAG">SAGIA</option>
                      <option value="OTH">Other</option>
                    </select>
                  </label>
                  <label>
                    Additional ID
                    <input
                      value={additionalId}
                      onChange={(event) => setAdditionalId(event.target.value)}
                      placeholder="ID Value"
                    />
                  </label>
                </div>
                <QuickAddressFields value={address} onChange={setAddress} />
              </div>
            </details>
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
              disabled={saving || name.trim().length < 2}
            >
              {saving ? "Saving" : "Save customer"}
            </button>
          </div>
        </Dialog.Content>
      )}
    </Dialog.Root>
  );
}

export function CustomerQuickEdit({
  customer,
  onUpdated,
  confirm,
  label = "Edit customer",
}: {
  customer: CustomerRecord;
  onUpdated?: (customer: CustomerRecord) => void;
  /** Asked before saving, e.g. when editing from one car changes the customer everywhere. */
  confirm?: string;
  label?: string;
}) {
  const { mutate } = useProduct();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [vatNumber, setVatNumber] = useState(customer.vatNumber ?? "");
  const [additionalIdType, setAdditionalIdType] = useState<
    CustomerRecord["additionalIdType"] | ""
  >(customer.additionalIdType ?? "");
  const [additionalId, setAdditionalId] = useState(customer.additionalId ?? "");
  const [address, setAddress] = useState<AddressDraft>(() =>
    customerAddress(customer),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setVatNumber(customer.vatNumber ?? "");
    setAdditionalIdType(customer.additionalIdType ?? "");
    setAdditionalId(customer.additionalId ?? "");
    setAddress(customerAddress(customer));
    setError(null);
    setConfirming(false);
  };

  const save = async () => {
    if (confirm && !confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updatedCustomer = await mutate<CustomerRecord>(
        `/api/customers/${customer.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name,
            phone: phone || undefined,
            email: email || undefined,
            nameAr: customer.nameAr,
            vatNumber: vatNumber || undefined,
            additionalIdType: additionalIdType || undefined,
            additionalId: additionalId || undefined,
            address: addressPayload(address),
          }),
        },
      );
      onUpdated?.(updatedCustomer);
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not update customer",
      );
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      <Dialog.Trigger>
        <button type="button" className="button secondary">
          <Pencil size={16} />
          {label}
        </button>
      </Dialog.Trigger>
      {open && (
        <Dialog.Content
          className="review-modal customer-quick-modal"
          maxWidth="640px"
        >
          <Dialog.Title>Edit customer</Dialog.Title>
          <Dialog.Description>
            Change what you know. You can come back and add more later.
          </Dialog.Description>
          {error && (
            <div className="modal-error" role="alert">
              <TriangleAlert size={17} />
              {error}
            </div>
          )}
          <div className="modal-form">
            <label>
              Name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer or Company Name"
              />
            </label>
            <label>
              Phone (optional)
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Mobile or WhatsApp"
              />
            </label>
            <details className="customer-extra-details">
              <summary>Address, email and tax details (optional)</summary>
              <div className="modal-form">
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  VAT Number
                  <input
                    value={vatNumber}
                    onChange={(event) => setVatNumber(event.target.value)}
                    placeholder="15-digit VAT Number"
                    maxLength={15}
                  />
                </label>
                <div className="form-grid two">
                  <label>
                    Additional ID Type
                    <select
                      value={additionalIdType}
                      onChange={(event) =>
                        setAdditionalIdType(event.target.value as any)
                      }
                    >
                      <option value="">None</option>
                      <option value="CRN">Commercial Registration (CRN)</option>
                      <option value="MOM">MOMRA</option>
                      <option value="MLS">MHRSD</option>
                      <option value="SAG">SAGIA</option>
                      <option value="OTH">Other</option>
                    </select>
                  </label>
                  <label>
                    Additional ID
                    <input
                      value={additionalId}
                      onChange={(event) => setAdditionalId(event.target.value)}
                      placeholder="ID Value"
                    />
                  </label>
                </div>
                <QuickAddressFields value={address} onChange={setAddress} />
              </div>
            </details>
          </div>
          {confirming && (
            <p className="inline-alert" role="alert">
              {confirm}
            </p>
          )}
          <div className="modal-actions">
            {confirming ? (
              <button
                className="button secondary"
                disabled={saving}
                onClick={() => setConfirming(false)}
              >
                Go back
              </button>
            ) : (
              <Dialog.Close>
                <button className="button secondary" disabled={saving}>
                  Cancel
                </button>
              </Dialog.Close>
            )}
            <button
              className="button primary"
              onClick={() => void save()}
              disabled={saving || name.trim().length < 2}
            >
              {saving
                ? "Saving"
                : confirming
                  ? "Yes, save for everyone"
                  : "Save changes"}
            </button>
          </div>
        </Dialog.Content>
      )}
    </Dialog.Root>
  );
}
