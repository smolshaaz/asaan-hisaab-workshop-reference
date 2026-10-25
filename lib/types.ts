export type DocumentKind = "STANDARD" | "SIMPLIFIED";
export type FiscalDocumentType = "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
export type DocumentStatus =
  | "DRAFT"
  | "VALIDATED"
  | "CLEARANCE_PENDING"
  | "CLEARED"
  | "ISSUED"
  | "REPORTING_PENDING"
  | "REPORTED"
  | "WARNING"
  | "REJECTED"
  | "SANDBOX_ISSUED";

export type VatCategory = "S" | "Z" | "E" | "O";

export interface Address {
  street: string;
  buildingNumber: string;
  district: string;
  city: string;
  postalCode: string;
  countryCode: "SA";
}

export interface Party {
  name: string;
  nameAr?: string;
  vatNumber?: string;
  additionalIdType?: "CRN" | "MOM" | "MLS" | "SAG" | "OTH";
  additionalId?: string;
  address?: Address;
  email?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  discount: number;
  discountMode?: "AMOUNT" | "PERCENTAGE";
  discountValue?: number;
  vatCategory: VatCategory;
  vatRate: number;
  exemptionReasonCode?: string;
  exemptionReason?: string;
}

export interface FiscalDocument {
  id: string;
  number: string;
  uuid?: string;
  kind: DocumentKind;
  documentType: FiscalDocumentType;
  status: DocumentStatus;
  customer: Party;
  seller: Party;
  issueDate: string;
  issueTime?: string;
  supplyDate?: string;
  currency: "SAR";
  taxCurrency: "SAR";
  paymentMeans?: string;
  lines: LineItem[];
  originalInvoiceNumber?: string;
  adjustmentReason?: string;
  counter?: number;
  previousHash?: string;
  xmlHash?: string;
  qrBase64?: string;
  immutableAt?: string;
  complianceVersion: string;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: "ERROR" | "WARNING";
}
