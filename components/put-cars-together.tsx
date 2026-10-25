"use client";

import { useMemo, useRef, useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { Search, X } from "@/lib/icons";
import { useProduct } from "./product-context";
import type {
  CarMoveRecord,
  CustomerRecord,
  VehicleRecord,
} from "@/lib/product-types";
import { REFERENCE_STORAGE_KEY } from "@/lib/reference-data";
import { carCustomerAliases, usablePhone } from "@/lib/car-moves";
import { openHelp } from "@/lib/help-guide";
import formStyles from "./car-form.module.css";
import styles from "./put-cars-together.module.css";

type Choice = { customer: CustomerRecord; cars: VehicleRecord[] };

const carLabel = (car: VehicleRecord) =>
  car.plateNumber || car.displayName || "Car";
export const carWord = (count: number) =>
  `${count} ${count === 1 ? "car" : "cars"}`;
const digits = (value = "") => value.replace(/\D/g, "");

function preview(cars: VehicleRecord[]) {
  const labels = cars.slice(0, 3).map(carLabel).join(", ");
  return cars.length > 3 ? `${labels} +${cars.length - 3} more` : labels;
}

/** A real phone and fuller details suggest the better record; "000" does not count. */
function completeness({ customer }: Choice) {
  return (
    (usablePhone(customer.phone) ? 8 : 0) +
    (customer.email ? 2 : 0) +
    (customer.vatNumber ? 2 : 0) +
    (customer.address?.street || customer.address?.city ? 1 : 0)
  );
}

/**
 * Asks whether a saved change applied after its answer was lost. Returns the
 * change, null when it was certainly not saved, or undefined when unknown.
 */
export async function savedCarMove(id: string) {
  try {
    const saved = window.localStorage.getItem(REFERENCE_STORAGE_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved) as { carMoves?: CarMoveRecord[] };
    return data.carMoves?.find((move) => move.id === id) || null;
  } catch {
    return undefined;
  }
}

export function PutCarsTogether({
  initialIds = [],
  onClose,
  onDone,
}: {
  initialIds?: string[];
  onClose: () => void;
  onDone: (move: CarMoveRecord) => void;
}) {
  const { data, refresh, mutate } = useProduct();
  const [selected, setSelected] = useState<string[]>(initialIds);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const operationId = useRef(crypto.randomUUID());
  const busy = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);

  // Customers that currently hold cars, from the full car list. Names whose
  // cars were already put together elsewhere are left out.
  const choices = useMemo<Choice[]>(() => {
    if (!data) return [];
    const aliases = carCustomerAliases(data.carMoves);
    const cars = new Map<string, VehicleRecord[]>();
    for (const car of data.vehicles)
      if (car.customerId)
        cars.set(car.customerId, [...(cars.get(car.customerId) || []), car]);
    return data.customers
      .filter(
        (customer) =>
          cars.has(customer.id) ||
          (!aliases.has(customer.id) && customer.status !== "ARCHIVED"),
      )
      .map((customer) => ({ customer, cars: cars.get(customer.id) || [] }))
      .sort(
        (a, b) =>
          b.cars.length - a.cars.length ||
          a.customer.name.localeCompare(b.customer.name),
      );
  }, [data]);

  const chosen = selected
    .map((id) => choices.find((choice) => choice.customer.id === id))
    .filter((choice): choice is Choice => Boolean(choice));
  const term = query.trim().toLocaleLowerCase();
  const termDigits = digits(term);
  const others = choices.filter(
    (choice) =>
      !selected.includes(choice.customer.id) &&
      (term
        ? choice.customer.name.toLocaleLowerCase().includes(term) ||
          (termDigits.length >= 3 &&
            digits(choice.customer.phone).includes(termDigits))
        : choice.cars.length > 0),
  );
  const shown = others.slice(0, 40);
  const suggested = [...chosen].sort(
    (a, b) =>
      completeness(b) - completeness(a) ||
      b.cars.length - a.cars.length ||
      a.customer.createdAt.localeCompare(b.customer.createdAt),
  )[0];
  const destination =
    chosen.find((choice) => choice.customer.id === picked) || suggested;
  const total = chosen.reduce((sum, choice) => sum + choice.cars.length, 0);
  const moving = chosen
    .filter((choice) => choice !== destination)
    .reduce((sum, choice) => sum + choice.cars.length, 0);
  const ready = chosen.length >= 2 && Boolean(destination) && moving > 0;
  const instruction =
    chosen.length < 2
      ? "Choose at least 2 names."
      : moving === 0
        ? "The other names have no cars to move."
        : "";

  function changed() {
    // A different selection is a different change.
    operationId.current = crypto.randomUUID();
    setError("");
    setNotice("");
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    changed();
  }

  async function finish(move: CarMoveRecord) {
    await refresh();
    onDone(move);
  }

  async function save() {
    if (!ready || !destination || busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    const id = operationId.current;
    const uncertain = async () => {
      const saved = await savedCarMove(id);
      if (saved) return finish(saved);
      setError(
        saved === null
          ? "Nothing changed. Try again."
          : "Could not check whether it was saved. Check browser storage, then try again.",
      );
    };
    try {
      const move = await mutate<CarMoveRecord>("/api/car-moves", {
        method: "POST",
        body: JSON.stringify({
          operationId: id,
          customerIds: chosen.map((choice) => choice.customer.id),
          destinationCustomerId: destination.customer.id,
          expectedCarIds: chosen.flatMap((choice) =>
            choice.cars.map((car) => car.id),
          ),
        }),
      });
      await finish(move);
    } catch {
      await uncertain();
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  const row = (choice: Choice) => {
    const id = choice.customer.id;
    const checked = selected.includes(id);
    return (
      <label
        key={id}
        className={styles.choice}
        data-checked={checked || undefined}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={working}
          onChange={() => toggle(id)}
        />
        <span className={styles.choiceText}>
          <strong>{choice.customer.name}</strong>
          <small>
            {[choice.customer.phone, carWord(choice.cars.length)]
              .filter(Boolean)
              .join(" · ")}
          </small>
          {choice.cars.length > 0 && (
            <small className={styles.plates}>{preview(choice.cars)}</small>
          )}
        </span>
      </label>
    );
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !working) onClose();
      }}
    >
      <Dialog.Content
        maxWidth="560px"
        className={formStyles.dialog}
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "calc(100dvh - 32px)",
        }}
      >
        <div className={formStyles.form}>
          <div className={`${formStyles.head} ${styles.head}`}>
            <div>
              <Dialog.Title className={formStyles.title}>
                Put cars together
              </Dialog.Title>
              <Dialog.Description className={formStyles.lead}>
                Choose the names for the same customer.
              </Dialog.Description>
            </div>
            <button
              type="button"
              className={styles.helpLink}
              disabled={working}
              onClick={() => {
                onClose();
                openHelp("cars", "cars-together");
              }}
            >
              How to use this
            </button>
          </div>
          <div className={`${formStyles.body} ${styles.body}`}>
            {notice && (
              <p className="inline-alert" role="status">
                {notice}
              </p>
            )}
            <label className="search-field">
              <span className="sr-only">Find a name or phone</span>
              <Search size={22} aria-hidden="true" />
              <input
                ref={searchInput}
                className="search-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a name or phone"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    searchInput.current?.focus();
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </label>
            <div className={styles.choices} role="group" aria-label="Names">
              {chosen.length > 0 && (
                <p className={styles.groupLabel}>
                  Chosen: {chosen.length}
                </p>
              )}
              {chosen.map(row)}
              {chosen.length > 0 && shown.length > 0 && (
                <p className={styles.groupLabel}>
                  {term ? "Matching names" : "Other names"}
                </p>
              )}
              {shown.map(row)}
              {!shown.length && term && (
                <p className={styles.quiet}>No other name matches.</p>
              )}
              {others.length > shown.length && (
                <p className={styles.quiet}>Search to see more names.</p>
              )}
            </div>
            {chosen.length >= 2 && (
              <fieldset className={styles.destination}>
                <legend>Use this name</legend>
                {chosen.map((choice) => (
                  <label
                    key={choice.customer.id}
                    className={styles.choice}
                    data-checked={destination === choice || undefined}
                  >
                    <input
                      type="radio"
                      name="put-together-destination"
                      checked={destination === choice}
                      disabled={working}
                      onChange={() => {
                        setPicked(choice.customer.id);
                        changed();
                      }}
                    />
                    <span className={styles.choiceText}>
                      <strong>{choice.customer.name}</strong>
                      <small>
                        {[choice.customer.phone, carWord(choice.cars.length)]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {ready && destination && (
              <div className={styles.summary} role="status">
                <strong>
                  {carWord(total)} will show under {destination.customer.name}.
                </strong>
                <p>Bills and payments will stay as they are.</p>
              </div>
            )}
          </div>
          <div className={formStyles.footer}>
            {error && (
              <p className="inline-alert error" role="alert">
                {error}
              </p>
            )}
            {instruction && <p className={styles.instruction}>{instruction}</p>}
            <div className={formStyles.buttons}>
              <button
                type="button"
                className={`button secondary ${formStyles.cancel}`}
                disabled={working}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`button primary ${formStyles.submit}`}
                disabled={!ready || working}
                onClick={() => void save()}
              >
                {working
                  ? "Saving…"
                  : chosen.length >= 2
                    ? `Put ${carWord(total)} together`
                    : "Put cars together"}
              </button>
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
