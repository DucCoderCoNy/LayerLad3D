import { Link } from 'react-router-dom'
import { useWish } from '../context/WishlistContext.jsx'
import { useLoaded, useStore } from '../lib/store.js'
import { useTitle } from '../lib/seo.js'
import ProductCard from '../components/ProductCard.jsx'

export default function Wishlist() {
  useTitle('Sản phẩm yêu thích')
  const { ids } = useWish(), [products] = useStore('products'), loaded = useLoaded()
  const list = ids.map((id) => products.find((p) => p.id === id && p.active)).filter(Boolean)
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Yêu thích</h1>
      <p className="mt-2 text-zinc-400">Danh sách này lưu trên thiết bị của bạn.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {loaded && list.length === 0 && <p className="py-20 text-center text-zinc-500">Chưa có sản phẩm nào. Bấm biểu tượng trái tim trên sản phẩm để lưu. <Link to="/shop" className="text-accent hover:underline">Đến cửa hàng</Link></p>}
    </div>
  )
}
