import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useTitle } from '../lib/seo.js'
import { useLoaded, useStore } from '../lib/store.js'
import ProductCard from '../components/ProductCard.jsx'
import { inp } from '../components/ui.jsx'

const PAGE = 12

/** Cửa hàng: lọc danh mục, tìm kiếm, sắp xếp, phân trang. Trạng thái nằm trên URL (?cat=&q=&sort=&page=) nên chia sẻ/quay lại được. */
export default function Shop() {
  const [products] = useStore('products'), [cats] = useStore('categories')
  const [sp, setSp] = useSearchParams()
  const cat = sp.get('cat') || 'all', q = sp.get('q') || '', sort = sp.get('sort') || '', page = Math.max(1, +sp.get('page') || 1)
  const activeCat = cats.find((c) => c.id === cat)
  useTitle(activeCat ? activeCat.label : 'Cửa hàng', 'Móc khóa, thời khóa biểu module, clicker và đồ dùng in 3D.')
  const loaded = useLoaded()
  const upd = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setSp(n, { replace: true }) }

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    let l = products.filter((p) => p.active && (cat === 'all' || p.category === cat) && (!ql || p.name.toLowerCase().includes(ql)))
    if (sort) l = [...l].sort((a, b) => (sort === 'asc' ? a.price - b.price : b.price - a.price))
    return l
  }, [products, cat, q, sort])
  const pages = Math.max(1, Math.ceil(list.length / PAGE)), cur = Math.min(page, pages), shown = list.slice((cur - 1) * PAGE, cur * PAGE)
  const CATEGORIES = [{ id: 'all', label: 'Tất cả' }, ...cats]
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">{activeCat ? activeCat.label : 'Cửa hàng'}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => upd('cat', c.id === 'all' ? '' : c.id)}
            className={`rounded-full px-4 py-2 text-sm transition ${cat === c.id ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{c.label}</button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
          <input value={q} onChange={(e) => upd('q', e.target.value)} placeholder="Tìm sản phẩm…" aria-label="Tìm sản phẩm" className={`${inp} pl-9`} />
        </div>
        <select value={sort} onChange={(e) => upd('sort', e.target.value)} aria-label="Sắp xếp" className={`${inp} w-auto`}>
          <option value="">Mặc định</option><option value="asc">Giá tăng dần</option><option value="desc">Giá giảm dần</option>
        </select>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {!loaded && <p className="py-20 text-center text-zinc-500">Đang tải sản phẩm…</p>}
      {loaded && list.length === 0 && <p className="py-20 text-center text-zinc-500">Không tìm thấy sản phẩm phù hợp.</p>}
      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Phân trang">
          <button disabled={cur <= 1} onClick={() => upd('page', cur - 1)} className="rounded-lg bg-white/10 px-3 py-2 text-sm disabled:opacity-40">‹ Trước</button>
          <span className="px-3 text-sm text-zinc-400">Trang {cur}/{pages}</span>
          <button disabled={cur >= pages} onClick={() => upd('page', cur + 1)} className="rounded-lg bg-white/10 px-3 py-2 text-sm disabled:opacity-40">Sau ›</button>
        </nav>)}
    </div>
  )
}
