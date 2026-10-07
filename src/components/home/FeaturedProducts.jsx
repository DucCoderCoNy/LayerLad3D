import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store.js'
import ProductCard from '../ProductCard.jsx'

/** Sản phẩm nổi bật: sản phẩm đang bán và được đánh dấu "hot" trong trang Admin */
export default function FeaturedProducts() {
  const [products] = useStore('products')
  const hot = products.filter((p) => p.active && p.hot).slice(0, 3)
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-white">Được đặt nhiều nhất</h2>
          <p className="mt-2 text-zinc-400">Học sinh, sinh viên chọn những món này mỗi đầu học kỳ.</p>
        </div>
        <Link to="/shop" className="hidden text-sm text-accent hover:underline sm:block">Xem tất cả</Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{hot.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  )
}
