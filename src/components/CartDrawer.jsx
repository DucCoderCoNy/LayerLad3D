import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { formatVND } from '../data/products.js'
import { Thumb, btn } from './ui.jsx'

/** Giỏ hàng trượt từ cạnh phải */
export default function CartDrawer() {
  const { items, open, setOpen, setQty, removeItem, total } = useCart()
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="font-display text-xl font-bold text-white">Giỏ hàng</h2>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/10"><X /></button>
        </div>
        {items.length === 0 ? (
          <div className="grid flex-1 place-items-center text-center text-zinc-500"><div><ShoppingBag className="mx-auto mb-3" size={40} />Giỏ hàng đang trống</div></div>
        ) : (
          <ul className="flex-1 space-y-4 overflow-y-auto p-5">
            {items.map((i) => (
              <li key={i.key} className="flex gap-3">
                <Thumb p={i} className="h-20 w-20 shrink-0 rounded-xl" />
                <div className="flex-1">
                  <p className="font-medium text-white">{i.name}</p>
                  <p className="text-xs text-zinc-500">Màu: {i.color}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => setQty(i.key, i.qty - 1)} className="rounded-md bg-white/10 p-1"><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm">{i.qty}</span>
                    <button onClick={() => setQty(i.key, i.qty + 1)} className="rounded-md bg-white/10 p-1"><Plus size={14} /></button>
                    <button onClick={() => removeItem(i.key)} className="ml-auto text-zinc-500 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-accent">{formatVND(i.price * i.qty)}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-white/10 p-5">
          <div className="mb-4 flex justify-between text-lg"><span className="text-zinc-400">Tạm tính</span><b className="text-white">{formatVND(total)}</b></div>
          <Link to="/checkout" onClick={() => setOpen(false)} className={`${btn} block text-center ${items.length ? '' : 'pointer-events-none opacity-50'}`}>Thanh toán</Link>
        </div>
      </aside>
    </div>
  )
}
