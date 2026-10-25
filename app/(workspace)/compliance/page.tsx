"use client";

import { SettingsBackLink } from "@/components/settings-back-link";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "@/lib/icons";
import { PageHeader } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
import type { Party } from "@/lib/types";

const officialLinks = {
  onboarding:
    "https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/E-invoicing-Detailed-Technical-Guideline.pdf",
  sdk: "https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/ComplianceEnablementToolbox/Pages/DownloadSDK.aspx",
  specifications:
    "https://www.zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/E-Invoice-specifications.aspx",
} as const;

const developerWork = [
  [
    "Safe user access",
    "Sign-in, roles, approvals, and an audit trail tied to real users.",
  ],
  [
    "Official invoice validation",
    "Current ZATCA rules, code lists, canonical XML hashing, and test vectors.",
  ],
  [
    "Protected signing and QR",
    "A non-exportable signing key, XAdES signature, and the required QR data.",
  ],
  [
    "Device onboarding",
    "OTP, CSR, Compliance CSID, official tests, and Production CSID renewal.",
  ],
  [
    "Clearance and reporting",
    "Durable submission, retries, reconciliation, and saved ZATCA responses.",
  ],
  [
    "Production controls",
    "Secure archive, restore tests, monitoring, trusted time, and independent review.",
  ],
] as const;

function hasCompleteOrganisation(organisation: Party | undefined) {
  const address = organisation?.address;
  return Boolean(
    organisation?.name?.trim() &&
    organisation.nameAr?.trim() &&
    organisation.vatNumber?.match(/^3\d{13}3$/) &&
    organisation.additionalIdType &&
    organisation.additionalId?.trim() &&
    organisation.email?.trim() &&
    address?.street?.trim() &&
    address.buildingNumber?.trim() &&
    address.district?.trim() &&
    address.city?.trim() &&
    address.postalCode?.trim() &&
    address.countryCode === "SA",
  );
}

function OfficialLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="setup-step-link" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}

export default function CompliancePage() {
  const { data, loading } = useProduct();
  const organisationReady = hasCompleteOrganisation(data?.organisation);
  const sandboxIssued =
    data?.invoices.filter((invoice) => invoice.status === "SANDBOX_ISSUED") ||
    [];

  return (
    <div className="page zatca-setup-page">
      <SettingsBackLink />
      <PageHeader
        title="ZATCA setup"
        description="Complete these four steps before this app can issue legal Saudi tax invoices."
      />

      <section className="zatca-status-strip" aria-labelledby="zatca-status">
        <span className="zatca-status-icon" aria-hidden="true">
          <LockKeyhole size={21} />
        </span>
        <div className="zatca-status-copy">
          <span>Live tax invoices</span>
          <h2 id="zatca-status">ZATCA is not connected</h2>
          <p>
            This workspace creates test copies only. Keep using your current
            live invoicing system for legal tax invoices.
          </p>
        </div>
        <div className="zatca-status-actions">
          <Link className="button primary" href="/organisation">
            Check company details
          </Link>
        </div>
      </section>

      <ol
        data-help="compliance-setup"
        className="setup-step-list"
        aria-label="ZATCA setup steps"
      >
        <li className="setup-step">
          <span className="setup-step-number" aria-hidden="true">
            1
          </span>
          <div className="setup-step-copy">
            <h2>Check company details</h2>
            <p>
              Confirm the legal names, VAT number, registration ID, email, and
              Saudi address that will appear on every invoice.
            </p>
          </div>
          <div className="setup-step-side">
            <span
              className={`setup-step-state ${
                loading ? "checking" : organisationReady ? "ready" : "waiting"
              }`}
            >
              {loading
                ? "Checking"
                : organisationReady
                  ? "Ready to review"
                  : "Needs attention"}
            </span>
            <Link className="setup-step-link" href="/organisation">
              Review details
            </Link>
          </div>
        </li>

        <li className="setup-step">
          <span className="setup-step-number" aria-hidden="true">
            2
          </span>
          <div className="setup-step-copy">
            <h2>Connect this invoicing device</h2>
            <p>
              ZATCA requires a portal OTP to securely generate the cryptographic
              signing key and Compliance CSID for this device.
            </p>
            {organisationReady ? (
              <form
                className="otp-form"
                style={{
                  marginTop: "16px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const otp = fd.get("otp");
                  if (otp) {
                    // TODO: Connect to backend API
                    alert(
                      "OTP submitted: " +
                        otp +
                        ". (API connection pending Phase 2)",
                    );
                  }
                }}
              >
                <input
                  name="otp"
                  placeholder="Enter 1-hour FATOORA OTP"
                  required
                  style={{ flex: 1, padding: "8px" }}
                />
                <button type="submit" className="button primary">
                  Connect Device
                </button>
              </form>
            ) : (
              <p
                style={{ color: "var(--color-danger-text)", marginTop: "8px" }}
              >
                <TriangleAlert
                  size={14}
                  style={{
                    display: "inline",
                    verticalAlign: "text-bottom",
                    marginRight: "4px",
                  }}
                />
                You must complete your Company details (Step 1) before
                generating an OTP.
              </p>
            )}
          </div>
          <div className="setup-step-side">
            <span className={`setup-step-state ${false ? "ready" : "waiting"}`}>
              {false ? "Connected" : "Needs attention"}
            </span>
            <OfficialLink href="https://zatca.gov.sa/en/E-Invoicing/Introduction/Pages/default.aspx">
              FATOORA Portal
            </OfficialLink>
          </div>
        </li>

        <li className="setup-step">
          <span className="setup-step-number" aria-hidden="true">
            3
          </span>
          <div className="setup-step-copy">
            <h2>Pass the official invoice tests</h2>
            <p>
              Validate the XML and QR rules, then pass ZATCA checks for every
              invoice, credit-note, and debit-note type the business will use.
            </p>
          </div>
          <div className="setup-step-side">
            <span className="setup-step-state locked">Locked</span>
            <OfficialLink href={officialLinks.sdk}>
              Open official SDK
            </OfficialLink>
          </div>
        </li>

        <li className="setup-step">
          <span className="setup-step-number" aria-hidden="true">
            4
          </span>
          <div className="setup-step-copy">
            <h2>Turn on live tax invoices</h2>
            <p>
              Production credentials must be active. Business invoices require
              clearance before delivery; simplified invoices must be reported
              within 24 hours.
            </p>
          </div>
          <div className="setup-step-side">
            <span className="setup-step-state locked">Locked</span>
            <OfficialLink href={officialLinks.specifications}>
              See specifications
            </OfficialLink>
          </div>
        </li>
      </ol>

      <section
        className="sandbox-available"
        aria-labelledby="sandbox-available"
      >
        <div className="sandbox-available-heading">
          <span aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 id="sandbox-available">What you can use now</h2>
            <p>
              Useful local work, without pretending it is live ZATCA issuance.
            </p>
          </div>
        </div>
        <div className="sandbox-capability-list">
          {[
            "Create quotations and drafts",
            "Record customer payments",
            "Run local field checks",
            "Create clearly marked test copies",
          ].map((label) => (
            <span key={label}>
              <Check size={15} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </section>

      <details className="developer-readiness">
        <summary>
          <span>Developer work still required</span>
          <small>
            {developerWork.length} production systems are unfinished
          </small>
        </summary>
        <div className="requirement-list">
          {developerWork.map(([title, description]) => (
            <article key={title}>
              <span aria-hidden="true">
                <LockKeyhole size={15} />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </details>

      <details className="technical-evidence">
        <summary>
          <span>Local test records</span>
          <small>
            {sandboxIssued.length}{" "}
            {sandboxIssued.length === 1 ? "record" : "records"}
            {data?.egs.last_counter
              ? ` · local counter ${data.egs.last_counter}`
              : ""}
          </small>
        </summary>
        <div className="technical-evidence-body">
          <div className="technical-evidence-heading">
            <div>
              <h2>Local test evidence</h2>
              <p>Generated on this computer and never sent to ZATCA.</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton table-skeleton" />
          ) : sandboxIssued.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Document</th>
                    <th scope="col">Counter</th>
                    <th scope="col">Local test ID</th>
                    <th scope="col">Local XML fingerprint</th>
                    <th scope="col">Timing requirement</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sandboxIssued.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <Link
                          className="text-link"
                          href={`/invoices/${invoice.id}`}
                        >
                          {invoice.number}
                        </Link>
                      </td>
                      <td>{invoice.counter ?? "—"}</td>
                      <td>
                        <code>
                          {invoice.uuid ? `${invoice.uuid.slice(0, 18)}…` : "—"}
                        </code>
                      </td>
                      <td>
                        <code>
                          {invoice.xmlHash
                            ? `${invoice.xmlHash.slice(0, 18)}…`
                            : "—"}
                        </code>
                      </td>
                      <td>
                        {invoice.reportingDeadline
                          ? new Date(invoice.reportingDeadline).toLocaleString(
                              "en-GB",
                            )
                          : "Clearance required before delivery"}
                      </td>
                      <td>
                        <span className="status-pill local-test-copy">
                          Local test copy
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Fingerprint size={30} aria-hidden="true" />
              <h3>No local test records yet</h3>
              <p>
                Create a test invoice to exercise the local sequence and
                archive.
              </p>
              <Link className="button secondary" href="/invoices/new">
                Create a test invoice
              </Link>
            </div>
          )}
        </div>
      </details>

      <div className="info-strip warning zatca-live-warning">
        <TriangleAlert size={19} aria-hidden="true" />
        <span>
          <strong>Keep using your current live tax system.</strong> Do not give
          customers the test copies from this workspace as legal tax invoices.
        </span>
      </div>
    </div>
  );
}
