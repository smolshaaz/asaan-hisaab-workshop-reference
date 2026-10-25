import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@/lib/icons";
import styles from "@/components/settings-menu.module.css";

const groups = [
  {
    title: "Business details",
    links: [
      [
        "/organisation",
        "Workshop details",
        "Your name, address and contact details on customer invoices",
      ],
      [
        "/customers",
        "Customer invoice details",
        "Add or update names, phone numbers and invoice addresses",
      ],
      [
        "/items",
        "Saved services & parts",
        "Save descriptions and prices to reuse on invoices",
      ],
    ],
  },
  {
    title: "Reports & records",
    links: [
      [
        "/reports/receivables",
        "Unpaid customer invoices",
        "See which customer invoices still need payment",
      ],
      [
        "/reports/vat",
        "Tax report",
        "Review sales tax and purchase tax for a date range",
      ],
      [
        "/expenses",
        "Earlier expense receipts",
        "Open expense receipts saved through the earlier expense form",
      ],
      [
        "/audit",
        "Record changes",
        "See when records were created, checked or corrected",
      ],
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className={`page daily-page ${styles.page}`}>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={18} aria-hidden="true" /> Back to Today
      </Link>
      <div className="daily-heading">
        <h1>More & settings</h1>
        <p>Choose a task. Each page has a way back here.</p>
      </div>
      <div data-help="settings-links" className={styles.groups}>
        {groups.map((group) => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            <div className={styles.links}>
              {group.links.map(([href, title, description]) => (
                <Link href={href} key={href}>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowRight size={20} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <details className={styles.advanced}>
        <summary>Technical setup</summary>
        <div className={styles.links}>
          <Link href="/compliance">
            <span>
              <strong>E-invoicing setup</strong>
              <small>Connection and readiness for official tax invoices</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
      </details>
    </div>
  );
}
