import { z } from "zod";
import Decimal from "decimal.js";

const hasAtMostTwoDecimals = (value: number) =>
  new Decimal(value).decimalPlaces() <= 2;

export const addressSchema = z.object({
  street: z.string().min(2),
  buildingNumber: z.string().min(1),
  district: z.string().min(2),
  city: z.string().min(2),
  postalCode: z.string().regex(/^\d{5}$/),
  countryCode: z.literal("SA"),
});

// Contact details can be collected gradually. Fiscal documents still use the
// complete address validation above and the issuance/compliance validators.
const customerAddressSchema = z.object({
  street: z.string().trim().max(300).default(""),
  buildingNumber: z.string().trim().max(40).default(""),
  district: z.string().trim().max(180).default(""),
  city: z.string().trim().max(180).default(""),
  postalCode: z
    .string()
    .trim()
    .regex(/^(\d{5})?$/, "Use a 5-digit postal code")
    .default(""),
  countryCode: z.literal("SA").default("SA"),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2),
  nameAr: z.string().trim().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  vatNumber: z
    .string()
    .regex(/^3\d{13}3$/, "Use a valid 15-digit Saudi VAT number")
    .optional()
    .or(z.literal("")),
  additionalIdType: z.enum(["CRN", "MOM", "MLS", "SAG", "OTH"]).optional(),
  additionalId: z.string().optional(),
  address: customerAddressSchema.optional(),
});

export const catalogItemSchema = z
  .object({
    sku: z.string().trim().min(2).max(40),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().min(2).max(500),
    unitCode: z.string().trim().min(2).max(6),
    unitPrice: z.coerce.number().nonnegative(),
    vatCategory: z.enum(["S", "Z", "E", "O"]),
    vatRate: z.coerce.number().nonnegative().max(100),
  })
  .superRefine((value, context) => {
    if (value.vatCategory === "S" && value.vatRate !== 15)
      context.addIssue({
        code: "custom",
        path: ["vatRate"],
        message: "Standard-rated Saudi supplies use 15% VAT",
      });
    if (value.vatCategory !== "S" && value.vatRate !== 0)
      context.addIssue({
        code: "custom",
        path: ["vatRate"],
        message: "Non-standard categories must use a 0% rate",
      });
  });

export const lineSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().trim().min(1),
    quantity: z.coerce.number().positive(),
    unitCode: z.string().trim().min(2).max(6),
    unitPrice: z.coerce.number().nonnegative(),
    discount: z.coerce.number().nonnegative(),
    discountMode: z.enum(["AMOUNT", "PERCENTAGE"]).optional(),
    discountValue: z.coerce.number().nonnegative().optional(),
    vatCategory: z.enum(["S", "Z", "E", "O"]),
    vatRate: z.coerce.number().nonnegative().max(100),
    exemptionReasonCode: z.string().trim().optional(),
    exemptionReason: z.string().trim().optional(),
  })
  .superRefine((line, context) => {
    if (
      line.discountMode === "PERCENTAGE" &&
      line.discountValue !== undefined &&
      line.discountValue > 100
    ) {
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percentage discount cannot exceed 100%",
      });
    }
    if (line.discount > line.quantity * line.unitPrice) {
      context.addIssue({
        code: "custom",
        path: ["discount"],
        message: "Discount cannot exceed the gross line amount",
      });
    }
    if (line.vatCategory === "S" && line.vatRate !== 15) {
      context.addIssue({
        code: "custom",
        path: ["vatRate"],
        message: "Standard-rated Saudi supplies use 15% VAT",
      });
    }
    if (line.vatCategory !== "S" && line.vatRate !== 0) {
      context.addIssue({
        code: "custom",
        path: ["vatRate"],
        message: "Non-standard tax categories must use a 0% rate",
      });
    }
    if (
      line.vatCategory !== "S" &&
      (!line.exemptionReasonCode || !line.exemptionReason)
    ) {
      context.addIssue({
        code: "custom",
        path: ["exemptionReason"],
        message:
          "A non-standard tax category requires a reason code and narrative",
      });
    }
  });

// Saving work is separate from completing a document. Keep unfinished text and
// zero quantities in drafts; the strict schemas below run when it is finalised.
const draftLineSchema = z.object({
  id: z.string().min(1),
  description: z.string().default(""),
  quantity: z.coerce.number().default(0),
  unitCode: z.string().default("PCE"),
  unitPrice: z.coerce.number().default(0),
  discount: z.coerce.number().default(0),
  discountMode: z.enum(["AMOUNT", "PERCENTAGE"]).optional(),
  discountValue: z.coerce.number().optional(),
  vatCategory: z.enum(["S", "Z", "E", "O"]).default("S"),
  vatRate: z.coerce.number().default(15),
  exemptionReasonCode: z.string().optional(),
  exemptionReason: z.string().optional(),
});
const draftDateSchema = z.union([z.string().date(), z.literal("")]);

export const quotationSchema = z.object({
  customerId: z.string().default(""),
  vehicleId: z.string().optional(),
  issueDate: draftDateSchema.default(""),
  expiryDate: draftDateSchema.optional(),
  taxEnabled: z.boolean().optional(),
  lines: z.array(draftLineSchema).default([]),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export const invoiceSchema = z.object({
  customerId: z.string().default(""),
  vehicleId: z.string().optional(),
  kind: z.enum(["STANDARD", "SIMPLIFIED"]).default("STANDARD"),
  issueDate: draftDateSchema.default(""),
  supplyDate: draftDateSchema.optional(),
  dueDate: draftDateSchema.optional(),
  lines: z.array(draftLineSchema).default([]),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  quotationId: z.string().optional(),
});

export const quotationReadySchema = z
  .object({
    customerId: z.string().min(1),
    issueDate: z.string().date(),
    expiryDate: z.union([z.string().date(), z.literal("")]).optional(),
    taxEnabled: z.boolean().optional(),
    lines: z.array(lineSchema).min(1),
    notes: z.string().optional(),
    terms: z.string().optional(),
  })
  .refine((value) => !value.expiryDate || value.expiryDate >= value.issueDate, {
    path: ["expiryDate"],
    message: "Expiry date cannot be before issue date",
  });

export const invoiceReadySchema = z
  .object({
    customerId: z.string().min(1),
    kind: z.enum(["STANDARD", "SIMPLIFIED"]),
    issueDate: z.string().date(),
    supplyDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    lines: z.array(lineSchema).min(1),
    notes: z.string().optional(),
    paymentTerms: z.string().optional(),
    quotationId: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.dueDate && value.dueDate < value.issueDate) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date cannot be before the draft issue date",
      });
    }
  });

export const invoiceActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue-sandbox") }),
  z.object({ action: z.literal("duplicate") }),
  z.object({ action: z.literal("record-bad-debt") }),
  z.object({
    action: z.literal("create-note"),
    type: z.enum(["CREDIT_NOTE", "DEBIT_NOTE"]),
    reason: z.string().trim().min(3).max(500),
  }),
]);

export const quotationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("convert"),
    kind: z.enum(["STANDARD", "SIMPLIFIED"]).default("STANDARD"),
  }),
  z.object({
    action: z.literal("transition"),
    status: z.enum(["SENT", "ACCEPTED", "DECLINED", "EXPIRED"]),
  }),
  z.object({ action: z.literal("duplicate") }),
]);

const partySchema = z.object({
  name: z.string(),
  nameAr: z.string().optional(),
  vatNumber: z.string().optional(),
  additionalIdType: z.enum(["CRN", "MOM", "MLS", "SAG", "OTH"]).optional(),
  additionalId: z.string().optional(),
  address: addressSchema.optional(),
  email: z.string().optional(),
});

export const organisationSchema = z.object({
  name: z.string().trim().min(2).max(200),
  nameAr: z.string().trim().min(2).max(200),
  vatNumber: z
    .string()
    .regex(/^3\d{13}3$/, "Use a valid 15-digit Saudi VAT number"),
  additionalIdType: z.enum(["CRN", "MOM", "MLS", "SAG", "OTH"]),
  additionalId: z.string().trim().min(2).max(80),
  email: z.string().email(),
  address: addressSchema,
});

export const fiscalDocumentSchema = z.object({
  id: z.string(),
  number: z.string(),
  uuid: z.string().optional(),
  kind: z.enum(["STANDARD", "SIMPLIFIED"]),
  documentType: z.enum(["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"]),
  status: z.enum([
    "DRAFT",
    "VALIDATED",
    "CLEARANCE_PENDING",
    "CLEARED",
    "ISSUED",
    "REPORTING_PENDING",
    "REPORTED",
    "WARNING",
    "REJECTED",
    "SANDBOX_ISSUED",
  ]),
  customer: partySchema,
  seller: partySchema,
  issueDate: z.string().date(),
  issueTime: z.string().optional(),
  supplyDate: z.string().date().optional(),
  currency: z.literal("SAR"),
  taxCurrency: z.literal("SAR"),
  paymentMeans: z.string().optional(),
  lines: z.array(lineSchema),
  originalInvoiceNumber: z.string().optional(),
  adjustmentReason: z.string().optional(),
  counter: z.number().int().nonnegative().optional(),
  previousHash: z.string().optional(),
  xmlHash: z.string().optional(),
  qrBase64: z.string().optional(),
  immutableAt: z.string().optional(),
  complianceVersion: z.string(),
});

export const paymentSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(100),
  payerPersonId: z.string().trim().min(1).max(100).optional(),
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive().refine(hasAtMostTwoDecimals, {
    message: "Payment amounts must use at most two decimal places",
  }),
  method: z.enum(["BANK_TRANSFER", "CARD", "CASH", "CHEQUE", "OTHER"]),
  reference: z.string().trim().min(1),
  paidAt: z.string().datetime({ offset: true }),
});
export const expenseSchema = z.object({
  vendor: z.string().trim().min(2),
  category: z.string().trim().min(2),
  expenseDate: z.string().date(),
  description: z.string().trim().min(2),
  subtotal: z.coerce.number().nonnegative().refine(hasAtMostTwoDecimals, {
    message: "Subtotal must use at most two decimal places",
  }),
  vatAmount: z.coerce.number().nonnegative().refine(hasAtMostTwoDecimals, {
    message: "VAT amount must use at most two decimal places",
  }),
  total: z.coerce.number().positive().optional(),
  status: z.enum(["DRAFT", "RECORDED"]),
});

// Only the car number is needed; other supplied values still need to make sense.
const carNumber = z
  .string()
  .trim()
  .max(40)
  .refine((value) => !value || /[\p{L}\p{N}]/u.test(value), {
    message: "Use letters or numbers",
  });
const carYear = z
  .string()
  .trim()
  .max(12)
  .refine((value) => !value || /^(19|20)\d{2}$/.test(value), {
    message: "Use a 4-digit year, like 2019",
  });

export const vehicleSchema = z.object({
  representativePersonId: z.string().trim().max(100).optional(),
  representativeName: z.string().trim().max(200).optional(),
  representativePhone: z.string().trim().max(80).optional(),
  personId: z.string().trim().max(100).optional(),
  plateNumber: carNumber.pipe(z.string().min(1, "Enter the car number")),
  customerId: z.string().trim().optional(),
  customerName: z.string().trim().max(180).optional().or(z.literal("")),
  customerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  make: z.string().trim().max(80).optional().or(z.literal("")),
  model: z.string().trim().max(80).optional().or(z.literal("")),
  year: carYear.optional(),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  vin: z.string().trim().max(80).optional().or(z.literal("")),
  odometer: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const vehicleUpdateSchema = z.object({
  representativePersonId: z.string().trim().max(100).nullable().optional(),
  representativeName: z.string().trim().max(200).nullable().optional(),
  representativePhone: z.string().trim().max(80).nullable().optional(),
  personId: z.string().trim().max(100).nullable().optional(),
  plateNumber: carNumber.nullable().optional(),
  customerId: z.string().trim().max(100).nullable().optional(),
  customerName: z.string().trim().max(180).nullable().optional(),
  customerPhone: z.string().trim().max(40).nullable().optional(),
  make: z.string().trim().max(80).nullable().optional(),
  model: z.string().trim().max(80).nullable().optional(),
  year: carYear.nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  vin: z.string().trim().max(80).nullable().optional(),
  odometer: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const carMoveSchema = z.object({
  operationId: z.string().uuid(),
  customerIds: z.array(z.string().trim().min(1).max(100)).min(2).max(100),
  destinationCustomerId: z.string().trim().min(1).max(100),
  expectedCarIds: z.array(z.string().trim().min(1).max(100)).max(20000),
});

export const dailyEntrySchema = z.object({
  category: z.enum([
    "CUSTOMER_PAYMENT",
    "EARNED_FROM_CAR",
    "EARNED_OTHER",
    "PASS_THROUGH_RECEIVED",
    "SPENT_ON_CAR",
    "SPENT_ON_MATERIAL",
    "SPENT_ON_WORKER",
    "SPENT_FOR_BUSINESS",
    "SPENT_RENT",
    "SPENT_UTILITIES",
    "SPENT_NON_BUSINESS",
    "PAID_SUPPLIER",
    "OWNER_PAID",
    "OWNER_TAKEN",
    "RANDOM_NOTE",
  ]),
  amount: z.coerce
    .number()
    .nonnegative()
    .refine(hasAtMostTwoDecimals, {
      message: "Amounts must use at most two decimal places",
    })
    .optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  partyName: z.string().trim().max(180).optional().or(z.literal("")),
  customerId: z.string().trim().optional(),
  customerName: z.string().trim().max(180).optional().or(z.literal("")),
  customerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  plateNumber: z.string().trim().max(40).optional().or(z.literal("")),
  vehicleId: z.string().trim().optional(),
  invoiceId: z.string().trim().optional(),
  promiseDate: z.string().date().optional(),
  paymentMethod: z
    .enum(["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"])
    .optional(),
  entryDate: z.string().date().optional(),
});
