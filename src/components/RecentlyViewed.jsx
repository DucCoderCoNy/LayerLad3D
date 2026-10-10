import { useStore } from '../lib/store.js'
import { getRecent } from '../lib/recent.js'
import ProductCard from './ProductCard.jsx'

/** Sản phẩm bạn đã xem gần đây (bỏ qua sản phẩm đang xem) */
export default function RecentlyViewed({ exclude, title = 'Bạn đã xem gần đây', className = 'mt-16' }) {
  const [products] = useStore('products')
  const list = getRecent().filter((id) => id !== exclude).map((id) => products.find((p) => p.id === id && p.active)).filter(Boolean).slice(0, 4)
  if (!list.length) return null
  return <section className={className}><h2 className="mb-5 font-display text-2xl font-bold text-white">{title}</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div></section>
}
