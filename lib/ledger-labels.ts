export const entryKinds = {
  INCOME: {
    label: "Payment for new work",
    hint: "Work paid now. If already on an invoice, open that invoice to record payment.",
    group: "in",
    person: false,
  },
  EXPENSE: {
    label: "We paid for something",
    hint: "A purchase or expense paid now.",
    group: "out",
    person: false,
  },
  GIVE_MONEY: {
    label: "Advance or pay someone back",
    hint: "An advance, or money paid back. This is not another expense.",
    group: "out",
    person: true,
  },
  RECEIVE_MONEY: {
    label: "Someone paid their balance",
    hint: "Money returned or a balance settled. This is not another sale.",
    group: "in",
    person: true,
  },
  PERSON_SPENT: {
    label: "Someone spent for us",
    hint: "Parts or work paid by this person. Their balance changes, even if they used their own money.",
    group: "worker",
    person: true,
  },
  PERSON_COLLECTED: {
    label: "Someone collected for us",
    hint: "A worker has customer money. It has not reached the workshop yet.",
    group: "worker",
    person: true,
  },
  CREDIT_PURCHASE: {
    label: "We bought, will pay later",
    hint: "Parts, outsourced work or wages we still need to pay.",
    group: "credit",
    person: true,
  },
  CREDIT_SALE: {
    label: "Customer will pay later",
    hint: "Work charged to a customer, with no money received yet. Do not enter the same invoice again.",
    group: "credit",
    person: true,
  },
  OWNER_IN: {
    label: "Owner put money in",
    hint: "Owner's money added to the business. It is not a sale.",
    group: "in",
    person: false,
  },
  OWNER_OUT: {
    label: "Owner took money out",
    hint: "Money taken out by the owner. It is not a business expense.",
    group: "out",
    person: false,
  },
  OPENING_OWED_TO_US: {
    label: "Old amount they owe us",
    hint: "A balance from before these records began. No money moves today.",
    group: "credit",
    person: true,
  },
  OPENING_WE_OWE: {
    label: "Old amount we owe them",
    hint: "A balance from before these records began. No money moves today.",
    group: "credit",
    person: true,
  },
} as const;
export type EntryKind = keyof typeof entryKinds;
const linkedLabels: Record<string, string> = {
  ADVANCE_RECEIVED: "Customer advance received",
  ADVANCE_GIVEN: "Advance given",
  ADVANCE_COLLECTED: "Advance collected for us",
  PERSON_PAID_BILL: "Someone paid a supplier for us",
  INVOICE_RECEIPT: "Customer invoice paid",
  INVOICE_COLLECTED: "Invoice payment collected for us",
  INVOICE_ALLOCATION: "Earlier payment used for invoice",
};
export const entryLabel = (kind: string) =>
  linkedLabels[kind] ||
  (kind === "BILL_ALLOCATION"
    ? "Earlier payment linked to bill"
    : kind === "OFFSET"
      ? "Settled against each other"
      : entryKinds[kind as EntryKind]?.label) ||
  kind.toLowerCase().replaceAll("_", " ");
export const balanceLabel = (balance: number) =>
  balance > 0 ? "They owe us" : balance < 0 ? "We owe them" : "All settled";
