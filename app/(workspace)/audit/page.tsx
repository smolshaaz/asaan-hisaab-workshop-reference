"use client";
import { SettingsBackLink } from "@/components/settings-back-link";
import { Activity, Download, Fingerprint, LockKeyhole } from "@/lib/icons";
import { PageHeader } from "@/components/app-shell";
import { useProduct } from "@/components/product-context";
export default function AuditPage() {
  const { data, loading } = useProduct();
  const exportLog = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.audit, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fatoora-audit.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="page">
      <SettingsBackLink />
      <PageHeader
        title="Record changes"
        description="See when records were created, checked or corrected."
        secondary={
          <button className="button secondary" onClick={exportLog}>
            <Download size={16} />
            Export JSON
          </button>
        }
      />
      <div className="info-strip">
        <LockKeyhole size={19} />
        <span>
          <strong>Event evidence.</strong> Production deployment still requires
          a database role and WORM archive that prevent privileged mutation.
        </span>
      </div>
      {loading ? (
        <div className="skeleton large-skeleton" />
      ) : (
        <section data-help="audit-history" className="panel register-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Object</th>
                  <th>Actor</th>
                  <th>Object hash</th>
                </tr>
              </thead>
              <tbody>
                {data!.audit.map((event) => (
                  <tr key={event.id}>
                    <td>
                      {new Date(event.occurredAt).toLocaleString("en-GB")}
                    </td>
                    <td>
                      <strong>{event.eventType.replaceAll("_", " ")}</strong>
                    </td>
                    <td>
                      {event.aggregateType}
                      <small>{event.aggregateId}</small>
                    </td>
                    <td>{event.actorId}</td>
                    <td>
                      <code>{event.objectHash.slice(0, 18)}...</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
