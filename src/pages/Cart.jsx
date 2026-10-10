import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { formatVND } from '../data/products.js'
import { useStore } from '../lib/store.js'
import { freeShipGap, isCustomItem } from '../lib/cartUtils.js'
import { useTitle } from '../lib/seo.js'
import { Thumb, btn } from '../components/ui.jsx'
import RecentlyViewed from '../components/RecentlyViewed.jsx'

/** Trang giỏ hàng đầy đủ (ngoài ngăn kéo giỏ nhanh) */
export default function Cart() {
  useTitle('Giỏ hàng')
  const { items, setQty, removeItem, total } = useCart(), [st] = useStore('settings'), gap = freeShipGap(st, total)
  if (!items.length) return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center"><h1 className="font-display text-3xl font-bold text-white">Giỏ hàng trống</h1>
      <p className="mt-2 text-zinc-400">Chưa có sản phẩm nào trong giỏ.</p><Link to="/shop" className={`${btn} mt-6 inline-block`}>Đến cửa hàng</Link><RecentlyViewed className="mt-16 text-left" /></div>)
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Giỏ hàng</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <ul className="space-y-3 md:col-span-2">{items.map((i) => (
          <li key={i.key} className="flex gap-4 rounded-2xl border border-white/10 bg-ink-800 p-4">
            <Thumb p={i} className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{i.name}</p><p className="text-sm text-zinc-500">{i.color}</p><p className="mt-1 text-accent">{formatVND(i.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button aria-label="Giảm số lượng" onClick={() => setQty(i.key, i.qty - 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><Minus size={14} /></button>
                <span className="w-8 text-center text-white" aria-live="polite">{i.qty}</span>
                <button aria-label="Tăng số lượng" onClick={() => setQty(i.key, i.qty + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><Plus size={14} /></button>
                <button aria-label="Xóa khỏi giỏ" onClick={() => removeItem(i.key)} className="ml-auto p-2 text-zinc-500 hover:text-red-400"><Trash2 size={18} /></button>
              </div>
            </div>
            <p className="hidden font-semibold text-white sm:block">{formatVND(i.price * i.qty)}</p>
          </li>))}</ul>
        <aside className="h-fit space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-5">
          <div className="flex justify-between text-zinc-300"><span>Tạm tính</span><b className="text-white">{formatVND(total)}</b></div>
          {gap !== null && <div className="text-sm"><p className={gap ? 'text-zinc-300' : 'text-neon'}>{gap ? <>Mua thêm <b className="text-white">{formatVND(gap)}</b> để miễn phí giao hàng</> : 'Bạn được miễn phí giao hàng'}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (total / st.freeShipOver) * 100)}%` }} /></div></div>}
          {items.some(isCustomItem) && <p className="rounded-lg bg-white/5 p-2.5 text-xs text-zinc-400">Giỏ có món in theo yêu cầu: thanh toán chuyển khoản 100% trước khi xưởng in.</p>}
          <Link to="/checkout" className={`${btn} block w-full text-center`}>Tiến hành thanh toán</Link>
          <Link to="/shop" className="block text-center text-sm text-zinc-400 hover:text-accent">Tiếp tục mua sắm</Link>
        </aside>
      </div>
    </div>
  )
}
