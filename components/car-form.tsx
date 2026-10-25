"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Dialog } from "@radix-ui/themes";
import { ChevronDown } from "@/lib/icons";
import { useProduct } from "./product-context";
import type { VehicleRecord } from "@/lib/product-types";
import {
  PersonPicker,
  carCustomerPayload,
  carRepresentativePayload,
  noPick,
  pickKey,
  type PersonPick,
  useCustomerPick,
} from "./car-customer-field";
import styles from "./car-form.module.css";

/** Session key holding the Cars list view a car page should lead back to. */
export const CARS_RETURN_KEY = "cars:return";

// Matches the server's duplicate check: case and repeated spaces are ignored.
const samePlate = (value = "") =>
  value.trim().toUpperCase().replace(/\s+/g, " ");
const compactPlate = (value = "") =>
  value.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
const yearPattern = /^(19|20)\d{2}$/;
const numberPattern = /[\p{L}\p{N}]/u;

type Details = {
  make: string;
  model: string;
  year: string;
  color: string;
  vin: string;
  notes: string;
};
const detailKeys = ["make", "model", "year", "color", "vin", "notes"] as const;

/**
 * Add or edit one car. Only the car number is needed. Mount it fresh for each
 * use so nothing carries over from a previous car.
 */
export function CarForm({
  car,
  initialCustomerId,
  initialPlate = "",
  focus = "number",
  onClose,
  onSaved,
}: {
  /** Present when editing a saved car. */
  car?: VehicleRecord;
  initialCustomerId?: string;
  initialPlate?: string;
  focus?: "number" | "customer";
  onClose: () => void;
  onSaved: (car: VehicleRecord) => void;
}) {
  const id = useId();
  const { data, mutate, refresh } = useProduct();
  const customerPick = useCustomerPick();
  const [initialCustomer] = useState(() =>
    customerPick(car ? car.customerId : initialCustomerId),
  );
  const initialDetails: Details = {
    make: car?.make || "",
    model: car?.model || "",
    year: car?.year || "",
    color: car?.color || "",
    vin: car?.vin || "",
    notes: car?.notes || "",
  };
  const initialRepresentative: PersonPick = car?.representativePersonId
    ? {
        kind: "saved",
        id: car.representativePersonId,
        name: car.representativeName || "",
      }
    : noPick;
  const [plateNumber, setPlateNumber] = useState(
    car ? car.plateNumber : initialPlate,
  );
  const [customer, setCustomer] = useState<PersonPick>(initialCustomer);
  const [details, setDetails] = useState<Details>(initialDetails);
  const [representative, setRepresentative] = useState<PersonPick>(
    initialRepresentative,
  );
  const [moreOpen, setMoreOpen] = useState(
    Boolean(car && detailKeys.some((key) => initialDetails[key])),
  );
  const [broughtOpen, setBroughtOpen] = useState(
    Boolean(car?.representativeName),
  );
  const [needsCustomerChoice, setNeedsCustomerChoice] = useState(false);
  const [needsPersonChoice, setNeedsPersonChoice] = useState(false);
  const [checked, setChecked] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const plateInput = useRef<HTMLInputElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);
  const vinInput = useRef<HTMLInputElement>(null);

  const others = (data?.vehicles || []).filter((item) => item.id !== car?.id);
  const plate = samePlate(plateNumber);
  const plateTwin = plate
    ? others.find((item) => samePlate(item.plateNumber) === plate)
    : undefined;
  const plateLookalike =
    !plateTwin && compactPlate(plateNumber).length >= 3
      ? others.find(
          (item) =>
            item.plateNumber &&
            compactPlate(item.plateNumber) === compactPlate(plateNumber),
        )
      : undefined;
  const vin = details.vin.trim().toUpperCase();
  const vinTwin = vin
    ? others.find((item) => item.vin?.trim().toUpperCase() === vin)
    : undefined;
  // The number is needed for a new car and cannot be removed once saved. Older
  // cars saved without one can still be edited. Older values are not rechecked.
  const plateError =
    !plate && (!car || car.plateNumber)
      ? "Enter the car number"
      : plate &&
          plate !== samePlate(car?.plateNumber) &&
          !numberPattern.test(plate)
        ? "Use letters or numbers"
        : "";
  const year = details.year.trim();
  const yearError =
    year && year !== initialDetails.year.trim() && !yearPattern.test(year)
      ? "Use 4 digits, like 2019"
      : "";
  const customerChanged = pickKey(customer) !== pickKey(initialCustomer);

  function setDetail(key: keyof Details, value: string) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function payload() {
    const representativeChanged =
      pickKey(representative) !== pickKey(initialRepresentative);
    const changed = <T,>(include: boolean, value: T) =>
      !car || include ? value : undefined;
    // Editing sends only what changed, so an empty value always means "clear it".
    return {
      plateNumber: changed(
        plateNumber.trim() !== (car?.plateNumber || ""),
        plateNumber.trim(),
      ),
      ...(changed(customerChanged, carCustomerPayload(customer)) || {}),
      ...(changed(
        representativeChanged,
        carRepresentativePayload(representative),
      ) || {}),
      ...Object.fromEntries(
        detailKeys.map((key) => [
          key,
          changed(
            details[key].trim() !== initialDetails[key].trim(),
            details[key].trim(),
          ),
        ]),
      ),
    };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    setChecked(true);
    setError("");
    if (plateError || plateTwin) {
      plateInput.current?.focus();
      return;
    }
    if (yearError || vinTwin) {
      setMoreOpen(true);
      requestAnimationFrame(() =>
        (yearError ? yearInput : vinInput).current?.focus(),
      );
      return;
    }
    const customerUnsure = customer.kind === "search" && !!customer.text.trim();
    const personUnsure =
      representative.kind === "search" && !!representative.text.trim();
    if (customerUnsure || personUnsure) {
      setNeedsCustomerChoice(customerUnsure);
      setNeedsPersonChoice(personUnsure);
      if (personUnsure) setBroughtOpen(true);
      return;
    }
    saving.current = true;
    setWorking(true);
    try {
      const saved = await mutate<VehicleRecord>(
        car ? `/api/vehicles/${car.id}` : "/api/vehicles",
        {
          method: car ? "PATCH" : "POST",
          body: JSON.stringify(payload()),
        },
      );
      onSaved(saved);
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message !== "Request failed"
          ? reason.message
          : "Could not save. Your details are still here. Try again.",
      );
      // A car saved elsewhere meanwhile shows up as an "already saved" link.
      void refresh();
    } finally {
      saving.current = false;
      setWorking(false);
    }
  }

  const twinLink = (twin: VehicleRecord, text: string) => (
    <p className={styles.twin} role="status">
      {text}{" "}
      <Link href={`/cars/${twin.id}`} onClick={onClose}>
        Open {twin.plateNumber || twin.displayName}
      </Link>
    </p>
  );

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !working) onClose();
      }}
    >
      <Dialog.Content
        maxWidth="520px"
        className={styles.dialog}
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "calc(100dvh - 32px)",
        }}
      >
        <form className={styles.form} onSubmit={save} noValidate>
          <div className={styles.head}>
            <Dialog.Title className={styles.title}>
              {car ? "Edit car" : "Add car"}
            </Dialog.Title>
            <Dialog.Description className={styles.lead}>
              {car
                ? "Change or clear any detail."
                : "Only the car number is needed. Add the rest later."}
            </Dialog.Description>
          </div>
          <div className={styles.body}>
            <fieldset className={styles.fields} disabled={working}>
              <div className={styles.field}>
                <label htmlFor={id + "-plate"} className={styles.label}>
                  Car number
                </label>
                <input
                  ref={plateInput}
                  id={id + "-plate"}
                  className={styles.plate}
                  autoFocus={focus === "number"}
                  required={!car || Boolean(car.plateNumber)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={40}
                  value={plateNumber}
                  aria-invalid={Boolean(checked && (plateError || plateTwin))}
                  onChange={(event) => setPlateNumber(event.target.value)}
                  placeholder="e.g. ABC 1234"
                />
                {plateError && checked && (
                  <p className={styles.fieldError}>{plateError}</p>
                )}
                {plateTwin && twinLink(plateTwin, "This car is already saved.")}
                {plateLookalike &&
                  twinLink(plateLookalike, "A similar number is saved.")}
              </div>
              <PersonPicker
                kind="customer"
                label="Customer"
                value={customer}
                onChange={(value) => {
                  setCustomer(value);
                  setNeedsCustomerChoice(false);
                }}
                disabled={working}
                autoFocus={focus === "customer"}
                needsChoice={needsCustomerChoice}
              />
              {car?.customerId && customerChanged && (
                <p className={styles.note}>
                  Old bills and payments stay with {car.customerName}.
                </p>
              )}
              <details
                className={styles.section}
                open={moreOpen}
                onToggle={(event) => setMoreOpen(event.currentTarget.open)}
              >
                <summary>
                  <ChevronDown size={18} aria-hidden="true" />
                  More car details
                </summary>
                <div className={styles.sectionBody}>
                  <div className={styles.pair}>
                    <label>
                      Brand
                      <input
                        maxLength={80}
                        value={details.make}
                        onChange={(event) =>
                          setDetail("make", event.target.value)
                        }
                        placeholder="e.g. Toyota"
                      />
                    </label>
                    <label>
                      Model
                      <input
                        maxLength={80}
                        value={details.model}
                        onChange={(event) =>
                          setDetail("model", event.target.value)
                        }
                        placeholder="e.g. Camry"
                      />
                    </label>
                  </div>
                  <div className={styles.pair}>
                    <label>
                      Year
                      <input
                        ref={yearInput}
                        inputMode="numeric"
                        maxLength={12}
                        value={details.year}
                        aria-invalid={Boolean(checked && yearError)}
                        onChange={(event) =>
                          setDetail("year", event.target.value)
                        }
                        placeholder="e.g. 2019"
                      />
                      {yearError && checked && (
                        <span className={styles.fieldError}>{yearError}</span>
                      )}
                    </label>
                    <label>
                      Colour
                      <input
                        maxLength={40}
                        value={details.color}
                        onChange={(event) =>
                          setDetail("color", event.target.value)
                        }
                        placeholder="e.g. White"
                      />
                    </label>
                  </div>
                  <label>
                    Chassis number
                    <input
                      ref={vinInput}
                      maxLength={80}
                      autoCapitalize="characters"
                      spellCheck={false}
                      value={details.vin}
                      aria-invalid={Boolean(checked && vinTwin)}
                      onChange={(event) =>
                        setDetail("vin", event.target.value)
                      }
                    />
                  </label>
                  {vinTwin &&
                    twinLink(vinTwin, "This chassis number is already saved.")}
                  <label>
                    Notes
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={details.notes}
                      onChange={(event) =>
                        setDetail("notes", event.target.value)
                      }
                    />
                  </label>
                </div>
              </details>
              <details
                className={styles.section}
                open={broughtOpen}
                onToggle={(event) => setBroughtOpen(event.currentTarget.open)}
              >
                <summary>
                  <ChevronDown size={18} aria-hidden="true" />
                  Someone else brought it
                </summary>
                <div className={styles.sectionBody}>
                  <PersonPicker
                    kind="person"
                    label="Who brought it"
                    value={representative}
                    onChange={(value) => {
                      setRepresentative(value);
                      setNeedsPersonChoice(false);
                    }}
                    disabled={working}
                    needsChoice={needsPersonChoice}
                  />
                </div>
              </details>
            </fieldset>
          </div>
          <div className={styles.footer}>
            {error && (
              <p className="inline-alert error" role="alert">
                {error}
              </p>
            )}
            <div className={styles.buttons}>
              <button
                type="button"
                className={`button secondary ${styles.cancel}`}
                disabled={working}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`button primary ${styles.submit}`}
                disabled={working}
              >
                {working ? "Saving…" : car ? "Save changes" : "Add car"}
              </button>
            </div>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
