import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store.js'
import { formatVND } from '../data/products.js'
import { useCart } from '../context/CartContext.jsx'
import { productPath } from '../lib/seo.js'
import { Thumb } from './ui.jsx'

export default function ProductCard({ p }) {
  const { addItem } = useCart(), [cats] = useStore('categories')
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-ink-800 transition hover:border-accent/60">
      <Link to={productPath(p)} className="relative block aspect-[4/3] overflow-hidden">
        <Thumb p={{ ...p, image: p.images?.[0] || p.image }} className="h-full w-full" />
        <span className="absolute bottom-3 left-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs text-white backdrop-blur">{cats.find((c) => c.id === p.category)?.label}</span>
        {p.stock <= 0 && <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white">Hết hàng</span>}
      </Link>
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <Link to={productPath(p)} className="font-semibold text-white group-hover:text-accent">{p.name}</Link>
          <p className="mt-1 font-display text-lg text-accent">{formatVND(p.price)}</p>
        </div>
        <button disabled={p.stock <= 0} onClick={() => addItem(p)} aria-label={`Thêm ${p.name} vào giỏ`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-accent hover:text-ink-950 disabled:opacity-40">
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}
