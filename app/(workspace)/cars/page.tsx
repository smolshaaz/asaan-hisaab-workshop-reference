"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Car,
  ChevronRight,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "@/lib/icons";
import { PageHeader } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import type { VehicleRecord } from "@/lib/product-types";
import { CarForm, CARS_RETURN_KEY } from "@/components/car-form";
import { CustomerQuickEdit } from "@/components/customer-quick-create";
import { PutCarsTogether } from "@/components/put-cars-together";
import { CarMoveHistory } from "@/components/car-move-history";
import {
  carCustomerAliases,
  resolveCarCustomer,
  sameCustomerSuggestions,
} from "@/lib/car-moves";
import styles from "@/components/cars.module.css";

/** URL value for the group of cars that have no customer yet. */
const NO_CUSTOMER = "none";
const NOT_SAME_KEY = "cars:not-same";

type CustomerGroup = {
  key: string;
  customerId?: string;
  name: string;
  phone?: string;
  /** Shown instead of the phone, e.g. for an old name. */
  note?: string;
  cars: VehicleRecord[];
};

const compact = (value = "") =>
  value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const digits = (value = "") => value.replace(/\D/g, "");
const carCount = (count: number) => `${count} ${count === 1 ? "car" : "cars"}`;

export default function CarsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, loading, error, refresh } = useProduct();
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<{
    key: number;
    customerId?: string;
    plate?: string;
  } | null>(null);
  const [together, setTogether] = useState<{
    key: number;
    ids: string[];
  } | null>(null);
  const [notSame, setNotSame] = useState<string[]>([]);
  const view = params.get("view") === "all" ? "all" : "customers";
  const selected = view === "customers" ? params.get("customer") : null;
  const plateParam = params.get("plate");

  useEffect(() => {
    if (plateParam) setForm({ key: Date.now(), plate: plateParam });
  }, [plateParam]);

  useEffect(() => {
    try {
      setNotSame(JSON.parse(localStorage.getItem(NOT_SAME_KEY) || "[]"));
    } catch {}
  }, []);

  // Lets a car page lead back to the list the manager was looking at.
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("plate");
    const search = next.toString();
    try {
      sessionStorage.setItem(
        CARS_RETURN_KEY,
        search ? `/cars?${search}` : "/cars",
      );
    } catch {}
  }, [params]);

  // Grouped by the car's own customer record, never by name. Cars are already
  // ordered by latest change, so groups follow recent activity.
  const groups = useMemo(() => {
    const map = new Map<string, CustomerGroup>();
    for (const car of data?.vehicles || []) {
      const key = car.customerId || NO_CUSTOMER;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          customerId: car.customerId,
          name: car.customerId
            ? car.customerName || "Unnamed customer"
            : "No customer yet",
          phone: car.customerPhone,
          cars: [],
        };
        map.set(key, group);
      }
      group.cars.push(car);
    }
    const list = [...map.values()];
    return [
      ...list.filter((group) => !group.customerId),
      ...list.filter((group) => group.customerId),
    ];
  }, [data]);

  // Names whose cars were put together under another customer.
  const aliases = useMemo(
    () => carCustomerAliases(data?.carMoves || []),
    [data],
  );
  const oldNames = useMemo(() => {
    const names = new Map<string, { id: string; name: string }[]>();
    for (const id of aliases.keys()) {
      const target = resolveCarCustomer(id, aliases);
      const name = data?.customers.find((customer) => customer.id === id)?.name;
      if (name) names.set(target, [...(names.get(target) || []), { id, name }]);
    }
    return names;
  }, [aliases, data]);

  function closeForm() {
    setForm(null);
    if (plateParam) {
      const next = new URLSearchParams(params.toString());
      next.delete("plate");
      const search = next.toString();
      router.replace(search ? `/cars?${search}` : "/cars");
    }
  }

  if (loading)
    return (
      <div className="page">
        <div className="skeleton large-skeleton" />
      </div>
    );
  if (error || !data)
    return (
      <div className="page">
        <div className="state-page error-state">
          <TriangleAlert size={28} />
          <h1>Cars could not load</h1>
          <p>{error}</p>
          <button className="button primary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      </div>
    );

  const selectedGroup = selected
    ? groups.find((group) => group.key === selected)
    : undefined;
  const selectedCustomer =
    selected && selected !== NO_CUSTOMER
      ? data.customers.find((customer) => customer.id === selected)
      : undefined;
  const selectedPerson = selectedCustomer
    ? data.ledger.people.find(
        (person) => person.customerId === selectedCustomer.id,
      )
    : undefined;
  const movedTo =
    selected && aliases.has(selected)
      ? data.customers.find(
          (customer) => customer.id === resolveCarCustomer(selected, aliases),
        )
      : undefined;
  const term = query.trim().toLocaleLowerCase();
  const openTogether = (ids: string[]) => setTogether({ key: Date.now(), ids });
  const suggestions =
    view === "customers" && !selected && !term
      ? sameCustomerSuggestions(
          groups.flatMap((group) =>
            group.customerId ? [{ id: group.customerId, name: group.name }] : [],
          ),
        )
          .filter((set) => !notSame.includes([...set].sort().join()))
          .sort((a, b) => b.length - a.length)
          .slice(0, 3)
      : [];
  function markNotSame(set: string[]) {
    const next = [...notSame, [...set].sort().join()];
    setNotSame(next);
    try {
      localStorage.setItem(NOT_SAME_KEY, JSON.stringify(next));
    } catch {}
  }
  // Only a customer's own car list preselects that customer.
  const openForm = () =>
    setForm({
      key: Date.now(),
      customerId:
        !term && selected && selected !== NO_CUSTOMER ? selected : undefined,
    });
  const compactTerm = compact(term);
  const termDigits = digits(term);
  const carMatches = term
    ? data.vehicles.filter(
        (car) =>
          [
            car.displayName,
            car.plateNumber,
            car.vin,
            car.customerName,
            ...(oldNames.get(car.customerId || "") || []).map(
              (old) => old.name,
            ),
            car.customerPhone,
            car.representativeName,
            car.representativePhone,
            car.make,
            car.model,
            car.color,
            car.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase()
            .includes(term) ||
          (compactTerm.length >= 2 &&
            [car.plateNumber, car.displayName, car.vin].some((value) =>
              compact(value).includes(compactTerm),
            )),
      )
    : [];
  const nameMatches = (name: string, phone?: string) =>
    name.toLocaleLowerCase().includes(term) ||
    (termDigits.length >= 3 && digits(phone).includes(termDigits));
  // An old name finds the customer now holding its cars, with a short note.
  const oldNameMatches: CustomerGroup[] = term
    ? [...aliases.keys()].flatMap((id) => {
        const old = data.customers.find((customer) => customer.id === id);
        const targetId = resolveCarCustomer(id, aliases);
        const target = data.customers.find(
          (customer) => customer.id === targetId,
        );
        if (!old || !target || !nameMatches(old.name, old.phone)) return [];
        return [
          {
            key: `old:${id}`,
            customerId: targetId,
            name: old.name,
            note: `Cars are under ${target.name}`,
            cars: groups.find((group) => group.key === targetId)?.cars || [],
          },
        ];
      })
    : [];
  const customerMatches = term
    ? [
        ...groups.filter(
          (group) =>
            group.customerId && nameMatches(group.name, group.phone),
        ),
        ...oldNameMatches,
      ]
    : [];

  return (
    <div className="page">
      <PageHeader
        title="Cars"
        description="Find a car. See its work, bills and payments."
        secondary={
          <button
            data-help="cars-add"
            className="button primary"
            onClick={openForm}
          >
            <Plus size={18} /> Add car
          </button>
        }
      />
      <div className={styles.browseBar}>
        <label className={`search-field ${styles.browseSearch}`}>
          <span className="sr-only">
            Search car number, chassis, customer or phone
          </span>
          <Search size={22} aria-hidden="true" />
          <input
            ref={searchInput}
            data-help="cars-search"
            className="search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Car number, customer or phone"
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
        <nav className={styles.viewSwitch} aria-label="Show cars">
          <Link
            href="/cars"
            aria-current={view === "customers" ? "page" : undefined}
          >
            By customer
          </Link>
          <Link
            href="/cars?view=all"
            aria-current={view === "all" ? "page" : undefined}
          >
            All cars
          </Link>
        </nav>
        <button
          type="button"
          data-help="cars-together"
          className={`button secondary ${styles.togetherButton}`}
          onClick={() =>
            openTogether(
              selected && selected !== NO_CUSTOMER && !term && !movedTo
                ? [selected]
                : [],
            )
          }
        >
          Put cars together
        </button>
      </div>

      <div data-help="cars-list">
        {term ? (
          carMatches.length || customerMatches.length ? (
            <>
              {customerMatches.length > 0 && (
                <section className={styles.resultSection}>
                  <h2>Customers</h2>
                  <CustomerList groups={customerMatches} />
                </section>
              )}
              {carMatches.length > 0 && (
                <section className={styles.resultSection}>
                  <h2>Cars</h2>
                  <CarGrid cars={carMatches} showCustomer />
                </section>
              )}
            </>
          ) : (
            <div className="quiet-empty">
              <Search size={30} />
              <h2>No matching car</h2>
              <p>Try the car number, customer name or phone.</p>
              <div className={styles.emptyActions}>
                <button
                  className="button secondary"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
                {/\d/.test(term) && (
                  <button
                    className="button primary"
                    onClick={() =>
                      setForm({ key: Date.now(), plate: query.trim() })
                    }
                  >
                    <Plus size={18} /> Add car {query.trim().toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          )
        ) : !data.vehicles.length ? (
          <div className="quiet-empty">
            <Car size={30} />
            <h2>Add your first car</h2>
            <p>Start with the car number. Add the rest later.</p>
            <button className="button primary" onClick={openForm}>
              <Plus size={18} /> Add car
            </button>
          </div>
        ) : view === "all" ? (
          <CarGrid cars={data.vehicles} showCustomer />
        ) : selected ? (
          <>
            <Link href="/cars" className="back-link">
              <ArrowLeft size={18} /> All customers
            </Link>
            {selectedGroup || selectedCustomer || selected === NO_CUSTOMER ? (
              <>
                {movedTo && (
                  <p className={styles.movedNote}>
                    Cars are under{" "}
                    <Link href={`/cars?customer=${movedTo.id}`}>
                      {movedTo.name}
                    </Link>
                    .
                  </p>
                )}
                <div className={styles.groupHead}>
                  <div>
                    <h2>
                      {selectedCustomer?.name ||
                        selectedGroup?.name ||
                        "No customer yet"}
                    </h2>
                    <p>
                      {[
                        selectedCustomer?.phone || selectedGroup?.phone,
                        carCount(selectedGroup?.cars.length || 0),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {selectedCustomer && (
                    <div className={styles.actions}>
                      <CustomerQuickEdit customer={selectedCustomer} />
                      {selectedPerson && (
                        <Link
                          className="button secondary"
                          href={`/people/${selectedPerson.id}`}
                        >
                          Customer page
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <CarMoveHistory
                    customerId={selectedCustomer.id}
                    customerName={selectedCustomer.name}
                    carTotal={selectedGroup?.cars.length || 0}
                    justMovedId={params.get("together")}
                  />
                )}
                {selectedGroup ? (
                  <CarGrid cars={selectedGroup.cars} />
                ) : (
                  <div className="quiet-empty">
                    <Car size={30} />
                    <h2>No cars here now</h2>
                    <button className="button primary" onClick={openForm}>
                      <Plus size={18} /> Add car
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="quiet-empty">
                <h2>Customer not found</h2>
              </div>
            )}
          </>
        ) : (
          <>
            {suggestions.map((set) => (
              <div key={set.join()} className={styles.suggestion}>
                <span>
                  <strong>Same customer?</strong>{" "}
                  {set
                    .map(
                      (id) =>
                        groups.find((group) => group.customerId === id)?.name,
                    )
                    .join(", ")}
                </span>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => openTogether(set)}
                >
                  Check
                </button>
                <button type="button" onClick={() => markNotSame(set)}>
                  Not the same
                </button>
              </div>
            ))}
            <CustomerList groups={groups} />
          </>
        )}
      </div>

      {together && (
        <PutCarsTogether
          key={together.key}
          initialIds={together.ids}
          onClose={() => setTogether(null)}
          onDone={(move) => {
            setTogether(null);
            setQuery("");
            router.push(
              `/cars?customer=${move.destinationCustomerId}&together=${move.id}`,
            );
          }}
        />
      )}
      {form && (
        <CarForm
          key={form.key}
          initialCustomerId={form.customerId}
          initialPlate={form.plate}
          onClose={closeForm}
          onSaved={(car) => {
            setForm(null);
            router.push(`/cars/${car.id}`);
          }}
        />
      )}
    </div>
  );
}

function CustomerList({ groups }: { groups: CustomerGroup[] }) {
  return (
    <ul className={styles.customerList}>
      {groups.map((group) => (
        <li key={group.key}>
          <Link
            href={`/cars?customer=${encodeURIComponent(group.customerId || NO_CUSTOMER)}`}
            className={
              group.customerId ? styles.customerRow : styles.noCustomerRow
            }
          >
            <span className={styles.customerName}>
              <strong>{group.name}</strong>
              {(group.note || group.phone) && (
                <small>{group.note || group.phone}</small>
              )}
            </span>
            <span className={styles.carCount}>
              {carCount(group.cars.length)}
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CarGrid({
  cars,
  showCustomer = false,
}: {
  cars: VehicleRecord[];
  showCustomer?: boolean;
}) {
  return (
    <div className={styles.carList}>
      {cars.map((car) => (
        <Link className={styles.carLink} href={`/cars/${car.id}`} key={car.id}>
          <Car size={28} />
          <div>
            <strong>{car.plateNumber || car.displayName || "Car"}</strong>
            <span>
              {[car.make, car.model, car.year, car.color]
                .filter(Boolean)
                .join(" ") || "No details yet"}
            </span>
            {showCustomer && (
              <small>
                {car.customerName ||
                  (car.customerId ? "Unnamed customer" : "No customer yet")}
              </small>
            )}
            {car.representativeName && (
              <small>Brought by {car.representativeName}</small>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
