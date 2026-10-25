"use client";

import { RefreshCw, TriangleAlert } from "@/lib/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="standalone-state">
          <section role="alert">
            <span className="standalone-mark">ف</span>
            <TriangleAlert size={34} />
            <p className="state-code">WORKSPACE ERROR</p>
            <h1>Asaan Hisaab could not continue</h1>
            <p>
              {error.message ||
                "An unexpected error interrupted the workspace."}
            </p>
            <button className="button primary" onClick={reset}>
              <RefreshCw size={16} />
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
