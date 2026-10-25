"use client";

import { RefreshCw, TriangleAlert } from "@/lib/icons";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page">
      <section className="panel state-page error-state" role="alert">
        <TriangleAlert size={32} />
        <h1>This workspace hit a problem</h1>
        <p>{error.message || "The page could not be loaded."}</p>
        <button className="button primary" onClick={reset}>
          <RefreshCw size={16} />
          Try again
        </button>
      </section>
    </div>
  );
}
