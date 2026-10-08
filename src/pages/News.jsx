import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { POST_CATS } from '../data/posts.js'
import { useLoaded, useStore } from '../lib/store.js'
import { findBySlug, postPath, useTitle } from '../lib/seo.js'
import Prose from '../components/Prose.jsx'

const catLabel = (id) => POST_CATS.find((c) => c.id === id)?.label || 'Tin tức'
const date = (t) => new Date(t).toLocaleDateString('vi-VN')

export function PostCard({ p }) {
  return (
    <Link to={postPath(p)} className="group overflow-hidden rounded-2xl border border-white/10 bg-ink-800 transition hover:border-accent/60">
      <div className="layers-dark aspect-[16/9] bg-gradient-to-br from-accent to-amber-400">{p.cover && <img src={p.cover} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
      <div className="p-4"><span className="text-xs text-accent">{catLabel(p.category)} · {date(p.createdAt)}</span>
        <h3 className="mt-1 font-semibold text-white group-hover:text-accent">{p.title}</h3><p className="mt-1 line-clamp-2 text-sm text-zinc-400">{p.excerpt}</p></div>
    </Link>
  )
}

export default function News() {
  useTitle('Tin tức & kiến thức in 3D', 'Bài viết về vật liệu PLA/PETG/ABS, thông số in và mẹo dùng đồ in 3D.')
  const [posts] = useStore('posts'), [cat, setCat] = useState('all'), loaded = useLoaded()
  const list = posts.filter((p) => p.published && (cat === 'all' || p.category === cat)).sort((a, b) => b.createdAt - a.createdAt)
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Tin tức & kiến thức</h1>
      <div className="mt-6 flex flex-wrap gap-2">{[{ id: 'all', label: 'Tất cả' }, ...POST_CATS].map((c) => (
        <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-full px-4 py-2 text-sm ${cat === c.id ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{c.label}</button>))}</div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PostCard key={p.id} p={p} />)}</div>
      {loaded && list.length === 0 && <p className="py-20 text-center text-zinc-500">Chưa có bài viết.</p>}
    </div>
  )
}

export function Post() {
  const { id } = useParams(), [posts] = useStore('posts'), loaded = useLoaded()
  const p = findBySlug(posts.filter((x) => x.published), id)
  useTitle(p?.title, p?.excerpt, { image: p?.cover, type: 'article', jsonLd: p && { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, image: p.cover, datePublished: new Date(p.createdAt).toISOString() } })
  if (!p) return <div className="py-32 text-center text-zinc-400">{loaded ? <>Không tìm thấy bài viết. <Link to="/tin-tuc" className="text-accent">Về tin tức</Link></> : 'Đang tải…'}</div>
  const more = posts.filter((x) => x.published && x.id !== p.id && x.category === p.category).slice(0, 3)
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <Link to="/tin-tuc" className="text-sm text-accent">← Tin tức</Link>
      <p className="mt-4 text-sm text-zinc-500">{catLabel(p.category)} · {date(p.createdAt)}</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-white">{p.title}</h1>
      {p.cover && <img src={p.cover} alt={p.title} className="mt-6 w-full rounded-2xl" />}
      <div className="mt-8"><Prose text={p.content} /></div>
      {more.length > 0 && <><h2 className="mb-4 mt-14 font-display text-xl font-bold text-white">Bài viết liên quan</h2><div className="grid gap-5 sm:grid-cols-2">{more.map((x) => <PostCard key={x.id} p={x} />)}</div></>}
    </article>
  )
}
