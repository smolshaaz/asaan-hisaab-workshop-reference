"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Check, Save } from "@/lib/icons";
import { useProduct } from "./product-context";
import { AttachmentPicker, useAttachmentQueue } from "./attachment-picker";
import { AmountInput } from "./amount-input";
import type { BillDirection, BillInput, BillRecord } from "@/lib/bill-types";
import type { LedgerExpenseCategory, LedgerPerson } from "@/lib/ledger-types";
import { riyadhDate } from "@/lib/business-date";
import { money, shortDate } from "@/lib/format";
import styles from "./bills.module.css";

const categories: Record<LedgerExpenseCategory, string> = {
  PARTS: "Parts",
  OUTSOURCED_WORK: "Outside work",
  WAGES: "Worker wages",
  BUSINESS: "Other business expense",
  RENT: "Rent",
  UTILITIES: "Electricity & water",
  PERSONAL: "Personal / non-business",
};

type BillFormProps = {
  initial?: BillRecord;
  fixedDirection?: BillDirection;
  onSaved?: (bill: BillRecord) => void;
  onCancel?: () => void;
};

export function BillForm(props: BillFormProps) {
  const params = useSearchParams();
  const formKey =
    props.initial?.id ||
    JSON.stringify([
      props.fixedDirection,
      params.get("direction"),
      params.get("person"),
      params.get("car"),
    ]);
  return <BillFormFields key={formKey} {...props} />;
}

function BillFormFields({
  initial,
  fixedDirection,
  onSaved,
  onCancel,
}: BillFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { data, loading, error: loadError, refresh, mutate } = useProduct();
  const [savedBill, setSavedBill] = useState<BillRecord | undefined>(initial);
  const direction: BillDirection =
    initial?.direction ||
    fixedDirection ||
    (params.get("direction") === "SALE" ? "SALE" : "PURCHASE");
  const [personId, setPersonId] = useState(
    initial?.personId || params.get("person") || "",
  );
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [number, setNumber] = useState(initial?.number || "");
  const [issueDate, setIssueDate] = useState(
    initial ? initial.issueDate || "" : riyadhDate(),
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [total, setTotal] = useState(
    initial?.total ? String(initial.total) : "",
  );
  const [note, setNote] = useState(initial?.note || "");
  const [category, setCategory] = useState<LedgerExpenseCategory>(
    initial?.category || "BUSINESS",
  );
  const [vehicleId, setVehicleId] = useState(
    initial?.vehicleId || params.get("car") || "",
  );
  const [existingEntryId, setExistingEntryId] = useState(
    initial?.existingEntryId || "",
  );
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const attachments = useAttachmentQueue();
  const [pendingSave, setPendingSave] = useState<{
    bill: BillRecord;
    post: boolean;
  } | null>(null);
  const busy = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const people = data?.ledger.people || [];
  const linkedCustomer = data?.customers.find(
    (customer) => customer.id === customerId,
  );
  const linkedPerson = customerId
    ? people.find((person) => person.customerId === customerId)
    : undefined;
  const canPost = Boolean(
    (personId === "new"
      ? newName.trim() || linkedCustomer
      : people.some((person) => person.id === personId)) &&
    issueDate &&
    Number(total) > 0,
  );
  const eligibleEntries = (data?.ledger.entries || []).filter(
    (entry) =>
      entry.kind ===
        (direction === "PURCHASE" ? "CREDIT_PURCHASE" : "CREDIT_SALE") &&
      entry.personId === personId &&
      !entry.reversedBy &&
      !entry.reversalOf &&
      !entry.needsReview &&
      !(data?.billBook.bills || []).some(
        (bill) =>
          bill.id !== savedBill?.id &&
          bill.status !== "CANCELLED" &&
          (bill.chargeEntryId === entry.id ||
            bill.existingEntryId === entry.id),
      ),
  );

  async function save(post: boolean) {
    if (busy.current || attachments.blocked) return;
    busy.current = true;
    setWorking(true);
    setError("");
    setSaved(Boolean(pendingSave));
    let completion = pendingSave;
    const hasFiles = attachments.files.length > 0;
    try {
      if (!completion) {
        let resolvedPerson = personId === "new" ? "" : personId;
        if (personId === "new" && (newName.trim() || linkedCustomer)) {
          const person =
            linkedPerson ||
            (await mutate<LedgerPerson>("/api/ledger", {
              method: "POST",
              body: JSON.stringify({
                action: "person",
                name: newName.trim() || linkedCustomer?.name,
                phone: newPhone || linkedCustomer?.phone,
                roles:
                  direction === "PURCHASE"
                    ? customerId
                      ? ["SUPPLIER", "CUSTOMER"]
                      : ["SUPPLIER"]
                    : ["CUSTOMER"],
                customerId: customerId || undefined,
              }),
            }));
          resolvedPerson = person.id;
          setPersonId(person.id);
        }
        const input: BillInput = {
          direction,
          personId: resolvedPerson || undefined,
          number,
          issueDate,
          dueDate,
          total: total === "" ? 0 : Number(total),
          note,
          category,
          vehicleId: vehicleId || undefined,
          existingEntryId: existingEntryId || undefined,
        };
        const bill = await mutate<BillRecord>("/api/bills", {
          method: "POST",
          body: JSON.stringify({
            action: savedBill ? "update" : "create",
            id: savedBill?.id,
            ...input,
            idempotencyKey: savedBill ? undefined : requestId.current,
          }),
        });
        setSavedBill(bill);
        setSaved(true);
        completion = { bill, post };
        setPendingSave(completion);
      }
      // Keep the saved id before uploading, so a failed photo never creates another bill.
      await attachments.upload("BILL", completion.bill.id);
      let bill = completion.bill;
      if (completion.post) {
        bill = await mutate<BillRecord>("/api/bills", {
          method: "POST",
          body: JSON.stringify({ action: "post", id: bill.id }),
        });
        setSavedBill(bill);
      }
      if (hasFiles && !completion.post) await refresh();
      if (!onSaved) router.replace(`/bills/${bill.id}`);
      onSaved?.(bill);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Could not save. Your details are still here.";
      setError(
        completion
          ? `Your record is saved. ${message} Retry below to finish the same record.`
          : message,
      );
      if (completion && hasFiles) await refresh();
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  if (loading)
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  if (!data)
    return (
      <div className="page">
        <h1>Could not load your records</h1>
        <p>{loadError}</p>
        <button className="button primary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  return (
    <div className={initial ? styles.form : `page ${styles.page}`}>
      {!initial && (
        <>
          <Link
            className="back-link"
            href={
              vehicleId
                ? `/cars/${vehicleId}`
                : direction === "PURCHASE"
                  ? "/bills"
                  : "/invoices"
            }
          >
            <ArrowLeft size={18} />{" "}
            {vehicleId
              ? "Back to car"
              : direction === "PURCHASE"
                ? "Back to supplier bills"
                : "Back to customer invoices"}
          </Link>
          <div className={styles.heading}>
            <h1>
              {direction === "PURCHASE"
                ? "Add a supplier bill"
                : "Record an existing invoice"}
            </h1>
            <p>
              {direction === "PURCHASE"
                ? "Save the bill once. Link it to a car and record payments here."
                : "Keep a copy of an invoice you already gave a customer."}
            </p>
          </div>
        </>
      )}
      <form
        data-help="bill-editor"
        noValidate
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
        onChange={() => setSaved(false)}
      >
        <fieldset
          disabled={working || Boolean(pendingSave)}
          className={styles.fields}
        >
          {direction === "SALE" && (
            <p className={styles.note}>
              For an invoice already made elsewhere. To make a new invoice here,{" "}
              <Link href="/invoices/new">create an invoice</Link>.
            </p>
          )}
          <label>
            Car (optional)
            <select
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              <option value="">Not linked to a car</option>
              {data.vehicles.map((car) => (
                <option value={car.id} key={car.id}>
                  {car.displayName || car.plateNumber || "Car without plate"}
                </option>
              ))}
            </select>
            {vehicleId && (
              <small>
                This bill will appear with this car
                {direction === "PURCHASE"
                  ? " and the supplier. The purchase is recorded once"
                  : ""}
                .
              </small>
            )}
          </label>
          <label data-help="bill-person">
            {direction === "PURCHASE"
              ? "Who sent this invoice?"
              : "Who is the customer?"}
            <select
              value={personId}
              onChange={(event) => {
                setPersonId(event.target.value);
                setExistingEntryId("");
              }}
            >
              <option value="">Add a person later</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                  {person.phone ? ` · ${person.phone}` : ""}
                </option>
              ))}
              <option value="new">+ Add a person or shop</option>
            </select>
          </label>
          {personId === "new" && (
            <div className={styles.personForm}>
              <div className={styles.two}>
                <label>
                  Name
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Person or shop name"
                  />
                </label>
                <label>
                  Phone (optional)
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                  />
                </label>
              </div>
              <details>
                <summary>They also have customer invoices here</summary>
                <label>
                  Match their customer record
                  <select
                    value={customerId}
                    onChange={(event) => {
                      setCustomerId(event.target.value);
                      const customer = data.customers.find(
                        (item) => item.id === event.target.value,
                      );
                      if (customer && !newName) setNewName(customer.name);
                    }}
                  >
                    <option value="">No customer record selected</option>
                    {data.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <small>
                    This lets you settle amounts against invoices made for the
                    same customer.
                  </small>
                </label>
                {linkedPerson && (
                  <p>
                    We’ll use the existing person record for {linkedPerson.name}
                    .
                  </p>
                )}
              </details>
            </div>
          )}
          <label data-help="bill-total" className={styles.amount}>
            {direction === "PURCHASE"
              ? "Bill total (SAR)"
              : "Invoice total (SAR)"}
            <AmountInput
              min="0"
              step="0.01"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              placeholder="0.00"
            />
            <small>
              Use the full total shown on the invoice, including any tax.
            </small>
          </label>
          <div className={styles.two}>
            <label>
              {direction === "PURCHASE" ? "Bill number" : "Invoice number"}
              <input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="Can add later"
              />
            </label>
            <label>
              {direction === "PURCHASE" ? "Bill date" : "Invoice date"}
              <input
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
              />
            </label>
          </div>
          <label>
            A few words (optional)
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                direction === "PURCHASE"
                  ? "For example: spare parts from Ahmed"
                  : "For example: repair work on the white Toyota"
              }
            />
          </label>
          <details className={styles.more}>
            <summary>Due date and other details</summary>
            <div className={styles.fields}>
              <label>
                Payment due date
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
              {direction === "PURCHASE" && (
                <label>
                  What was it for?
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as LedgerExpenseCategory)
                    }
                  >
                    {Object.entries(categories).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {eligibleEntries.length > 0 && (
                <label>
                  Was this amount already recorded as “pay later”?
                  <select
                    value={existingEntryId}
                    onChange={(event) => setExistingEntryId(event.target.value)}
                  >
                    <option value="">No — this is a new amount</option>
                    {eligibleEntries.map((entry) => (
                      <option value={entry.id} key={entry.id}>
                        {shortDate(entry.entryDate)} · {money(entry.amount)} ·{" "}
                        {entry.note || "Pay-later record"}
                      </option>
                    ))}
                  </select>
                  <small>
                    Choose the earlier record to avoid adding the same amount
                    twice.
                  </small>
                </label>
              )}
            </div>
          </details>
        </fieldset>
        <section
          aria-label={
            direction === "PURCHASE"
              ? "Bill photo or PDF"
              : "Invoice photo or PDF"
          }
        >
          <h2>
            {direction === "PURCHASE"
              ? "Bill photo or PDF"
              : "Invoice photo or PDF"}
          </h2>
          <AttachmentPicker queue={attachments} disabled={working} />
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className={styles.saved} role="status">
            <Check size={18} /> Record saved.
            {savedBill && !initial && (
              <Link href={`/bills/${savedBill.id}`}>
                {attachments.files.length
                  ? "Open saved record without the pending files"
                  : "Open saved record"}
              </Link>
            )}
          </p>
        )}
        <p className={styles.note}>
          {pendingSave
            ? "Your record is already saved. Retry to save any remaining files and finish. This will not add another record."
            : canPost
              ? "Save a draft to finish later, or record the amount owed now. No payment is recorded yet."
              : "You can save with details missing. Add a person, date and total before recording an amount owed."}
        </p>
        <div className={styles.actions}>
          <button
            className="button primary"
            type="submit"
            disabled={working || attachments.blocked}
          >
            <Save size={18} />{" "}
            {working
              ? "Saving…"
              : pendingSave
                ? "Retry and finish saving"
                : "Save draft"}
          </button>
          {!pendingSave && (
            <button
              className="button secondary"
              type="button"
              disabled={working || attachments.blocked || !canPost}
              onClick={() => void save(true)}
            >
              Record amount owed
            </button>
          )}
          {onCancel && (
            <button
              className="button secondary"
              type="button"
              disabled={working}
              onClick={onCancel}
            >
              {attachments.files.length && pendingSave
                ? "Open saved record without the pending files"
                : "Back to record"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
