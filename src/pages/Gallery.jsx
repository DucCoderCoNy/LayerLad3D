import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { useStore } from '../lib/store.js'
import { useTitle } from '../lib/seo.js'

export const Stars = ({ n = 5 }) => <span className="inline-flex text-accent">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill={i <= n ? 'currentColor' : 'none'} />)}</span>

/** Thư viện ảnh sản phẩm đã làm (+ đánh giá khách). Quản lý trong Admin → Thư viện & đánh giá */
export default function Gallery() {
  useTitle('Thư viện sản phẩm đã làm')
  const [items] = useStore('showcase'), [big, setBig] = useState(null)
  const list = items.filter((x) => x.active)
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Sản phẩm đã làm</h1>
      <p className="mt-2 text-zinc-400">Một số món xưởng đã in và gửi tới khách.</p>
      {list.length === 0 && <p className="py-20 text-center text-zinc-500">Thư viện đang được cập nhật.</p>}
      <div className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
        {list.map((x) => (
          <figure key={x.id} className="break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-ink-800">
            {x.image && <button onClick={() => setBig(x)} className="block w-full"><img src={x.image} alt={x.title} loading="lazy" className="w-full object-cover" /></button>}
            <figcaption className="p-4"><b className="text-white">{x.title}</b>
              {x.quote && <p className="mt-2 text-sm text-zinc-400">“{x.quote}”</p>}
              {x.customer && <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">{x.customer} <Stars n={x.rating || 5} /></p>}
            </figcaption>
          </figure>))}
      </div>
      {big && <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setBig(null)}><button aria-label="Đóng" className="absolute right-4 top-4 text-white"><X size={28} /></button><img src={big.image} alt={big.title} className="max-h-full max-w-full rounded-xl" /></div>}
    </div>
  )
}
