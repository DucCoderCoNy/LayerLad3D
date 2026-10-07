import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLORS, formatVND } from '../data/products.js'
import { useLoaded, useStore } from '../lib/store.js'
import { useCart } from '../context/CartContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Thumb, btn, btn2, inp } from '../components/ui.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const [products] = useStore('products')
  const { addItem } = useCart()
  const [color, setColor] = useState(COLORS[0]), [qty, setQty] = useState(1)
  const loaded = useLoaded()
  const p = products.find((x) => x.id === id && x.active)
  if (!p && !loaded) return <div className="py-32 text-center text-zinc-500">Đang tải…</div>
  if (!p) return <div className="py-32 text-center text-zinc-400">Không tìm thấy sản phẩm. <Link to="/shop" className="text-accent">Về cửa hàng</Link></div>
  const related = products.filter((x) => x.active && x.category === p.category && x.id !== p.id).slice(0, 3)
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <Thumb p={p} className="aspect-square w-full rounded-3xl" />
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{p.name}</h1>
          <p className="mt-3 font-display text-3xl text-accent">{formatVND(p.price)}</p>
          <p className="mt-5 leading-relaxed text-zinc-400">{p.desc}</p>
          <div className="mt-6 grid max-w-xs gap-4">
            <label className="text-sm text-zinc-400">Màu sắc
              <select value={color} onChange={(e) => setColor(e.target.value)} className={`${inp} mt-1`}>{COLORS.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            {color === 'Custom' && <p className="text-xs text-zinc-500">Màu tùy chọn: ghi rõ màu mong muốn trong ghi chú khi thanh toán.</p>}
            <label className="text-sm text-zinc-400">Số lượng
              <input type="number" min="1" max={p.stock} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))} className={`${inp} mt-1`} />
            </label>
          </div>
          <p className="mt-4 text-sm text-zinc-500">{p.stock > 0 ? `Còn ${p.stock} sản phẩm` : 'Tạm hết hàng'}</p>
          <div className="mt-6 flex gap-3">
            <button disabled={p.stock <= 0} onClick={() => addItem(p, color, qty)} className={btn}>Thêm vào giỏ hàng</button>
            <Link to="/custom" className={btn2}>Cần bản riêng? Đặt in theo yêu cầu</Link>
          </div>
        </div>
      </div>
      {related.length > 0 && (<><h2 className="mb-5 mt-16 font-display text-2xl font-bold text-white">Sản phẩm liên quan</h2>
        <div className="grid gap-5 sm:grid-cols-3">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div></>)}
    </div>
  )
}
