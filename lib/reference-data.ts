import type { BillBookSnapshot } from "./bill-types";
import type { LedgerEntry, LedgerPerson, LedgerSnapshot } from "./ledger-types";
import type {
  AuditRecord,
  AttachmentRecord,
  CarMoveRecord,
  CatalogItem,
  CustomerRecord,
  EgsState,
  ExpenseRecord,
  InvoiceRecord,
  MoneyEntryRecord,
  PaymentRecord,
  QuotationRecord,
  VehicleRecord,
  WorkshopJobRecord,
} from "./product-types";
import type { Party } from "./types";
import { riyadhDate } from "./business-date";

export interface Snapshot {
  billBook: BillBookSnapshot;
  ledger: LedgerSnapshot;
  storage: { mode: "local" | "shared"; durable: boolean };
  customers: CustomerRecord[];
  items: CatalogItem[];
  quotations: QuotationRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  vehicles: VehicleRecord[];
  carMoves: CarMoveRecord[];
  workshopJobs: WorkshopJobRecord[];
  moneyEntries: MoneyEntryRecord[];
  attachments: AttachmentRecord[];
  audit: AuditRecord[];
  egs: EgsState;
  organisation: Party;
}

export const REFERENCE_STORAGE_KEY = "asaan-hisaab-reference-workspace-v1";

export function makeReferenceSnapshot(): Snapshot {
  const today = riyadhDate();
  const timestamp = `${today}T09:00:00.000Z`;
  const organisation: Party = { name: "Al Noor Auto Care" };
  const customer: CustomerRecord = {
    id: "customer-demo",
    name: "Noura Al-Harbi",
    phone: "+966 55 401 7286",
    status: "ACTIVE",
    outstanding: 1450,
    promiseDate: today,
    promiseStatus: "OPEN",
    promiseHistory: [],
    createdAt: timestamp,
  };
  const vehicle: VehicleRecord = {
    id: "car-demo",
    plateNumber: "RSH 4821",
    displayName: "Toyota Camry · 2021",
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    make: "Toyota",
    model: "Camry",
    year: "2021",
    promiseDate: today,
    promiseStatus: "OPEN",
    promiseHistory: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const line = {
    id: "line-demo",
    description: "Brake pads and inspection",
    quantity: 1,
    unitCode: "EA",
    unitPrice: 2060.87,
    discount: 0,
    vatCategory: "S" as const,
    vatRate: 15,
  };
  const quotation: QuotationRecord = {
    id: "quotation-demo",
    number: "Q-2026-019",
    customerId: customer.id,
    vehicleId: vehicle.id,
    customer,
    issueDate: today,
    taxEnabled: true,
    status: "DRAFT",
    currency: "SAR",
    lines: [line],
    notes: "",
    terms: "",
    subtotal: 2060.87,
    vatTotal: 309.13,
    total: 2370,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const invoice: InvoiceRecord = {
    id: "invoice-demo",
    number: "INV-2026-014",
    customerId: customer.id,
    vehicleId: vehicle.id,
    customer,
    seller: organisation,
    kind: "SIMPLIFIED",
    documentType: "INVOICE",
    status: "ISSUED",
    paymentStatus: "PARTIALLY_PAID",
    issueDate: today,
    dueDate: today,
    currency: "SAR",
    lines: [line],
    notes: "",
    paymentTerms: "",
    subtotal: 2060.87,
    vatTotal: 309.13,
    total: 2370,
    paidAmount: 920,
    badDebtAmount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const entries: LedgerEntry[] = [
    {
      id: "entry-demo-service",
      kind: "INCOME",
      amount: 1450,
      personId: "person-demo",
      personName: customer.name,
      note: "Service payment",
      entryDate: today,
      vehicleId: vehicle.id,
      plateNumber: vehicle.plateNumber,
      paymentMethod: "BANK_TRANSFER",
      attachmentIds: [],
      allocatedAmount: 0,
      availableAmount: 1450,
      createdAt: timestamp,
      cashIn: 1450,
      cashOut: 0,
      cashChange: 1450,
      income: 1450,
      businessExpense: 0,
      personalExpense: 0,
      personBalanceChange: 0,
      counterpartyBalanceChange: 0,
    },
    {
      id: "entry-demo-parts",
      kind: "EXPENSE",
      amount: 680,
      personId: "supplier-demo",
      personName: "Riyadh Motor Parts",
      category: "PARTS",
      note: "Parts purchase",
      entryDate: today,
      vehicleId: vehicle.id,
      plateNumber: vehicle.plateNumber,
      paymentMethod: "CASH",
      attachmentIds: [],
      allocatedAmount: 0,
      availableAmount: 0,
      createdAt: timestamp,
      cashIn: 0,
      cashOut: 680,
      cashChange: -680,
      income: 0,
      businessExpense: 680,
      personalExpense: 0,
      personBalanceChange: 0,
      counterpartyBalanceChange: 0,
    },
    {
      id: "entry-demo-invoice-payment",
      kind: "INVOICE_RECEIPT",
      amount: 920,
      personId: "person-demo",
      personName: customer.name,
      note: "Invoice payment",
      entryDate: today,
      vehicleId: vehicle.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      paymentId: "payment-demo",
      paymentMethod: "CARD",
      attachmentIds: [],
      allocatedAmount: 920,
      availableAmount: 0,
      createdAt: timestamp,
      cashIn: 920,
      cashOut: 0,
      cashChange: 920,
      income: 920,
      businessExpense: 0,
      personalExpense: 0,
      personBalanceChange: 0,
      counterpartyBalanceChange: 0,
    },
  ];
  const supplier: LedgerPerson = {
    id: "supplier-demo",
    name: "Riyadh Motor Parts",
    roles: ["SUPPLIER"],
    phone: "+966 11 438 2210",
    createdAt: timestamp,
    updatedAt: timestamp,
    balance: -680,
    entryCount: 1,
    needsReviewCount: 0,
    confirmedBalance: -680,
  };
  const customerPerson: LedgerPerson = {
    id: "person-demo",
    name: customer.name,
    roles: ["CUSTOMER"],
    phone: customer.phone,
    customerId: customer.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    balance: 0,
    entryCount: 2,
    needsReviewCount: 0,
    confirmedBalance: 0,
  };
  const billBook: BillBookSnapshot = {
    bills: [
      {
        id: "bill-demo",
        direction: "PURCHASE",
        personId: supplier.id,
        number: "RP-4821",
        issueDate: today,
        dueDate: today,
        total: 680,
        category: "PARTS",
        note: "Parts for Toyota Camry",
        vehicleId: vehicle.id,
        status: "POSTED",
        personName: supplier.name,
        plateNumber: vehicle.plateNumber,
        chargeEntryId: entries[1].id,
        paidAmount: 0,
        offsetAmount: 0,
        balance: 680,
        createdAt: timestamp,
        updatedAt: timestamp,
        postedAt: timestamp,
      },
    ],
    settlements: [],
  };
  const ledger: LedgerSnapshot = {
    people: [customerPerson, supplier],
    entries,
    creditUses: [],
    legacyEntries: [],
    totals: {
      cashIn: 2370,
      cashOut: 680,
      cashChange: 1690,
      income: 2370,
      businessExpense: 680,
      personalExpense: 0,
      owedToUs: 0,
      weOwe: 0,
      needsReviewCount: 0,
    },
  };
  const payment: PaymentRecord = {
    id: "payment-demo",
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    customerName: customer.name,
    customerId: customer.id,
    ledgerEntryId: entries[2].id,
    sourceEntryId: entries[2].id,
    payerPersonId: "person-demo",
    payerName: customer.name,
    source: "WORKSHOP",
    amount: 920,
    method: "CARD",
    reference: "",
    paidAt: `${today}T09:00:00.000Z`,
    createdAt: timestamp,
  };
  const expense: ExpenseRecord = {
    id: "expense-demo",
    number: "EXP-2026-008",
    vendor: "Riyadh Motor Parts",
    category: "Parts",
    expenseDate: today,
    description: "Parts purchase for Toyota Camry",
    subtotal: 680,
    vatAmount: 0,
    total: 680,
    status: "RECORDED",
    createdAt: timestamp,
  };
  const job: WorkshopJobRecord = {
    id: "job-demo",
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    workDate: today,
    description: "Brake pads and inspection",
    workerName: "Faisal Ahmed",
    status: "OPEN",
    amountCharged: 2370,
    costAmount: 680,
    attachmentCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const item: CatalogItem = {
    id: "item-demo",
    sku: "BRK-01",
    name: "Brake pad service",
    description: "Brake pads and inspection",
    unitCode: "EA",
    unitPrice: 2060.87,
    vatCategory: "S",
    vatRate: 15,
    active: true,
    createdAt: timestamp,
  };

  return {
    organisation,
    storage: { mode: "local", durable: true },
    customers: [customer],
    items: [item],
    quotations: [quotation],
    invoices: [invoice],
    payments: [payment],
    expenses: [expense],
    vehicles: [vehicle],
    carMoves: [] as CarMoveRecord[],
    workshopJobs: [job],
    moneyEntries: [] as MoneyEntryRecord[],
    attachments: [] as AttachmentRecord[],
    audit: [] as AuditRecord[],
    billBook,
    ledger,
    egs: {
      id: "reference-demo",
      environment: "sandbox",
      qualification_status: "not_configured",
      last_counter: 0,
      last_invoice_hash: "",
      csid_status: "not_configured",
      certificate_expires_at: null,
      updated_at: timestamp,
    },
  };
}
