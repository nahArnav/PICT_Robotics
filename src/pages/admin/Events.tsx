import { ResourceManager } from "./ResourceManager";
export function AdminEvents() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Events management</h1>
      <ResourceManager table="club_events" />
    </div>
  );
}
