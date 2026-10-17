import { Button } from "./ui";
export function DataState({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
  retry?: () => void;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className="rounded-xl border border-line bg-white p-6 text-sm text-ink-soft"
    >
      {loading ? "Loading…" : error || empty}
      {error && retry && (
        <Button variant="outline" size="sm" className="ml-4" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}
