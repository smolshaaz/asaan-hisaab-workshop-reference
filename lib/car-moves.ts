import type { CarMoveRecord } from "./product-types";

/**
 * Old customer → the customer now holding its cars, from "Put cars together"
 * changes that were not put back. Used only for finding and assigning cars,
 * never for documents or accounts.
 */
export function carCustomerAliases(moves: CarMoveRecord[]) {
  const aliases = new Map<string, string>();
  const active = moves
    .filter((move) => !move.putBackAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const move of active)
    for (const source of move.sourceCustomerIds)
      aliases.set(source, move.destinationCustomerId);
  return aliases;
}

/** Follows old names to the customer now holding the cars. */
export function resolveCarCustomer(
  customerId: string,
  aliases: Map<string, string>,
) {
  let current = customerId;
  const seen = new Set([current]);
  while (aliases.has(current)) {
    const next = aliases.get(current)!;
    if (seen.has(next)) break;
    seen.add(next);
    current = next;
  }
  return current;
}

/** Placeholder numbers such as "000" do not make a record more trustworthy. */
export function usablePhone(phone?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 7 && !/^(\d)\1+$/.test(digits);
}

// Words that say nothing about who the customer is.
const genericWords = new Set([
  "the",
  "and",
  "company",
  "co",
  "comp",
  "est",
  "establishment",
  "trading",
  "trade",
  "group",
  "llc",
  "ltd",
  "limited",
  "inc",
  "corp",
  "corporation",
  "services",
  "service",
  "for",
]);

export function sameCustomerKey(name: string) {
  return name
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !genericWords.has(word))
    .join("");
}

function oneEditApart(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Conservative "Same customer?" hints: the same name once generic words and
 * punctuation are ignored, or one letter apart in a longer name. Phones are
 * never used as proof. Suggestions only open the review; nothing is saved.
 */
export function sameCustomerSuggestions(
  customers: { id: string; name: string }[],
) {
  const keyed = customers
    .map((customer) => ({ id: customer.id, key: sameCustomerKey(customer.name) }))
    .filter((customer) => customer.key.length >= 3);
  const parent = new Map(keyed.map((customer) => [customer.id, customer.id]));
  const find = (id: string): string =>
    parent.get(id) === id ? id : find(parent.get(id)!);
  for (let a = 0; a < keyed.length; a++)
    for (let b = a + 1; b < keyed.length; b++) {
      const left = keyed[a].key;
      const right = keyed[b].key;
      if (
        left === right ||
        (Math.min(left.length, right.length) >= 6 && oneEditApart(left, right))
      )
        parent.set(find(keyed[b].id), find(keyed[a].id));
    }
  const sets = new Map<string, string[]>();
  for (const customer of keyed) {
    const root = find(customer.id);
    sets.set(root, [...(sets.get(root) || []), customer.id]);
  }
  return [...sets.values()].filter((set) => set.length > 1);
}
