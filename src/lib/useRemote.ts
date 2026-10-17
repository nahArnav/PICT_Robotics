import { useEffect, useState, type DependencyList } from "react";
import { authErrorMessage } from "./auth";

export function useRemote<T>(load: () => Promise<T>, dependencies: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void load()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((error) => {
        if (active) setError(authErrorMessage(error, "Unable to load this page. Please retry."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...dependencies, version]);
  return {
    data,
    setData,
    error,
    loading,
    refresh: () => setVersion((value) => value + 1),
  };
}
