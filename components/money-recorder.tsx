"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Save,
} from "@/lib/icons";
import { AttachmentPicker, useAttachmentQueue } from "./attachment-picker";
import { AmountInput } from "./amount-input";
import { PersonNameField, type PersonChoice } from "./person-name-field";
import { useProduct } from "./product-context";
import type {
  MoneyRecordInput,
  MoneyRecordResult,
} from "@/lib/money-record-types";
import type {
  LedgerExpenseCategory,
  LedgerPaymentMethod,
} from "@/lib/ledger-types";
import { canReceiveInvoicePayment } from "@/lib/invoice-payment-eligibility";
import { riyadhDate } from "@/lib/business-date";
import { money, shortDate } from "@/lib/format";
import styles from "./money-recorder.module.css";

type Direction = "IN" | "OUT";
type Purpose = MoneyRecordInput["purpose"];
type Timing = MoneyRecordInput["timing"];
type DocumentChoice = {
  id: string;
  type: "BILL" | "INVOICE";
  label: string;
  balance: number;
  personId?: string;
  vehicleId?: string;
  date?: string;
};
const steps = ["In or out", "Who", "Amount", "What for", "Save"];
const categories: Record<LedgerExpenseCategory, string> = {
  PARTS: "Parts & car work",
  OUTSOURCED_WORK: "Outside work",
  WAGES: "Worker pay",
  BUSINESS: "Shop / sales expense",
  RENT: "Rent",
  UTILITIES: "Electricity & water",
  PERSONAL: "Personal expense",
};
const methods: Record<LedgerPaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};
const emptyPerson: PersonChoice = { name: "" };
function initialKind(kind: string | null) {
  const out = [
    "EXPENSE",
    "GIVE_MONEY",
    "PERSON_SPENT",
    "CREDIT_PURCHASE",
    "OPENING_WE_OWE",
  ].includes(kind || "");
  return {
    direction: kind ? ((out ? "OUT" : "IN") as Direction) : undefined,
    timing:
      kind?.startsWith("CREDIT_") || kind?.startsWith("OPENING_")
        ? ("LATER" as Timing)
        : ("NOW" as Timing),
    purpose: kind?.startsWith("OPENING_")
      ? ("OPENING" as Purpose)
      : ["GIVE_MONEY", "RECEIVE_MONEY"].includes(kind || "")
        ? ("RETURN" as Purpose)
        : ("NEW" as Purpose),
    handled: ["PERSON_SPENT", "PERSON_COLLECTED"].includes(kind || ""),
  };
}
function reasonLabel(purpose: Purpose, direction: Direction | undefined) {
  if (purpose === "SETTLEMENT")
    return direction === "IN"
      ? "Payment for recorded work"
      : "Payment of a saved bill";
  if (purpose === "ADVANCE")
    return direction === "IN" ? "Customer advance" : "Money given in advance";
  if (purpose === "RETURN")
    return direction === "IN"
      ? "Money handed over / balance payment"
      : "Pay someone back";
  if (purpose === "OPENING")
    return direction === "IN"
      ? "Earlier amount they owe us"
      : "Earlier amount we owe them";
  return direction === "IN"
    ? "New work / car charge"
    : "New purchase / expense";
}
export function MoneyRecorder() {
  const params = useSearchParams();
  return <Recorder key={params.toString()} />;
}
function Recorder() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, loading, error: loadError, mutate, refresh } = useProduct();
  const old = initialKind(params.get("kind"));
  const suppliedDirection = params.get("direction");
  const presetDirection =
    suppliedDirection === "IN" || suppliedDirection === "OUT"
      ? suppliedDirection
      : params.get("invoice")
        ? "IN"
        : params.get("bill")
          ? data?.billBook.bills.find((b) => b.id === params.get("bill"))
              ?.direction === "SALE"
            ? "IN"
            : "OUT"
          : old.direction;
  const initialDocument = params.get("invoice") || params.get("bill") || "";
  const initialPerson = data?.ledger.people.find(
    (p) => p.id === params.get("person"),
  );
  const [direction, setDirection] = useState<Direction | undefined>(
    presetDirection,
  );
  const [step, setStep] = useState(() =>
    presetDirection
      ? Math.max(
          1,
          ["direction", "who", "amount", "purpose", "review"].indexOf(
            params.get("step") || "",
          ),
        )
      : 0,
  );
  const [person, setPerson] = useState<PersonChoice>(
    !old.handled && initialPerson
      ? { id: initialPerson.id, name: initialPerson.name }
      : emptyPerson,
  );
  const [handler, setHandler] = useState<PersonChoice>(
    old.handled && initialPerson
      ? { id: initialPerson.id, name: initialPerson.name }
      : emptyPerson,
  );
  const [handled, setHandled] = useState(old.handled);
  const [payer, setPayer] = useState<PersonChoice>(emptyPerson);
  const [differentPayer, setDifferentPayer] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>(
    initialDocument
      ? "SETTLEMENT"
      : ["NEW", "SETTLEMENT", "ADVANCE", "RETURN", "OPENING"].includes(
            params.get("purpose") || "",
          )
        ? (params.get("purpose") as Purpose)
        : old.purpose,
  );
  const [timing, setTiming] = useState<Timing>(old.timing);
  const [amount, setAmount] = useState(params.get("amount") || "");
  const [paidNow, setPaidNow] = useState("");
  const [entryDate, setEntryDate] = useState(riyadhDate());
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState<LedgerPaymentMethod>("CASH");
  const [vehicleId, setVehicleId] = useState(params.get("car") || "");
  const [documentKey, setDocumentKey] = useState(
    initialDocument
      ? `${params.get("invoice") ? "INVOICE" : "BILL"}:${initialDocument}`
      : "",
  );
  const [existingEntryId, setExistingEntryId] = useState(
    params.get("credit") || "",
  );
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<LedgerExpenseCategory>("PARTS");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [savedResult, setSavedResult] = useState<MoneyRecordResult | null>(
    null,
  );
  const attachments = useAttachmentQueue();
  const busy = useRef(false);
  const request = useRef({ key: "", signature: "" });
  const initialised = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const locked = working || !!savedResult;
  const people = data?.ledger.people || [];
  const peopleOptions = people.map((p) => ({
    id: p.id,
    name: p.name,
    detail: p.phone || undefined,
  }));
  const selectedPerson = people.find((p) => p.id === person.id);
  const car = data?.vehicles.find((c) => c.id === vehicleId);
  const documents: DocumentChoice[] = data
    ? [
        ...data.billBook.bills
          .filter(
            (b) =>
              b.status === "POSTED" &&
              b.balance > 0 &&
              b.direction === (direction === "OUT" ? "PURCHASE" : "SALE") &&
              (!person.id || b.personId === person.id),
          )
          .map((b) => ({
            id: b.id,
            type: "BILL" as const,
            label:
              b.number ||
              (b.direction === "PURCHASE" ? "Supplier bill" : "Car work"),
            balance: b.balance,
            personId: b.personId,
            vehicleId: b.vehicleId,
            date: b.issueDate,
          })),
        ...(direction === "IN"
          ? data.invoices
              .filter(
                (i) =>
                  canReceiveInvoicePayment(i) &&
                  (!person.id || selectedPerson?.customerId === i.customerId),
              )
              .map((i) => ({
                id: i.id,
                type: "INVOICE" as const,
                label: i.number,
                balance: Math.max(0, i.total - i.paidAmount - i.badDebtAmount),
                personId: people.find((p) => p.customerId === i.customerId)?.id,
                vehicleId: i.vehicleId,
                date: i.issueDate,
              }))
          : []),
      ].sort(
        (a, b) =>
          Number(b.vehicleId === vehicleId) - Number(a.vehicleId === vehicleId),
      )
    : [];
  const document = documents.find((d) => `${d.type}:${d.id}` === documentKey);
  const creditOptions = (data?.ledger.entries || []).filter(
    (e) =>
      !e.reversedBy &&
      !e.reversalOf &&
      !e.needsReview &&
      (e.availableAmount || 0) > 0 &&
      (direction === "IN"
        ? !!person.id &&
          ((e.personId === person.id &&
            ["RECEIVE_MONEY", "ADVANCE_RECEIVED"].includes(e.kind)) ||
            (e.counterpartyId === person.id &&
              ["PERSON_COLLECTED", "ADVANCE_COLLECTED"].includes(e.kind)))
        : !!person.id &&
          ((e.personId === person.id &&
            ["GIVE_MONEY", "ADVANCE_GIVEN"].includes(e.kind)) ||
            (e.counterpartyId === person.id && e.kind === "PERSON_PAID_BILL"))),
  );
  const chosenCredit = creditOptions.find((e) => e.id === existingEntryId);
  const noMovement =
    timing === "LATER" || purpose === "OPENING" || !!existingEntryId;
  const actualPaid = timing === "PART" ? Number(paidNow) : Number(amount);
  const backHref = params.get("invoice")
    ? `/invoices/${params.get("invoice")}`
    : params.get("bill")
      ? `/bills/${params.get("bill")}`
      : params.get("car")
        ? `/cars/${params.get("car")}`
        : params.get("person")
          ? `/people/${params.get("person")}`
          : "/payments";
  const backLabel = params.get("invoice")
    ? "Back to invoice"
    : params.get("bill")
      ? "Back to bill"
      : params.get("car")
        ? "Back to car"
        : params.get("person")
          ? "Back to person"
          : "Money book";
  const nameRequired = timing !== "NOW" || purpose !== "NEW" || differentPayer;

  useEffect(() => {
    if (!data || initialised.current) return;
    initialised.current = true;
    const preset = data.ledger.people.find(
      (p) => p.id === params.get("person"),
    );
    if (preset) {
      if (old.handled) setHandler({ id: preset.id, name: preset.name });
      else setPerson({ id: preset.id, name: preset.name });
    }
    const inv = data.invoices.find((i) => i.id === params.get("invoice"));
    const bill = data.billBook.bills.find((b) => b.id === params.get("bill"));
    const initialCar = data.vehicles.find((c) => c.id === params.get("car"));
    const owner = inv
      ? data.ledger.people.find((p) => p.customerId === inv.customerId)
      : bill
        ? data.ledger.people.find((p) => p.id === bill.personId)
        : presetDirection === "IN" && initialCar?.customerId
          ? data.ledger.people.find(
              (p) => p.customerId === initialCar.customerId,
            )
          : undefined;
    if (owner) setPerson({ id: owner.id, name: owner.name });
    if (inv || bill) {
      setDirection(inv || bill?.direction === "SALE" ? "IN" : "OUT");
      setVehicleId(
        inv?.vehicleId || bill?.vehicleId || params.get("car") || "",
      );
      if (!params.get("amount")) {
        const remaining = inv
          ? Math.max(0, inv.total - inv.paidAmount - inv.badDebtAmount)
          : bill!.balance;
        const credit = data.ledger.entries.find(
          (e) => e.id === params.get("credit"),
        );
        setAmount(
          String(
            credit
              ? Math.min(remaining, credit.availableAmount || 0)
              : remaining,
          ),
        );
      }
    }
  }, [data, params, old.handled, presetDirection]);
  useEffect(() => {
    if (loading) return;
    const target =
      step === 2
        ? form.current?.querySelector<HTMLInputElement>("#record-amount")
        : heading.current;
    target?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, loading]);
  function go(next: number) {
    if (locked) return;
    setError("");
    setStep(next);
  }
  function chooseDirection(next: Direction) {
    setDirection(next);
    setPurpose("NEW");
    setTiming("NOW");
    setDocumentKey("");
    setExistingEntryId("");
    setHandled(false);
    setHandler(emptyPerson);
    setDifferentPayer(false);
    setPayer(emptyPerson);
    if (direction && next !== direction) setPerson(emptyPerson);
    if (next === "IN" && car?.customerId) {
      const owner = people.find((p) => p.customerId === car.customerId);
      if (owner) setPerson({ id: owner.id, name: owner.name });
    }
    go(1);
  }
  function changePerson(next: PersonChoice) {
    setPerson(next);
    setDocumentKey("");
    setExistingEntryId("");
  }
  function selectDocument(key: string) {
    setDocumentKey(key);
    setExistingEntryId("");
    const picked = documents.find((d) => `${d.type}:${d.id}` === key);
    if (!picked) return;
    if (picked.personId) {
      const owner = people.find((p) => p.id === picked.personId);
      if (owner) setPerson({ id: owner.id, name: owner.name });
    }
    if (picked.vehicleId) setVehicleId(picked.vehicleId);
    if (!amount || Number(amount) > picked.balance)
      setAmount(picked.balance.toFixed(2));
    setTiming("NOW");
    setPurpose("SETTLEMENT");
  }
  function fail(message: string, destination = step) {
    setStep(destination);
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
    return false;
  }
  function validMoney(value: string) {
    return (
      /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value.trim()) &&
      Number(value) > 0 &&
      Number(value) <= 999999999.99
    );
  }
  function validate(at: number) {
    if (at === 0 && !direction) return fail("Choose money in or money out.", 0);
    if (at === 1) {
      if (nameRequired && !person.name.trim())
        return fail(
          "Enter a name or nickname so we can keep track of this balance.",
          1,
        );
      if (person.id && !people.some((p) => p.id === person.id))
        return fail(
          "Choose the saved name again. Your other details are still here.",
          1,
        );
      if (differentPayer && direction === "IN" && !payer.name.trim())
        return fail("Enter who paid on the customer's behalf.", 1);
    }
    if (at === 2) {
      if (!validMoney(amount))
        return fail(
          "Enter an amount above zero, with no more than two decimal places.",
          2,
        );
      if (
        timing === "PART" &&
        (!validMoney(paidNow) || Number(paidNow) >= Number(amount))
      )
        return fail(
          "Enter the part paid now. It must be less than the full amount.",
          2,
        );
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(entryDate) ||
        Number.isNaN(Date.parse(entryDate))
      )
        return fail("Choose a valid date.", 2);
      if (handled && !noMovement && !handler.name.trim())
        return fail(
          direction === "IN"
            ? "Enter who collected the money."
            : "Enter who paid for the workshop.",
          2,
        );
      if (handled && !noMovement && person.id && handler.id === person.id)
        return fail(
          "The customer or supplier and the person handling the money are the same. Choose The workshop for a direct payment, or select the worker who handled it.",
          2,
        );
      if (
        dueDate &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
          Number.isNaN(Date.parse(dueDate)))
      )
        return fail("Choose a valid payment date, or leave it empty.", 2);
    }
    if (at === 3) {
      if (nameRequired && !person.name.trim())
        return fail(
          "This record needs a name to keep the balance. Enter it here; everything else is kept.",
          1,
        );
      if (purpose === "SETTLEMENT" && !document)
        return fail(
          "Choose the invoice or bill this payment belongs to. For an amount only in the money book, choose Balance payment.",
          3,
        );
      if (document && Number(amount) > document.balance + 0.001)
        return fail(
          `Only ${money(document.balance)} is left on this record. Reduce the amount.`,
          2,
        );
      if (
        existingEntryId &&
        (!chosenCredit ||
          Number(amount) > (chosenCredit.availableAmount || 0) + 0.001)
      )
        return fail(
          "The amount is more than the unused earlier payment. Reduce it or choose another payment.",
          2,
        );
      if (attachments.blocked)
        return fail(
          attachments.preparing
            ? "Wait a moment while the photo is prepared."
            : "Remove or replace the photo that could not be prepared.",
          3,
        );
    }
    return true;
  }
  function done(result: MoneyRecordResult) {
    const returnTo = new URL(backHref, window.location.origin);
    returnTo.searchParams.set("saved", result.entryId);
    if (result.personId)
      returnTo.searchParams.set("savedPerson", result.personId);
    router.push(
      returnTo.pathname +
        returnTo.search +
        (backHref === "/payments" ? `#entry-${result.entryId}` : ""),
    );
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step < 4) {
      if (validate(step)) go(step + 1);
      return;
    }
    if (busy.current || !direction) return;
    if (!savedResult) for (const at of [0, 1, 2, 3]) if (!validate(at)) return;
    if (attachments.blocked)
      return fail(
        "Wait for the photo, or remove the file that could not be prepared.",
        3,
      );
    busy.current = true;
    setWorking(true);
    setError("");
    let result = savedResult;
    try {
      if (!result) {
        const input: Omit<MoneyRecordInput, "idempotencyKey"> = {
          direction,
          purpose,
          timing: purpose === "OPENING" ? "LATER" : timing,
          amount: Number(amount),
          paidNow: timing === "PART" ? Number(paidNow) : undefined,
          personId: person.id,
          personName: person.id ? undefined : person.name.trim() || undefined,
          handlerPersonId: handled && !noMovement ? handler.id : undefined,
          handlerName:
            handled && !noMovement && !handler.id
              ? handler.name.trim() || undefined
              : undefined,
          payerPersonId:
            differentPayer && direction === "IN" && !noMovement
              ? payer.id
              : undefined,
          payerName:
            differentPayer && direction === "IN" && !noMovement && !payer.id
              ? payer.name.trim() || undefined
              : undefined,
          documentId: purpose === "SETTLEMENT" ? document?.id : undefined,
          documentType: purpose === "SETTLEMENT" ? document?.type : undefined,
          existingEntryId:
            purpose === "SETTLEMENT" ? existingEntryId || undefined : undefined,
          category:
            direction === "OUT" && purpose === "NEW" ? category : undefined,
          note,
          entryDate,
          vehicleId: vehicleId || undefined,
          paymentMethod: noMovement ? undefined : method,
          reference,
          dueDate: timing !== "NOW" ? dueDate || undefined : undefined,
        };
        const signature = JSON.stringify(input);
        if (request.current.signature !== signature)
          request.current = { signature, key: crypto.randomUUID() };
        result = await mutate<MoneyRecordResult>("/api/money-records", {
          method: "POST",
          body: JSON.stringify({
            ...input,
            idempotencyKey: request.current.key,
          }),
        });
        setSavedResult(result);
      }
      const hasFiles = attachments.files.length > 0;
      await attachments.upload("LEDGER_ENTRY", result.entryId);
      if (hasFiles) await refresh();
      done(result);
    } catch (reason) {
      setError(
        (result ? "The money record is saved. " : "") +
          (reason instanceof Error
            ? reason.message
            : "Could not save. Your details are still here.") +
          (result ? " Retry only the remaining photos below." : ""),
      );
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }
  if (loading)
    return (
      <div className={`page ${styles.page}`}>Loading your people and cars…</div>
    );
  if (!data)
    return (
      <div className={`page ${styles.page}`}>
        <h1>Could not load your records</h1>
        <p role="alert">{loadError}</p>
        <button className="button primary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  const titles = [
    "Money in or money out?",
    purpose === "RETURN" && direction === "IN"
      ? "Who handed over the money?"
      : direction === "IN"
        ? "Who is this payment for?"
        : "Who is the money for?",
    "How much?",
    "What is it for?",
    "Ready to save?",
  ];
  const tone = direction === "OUT" ? "out" : "in";
  const explanation =
    purpose === "OPENING"
      ? "An earlier balance. No new payment or cost."
      : existingEntryId
        ? "Uses money already recorded. No new money moves."
        : timing === "LATER"
          ? direction === "IN"
            ? "They owe this amount. No money received yet."
            : "This is a cost now, with payment still owed."
          : purpose === "ADVANCE"
            ? direction === "IN"
              ? "Keep this as their advance. Apply it to work later without receiving the money twice."
              : "Money entrusted to this person. Record what they buy separately."
            : direction === "IN"
              ? handled
                ? `Collected by ${handler.name || "another person"}. This payment is credited to the customer; it has not reached the workshop.`
                : `Received by the workshop${differentPayer ? ` from ${payer.name}, for ${person.name}` : ""}.`
              : handled
                ? `Paid by ${handler.name || "another person"}. Their account changes; no workshop cash leaves again.`
                : "Paid by the workshop.";
  const purposeChoices: Array<{ value: Purpose; title: string; hint: string }> =
    direction === "IN"
      ? [
          {
            value: "NEW",
            title: "New work / car charge",
            hint: "This work has not been charged yet",
          },
          {
            value: "SETTLEMENT",
            title: "Work already recorded",
            hint: "Pay an existing invoice or car charge",
          },
          {
            value: "ADVANCE",
            title: "Customer paid in advance",
            hint: "Keep money for work to be done",
          },
          {
            value: "RETURN",
            title: "Handover / balance payment",
            hint: "An older balance or money a worker hands over",
          },
        ]
      : [
          {
            value: "NEW",
            title: "New purchase / expense",
            hint: "Parts, outside work or another new cost",
          },
          {
            value: "SETTLEMENT",
            title: "Bill already recorded",
            hint: "Pay a saved supplier bill without another cost",
          },
          {
            value: "ADVANCE",
            title: "Give money in advance",
            hint: "Money for someone to spend or return",
          },
          {
            value: "RETURN",
            title: "Pay someone back",
            hint: "Pay an older money-book balance, directly or through someone",
          },
        ];
  const choosePurpose = (value: Purpose) => {
    setPurpose(value);
    setError("");
    if (value !== "NEW") {
      setTiming("NOW");
      setDueDate("");
    }
    if (value === "OPENING") setHandled(false);
    if (value !== "SETTLEMENT") {
      setDocumentKey("");
      setExistingEntryId("");
    }
  };
  return (
    <div className={`page ${styles.page}`} data-tone={tone}>
      <header className={styles.heading}>
        <Link href={backHref} className={styles.backLink}>
          <ArrowLeft size={18} />
          {backLabel}
        </Link>
        <h1>Add money record</h1>
      </header>
      <ol className={styles.steps} aria-label="Record progress">
        {steps.map((title, index) => (
          <li
            key={title}
            className={
              index === step
                ? styles.current
                : index < step
                  ? styles.completed
                  : undefined
            }
          >
            <button
              type="button"
              disabled={index > step || locked}
              onClick={() => go(index)}
              aria-current={index === step ? "step" : undefined}
            >
              <span className={styles.stepNumber}>
                {index < step ? <Check size={16} /> : index + 1}
              </span>
              {title}
            </button>
          </li>
        ))}
      </ol>
      <form
        ref={form}
        onSubmit={submit}
        className={styles.panel}
        data-help="money-form"
        noValidate
      >
        <div className={styles.panelHeading}>
          <p className={styles.eyebrow}>
            {direction
              ? `${direction === "IN" ? "Money in" : "Money out"} · `
              : ""}
            STEP {step + 1} OF 5
          </p>
          <h2 ref={heading} tabIndex={-1} className={styles.stepTitle}>
            {titles[step]}
          </h2>
          <p className={styles.intro}>
            {step === 0
              ? "Start here, even if payment will happen later."
              : step === 1
                ? direction === "IN"
                  ? purpose === "RETURN"
                    ? "Choose the person returning money or paying their balance."
                    : "Name the customer, company or person this money belongs to."
                  : "Name the supplier, friend or person we need to pay. A name is enough."
                : step === 2
                  ? person.name || "No name recorded"
                  : step === 3
                    ? "Choose the reason, add a few words, and keep the receipt."
                    : "Check the details. Change anything before saving."}
          </p>
        </div>
        {error && (
          <p className={styles.error} role="alert" ref={errorRef} tabIndex={-1}>
            {error}
          </p>
        )}
        {step === 0 && (
          <div data-help="money-types" className={styles.directionGrid}>
            <button
              className={`${styles.directionCard} ${styles.moneyIn}`}
              type="button"
              onClick={() => chooseDirection("IN")}
            >
              <span className={styles.directionIcon}>
                <ArrowDownRight />
              </span>
              <strong>Money in</strong>
              <small>Received, or someone will pay us</small>
              <ArrowRight />
            </button>
            <button
              className={`${styles.directionCard} ${styles.moneyOut}`}
              type="button"
              onClick={() => chooseDirection("OUT")}
            >
              <span className={styles.directionIcon}>
                <ArrowUpRight />
              </span>
              <strong>Money out</strong>
              <small>Paid, or we need to pay someone</small>
              <ArrowRight />
            </button>
          </div>
        )}
        {step === 1 && (
          <section data-help="money-person" className={styles.whoStep}>
            <PersonNameField
              label={
                purpose === "RETURN"
                  ? "Person"
                  : direction === "IN"
                    ? "Customer / company"
                    : "Supplier / person"
              }
              value={person}
              onChange={changePerson}
              people={peopleOptions}
              placeholder="Type a name, or choose someone"
              disabled={locked}
            />
            {car && (
              <p className={styles.linkedCar}>
                For {car.displayName || car.plateNumber || "this car"}
                {car.customerName ? ` · ${car.customerName}` : ""}
              </p>
            )}
            {direction === "IN" && (
              <>
                <label className={styles.checkLine}>
                  <input
                    type="checkbox"
                    checked={differentPayer}
                    onChange={(e) => setDifferentPayer(e.target.checked)}
                  />
                  Someone else is paying for this customer
                </label>
                {differentPayer && (
                  <PersonNameField
                    label="Who actually paid?"
                    value={payer}
                    onChange={setPayer}
                    people={peopleOptions}
                    hint="The customer or company's bill changes. Their employee or other payer is recorded here."
                  />
                )}
              </>
            )}
            {!nameRequired && !person.name.trim() && (
              <button
                type="button"
                className={styles.skip}
                onClick={() => go(2)}
              >
                Continue without a name <ArrowRight size={17} />
              </button>
            )}
          </section>
        )}
        {step === 2 && (
          <section data-help="money-amount">
            <div className={styles.amountHero}>
              <label htmlFor="record-amount">
                {timing === "PART" ? "Full amount" : "Amount"}
              </label>
              <div className={styles.amountBox}>
                <span>SAR</span>
                <AmountInput
                  id="record-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  aria-label="Amount"
                />
              </div>
            </div>
            {purpose === "NEW" && (
              <div
                className={styles.timingChoices}
                role="group"
                aria-label="When is it paid?"
              >
                {(["NOW", "LATER", "PART"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    aria-pressed={timing === t}
                    className={`${styles.timingButton} ${timing === t ? styles.selected : ""}`}
                    onClick={() => {
                      setTiming(t);
                      if (t === "LATER") setHandled(false);
                    }}
                  >
                    {t === "NOW"
                      ? direction === "IN"
                        ? "Received now"
                        : "Paid now"
                      : t === "LATER"
                        ? direction === "IN"
                          ? "Will receive later"
                          : "Will pay later"
                        : "Part paid"}
                  </button>
                ))}
              </div>
            )}
            {timing === "PART" && (
              <div className={styles.two}>
                <label className={styles.field}>
                  {direction === "IN" ? "Received now" : "Paid now"}
                  <AmountInput
                    value={paidNow}
                    onChange={(e) => setPaidNow(e.target.value)}
                    placeholder="0"
                  />
                </label>
                <p className={styles.remainder}>
                  Left {direction === "IN" ? "to collect" : "to pay"}
                  <strong>
                    {money(
                      Math.max(0, Number(amount || 0) - Number(paidNow || 0)),
                    )}
                  </strong>
                </p>
              </div>
            )}
            {!noMovement && (
              <div data-help="money-handler" className={styles.handling}>
                <span className={styles.fieldLabel}>
                  {direction === "IN" ? "Who received the money?" : "Who paid?"}
                </span>
                <div className={styles.timingChoices}>
                  <button
                    type="button"
                    aria-pressed={!handled}
                    className={`${styles.timingButton} ${!handled ? styles.selected : ""}`}
                    onClick={() => setHandled(false)}
                  >
                    The workshop
                  </button>
                  <button
                    type="button"
                    aria-pressed={handled}
                    className={`${styles.timingButton} ${handled ? styles.selected : ""}`}
                    onClick={() => setHandled(true)}
                  >
                    A worker / someone else
                  </button>
                </div>
                {handled && (
                  <PersonNameField
                    label={
                      direction === "IN"
                        ? "Who has the money?"
                        : "Who spent for us?"
                    }
                    value={handler}
                    onChange={setHandler}
                    people={peopleOptions}
                    hint={
                      direction === "IN"
                        ? "This payment reduces what the customer owes. Record the handover to the workshop later."
                        : "Their own money, an earlier advance, or both — their account will keep the difference."
                    }
                  />
                )}
              </div>
            )}
            <div className={styles.two}>
              <label className={styles.field}>
                Date
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </label>
              {timing !== "NOW" && purpose !== "OPENING" && (
                <label className={styles.field}>
                  Expected payment date <span>(optional)</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              )}
              {!noMovement && (
                <label className={styles.field}>
                  How was it paid?
                  <select
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as LedgerPaymentMethod)
                    }
                  >
                    {Object.entries(methods).map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {timing === "LATER" && (
              <p className={styles.context}>
                {direction === "IN"
                  ? "No money received yet. This amount will be kept against the customer's name."
                  : "No money paid yet. Use the name of whoever we owe — the supplier or the person who arranged it."}
              </p>
            )}
          </section>
        )}
        {step === 3 && (
          <section data-help="money-kind">
            <div
              className={styles.natureChoices}
              role="group"
              aria-label="Reason for this record"
            >
              {purposeChoices
                .filter((c) => timing === "NOW" || c.value === "NEW")
                .map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    className={`${styles.choice} ${purpose === c.value ? styles.selected : ""}`}
                    aria-pressed={purpose === c.value}
                    onClick={() => choosePurpose(c.value)}
                  >
                    <strong>{c.title}</strong>
                    <small>{c.hint}</small>
                    {purpose === c.value && <Check size={17} />}
                  </button>
                ))}
            </div>
            {purpose === "SETTLEMENT" && (
              <div className={styles.documentPicker} data-help="money-document">
                <label className={styles.field}>
                  {direction === "IN"
                    ? "Which invoice or car charge?"
                    : "Which supplier bill?"}
                  <select
                    value={documentKey}
                    onChange={(e) => selectDocument(e.target.value)}
                  >
                    <option value="">Choose the saved record</option>
                    {documents.map((d) => (
                      <option
                        key={`${d.type}:${d.id}`}
                        value={`${d.type}:${d.id}`}
                      >
                        {d.label} · {money(d.balance)} left
                        {d.date ? ` · ${shortDate(d.date)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {documents.length === 0 && (
                  <p className={styles.hint}>
                    No unpaid document for this name. If their amount is only in
                    the money book, choose{" "}
                    {direction === "IN"
                      ? "Handover / balance payment"
                      : "Pay someone back"}
                    .
                  </p>
                )}
                {creditOptions.length > 0 && document && (
                  <label className={styles.field}>
                    Use money already recorded?
                    <select
                      value={existingEntryId}
                      onChange={(e) => {
                        setExistingEntryId(e.target.value);
                        const credit = creditOptions.find(
                          (c) => c.id === e.target.value,
                        );
                        if (credit)
                          setAmount(
                            Math.min(
                              Number(amount) || document.balance,
                              document.balance,
                              credit.availableAmount || 0,
                            ).toFixed(2),
                          );
                      }}
                    >
                      <option value="">No — this is a new payment</option>
                      {creditOptions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {money(e.availableAmount || 0)} available ·{" "}
                          {shortDate(e.entryDate)} ·{" "}
                          {e.note || e.reference || "Earlier payment"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {chosenCredit && (
                  <p className={styles.context}>
                    Using {money(Number(amount))} from an earlier payment.{" "}
                    {money(
                      Math.max(
                        0,
                        (chosenCredit.availableAmount || 0) -
                          Number(amount || 0),
                      ),
                    )}{" "}
                    will remain unused. No new money moves.
                  </p>
                )}
              </div>
            )}
            {purpose === "NEW" && documents.length > 0 && timing === "NOW" && (
              <div className={styles.existingNotice}>
                <span>
                  This name already has {documents.length} unpaid record
                  {documents.length === 1 ? "" : "s"}.
                </span>
                <button
                  type="button"
                  onClick={() => choosePurpose("SETTLEMENT")}
                >
                  Choose an existing {direction === "IN" ? "charge" : "bill"}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            {purpose === "OPENING" && (
              <p className={styles.context}>
                Earlier amount{" "}
                {direction === "IN" ? "they owe us" : "we owe them"}. This adds
                a starting balance only.
              </p>
            )}
            <label className={styles.field} data-help="money-description">
              Description <span>(optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder={
                  direction === "IN"
                    ? "For example: deposit for MJCC's Toyota, paid by Ali"
                    : "For example: brake pads arranged by Ali for MJCC's Toyota"
                }
              />
            </label>
            <div className={styles.two}>
              {direction === "OUT" && purpose === "NEW" && (
                <label className={styles.field}>
                  Expense type
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as LedgerExpenseCategory)
                    }
                  >
                    {Object.entries(categories).map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className={styles.field}>
                For a car? <span>(optional)</span>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  disabled={!!document?.vehicleId}
                >
                  <option value="">Not for a car</option>
                  {data.vehicles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName || c.plateNumber || "Car details to add"} ·{" "}
                      {[c.make, c.model].filter(Boolean).join(" ") ||
                        c.customerName}
                    </option>
                  ))}
                </select>
                {document && !document.vehicleId && vehicleId && (
                  <small className={styles.hint}>
                    This also links the saved{" "}
                    {document.type === "INVOICE" ? "invoice" : "bill"} to this
                    car. It does not add another charge.
                  </small>
                )}
                {purpose === "RETURN" && (
                  <small className={styles.hint}>
                    Choose a car if the whole payment belongs to it. Otherwise,
                    keep it in the person's account.
                  </small>
                )}
              </label>
            </div>
            <section className={styles.photoSection} data-help="money-photos">
              <h3>
                Keep the receipt <span>(optional)</span>
              </h3>
              <AttachmentPicker queue={attachments} disabled={working} />
            </section>
            <details className={styles.reference}>
              <summary>Reference number or an earlier balance</summary>
              <label className={styles.field}>
                Receipt / transfer reference
                <input
                  value={reference}
                  maxLength={200}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <button
                type="button"
                className={styles.skip}
                onClick={() => {
                  setHandled(false);
                  setPurpose("OPENING");
                  setTiming("LATER");
                  setDocumentKey("");
                  setExistingEntryId("");
                }}
              >
                This is an old amount{" "}
                {direction === "IN" ? "they owe us" : "we owe them"}
              </button>
            </details>
          </section>
        )}
        {step === 4 && (
          <section className={styles.review}>
            <div className={styles.reviewGrid}>
              <div className={styles.reviewSummary}>
                <div className={styles.reviewTop}>
                  <span>
                    {timing === "PART"
                      ? "Full amount · part paid"
                      : direction === "IN"
                        ? "Money in"
                        : "Money out"}
                    {noMovement ? " · no new payment" : ""}
                  </span>
                  <strong>{money(Number(amount) || 0)}</strong>
                  <p>{person.name || "No name recorded"}</p>
                </div>
                <p className={styles.effect}>
                  {explanation}
                  {timing === "PART" &&
                    ` ${money(actualPaid)} paid now; ${money(Math.max(0, Number(amount) - actualPaid))} left.`}
                </p>
              </div>
              <dl className={styles.reviewRows}>
                <div>
                  <dt>Who</dt>
                  <dd>
                    {person.name || "No name recorded"}
                    {differentPayer && !noMovement && (
                      <p>Paid by {payer.name}</p>
                    )}
                    {handled && !noMovement && (
                      <p>
                        {direction === "IN" ? "Received" : "Paid"} by{" "}
                        {handler.name}
                      </p>
                    )}
                  </dd>
                  <button
                    type="button"
                    className={styles.editButton}
                    disabled={locked}
                    onClick={() => go(1)}
                  >
                    Change<span className="sr-only"> person</span>
                  </button>
                </div>
                <div>
                  <dt>When / how</dt>
                  <dd>
                    {shortDate(entryDate)} ·{" "}
                    {noMovement ? "No new payment" : methods[method]}
                    {dueDate && <p>Expected {shortDate(dueDate)}</p>}
                  </dd>
                  <button
                    type="button"
                    className={styles.editButton}
                    disabled={locked}
                    onClick={() => go(2)}
                  >
                    Change
                    <span className="sr-only"> amount, date or method</span>
                  </button>
                </div>
                <div>
                  <dt>What for</dt>
                  <dd>
                    {reasonLabel(purpose, direction)}
                    {document && (
                      <p>
                        {document.label} ·{" "}
                        {money(
                          Math.max(0, document.balance - Number(amount || 0)),
                        )}{" "}
                        left after this
                      </p>
                    )}
                    {note && <p>{note}</p>}
                    {car && (
                      <p>
                        Car:{" "}
                        {car.displayName ||
                          car.plateNumber ||
                          [car.make, car.model].join(" ")}
                      </p>
                    )}
                  </dd>
                  <button
                    type="button"
                    className={styles.editButton}
                    disabled={locked}
                    onClick={() => go(3)}
                  >
                    Change<span className="sr-only"> purpose</span>
                  </button>
                </div>
                <div>
                  <dt>Receipt</dt>
                  <dd>
                    {attachments.files.length
                      ? `${attachments.files.length} file(s) ready to save`
                      : savedResult
                        ? "Saved with record"
                        : "No photo added"}
                    {reference && <p>{reference}</p>}
                  </dd>
                  <button
                    type="button"
                    className={styles.editButton}
                    disabled={locked}
                    onClick={() => go(3)}
                  >
                    Change<span className="sr-only"> receipt</span>
                  </button>
                </div>
              </dl>
            </div>
            {savedResult && (
              <div className={styles.context}>
                <strong>The money record is saved.</strong>
                <p>
                  Only the remaining photos need saving. Retry will not record
                  the amount again.
                </p>
                <AttachmentPicker queue={attachments} disabled={working} />
                <button
                  type="button"
                  className={styles.skip}
                  onClick={() => done(savedResult)}
                >
                  Finish without the remaining photos
                </button>
              </div>
            )}
          </section>
        )}
        {step > 0 && (
          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.backButton}
              disabled={locked}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft size={19} />
              Back
            </button>
            <button
              type="submit"
              className={styles.primary}
              disabled={working || attachments.blocked}
              data-help={step === 4 ? "money-save" : undefined}
            >
              {step === 4 ? <Save size={19} /> : null}
              {working
                ? "Saving…"
                : savedResult
                  ? "Retry photos"
                  : step === 4
                    ? "Save record"
                    : step === 3
                      ? "Check record"
                      : "Continue"}
              {step < 4 && <ArrowRight size={20} />}
            </button>
          </footer>
        )}
      </form>
    </div>
  );
}
