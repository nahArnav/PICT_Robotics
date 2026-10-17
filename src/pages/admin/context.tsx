import { createContext, useContext, useState, type ReactNode } from "react";
import { getRecruitmentCycles } from "../../lib/services/admin";
import { useRemote } from "../../lib/useRemote";
type Cycle = Awaited<ReturnType<typeof getRecruitmentCycles>>[number];
const Context = createContext<{
  cycleId: string;
  setCycleId: (id: string) => void;
  cycles: Cycle[];
  refreshCycles: () => void;
}>({ cycleId: "", setCycleId: () => {}, cycles: [], refreshCycles: () => {} });
export function AdminProvider({ children }: { children: ReactNode }) {
  const cycles = useRemote(getRecruitmentCycles);
  const [cycleId, setCycleId] = useState("");
  return (
    <Context.Provider
      value={{ cycleId, setCycleId, cycles: cycles.data ?? [], refreshCycles: cycles.refresh }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAdminCycle() {
  return useContext(Context);
}
