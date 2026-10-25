"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus, Users } from "@/lib/icons";
import { useProduct } from "@/components/product-context";
import { personAccount, documentAccountItems } from "@/lib/account-summary";
import styles from "@/components/person-balance.module.css";
import { initials, money } from "@/lib/format";

export default function PeoplePage() {
  const { data, loading, mutate } = useProduct();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<string[]>(["WORKER"]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const people = (data?.ledger.people || []).filter((p) =>
    `${p.name} ${p.phone || ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const documents = data ? documentAccountItems(data) : [];
  const accounts = new Map(
    (data?.ledger.people || []).map((person) => [
      person.id,
      personAccount(data!, person, documents),
    ]),
  );
  const owedToUs =
    [...accounts.values()].reduce(
      (sum, account) => sum + Math.round(account.theyOwe * 100),
      0,
    ) / 100;
  const weOwe =
    [...accounts.values()].reduce(
      (sum, account) => sum + Math.round(account.weOwe * 100),
      0,
    ) / 100;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError("");
    try {
      await mutate("/api/ledger", {
        method: "POST",
        body: JSON.stringify({ action: "person", name, phone, roles }),
      });
      setName("");
      setPhone("");
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save person");
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="page daily-page">
      <div className="daily-heading heading-with-action">
        <div>
          <h1>People</h1>
          <p>Workers, suppliers, customers. Every amount has a history.</p>
        </div>
        <button
          data-help="people-add"
          className="button primary"
          onClick={() => setAdding(!adding)}
        >
          <Plus size={18} /> Add person
        </button>
      </div>
      {adding && (
        <form className="simple-form inline-add-person" onSubmit={save}>
          <h2>Add a person or shop</h2>
          <label>
            Name
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Phone (optional)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <fieldset className="role-choices">
            <legend>They can be more than one</legend>
            {Object.entries({
              WORKER: "Worker",
              SUPPLIER: "Supplier / outside worker",
              CUSTOMER: "Customer",
              OTHER: "Someone else",
            }).map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={roles.includes(value)}
                  onChange={(e) =>
                    setRoles(
                      e.target.checked
                        ? [...roles, value]
                        : roles.filter((r) => r !== value),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-buttons">
            <button
              className="button primary"
              disabled={working || !roles.length}
            >
              {working ? "Saving…" : "Save person"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div data-help="people-balances" className="balance-overview">
        <div>
          <span>People owe us</span>
          <strong>{money(owedToUs)}</strong>
        </div>
        <div>
          <span>We owe / customer credit</span>
          <strong>{money(weOwe)}</strong>
        </div>
      </div>
      <p className="plain-note">
        Linked invoices, supplier bills and other money-book balances, counted
        once. Open a person to see both sides and the records behind them.
      </p>
      <label className="daily-search">
        <span className="sr-only">Find a person</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a name or phone number"
        />
      </label>
      {loading ? (
        <p>Loading people…</p>
      ) : (
        <div data-help="people-list" className="people-list">
          {people.map((person) => {
            const account = accounts.get(person.id)!;
            return (
              <Link
                href={`/people/${person.id}`}
                key={person.id}
                className="person-row"
              >
                <span className="person-avatar">{initials(person.name)}</span>
                <span className="person-words">
                  <strong>{person.name}</strong>
                  <small>
                    {person.roles
                      .map(
                        (r) =>
                          ({
                            WORKER: "Worker",
                            SUPPLIER: "Supplier",
                            CUSTOMER: "Customer",
                            OTHER: "Other",
                          })[r],
                      )
                      .join(" · ")}
                    {person.needsReviewCount ? " · Needs checking" : ""}
                  </small>
                </span>
                <span className="person-balance">
                  {account.theyOwe > 0 && (
                    <span className={styles.incomingText}>
                      <strong>{money(account.theyOwe)}</strong>
                      <small>They owe us</small>
                    </span>
                  )}
                  {account.weOwe > 0 && (
                    <span className={styles.outgoingText}>
                      <strong>{money(account.weOwe)}</strong>
                      <small>We owe / credit</small>
                    </span>
                  )}
                  {!account.theyOwe && !account.weOwe && (
                    <span className={styles.incomingText}>
                      <strong>Settled</strong>
                      <small>Nothing owed either way</small>
                    </span>
                  )}
                </span>
                <ArrowRight size={18} />
              </Link>
            );
          })}
          {!people.length && (
            <div className="quiet-empty">
              <Users size={32} />
              <h2>{query ? "No matching person" : "Start with one person"}</h2>
              <p>Add the worker or supplier you deal with most.</p>
            </div>
          )}
        </div>
      )}
      <Link className="text-link ledger-other-link" href="/customers">
        Customer details for invoices <ArrowRight size={16} />
      </Link>
    </div>
  );
}
