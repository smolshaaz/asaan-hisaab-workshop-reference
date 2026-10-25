import Link from "next/link";
import { ArrowLeft, FileText } from "@/lib/icons";

export default function NotFound() {
  return (
    <main className="standalone-state">
      <section>
        <span className="standalone-mark">ف</span>
        <FileText size={34} />
        <p className="state-code">404</p>
        <h1>That record is not here</h1>
        <p>The document may have moved, or the link may be incomplete.</p>
        <Link className="button primary" href="/dashboard">
          <ArrowLeft size={16} />
          Return to overview
        </Link>
      </section>
    </main>
  );
}
