import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const Ctx = createContext(null), KEY = 'll3d:wish'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }

/** Danh sách yêu thích: lưu trên máy khách (localStorage), không cần đăng nhập */
export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(ids)) } catch { /* bỏ qua */ } }, [ids])
  const value = useMemo(() => ({ ids, has: (id) => ids.includes(id), toggle: (id) => setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [id, ...c].slice(0, 100))) }), [ids])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useWish = () => useContext(Ctx)
