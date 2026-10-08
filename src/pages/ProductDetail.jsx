import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatVND } from '../data/products.js'
import { useLoaded, useStore } from '../lib/store.js'
import { findBySlug, useTitle } from '../lib/seo.js'
import { useCart } from '../context/CartContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Thumb, btn, btn2, inp } from '../components/ui.jsx'

/** Danh sách ảnh của sản phẩm (hỗ trợ cả dữ liệu cũ chỉ có 1 ảnh `image`) */
export const imagesOf = (p) => (p.images?.length ? p.images : p.image ? [p.image] : [])
/** Màu khách được chọn: các màu admin gán cho sản phẩm; chưa gán thì dùng mọi màu đang bật */
export const colorsOf = (p, all) => {
  const on = all.filter((c) => c.active).sort((a, b) => (a.sort || 0) - (b.sort || 0))
  const own = p.colorIds?.length ? on.filter((c) => p.colorIds.includes(c.id)) : on
  return own
}

export default function ProductDetail() {
  const { id } = useParams()
  const [products] = useStore('products'), [allColors] = useStore('colors'), [cats] = useStore('categories')
  const { addItem } = useCart()
  const loaded = useLoaded()
  const p = findBySlug(products.filter((x) => x.active), id)
  const colors = useMemo(() => (p ? colorsOf(p, allColors) : []), [p, allColors])
  const [color, setColor] = useState(''), [qty, setQty] = useState(1), [pic, setPic] = useState(0)
  useEffect(() => { setPic(0); setQty(1); setColor('') }, [id])
  const imgs = p ? imagesOf(p) : []
  useTitle(p?.name, p?.desc?.slice(0, 160), {
    image: imgs[0], type: 'product',
    jsonLd: p && { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.desc, image: imgs.slice(0, 4),
      offers: { '@type': 'Offer', priceCurrency: 'VND', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } },
  })
  if (!p && !loaded) return <div className="py-32 text-center text-zinc-500">Đang tải…</div>
  if (!p) return <div className="py-32 text-center text-zinc-400">Không tìm thấy sản phẩm. <Link to="/shop" className="text-accent">Về cửa hàng</Link></div>
  const chosen = color || colors[0]?.name || 'Trắng'
  const related = products.filter((x) => x.active && x.category === p.category && x.id !== p.id).slice(0, 3)
  const cat = cats.find((c) => c.id === p.category)
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <nav className="mb-6 text-sm text-zinc-500"><Link to="/shop" className="hover:text-white">Cửa hàng</Link>{cat && <> / <span>{cat.label}</span></>} / <span className="text-zinc-300">{p.name}</span></nav>
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <Thumb p={{ ...p, image: imgs[pic] }} className="aspect-square w-full rounded-3xl" />
          {imgs.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {imgs.map((u, i) => <button key={u + i} onClick={() => setPic(i)} aria-label={`Ảnh ${i + 1}`} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === pic ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`}><img src={u} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}
            </div>)}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{p.name}</h1>
          <p className="mt-3 font-display text-3xl text-accent">{formatVND(p.price)}</p>
          <p className="mt-5 whitespace-pre-line leading-relaxed text-zinc-400">{p.desc}</p>
          <div className="mt-6 grid max-w-sm gap-5">
            {colors.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm text-zinc-400">Màu sắc: <b className="text-white">{chosen}</b></legend>
                <div className="flex flex-wrap gap-2">{colors.map((c) => <button key={c.id} type="button" title={c.name} aria-label={c.name} onClick={() => setColor(c.name)} className={`h-9 w-9 rounded-full border-2 ${chosen === c.name ? 'border-accent ring-2 ring-accent/40' : 'border-white/20'}`} style={{ background: c.hex }} />)}</div>
              </fieldset>)}
            <label className="text-sm text-zinc-400">Số lượng
              <input type="number" min="1" max={Math.max(1, p.stock)} value={qty} onChange={(e) => setQty(Math.min(Math.max(1, p.stock), Math.max(1, +e.target.value || 1)))} className={`${inp} mt-1`} />
            </label>
          </div>
          <p className="mt-4 text-sm text-zinc-500">{p.stock > 0 ? `Còn ${p.stock} sản phẩm` : 'Tạm hết hàng'}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button disabled={p.stock <= 0} onClick={() => addItem(p, chosen, qty)} className={btn}>Thêm vào giỏ hàng</button>
            <Link to="/custom" className={btn2}>Cần bản riêng? Đặt in theo yêu cầu</Link>
          </div>
        </div>
      </div>
      {related.length > 0 && (<><h2 className="mb-5 mt-16 font-display text-2xl font-bold text-white">Sản phẩm liên quan</h2>
        <div className="grid gap-5 sm:grid-cols-3">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div></>)}
    </div>
  )
}
