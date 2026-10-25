"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "@/lib/icons";
import { useProduct } from "./product-context";
import { carCustomerAliases, resolveCarCustomer } from "@/lib/car-moves";
import styles from "./car-form.module.css";

/**
 * A linked person or customer. A typed name is only a search until the user
 * picks a saved record or explicitly chooses to add it as a new one.
 */
export type PersonPick =
  | { kind: "search"; text: string }
  | { kind: "saved"; id: string; name: string }
  | { kind: "new"; name: string; phone: string };

export const noPick: PersonPick = { kind: "search", text: "" };

type PickKind = "customer" | "person";
type PickOption = {
  id: string;
  name: string;
  phone?: string;
  detail: string;
  /** For a name whose cars were put together: the customer to pick instead. */
  redirect?: { id: string; name: string };
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "Customer",
  SUPPLIER: "Supplier",
  WORKER: "Worker",
  OTHER: "Contact",
};

/**
 * Customers: saved people (they may also be suppliers), then customers without
 * a person record. People: everyone saved, for "someone else brought it".
 */
function usePickOptions(kind: PickKind): PickOption[] {
  const { data } = useProduct();
  return useMemo(() => {
    if (!data) return [];
    const carCounts = new Map<string, number>();
    for (const car of data.vehicles)
      if (car.customerId)
        carCounts.set(car.customerId, (carCounts.get(car.customerId) || 0) + 1);
    const customerNames = new Map(
      data.customers.map((customer) => [customer.id, customer.name]),
    );
    const describe = (
      phone?: string,
      customerId?: string,
      roles: string[] = [],
    ) => {
      const cars =
        kind === "customer" && customerId ? carCounts.get(customerId) || 0 : 0;
      const role =
        kind === "customer" && customerId
          ? ""
          : roles.map((value) => roleLabels[value]).find(Boolean) || "";
      return [phone, cars ? `${cars} ${cars === 1 ? "car" : "cars"}` : role]
        .filter(Boolean)
        .join(" · ");
    };
    const aliases = carCustomerAliases(data.carMoves);
    const redirectFor = (customerId?: string) => {
      if (kind !== "customer" || !customerId || !aliases.has(customerId))
        return undefined;
      const target = resolveCarCustomer(customerId, aliases);
      const name = customerNames.get(target);
      if (!name) return undefined;
      const person = data.ledger.people.find(
        (item) => item.customerId === target,
      );
      return { id: person?.id || `customer:${target}`, name };
    };
    const withRedirect = <T extends { detail: string }>(
      option: T,
      customerId?: string,
    ) => {
      const redirect = redirectFor(customerId);
      return redirect
        ? { ...option, detail: `Cars are under ${redirect.name}`, redirect }
        : option;
    };
    const people = data.ledger.people.map((person) =>
      withRedirect(
        {
          id: person.id,
          name:
            (person.customerId && customerNames.get(person.customerId)) ||
            person.name,
          phone: person.phone,
          detail: describe(person.phone, person.customerId, person.roles),
          cars: person.customerId ? carCounts.get(person.customerId) || 0 : 0,
        },
        person.customerId,
      ),
    );
    const linked = new Set(
      data.ledger.people.map((person) => person.customerId).filter(Boolean),
    );
    const customersOnly =
      kind === "customer"
        ? data.customers
            .filter(
              (customer) =>
                !linked.has(customer.id) && customer.status !== "ARCHIVED",
            )
            .map((customer) =>
              withRedirect(
                {
                  id: `customer:${customer.id}`,
                  name: customer.name,
                  phone: customer.phone,
                  detail: describe(customer.phone, customer.id),
                  cars: carCounts.get(customer.id) || 0,
                },
                customer.id,
              ),
            )
        : [];
    return [...people, ...customersOnly]
      .sort((a, b) => b.cars - a.cars || a.name.localeCompare(b.name))
      .map(({ cars: _cars, ...option }) => option);
  }, [data, kind]);
}

/** The picker entry for a car's saved customer. */
export function useCustomerPick() {
  const { data } = useProduct();
  return (customerId?: string): PersonPick => {
    if (!customerId || !data) return noPick;
    const customer = data.customers.find((item) => item.id === customerId);
    const person = data.ledger.people.find(
      (item) => item.customerId === customerId,
    );
    const name = customer?.name || person?.name;
    if (!name) return noPick;
    return { kind: "saved", id: person?.id || `customer:${customerId}`, name };
  };
}

export function pickKey(pick: PersonPick) {
  if (pick.kind === "saved") return `saved:${pick.id}`;
  if (pick.kind === "new") return `new:${pick.name.trim()}:${pick.phone.trim()}`;
  return "none";
}

export function carCustomerPayload(pick: PersonPick) {
  if (pick.kind === "saved")
    return pick.id.startsWith("customer:")
      ? { personId: "", customerId: pick.id.slice("customer:".length) }
      : { personId: pick.id, customerId: "" };
  return {
    personId: "",
    customerId: "",
    customerName: pick.kind === "new" ? pick.name.trim() : "",
    customerPhone: pick.kind === "new" ? pick.phone.trim() : "",
  };
}

export function carRepresentativePayload(pick: PersonPick) {
  if (pick.kind === "saved") return { representativePersonId: pick.id };
  return {
    representativePersonId: "",
    representativeName: pick.kind === "new" ? pick.name.trim() : "",
    representativePhone: pick.kind === "new" ? pick.phone.trim() : "",
  };
}

const digits = (value = "") => value.replace(/\D/g, "");

export function PersonPicker({
  kind,
  label,
  value,
  onChange,
  disabled,
  autoFocus,
  needsChoice,
}: {
  kind: PickKind;
  label: string;
  value: PersonPick;
  onChange: (value: PersonPick) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Set when the form was submitted with a typed name that is not chosen yet. */
  needsChoice?: boolean;
}) {
  const id = useId();
  const options = usePickOptions(kind);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focusInput, setFocusInput] = useState(false);
  const noun = kind === "customer" ? "customer" : "person";
  const text = value.kind === "search" ? value.text : "";
  const term = text.trim().toLocaleLowerCase();
  const termDigits = digits(term);
  const matches = options
    .filter(
      (option) =>
        !term ||
        option.name.toLocaleLowerCase().includes(term) ||
        (termDigits.length >= 3 && digits(option.phone).includes(termDigits)),
    )
    .slice(0, 6);
  const rows = term ? matches.length + 1 : matches.length;

  useEffect(() => {
    if (focusInput && value.kind === "search") {
      input.current?.focus();
      setFocusInput(false);
    }
  }, [focusInput, value.kind]);

  function choose(index: number) {
    const option = matches[index];
    if (option)
      onChange({
        kind: "saved",
        ...(option.redirect || { id: option.id, name: option.name }),
      });
    else if (term) onChange({ kind: "new", name: text.trim(), phone: "" });
    setOpen(false);
    setActive(-1);
  }

  function restart() {
    onChange(noPick);
    setFocusInput(true);
  }

  if (value.kind !== "search") {
    const option =
      value.kind === "saved"
        ? options.find((item) => item.id === value.id)
        : undefined;
    return (
      <div className={styles.field} role="group" aria-labelledby={id + "-label"}>
        <span id={id + "-label"} className={styles.label}>
          {label}
        </span>
        <div className={styles.chosen}>
          <Check size={20} aria-hidden="true" className={styles.chosenMark} />
          <div className={styles.chosenText}>
            <strong>{value.name}</strong>
            <small>
              {value.kind === "new"
                ? `New ${noun}`
                : option?.detail || `Saved ${noun}`}
            </small>
          </div>
          <button
            type="button"
            className={styles.linkButton}
            disabled={disabled}
            onClick={restart}
          >
            Change
          </button>
          <button
            type="button"
            className={styles.iconButton}
            disabled={disabled}
            aria-label={`Remove ${noun}`}
            title={`Remove ${noun}`}
            onClick={restart}
          >
            <X size={18} />
          </button>
        </div>
        {value.kind === "new" && (
          <label className={styles.subField}>
            Phone
            <input
              type="tel"
              inputMode="tel"
              maxLength={40}
              value={value.phone}
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...value, phone: event.target.value })
              }
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div
      className={styles.field}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div
        className="search-field"
        data-invalid={needsChoice ? "true" : undefined}
        onClick={() => input.current?.focus()}
      >
        <Search size={22} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          className="search-input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && rows > 0}
          aria-controls={id + "-list"}
          aria-activedescendant={
            open && active >= 0 ? `${id}-row-${active}` : undefined
          }
          aria-invalid={needsChoice || undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={180}
          value={text}
          disabled={disabled}
          placeholder={
            kind === "customer" ? "Name, company or phone" : "Name or phone"
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange({ kind: "search", text: event.target.value });
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown" && rows) {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, rows - 1));
            }
            if (event.key === "ArrowUp" && rows) {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && open && active >= 0) {
              event.preventDefault();
              choose(active);
            }
          }}
        />
        {text && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onChange(noPick);
              input.current?.focus();
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
      {open && rows > 0 && (
        <div
          id={id + "-list"}
          role="listbox"
          aria-label={label}
          className={styles.options}
        >
          {matches.map((option, index) => (
            <button
              key={option.id}
              id={`${id}-row-${index}`}
              role="option"
              aria-selected={active === index}
              type="button"
              tabIndex={-1}
              className={active === index ? styles.active : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <strong>{option.name}</strong>
              {option.detail && <small>{option.detail}</small>}
            </button>
          ))}
          {term && (
            <button
              id={`${id}-row-${matches.length}`}
              role="option"
              aria-selected={active === matches.length}
              type="button"
              tabIndex={-1}
              className={`${styles.addOption} ${active === matches.length ? styles.active : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(matches.length)}
            >
              <Plus size={18} aria-hidden="true" />
              <span>
                Add new {noun} “<strong>{text.trim()}</strong>”
              </span>
            </button>
          )}
        </div>
      )}
      {needsChoice && term && (
        <div className={styles.resolve} role="alert">
          <p>“{text.trim()}” is not saved yet.</p>
          <div>
            <button
              type="button"
              className="button primary"
              onClick={() =>
                onChange({ kind: "new", name: text.trim(), phone: "" })
              }
            >
              Add new {noun}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => onChange(noPick)}
            >
              Leave empty
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
