import { useState } from 'react'
import { Search } from 'lucide-react'
import { CATEGORIES } from '../data/products.js'
import { useLoaded, useStore } from '../lib/store.js'
import ProductCard from '../components/ProductCard.jsx'
import { inp } from '../components/ui.jsx'

/** Cửa hàng: lọc theo danh mục, tìm kiếm, sắp xếp theo giá */
export default function Shop() {
  const [products] = useStore('products')
  const loaded = useLoaded()
  const [cat, setCat] = useState('all'), [q, setQ] = useState(''), [sort, setSort] = useState('')
  let list = products.filter((p) => p.active && (cat === 'all' || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()))
  if (sort) list = [...list].sort((a, b) => (sort === 'asc' ? a.price - b.price : b.price - a.price))
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Cửa hàng</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`rounded-full px-4 py-2 text-sm transition ${cat === c.id ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{c.label}</button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm…" className={`${inp} pl-9`} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inp} w-auto`}>
          <option value="">Mặc định</option><option value="asc">Giá tăng dần</option><option value="desc">Giá giảm dần</option>
        </select>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {!loaded && <p className="py-20 text-center text-zinc-500">Đang tải sản phẩm…</p>}
      {loaded && list.length === 0 && <p className="py-20 text-center text-zinc-500">Không tìm thấy sản phẩm phù hợp.</p>}
    </div>
  )
}
