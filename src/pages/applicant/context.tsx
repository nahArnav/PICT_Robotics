import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuthState } from "../../lib/auth";
import { loadDashboardData } from "../../lib/services/applicant";
import { useRemote } from "../../lib/useRemote";
type DashboardState = ReturnType<
  typeof useRemote<Awaited<ReturnType<typeof loadDashboardData>>>
> & {
  cycleId?: string;
  setCycleId: (id: string) => void;
};
const Context = createContext<DashboardState | null>(null);
export function DashboardProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  const [cycleId, setCycleId] = useState<string>();
  const remote = useRemote(
    () => loadDashboardData(auth.user!.id, cycleId),
    [auth.user?.id, cycleId],
  );
  return <Context.Provider value={{ ...remote, cycleId, setCycleId }}>{children}</Context.Provider>;
}
export function useDashboard() {
  const value = useContext(Context);
  if (!value) throw new Error("DashboardProvider required");
  return value;
}
