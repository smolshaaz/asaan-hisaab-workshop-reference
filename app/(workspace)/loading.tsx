export default function WorkspaceLoading() {
  return (
    <div className="page" aria-label="Loading workspace">
      <div className="skeleton heading-skeleton" />
      <div className="loading-metrics">
        <div className="skeleton metric-skeleton" />
        <div className="skeleton metric-skeleton" />
        <div className="skeleton metric-skeleton" />
        <div className="skeleton metric-skeleton" />
      </div>
      <div className="skeleton table-skeleton" />
    </div>
  );
}
