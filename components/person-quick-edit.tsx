"use client";

import { useRef, useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { Pencil, TriangleAlert } from "@/lib/icons";
import { useProduct } from "./product-context";
import { CustomerQuickEdit } from "./customer-quick-create";
import type { LedgerPerson } from "@/lib/ledger-types";

/**
 * Corrects one saved person in place, so the change shows everywhere they are
 * linked. People who are also customers use the customer form, which keeps
 * both records in step.
 */
export function PersonQuickEdit({
  person,
  confirm,
  label = "Edit details",
  onUpdated,
}: {
  person: LedgerPerson;
  /** Asked before saving, e.g. when editing from one car changes them everywhere. */
  confirm?: string;
  label?: string;
  onUpdated?: () => void;
}) {
  const { data, mutate } = useProduct();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [phone, setPhone] = useState(person.phone ?? "");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const customer = person.customerId
    ? data?.customers.find((item) => item.id === person.customerId)
    : undefined;
  if (customer)
    return (
      <CustomerQuickEdit
        customer={customer}
        confirm={confirm}
        label={label}
        onUpdated={() => onUpdated?.()}
      />
    );

  async function save() {
    if (busy.current) return;
    if (confirm && !confirming) {
      setConfirming(true);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await mutate("/api/ledger", {
        method: "POST",
        body: JSON.stringify({
          action: "update-person",
          id: person.id,
          name: name.trim(),
          phone: phone.trim(),
          roles: person.roles,
          customerId: person.customerId,
        }),
      });
      onUpdated?.();
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save. Your changes are still here.",
      );
      setConfirming(false);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) return;
        setOpen(nextOpen);
        if (nextOpen) {
          setName(person.name);
          setPhone(person.phone ?? "");
          setConfirming(false);
          setError("");
        }
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
          maxWidth="480px"
        >
          <Dialog.Title>Edit {person.name}</Dialog.Title>
          <Dialog.Description>
            Fix their name or phone. It changes everywhere they appear.
          </Dialog.Description>
          {error && (
            <div className="modal-error" role="alert">
              <TriangleAlert size={17} />
              {error}
            </div>
          )}
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label>
              Name
              <input
                autoFocus
                maxLength={200}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setConfirming(false);
                }}
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                inputMode="tel"
                maxLength={80}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setConfirming(false);
                }}
                placeholder="Mobile or WhatsApp"
              />
            </label>
            {confirming && (
              <p className="inline-alert" role="alert">
                {confirm}
              </p>
            )}
            <div className="modal-actions">
              {confirming ? (
                <button
                  type="button"
                  className="button secondary"
                  disabled={saving}
                  onClick={() => setConfirming(false)}
                >
                  Go back
                </button>
              ) : (
                <Dialog.Close>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </Dialog.Close>
              )}
              <button
                type="submit"
                className="button primary"
                disabled={saving || !name.trim()}
              >
                {saving
                  ? "Saving…"
                  : confirming
                    ? "Yes, save for everyone"
                    : "Save changes"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      )}
    </Dialog.Root>
  );
}
