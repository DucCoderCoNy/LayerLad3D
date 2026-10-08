import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

/** Giỏ hàng (lưu localStorage): items = [{ key, id, name, price, image, color, qty }] */
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem('ll3d:cart')) || [] } catch { return [] } })
  const [open, setOpen] = useState(false)
  useEffect(() => localStorage.setItem('ll3d:cart', JSON.stringify(items)), [items])

  const addItem = (p, color = 'Trắng', qty = 1) => {
    setItems((cur) => {
      const key = p.id + color
      if (cur.some((i) => i.key === key)) return cur.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
      return [...cur, { key, id: p.id, name: p.name, price: p.price, image: p.images?.[0] || p.image, hue: p.hue, color, qty }]
    })
    setOpen(true)
  }
  /** Món tùy biến (móc khóa, thời khóa biểu): it = { id:'cfg-...', name, price, color, cfg, hue } – server tính lại giá từ cfg */
  const addConfigured = (it, qty = 1) => {
    setItems((cur) => {
      const key = it.id + JSON.stringify(it.cfg)
      if (cur.some((i) => i.key === key)) return cur.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
      return [...cur, { ...it, key, qty }]
    })
    setOpen(true)
  }
  const setQty = (key, qty) => setItems((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i)))
  const removeItem = (key) => setItems((c) => c.filter((i) => i.key !== key))
  const clear = () => setItems([])

  const value = useMemo(() => ({
    items, addItem, addConfigured, setQty, removeItem, clear, open, setOpen,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.price, 0),
  }), [items, open])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
