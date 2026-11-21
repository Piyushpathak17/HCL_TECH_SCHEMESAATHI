import { useCallback, useEffect, useState, type DependencyList } from "react";
import { errorMessage } from "../api";

export interface AsyncState<T> {
  loading: boolean;
  data?: T;
  error?: string;
  reload: () => void;
}

/** Run `fn` when `deps` change; keeps the previous data while reloading. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, enabled = true): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ loading: boolean; data?: T; error?: string }>({ loading: enabled });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => alive && setState({ loading: false, data }),
      (err) => alive && setState((s) => ({ loading: false, data: s.data, error: errorMessage(err) })),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
