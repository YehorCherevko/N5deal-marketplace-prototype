export function LoadingState({ label }: { label: string }) {
  return (
    <main id="main-content" className="page-container marketplace-main">
      <p role="status" className="loading-state">{label}…</p>
    </main>
  );
}
