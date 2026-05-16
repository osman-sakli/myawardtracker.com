'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (value: T | null) => void;
}

/** Run an async loader on mount; exposes data, loading, error, and a reload. */
export function useAsync<T>(loader: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Something went wrong.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
