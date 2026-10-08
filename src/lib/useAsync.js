import { useCallback, useEffect, useState } from 'react'
/** Tải dữ liệu bất đồng bộ: const { data, loading, error, reload } = useAsync(() => fetch..., [deps]) */
export function useAsync(fn, deps = []) {
  const [s, setS] = useState({ data: null, loading: true, error: null }), [tick, setTick] = useState(0)
  useEffect(() => {
    let ok = true; setS((x) => ({ ...x, loading: true }))
    Promise.resolve().then(fn).then((data) => ok && setS({ data, loading: false, error: null })).catch((error) => ok && setS({ data: null, loading: false, error }))
    return () => { ok = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { ...s, reload: useCallback(() => setTick((t) => t + 1), []) }
}
export const must = ({ data, error }) => { if (error) throw error; return data }
