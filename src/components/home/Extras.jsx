import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store.js'
import { ToolCards } from '../../pages/Design.jsx'
import { PostCard } from '../../pages/News.jsx'
import { Stars } from '../../pages/Gallery.jsx'

export function Tools() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-4 pb-16">
      <h2 className="mb-2 font-display text-3xl font-bold text-white">Tự thiết kế món của bạn</h2>
      <p className="mb-8 text-zinc-400">Xem trước ngay, báo giá tức thì.</p>
      <ToolCards />
    </section>
  )
}
export function Reviews() {
  const [items] = useStore('showcase'), list = items.filter((x) => x.active && x.quote).slice(0, 3)
  if (!list.length) return null
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16">
      <div className="mb-8 flex items-end justify-between"><h2 className="font-display text-3xl font-bold text-white">Khách nói gì</h2><Link to="/thu-vien" className="text-sm text-accent">Xem thư viện</Link></div>
      <div className="grid gap-5 md:grid-cols-3">{list.map((x) => (
        <figure key={x.id} className="rounded-2xl border border-white/10 bg-ink-800 p-5"><Stars n={x.rating || 5} />
          <blockquote className="mt-3 text-sm leading-relaxed text-zinc-300">“{x.quote}”</blockquote><figcaption className="mt-3 text-xs text-zinc-500">{x.customer}</figcaption></figure>))}</div>
    </section>
  )
}
export function LatestPosts() {
  const [posts] = useStore('posts'), list = posts.filter((p) => p.published).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
  if (!list.length) return null
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16">
      <div className="mb-8 flex items-end justify-between"><h2 className="font-display text-3xl font-bold text-white">Kiến thức in 3D</h2><Link to="/tin-tuc" className="text-sm text-accent">Xem tất cả</Link></div>
      <div className="grid gap-5 md:grid-cols-3">{list.map((p) => <PostCard key={p.id} p={p} />)}</div>
    </section>
  )
}
